from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from .catalog import Product
from .registration import TraderBranch, TraderProfile


class Order(models.Model):
    class Source(models.TextChoices):
        ADMIN = "admin", "Admin"
        WEB_PWA = "web_pwa", "Web PWA"
        MOBILE_PWA = "mobile_pwa", "Mobile PWA"
        API = "api", "API"

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        REQUESTED = "requested", "Requested"
        CONFIRMED = "confirmed", "Confirmed"
        PROCESSING = "processing", "Processing"
        READY = "ready", "Ready"
        SHIPPED = "shipped", "Shipped"
        DELIVERED = "delivered", "Delivered"
        CANCELLED = "cancelled", "Cancelled"
        REJECTED = "rejected", "Rejected"

    class PaymentStatus(models.TextChoices):
        UNPAID = "unpaid", "Unpaid"
        PENDING = "pending", "Pending"
        PAID = "paid", "Paid"
        REFUNDED = "refunded", "Refunded"

    order_number = models.CharField(max_length=20, unique=True, editable=False)
    customer_user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="orders")
    customer_username = models.CharField(max_length=150, blank=True)
    customer_full_name = models.CharField(max_length=255)
    customer_phone = models.CharField(max_length=50)
    customer_email = models.EmailField(blank=True)
    customer_country = models.CharField(max_length=100, default="Tanzania")
    customer_region = models.CharField(max_length=100, blank=True)
    customer_district = models.CharField(max_length=100, blank=True)
    customer_ward = models.CharField(max_length=100, blank=True)
    customer_street = models.CharField(max_length=100, blank=True)
    customer_address = models.TextField(blank=True)
    delivery_note = models.TextField(blank=True)
    admin_note = models.TextField(blank=True)
    source = models.CharField(max_length=20, choices=Source.choices, default=Source.ADMIN)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.REQUESTED)
    payment_status = models.CharField(max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.UNPAID)
    currency = models.CharField(max_length=10, default="TZS")
    subtotal_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    discount_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    delivery_fee = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    items_count = models.PositiveIntegerField(default=0)
    total_quantity = models.PositiveIntegerField(default=0)
    requested_ip_address = models.GenericIPAddressField(null=True, blank=True)
    requested_user_agent = models.TextField(blank=True)
    requested_device = models.CharField(max_length=100, blank=True)
    requested_browser = models.CharField(max_length=100, blank=True)
    requested_os = models.CharField(max_length=100, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="created_orders")
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="updated_orders")
    confirmed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="confirmed_orders")
    confirmed_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=("order_number",)),
            models.Index(fields=("status",)),
            models.Index(fields=("customer_phone",)),
            models.Index(fields=("customer_email",)),
            models.Index(fields=("created_at",)),
            models.Index(fields=("source",)),
        ]
        permissions = [
            ("confirm_order", "Can confirm order"),
            ("cancel_order", "Can cancel order"),
            ("mark_order_delivered", "Can mark order delivered"),
        ]

    def save(self, *args, **kwargs):
        if self.customer_user and not self.customer_username:
            self.customer_username = self.customer_user.get_username()
        super().save(*args, **kwargs)

    def recalculate_totals(self):
        items = list(self.items.all())
        subtotal = sum((item.quantity * item.unit_price for item in items), Decimal("0.00"))
        discount = sum((item.line_discount for item in items), Decimal("0.00"))
        total = subtotal - discount + self.delivery_fee
        self.subtotal_amount = subtotal
        self.discount_amount = discount
        self.total_amount = max(total, Decimal("0.00"))
        self.items_count = len(items)
        self.total_quantity = sum(item.quantity for item in items)
        self.save(update_fields=["subtotal_amount", "discount_amount", "total_amount", "items_count", "total_quantity", "updated_at"])

    def __str__(self):
        return self.order_number


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, null=True, blank=True, on_delete=models.SET_NULL, related_name="order_items")
    product_media_url = models.URLField(blank=True)
    product_id_snapshot = models.CharField(max_length=50, blank=True)
    product_name_snapshot = models.CharField(max_length=255)
    product_sku_snapshot = models.CharField(max_length=100, blank=True)
    trader = models.ForeignKey(TraderProfile, null=True, blank=True, on_delete=models.SET_NULL)
    trader_name_snapshot = models.CharField(max_length=255, blank=True)
    branch = models.ForeignKey(TraderBranch, null=True, blank=True, on_delete=models.SET_NULL)
    branch_name_snapshot = models.CharField(max_length=255, blank=True)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=14, decimal_places=2)
    line_discount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    line_total = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    note = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("created_at", "id")

    def clean(self):
        if self.quantity < 1:
            raise ValidationError({"quantity": "Quantity must be at least 1."})
        gross = self.quantity * self.unit_price
        if self.line_discount > gross:
            raise ValidationError({"line_discount": "Line discount cannot exceed quantity times unit price."})

    def _snapshot_product(self):
        if not self.product:
            return
        self.product_id_snapshot = self.product.product_id
        self.product_name_snapshot = self.product.name
        self.product_sku_snapshot = self.product.sku
        self.trader = self.product.trader
        self.trader_name_snapshot = self.product.trader.business_name if self.product.trader else ""
        self.branch = self.product.branch
        self.branch_name_snapshot = self.product.branch.name if self.product.branch else ""
        if not self.unit_price:
            self.unit_price = self.product.price
        media = self.product.primary_media
        if media and media.file:
            try:
                self.product_media_url = media.file.url
            except Exception:
                self.product_media_url = media.file.name

    def save(self, *args, **kwargs):
        if self.product_id and (self._state.adding or "product" in kwargs.get("update_fields", []) or not self.product_name_snapshot):
            self._snapshot_product()
        self.line_total = max((self.quantity * self.unit_price) - self.line_discount, Decimal("0.00"))
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.order} - {self.product_name_snapshot}"


class OrderStatusHistory(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="status_history")
    from_status = models.CharField(max_length=20, blank=True)
    to_status = models.CharField(max_length=20)
    note = models.TextField(blank=True)
    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        verbose_name_plural = "Order status histories"

    def __str__(self):
        return f"{self.order} {self.from_status} -> {self.to_status}"


class OrderNumberSequence(models.Model):
    year = models.PositiveIntegerField(unique=True)
    last_number = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-year",)

    def __str__(self):
        return f"{self.year}: {self.last_number}"
