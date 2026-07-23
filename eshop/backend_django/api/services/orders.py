import logging
from decimal import Decimal

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import serializers

from api.models import AdminActivityLog, Order, OrderItem, OrderNumberSequence, OrderStatusHistory, Product
from api.utils.request_meta import request_meta_snapshot

logger = logging.getLogger(__name__)

VALID_STATUS_TRANSITIONS = {
    Order.Status.DRAFT: {Order.Status.REQUESTED, Order.Status.CANCELLED},
    Order.Status.REQUESTED: {Order.Status.CONFIRMED, Order.Status.REJECTED, Order.Status.CANCELLED},
    Order.Status.CONFIRMED: {Order.Status.PROCESSING, Order.Status.CANCELLED},
    Order.Status.PROCESSING: {Order.Status.READY, Order.Status.CANCELLED},
    Order.Status.READY: {Order.Status.SHIPPED, Order.Status.DELIVERED, Order.Status.CANCELLED},
    Order.Status.SHIPPED: {Order.Status.DELIVERED, Order.Status.CANCELLED},
    Order.Status.DELIVERED: set(),
    Order.Status.CANCELLED: set(),
    Order.Status.REJECTED: set(),
}

ACTION_STATUS = {
    "confirm": Order.Status.CONFIRMED,
    "process": Order.Status.PROCESSING,
    "ready": Order.Status.READY,
    "ship": Order.Status.SHIPPED,
    "deliver": Order.Status.DELIVERED,
    "cancel": Order.Status.CANCELLED,
    "reject": Order.Status.REJECTED,
}

ACTION_LOG = {
    "confirm": "confirm",
    "process": "process",
    "ready": "ready",
    "ship": "ship",
    "deliver": "deliver",
    "cancel": "cancel",
    "reject": "reject",
}


def next_order_number(max_attempts=3):
    year = timezone.now().year
    for _ in range(max_attempts):
        try:
            with transaction.atomic():
                sequence, _ = OrderNumberSequence.objects.select_for_update().get_or_create(year=year)
                sequence.last_number += 1
                sequence.save(update_fields=["last_number", "updated_at"])
                return f"ORD-{year}-{sequence.last_number:06d}"
        except IntegrityError:
            logger.warning("Order number sequence collision for %s", year, exc_info=True)
    raise serializers.ValidationError({"order_number": "Could not allocate an order number. Please retry."})


def calculate_order_totals(order):
    items = list(order.items.all())
    subtotal = sum((item.quantity * item.unit_price for item in items), Decimal("0.00"))
    discount = sum((item.line_discount for item in items), Decimal("0.00"))
    total = max(subtotal - discount + order.delivery_fee, Decimal("0.00"))
    Order.objects.filter(pk=order.pk).update(
        subtotal_amount=subtotal,
        discount_amount=discount,
        total_amount=total,
        items_count=len(items),
        total_quantity=sum(item.quantity for item in items),
        updated_at=timezone.now(),
    )
    order.subtotal_amount = subtotal
    order.discount_amount = discount
    order.total_amount = total
    order.items_count = len(items)
    order.total_quantity = sum(item.quantity for item in items)
    return order


def _decimal(value, field):
    try:
        amount = Decimal(str(value))
    except Exception as exc:
        raise serializers.ValidationError({field: "Enter a valid decimal value."}) from exc
    return amount


def _validate_item(raw_item):
    quantity = int(raw_item.get("quantity", 1))
    if quantity < 1:
        raise serializers.ValidationError({"quantity": "Quantity must be at least 1."})
    unit_price = _decimal(raw_item.get("unit_price", "0"), "unit_price")
    line_discount = _decimal(raw_item.get("line_discount", "0"), "line_discount")
    if unit_price < 0:
        raise serializers.ValidationError({"unit_price": "Unit price cannot be negative."})
    if line_discount < 0:
        raise serializers.ValidationError({"line_discount": "Line discount cannot be negative."})
    if line_discount > quantity * unit_price:
        raise serializers.ValidationError({"line_discount": "Line discount cannot exceed quantity times unit price."})
    raw_item["quantity"] = quantity
    raw_item["unit_price"] = unit_price
    raw_item["line_discount"] = line_discount
    return raw_item


