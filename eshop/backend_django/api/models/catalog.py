import os
import uuid
from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.db.models import Q
from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone
from django.utils.text import slugify

from .registration import TraderBranch, TraderProfile


def product_media_upload_path(instance, filename):
    """Keep S3 objects grouped by product and use non-guessable filenames."""
    extension = os.path.splitext(filename)[1].lower()
    folder = "images" if instance.media_type == ProductMedia.MediaType.IMAGE else "clips"
    safe_product_id = slugify(instance.product.product_id.replace("#", "")) or str(instance.product_id)
    trader_part = f"trader-{instance.product.trader_id}"
    return f"products/{trader_part}/{safe_product_id}/{folder}/{uuid.uuid4().hex}{extension}"


class ProductCategory(models.Model):
    name = models.CharField(max_length=150)
    slug = models.SlugField(max_length=170, unique=True, blank=True)
    parent = models.ForeignKey("self", null=True, blank=True, on_delete=models.SET_NULL, related_name="children")
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("name",)

    def save(self, *args, **kwargs):
        base_slug = slugify(self.name) or "category"
        candidate, suffix = base_slug, 2
        while ProductCategory.objects.exclude(pk=self.pk).filter(slug=candidate).exists():
            candidate = f"{base_slug}-{suffix}"
            suffix += 1
        self.slug = candidate
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Product(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PENDING_REVIEW = "pending_review", "Pending review"
        ACTIVE = "active", "Active"
        REJECTED = "rejected", "Rejected"
        OUT_OF_STOCK = "out_of_stock", "Out of stock"
        ARCHIVED = "archived", "Archived"

    product_id = models.CharField(max_length=30, unique=True, editable=False)
    trader = models.ForeignKey(TraderProfile, on_delete=models.CASCADE, related_name="products")
    branch = models.ForeignKey(TraderBranch, null=True, blank=True, on_delete=models.SET_NULL, related_name="products")
    category = models.ForeignKey(ProductCategory, null=True, blank=True, on_delete=models.SET_NULL, related_name="products")
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=280, blank=True)
    short_description = models.CharField(max_length=500, blank=True)
    description = models.TextField(blank=True)
    sku = models.CharField(max_length=100, blank=True)
    price = models.DecimalField(max_digits=14, decimal_places=2)
    compare_at_price = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    cost_price = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=10, default="TZS")
    stock_quantity = models.PositiveIntegerField(default=0)
    minimum_order_quantity = models.PositiveIntegerField(default=1)
    unit = models.CharField(max_length=50, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    is_featured = models.BooleanField(default=False)
    is_discountable = models.BooleanField(default=True)
    position = models.PositiveIntegerField(null=True, blank=True)
    views_count = models.PositiveIntegerField(default=0)
    sold_count = models.PositiveIntegerField(default=0)
    related_products = models.ManyToManyField("self", blank=True, symmetrical=False, related_name="related_to")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="created_products")
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="updated_products")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("position", "-created_at")
        constraints = [
            models.UniqueConstraint(fields=("trader", "slug"), name="unique_product_slug_per_trader"),
            models.UniqueConstraint(fields=("trader", "sku"), condition=~Q(sku=""), name="unique_product_sku_per_trader"),
        ]
        indexes = [
            models.Index(fields=("trader", "status")), models.Index(fields=("category", "status")),
            models.Index(fields=("product_id",)), models.Index(fields=("slug",)), models.Index(fields=("position",)),
        ]
        permissions = [
            ("approve_product", "Can approve product"),
            ("feature_product", "Can feature product"),
            ("archive_product", "Can archive product"),
        ]

    def clean(self):
        errors = {}
        if self.compare_at_price is not None and self.compare_at_price <= self.price:
            errors["compare_at_price"] = "Compare-at price must be greater than the current price."
        if self.branch_id and self.trader_id and self.branch.trader_id != self.trader_id:
            errors["branch"] = "The selected branch does not belong to the selected trader."
        if errors:
            raise ValidationError(errors)

    def _set_slug(self):
        base_slug = slugify(self.name) or "product"
        candidate, suffix = base_slug, 2
        queryset = Product.objects.exclude(pk=self.pk).filter(trader_id=self.trader_id)
        while queryset.filter(slug=candidate).exists():
            candidate = f"{base_slug}-{suffix}"
            suffix += 1
        self.slug = candidate

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        self.clean()
        with transaction.atomic():
            if not self.slug or (not is_new and self.name != Product.objects.get(pk=self.pk).name):
                self._set_slug()
            if is_new:
                # Lock the sequence lookup so concurrent creators receive different IDs.
                year = timezone.now().year
                last = Product.objects.select_for_update().filter(product_id__startswith=f"PRD-{year}-").order_by("-product_id").first()
                sequence = int(last.product_id.rsplit("-", 1)[1]) + 1 if last else 1
                self.product_id = f"PRD-{year}-{sequence:06d}"
                if self.position is None:
                    last_position = Product.objects.select_for_update().filter(trader_id=self.trader_id).order_by("-position").values_list("position", flat=True).first()
                    self.position = (last_position or 0) + 1
            super().save(*args, **kwargs)

    @property
    def has_discount(self):
        return bool(self.is_discountable and self.compare_at_price and self.compare_at_price > self.price)

    @property
    def discount_amount(self):
        return self.compare_at_price - self.price if self.has_discount else Decimal("0.00")

    @property
    def discount_percent(self):
        return round((self.discount_amount / self.compare_at_price) * 100, 2) if self.has_discount else Decimal("0.00")

    @property
    def primary_media(self):
        media = list(self.media.all()) if hasattr(self, "media") else []
        images = [item for item in media if item.media_type == ProductMedia.MediaType.IMAGE]
        return next((item for item in images if item.is_primary), None) or (images[0] if images else None)

    def __str__(self):
        return f"{self.product_id} - {self.name}"


