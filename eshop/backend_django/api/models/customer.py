from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from .catalog import Product
from .registration import TraderProfile


class StoreFollow(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="store_follows")
    trader = models.ForeignKey(TraderProfile, on_delete=models.CASCADE, related_name="followers")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        constraints = [models.UniqueConstraint(fields=("user", "trader"), name="unique_store_follow")]
        indexes = [models.Index(fields=("trader", "created_at")), models.Index(fields=("user", "created_at"))]

    def __str__(self):
        return f"{self.user} follows {self.trader}"


class ProductBookmark(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="product_bookmarks")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="bookmarks")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        constraints = [models.UniqueConstraint(fields=("user", "product"), name="unique_product_bookmark")]
        indexes = [models.Index(fields=("product", "created_at")), models.Index(fields=("user", "created_at"))]

    def __str__(self):
        return f"{self.user} bookmarked {self.product}"


class Cart(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="cart")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Cart for {self.user}"


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="cart_items")
    quantity = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("created_at", "id")
        constraints = [models.UniqueConstraint(fields=("cart", "product"), name="unique_cart_product")]

    def clean(self):
        if self.quantity < 1:
            raise ValidationError({"quantity": "Quantity must be at least 1."})
        minimum = self.product.minimum_order_quantity if self.product_id else 1
        if self.quantity < minimum:
            raise ValidationError({"quantity": f"Minimum order quantity is {minimum}."})
        if self.product_id and self.quantity > self.product.stock_quantity:
            raise ValidationError({"quantity": "Requested quantity exceeds available stock."})

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.quantity} x {self.product}"