def _apply_product_snapshot(item, product, allow_price_override):
    if not product:
        return item
    item["product"] = product
    item["product_id_snapshot"] = product.product_id
    item["product_name_snapshot"] = product.name
    item["product_sku_snapshot"] = product.sku
    item["trader"] = product.trader
    item["trader_name_snapshot"] = product.trader.business_name if product.trader else ""
    item["branch"] = product.branch
    item["branch_name_snapshot"] = product.branch.name if product.branch else ""
    if not allow_price_override:
        item["unit_price"] = product.price
    media = product.primary_media
    if media and media.file:
        try:
            item["product_media_url"] = media.file.url
        except Exception:
            item["product_media_url"] = media.file.name
    return item


def _prepare_items(items, allow_price_override=False):
    prepared = []
    errors = []
    for index, item in enumerate(items):
        raw = dict(item)
        try:
            product = raw.get("product")
            if product and not isinstance(product, Product):
                product = Product.objects.select_related("trader", "branch").prefetch_related("media").get(pk=product)
            raw = _validate_item(raw)
            raw = _apply_product_snapshot(raw, product, allow_price_override)
            if not raw.get("product") and not raw.get("product_name_snapshot"):
                raise serializers.ValidationError({"product_name_snapshot": "Provide a product or product name snapshot."})
            prepared.append(raw)
        except Product.DoesNotExist:
            errors.append({index: {"product": "Product not found."}})
        except serializers.ValidationError as exc:
            errors.append({index: exc.detail})
        except (TypeError, ValueError):
            errors.append({index: {"quantity": "Enter a valid quantity."}})
    if errors:
        raise serializers.ValidationError({"items": errors})
    return prepared


def _line_fields(item):
    return {
        "product": item.get("product"),
        "product_media_url": item.get("product_media_url", ""),
        "product_id_snapshot": item.get("product_id_snapshot", ""),
        "product_name_snapshot": item.get("product_name_snapshot", ""),
        "product_sku_snapshot": item.get("product_sku_snapshot", ""),
        "trader": item.get("trader"),
        "trader_name_snapshot": item.get("trader_name_snapshot", ""),
        "branch": item.get("branch"),
        "branch_name_snapshot": item.get("branch_name_snapshot", ""),
        "quantity": item["quantity"],
        "unit_price": item["unit_price"],
        "line_discount": item["line_discount"],
        "line_total": max(item["quantity"] * item["unit_price"] - item["line_discount"], Decimal("0.00")),
        "note": item.get("note", ""),
    }


def record_order_activity(request, action, order, status_code=None, metadata=None):
    try:
        user = getattr(request, "user", None)
        actor = user if getattr(user, "is_authenticated", False) else None
        meta = request_meta_snapshot(request) if hasattr(request, "META") else {
            "ip_address": None,
            "user_agent": "",
            "device_type": "",
            "browser": "",
            "os": "",
        }
        AdminActivityLog.objects.create(
            actor=actor,
            actor_username=actor.get_username() if actor else "",
            ip_address=meta["ip_address"],
            user_agent=meta["user_agent"],
            device_type=meta["device_type"],
            browser=meta["browser"],
            os=meta["os"],
            module="orders",
            action=action,
            object_type=order.__class__.__name__,
            object_id=str(order.pk),
            object_repr=str(order)[:255],
            path=getattr(request, "path", "")[:500],
            method=getattr(request, "method", ""),
            status_code=status_code,
            metadata=metadata or {},
        )
    except Exception:
        logger.warning("Could not record order admin activity", exc_info=True)