class ProductMedia(models.Model):
    class MediaType(models.TextChoices):
        IMAGE = "image", "Image"
        CLIP = "clip", "Clip"

    IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
    CLIP_EXTENSIONS = {".mp4", ".mov", ".webm"}

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="media")
    media_type = models.CharField(max_length=10, choices=MediaType.choices)
    file = models.FileField(upload_to=product_media_upload_path)
    title = models.CharField(max_length=255, blank=True)
    alt_text = models.CharField(max_length=255, blank=True)
    is_primary = models.BooleanField(default=False)
    sort_order = models.PositiveIntegerField(default=0)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="created_product_media")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("sort_order", "created_at")
        constraints = [models.UniqueConstraint(fields=("product",), condition=Q(is_primary=True), name="one_primary_media_per_product")]

    def clean(self):
        extension = os.path.splitext(self.file.name)[1].lower()
        valid = self.IMAGE_EXTENSIONS if self.media_type == self.MediaType.IMAGE else self.CLIP_EXTENSIONS
        if extension not in valid:
            raise ValidationError({"file": f"Unsupported {self.media_type} format. Allowed: {', '.join(sorted(valid))}."})

    def save(self, *args, **kwargs):
        self.clean()
        with transaction.atomic():
            if self.is_primary:
                ProductMedia.objects.filter(product=self.product, is_primary=True).exclude(pk=self.pk).update(is_primary=False)
            super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.product} - {self.media_type}"


@receiver(post_delete, sender=ProductMedia)
def delete_product_media_file(sender, instance, **kwargs):
    """Django cascade deletion emits this signal, so S3 objects are removed too."""
    if instance.file and instance.file.name:
        try:
            instance.file.storage.delete(instance.file.name)
        except Exception:
            pass


@receiver(pre_save, sender=ProductMedia)
def remember_replaced_product_media_file(sender, instance, **kwargs):
    if not instance.pk:
        return
    try:
        old_file = ProductMedia.objects.only("file").get(pk=instance.pk).file
    except ProductMedia.DoesNotExist:
        return
    old_name = old_file.name if old_file else ""
    new_name = instance.file.name if instance.file else ""
    instance._old_file_name = old_name if old_name and old_name != new_name else ""


@receiver(post_save, sender=ProductMedia)
def delete_replaced_product_media_file(sender, instance, **kwargs):
    old_name = getattr(instance, "_old_file_name", "")
    if not old_name:
        return
    try:
        instance.file.storage.delete(old_name)
    except Exception:
        pass
