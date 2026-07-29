from decimal import Decimal

from django.conf import settings
from django.db import models

from .catalog import Product
from .orders import Order


class Invoice(models.Model):
    class DocumentType(models.TextChoices):
        PROFORMA = "proforma", "Pro forma"
        ORDER_INVOICE = "order_invoice", "Order invoice"

    class Status(models.TextChoices):
        ISSUED = "issued", "Issued"
        PAID = "paid", "Paid"
        VOID = "void", "Void"

    invoice_number = models.CharField(max_length=24, unique=True, editable=False)
    document_type = models.CharField(max_length=20, choices=DocumentType.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ISSUED)
    customer_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, related_name="invoices", on_delete=models.PROTECT
    )
    order = models.OneToOneField(
        Order, null=True, blank=True, related_name="invoice", on_delete=models.SET_NULL
    )
    currency = models.CharField(max_length=10, default="TZS")
    subtotal_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    discount_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    delivery_fee = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    customer_name_snapshot = models.CharField(max_length=255)
    customer_email_snapshot = models.EmailField(blank=True)
    customer_phone_snapshot = models.CharField(max_length=50, blank=True)
    customer_address_snapshot = models.TextField(blank=True)
    company_name_snapshot = models.CharField(max_length=255, default="SmartWear")
    company_logo_url_snapshot = models.URLField(blank=True)
    cart_fingerprint = models.CharField(max_length=64, blank=True, db_index=True)
    issued_at = models.DateTimeField()
    due_at = models.DateTimeField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    voided_at = models.DateTimeField(null=True, blank=True)
    void_reason = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-issued_at", "-id")
        indexes = [
            models.Index(fields=("customer_user", "issued_at")),
            models.Index(fields=("document_type", "status", "issued_at")),
        ]


class InvoiceItem(models.Model):
    invoice = models.ForeignKey(Invoice, related_name="items", on_delete=models.CASCADE)
    product = models.ForeignKey(
        Product, null=True, blank=True, related_name="invoice_items", on_delete=models.SET_NULL
    )
    product_id_snapshot = models.CharField(max_length=50, blank=True)
    product_name_snapshot = models.CharField(max_length=255)
    product_sku_snapshot = models.CharField(max_length=100, blank=True)
    product_media_url = models.URLField(blank=True)
    trader_name_snapshot = models.CharField(max_length=255, blank=True)
    selected_specifications_snapshot = models.JSONField(default=list, blank=True)
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=14, decimal_places=2)
    line_discount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    line_total = models.DecimalField(max_digits=14, decimal_places=2)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ("sort_order", "id")


class InvoiceNumberSequence(models.Model):
    year = models.PositiveIntegerField()
    document_type = models.CharField(max_length=20, choices=Invoice.DocumentType.choices)
    last_number = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("year", "document_type"), name="unique_invoice_sequence_per_year_type"
            )
        ]