@transaction.atomic
def create_order(validated_data, items, user=None, request=None):
    initial_status = validated_data.get("status") or Order.Status.REQUESTED
    if initial_status != Order.Status.DRAFT and not items:
        raise serializers.ValidationError({"items": "At least one order item is required for non-draft orders."})
    prepared_items = _prepare_items(items, allow_price_override=validated_data.pop("allow_price_override", False))
    order = Order.objects.create(order_number=next_order_number(), created_by=user, updated_by=user, **validated_data)
    for item in prepared_items:
        OrderItem.objects.create(order=order, **_line_fields(item))
    calculate_order_totals(order)
    OrderStatusHistory.objects.create(order=order, from_status="", to_status=order.status, changed_by=user)
    from api.services.notifications import sync_order_notification
    sync_order_notification(order)
    if request:
        record_order_activity(request, "create", order, 201)
    return order


@transaction.atomic
def update_order(order, validated_data, items=None, user=None, request=None):
    status = validated_data.pop("status", None)
    allow_price_override = validated_data.pop("allow_price_override", False)
    if status is not None and status != order.status:
        raise serializers.ValidationError({"status": "Use a status action endpoint to change order status."})
    old_payment_status = order.payment_status
    for key, value in validated_data.items():
        setattr(order, key, value)
    order.updated_by = user
    order.save()
    if items is not None:
        sync_order_items(order, items, allow_price_override=allow_price_override, request=request)
    calculate_order_totals(order)
    if request:
        record_order_activity(request, "update", order, 200)
        if old_payment_status != order.payment_status:
            record_order_activity(request, "payment-status-change", order, 200, {"from": old_payment_status, "to": order.payment_status})
    if old_payment_status != order.payment_status:
        from api.services.notifications import sync_order_notification
        sync_order_notification(order)
    return order


def sync_order_items(order, items, allow_price_override=False, request=None):
    prepared_items = _prepare_items(items, allow_price_override=allow_price_override)
    existing = {item.id: item for item in order.items.all()}
    seen = set()
    for item in prepared_items:
        item_id = item.get("id")
        fields = _line_fields(item)
        if item_id:
            if item_id not in existing:
                raise serializers.ValidationError({"items": f"Order item {item_id} does not belong to this order."})
            line = existing[item_id]
            for key, value in fields.items():
                setattr(line, key, value)
            line.full_clean()
            line.save()
            seen.add(item_id)
            if request:
                record_order_activity(request, "item-update", order, 200, {"item_id": item_id})
        else:
            line = OrderItem(order=order, **fields)
            line.full_clean()
            line.save()
            seen.add(line.id)
            if request:
                record_order_activity(request, "item-add", order, 200, {"item_id": line.id})
    for item_id, line in existing.items():
        if item_id not in seen:
            line.delete()
            if request:
                record_order_activity(request, "item-delete", order, 200, {"item_id": item_id})


@transaction.atomic
def transition_order(order, new_status, user=None, note="", request=None, action=None):
    old_status = order.status
    if new_status not in VALID_STATUS_TRANSITIONS.get(old_status, set()):
        raise serializers.ValidationError({"status": f"Cannot transition order from {old_status} to {new_status}."})
    now = timezone.now()
    order.status = new_status
    order.updated_by = user
    if new_status == Order.Status.CONFIRMED:
        order.confirmed_by = user
        order.confirmed_at = now
    if new_status == Order.Status.DELIVERED:
        order.delivered_at = now
    if new_status in (Order.Status.CANCELLED, Order.Status.REJECTED):
        order.cancelled_at = now
    try:
        order.full_clean()
    except DjangoValidationError as exc:
        raise serializers.ValidationError(exc.message_dict) from exc
    order.save()
    OrderStatusHistory.objects.create(order=order, from_status=old_status, to_status=new_status, changed_by=user, note=note)
    from api.services.notifications import sync_order_notification
    sync_order_notification(order)
    if request:
        record_order_activity(request, ACTION_LOG.get(action or "", "status-change"), order, 200, {"from": old_status, "to": new_status})
    return order
