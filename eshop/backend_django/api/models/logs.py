import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from .catalog import Product, ProductMedia
from .registration import TraderProfile


class UserActivityLog(models.Model):
    class Action(models.TextChoices):
        PRODUCT_VIEW = "product_view", "Product view"
        PRODUCT_OPEN = "product_open", "Product open"
        MEDIA_VIEW = "media_view", "Media view"
        MEDIA_PLAY = "media_play", "Media play"
        MEDIA_PAUSE = "media_pause", "Media pause"
        MEDIA_COMPLETE = "media_complete", "Media complete"
        IMAGE_ZOOM = "image_zoom", "Image zoom"
        LIKE = "like", "Like"
        UNLIKE = "unlike", "Unlike"
        BOOKMARK = "bookmark", "Bookmark"
        UNBOOKMARK = "unbookmark", "Unbookmark"
        ADD_TO_CART = "add_to_cart", "Add to cart"
        REMOVE_FROM_CART = "remove_from_cart", "Remove from cart"
        CART_QUANTITY_CHANGE = "cart_quantity_change", "Cart quantity change"
        RATING = "rating", "Rating"
        REVIEW = "review", "Review"
        SHARE = "share", "Share"
        SEARCH = "search", "Search"
        FILTER = "filter", "Filter"
        CATEGORY_OPEN = "category_open", "Category open"
        TRADER_OPEN = "trader_open", "Trader open"
        STORE_FOLLOW = "store_follow", "Store follow"
        STORE_UNFOLLOW = "store_unfollow", "Store unfollow"
        ORDER_REQUEST = "order_request", "Order request"
        ORDER_SUBMIT = "order_submit", "Order submit"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="user_activity_logs")
    username_snapshot = models.CharField(max_length=150, blank=True)
    session_key = models.CharField(max_length=100, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    device_type = models.CharField(max_length=50, blank=True)
    browser = models.CharField(max_length=100, blank=True)
    os = models.CharField(max_length=100, blank=True)
    action = models.CharField(max_length=30, choices=Action.choices)
    product = models.ForeignKey(Product, null=True, blank=True, on_delete=models.SET_NULL, related_name="activity_logs")
    product_media = models.ForeignKey(ProductMedia, null=True, blank=True, on_delete=models.SET_NULL, related_name="activity_logs")
    trader = models.ForeignKey(TraderProfile, null=True, blank=True, on_delete=models.SET_NULL, related_name="activity_logs")
    rating_value = models.PositiveSmallIntegerField(null=True, blank=True)
    search_query = models.CharField(max_length=255, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=("action",)),
            models.Index(fields=("product", "action")),
            models.Index(fields=("user", "created_at")),
            models.Index(fields=("ip_address",)),
            models.Index(fields=("created_at",)),
            models.Index(fields=("trader", "action")),
        ]

    def clean(self):
        if self.action == self.Action.RATING and (self.rating_value is None or not 1 <= self.rating_value <= 5):
            raise ValidationError({"rating_value": "Rating must be between 1 and 5."})

    def save(self, *args, **kwargs):
        if self.user and not self.username_snapshot:
            self.username_snapshot = self.user.get_username()
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.action} at {self.created_at}"


class AdminActivityLog(models.Model):
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="admin_activity_logs")
    actor_username = models.CharField(max_length=150, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    device_type = models.CharField(max_length=50, blank=True)
    browser = models.CharField(max_length=100, blank=True)
    os = models.CharField(max_length=100, blank=True)
    module = models.CharField(max_length=50)
    action = models.CharField(max_length=50)
    object_type = models.CharField(max_length=100, blank=True)
    object_id = models.CharField(max_length=100, blank=True)
    object_repr = models.CharField(max_length=255, blank=True)
    path = models.CharField(max_length=500, blank=True)
    method = models.CharField(max_length=10, blank=True)
    status_code = models.PositiveIntegerField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=("actor", "created_at")),
            models.Index(fields=("module", "action")),
            models.Index(fields=("object_type", "object_id")),
            models.Index(fields=("created_at",)),
        ]

    def save(self, *args, **kwargs):
        if self.actor and not self.actor_username:
            self.actor_username = self.actor.get_username()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.actor_username or 'system'} {self.module}.{self.action}"


class SystemRequestLog(models.Model):
    request_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="system_request_logs")
    username_snapshot = models.CharField(max_length=150, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    device_type = models.CharField(max_length=50, blank=True)
    browser = models.CharField(max_length=100, blank=True)
    os = models.CharField(max_length=100, blank=True)
    method = models.CharField(max_length=10)
    path = models.CharField(max_length=500)
    query_string = models.TextField(blank=True)
    view_name = models.CharField(max_length=255, blank=True)
    status_code = models.PositiveIntegerField(null=True, blank=True)
    duration_ms = models.PositiveIntegerField(null=True, blank=True)
    referer = models.TextField(blank=True)
    origin = models.TextField(blank=True)
    is_error = models.BooleanField(default=False)
    error_message = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=("created_at",)),
            models.Index(fields=("path",)),
            models.Index(fields=("status_code",)),
            models.Index(fields=("is_error",)),
            models.Index(fields=("user", "created_at")),
        ]

    def save(self, *args, **kwargs):
        if self.user and not self.username_snapshot:
            self.username_snapshot = self.user.get_username()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.method} {self.path} {self.status_code}"
