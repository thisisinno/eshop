import hashlib
import json
from decimal import Decimal

from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from api.models import (
    Cart, Invoice, InvoiceItem, InvoiceNumberSequence, Order, SiteBranding, UserNotification,
)
from api.services.realtime import broadcast_after_commit, customer_group


def next_invoice_number(document_type):
    year = timezone.now().year
    prefix = "PF" if document_type == Invoice.DocumentType.PROFORMA else "INV"
    for _ in range(3):
        try:
            with transaction.atomic():
                sequence, _ = InvoiceNumberSequence.objects.select_for_update().get_or_create(
                    year=year, document_type=document_type
                )
                sequence.last_number += 1
                sequence.save(update_fields=("last_number", "updated_at"))
                return f"{prefix}-{year}-{sequence.last_number:06d}"
        except IntegrityError:
            continue
    raise ValidationError({"invoice_number": "Could not allocate an invoice number. Please retry."})


def _media_url(product):
    media = product.primary_media
    if not media or not media.file:
        return ""
    try:
        return media.file.url
    except Exception:
        return media.file.name


def _branding():
    branding = SiteBranding.objects.order_by("-updated_at").first()
    if not branding:
        return "SmartWear", ""
    try:
        logo = branding.logo.url if branding.logo else ""
    except Exception:
        logo = ""
    return branding.site_name or "SmartWear", logo


def cart_fingerprint(items, delivery_fee):
    normalized = [
        {
            "product": item.product_id,
            "signature": item.specification_signature,
            "quantity": item.quantity,
            "unit_price": str(item.unit_price),
        }
        for item in sorted(items, key=lambda row: (row.product_id, row.specification_signature, row.id))
    ]
    normalized.append({"delivery_fee": str(delivery_fee)})
    return hashlib.sha256(json.dumps(normalized, sort_keys=True).encode()).hexdigest()


@transaction.atomic
def create_proforma_from_cart(user):
    cart = Cart.objects.prefetch_related(
        "items__product__trader", "items__product__media",
    ).filter(user=user).first()
    items = list(cart.items.all()) if cart else []
    if not items:
        raise ValidationError({"cart": "Cart is empty."})
    delivery_fee = Decimal("0.00")
    seen_products = set()
    subtotal = Decimal("0.00")
    for item in items:
        product = item.product
        if product.status != product.Status.ACTIVE:
            raise ValidationError({"cart": f"{product.name} is no longer available."})
        if item.quantity < product.minimum_order_quantity or item.quantity > product.stock_quantity:
            raise ValidationError({"cart": f"Quantity for {product.name} is no longer available."})
        subtotal += item.unit_price * item.quantity
        if product.id not in seen_products:
            delivery_fee += product.delivery_fee
            seen_products.add(product.id)
    fingerprint = cart_fingerprint(items, delivery_fee)
    existing = Invoice.objects.filter(
        customer_user=user, document_type=Invoice.DocumentType.PROFORMA,
        status=Invoice.Status.ISSUED, cart_fingerprint=fingerprint,
    ).order_by("-issued_at").first()
    if existing:
        return existing, False
    company_name, logo = _branding()
    invoice = Invoice.objects.create(
        invoice_number=next_invoice_number(Invoice.DocumentType.PROFORMA),
        document_type=Invoice.DocumentType.PROFORMA,
        customer_user=user,
        subtotal_amount=subtotal,
        delivery_fee=delivery_fee,
        total_amount=subtotal + delivery_fee,
        customer_name_snapshot=user.get_full_name() or user.get_username(),
        customer_email_snapshot=user.email or "",
        company_name_snapshot=company_name,
        company_logo_url_snapshot=logo,
        cart_fingerprint=fingerprint,
        issued_at=timezone.now(),
    )
    for index, item in enumerate(items):
        product = item.product
        InvoiceItem.objects.create(
            invoice=invoice, product=product,
            product_id_snapshot=product.product_id,
            product_name_snapshot=product.name,
            product_sku_snapshot=product.sku,
            product_media_url=_media_url(product),
            trader_name_snapshot=product.trader.business_name if product.trader_id else "",
            selected_specifications_snapshot=item.selected_specifications,
            quantity=item.quantity, unit_price=item.unit_price,
            line_total=item.unit_price * item.quantity, sort_order=index,
        )
    return invoice, True


@transaction.atomic
def create_order_invoice(order):
    existing = Invoice.objects.filter(order=order).first()
    if existing:
        return existing, False
    if not order.customer_user_id:
        raise ValidationError({"order": "A registered customer is required for an invoice."})
    company_name, logo = _branding()
    invoice = Invoice.objects.create(
        invoice_number=next_invoice_number(Invoice.DocumentType.ORDER_INVOICE),
        document_type=Invoice.DocumentType.ORDER_INVOICE,
        customer_user=order.customer_user, order=order, currency=order.currency,
        subtotal_amount=order.subtotal_amount, discount_amount=order.discount_amount,
        delivery_fee=order.delivery_fee, total_amount=order.total_amount,
        customer_name_snapshot=order.customer_full_name,
        customer_email_snapshot=order.customer_email,
        customer_phone_snapshot=order.customer_phone,
        customer_address_snapshot=order.customer_address,
        company_name_snapshot=company_name, company_logo_url_snapshot=logo,
        issued_at=timezone.now(),
    )
    for index, item in enumerate(order.items.all()):
        InvoiceItem.objects.create(
            invoice=invoice, product=item.product,
            product_id_snapshot=item.product_id_snapshot,
            product_name_snapshot=item.product_name_snapshot,
            product_sku_snapshot=item.product_sku_snapshot,
            product_media_url=item.product_media_url,
            trader_name_snapshot=item.trader_name_snapshot,
            selected_specifications_snapshot=item.selected_specifications_snapshot,
            quantity=item.quantity, unit_price=item.unit_price,
            line_discount=item.line_discount, line_total=item.line_total, sort_order=index,
        )
    notification = UserNotification.objects.create(
        recipient=order.customer_user,
        notification_type=UserNotification.NotificationType.INVOICE,
        title=f"Invoice {invoice.invoice_number}",
        message=f"Your invoice for {order.order_number} is ready.",
        metadata={"invoice_id": invoice.id, "order_id": order.id,
                  "action": f"/invoices/{invoice.id}", "admin": False},
    )
    broadcast_after_commit(
        [customer_group(order.customer_user_id)],
        {"type": "invoice.created", "version": 1, "invoice_id": invoice.id,
         "order_id": order.id, "notification_id": notification.id},
    )
    return invoice, True
