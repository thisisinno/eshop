from decimal import Decimal

from django.db import transaction
from rest_framework import serializers

from api.models import BrandStatus, Cart, CartItem, Order, OrderItem, Product, ProductBookmark, ProductCategory, ProductMedia, SiteBranding, StoreFollow, TraderProfile, UserActivityLog, UserNotification
from api.serializers.catalog import product_media_file_url
from api.services.orders import next_order_number
from api.utils.request_meta import request_meta_snapshot


def file_url(file, request=None):
    return product_media_file_url(file, request) if file else None


class PublicCategorySerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = ProductCategory
        fields = ("id", "name", "slug", "description", "icon", "image_url", "display_order", "is_featured")

    def get_image_url(self, obj):
        return file_url(obj.image, self.context.get("request"))


class PublicMediaSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = ProductMedia
        fields = ("id", "media_type", "url", "title", "alt_text", "caption", "is_primary", "sort_order", "frame_index", "edit_metadata", "mime_type", "file_size")

    def get_url(self, obj):
        return file_url(obj.file, self.context.get("request"))


class PublicStoreSummarySerializer(serializers.ModelSerializer):
    follower_count = serializers.IntegerField(read_only=True, default=0)
    product_count = serializers.IntegerField(read_only=True, default=0)
    is_following = serializers.BooleanField(read_only=True, default=False)
    logo_url = serializers.SerializerMethodField()
    cover_url = serializers.SerializerMethodField()
    location_summary = serializers.SerializerMethodField()

    class Meta:
        model = TraderProfile
        fields = (
            "id", "business_name", "slug", "trader_type", "logo_url", "cover_url", "is_verified", "is_featured",
            "follower_count", "product_count", "is_following", "region", "district", "location_summary",
        )

    def get_logo_url(self, obj):
        return file_url(obj.logo, self.context.get("request"))

    def get_cover_url(self, obj):
        return file_url(obj.cover_image, self.context.get("request"))

    def get_location_summary(self, obj):
        return ", ".join(part for part in (obj.region, obj.district, obj.country) if part)


class PublicStoreDetailSerializer(PublicStoreSummarySerializer):
    categories = serializers.SerializerMethodField()

    class Meta(PublicStoreSummarySerializer.Meta):
        fields = PublicStoreSummarySerializer.Meta.fields + ("phone", "email", "address_description", "categories")

    def get_categories(self, obj):
        categories = ProductCategory.objects.filter(products__trader=obj, products__status=Product.Status.ACTIVE, products__trader__status=TraderProfile.Status.APPROVED, is_active=True).distinct()
        return PublicCategorySerializer(categories, many=True, context=self.context).data


class PublicProductCardSerializer(serializers.ModelSerializer):
    store = PublicStoreSummarySerializer(source="trader", read_only=True)
    category = PublicCategorySerializer(read_only=True)
    primary_media_url = serializers.SerializerMethodField()
    has_discount = serializers.ReadOnlyField()
    discount_percent = serializers.ReadOnlyField()
    is_bookmarked = serializers.BooleanField(read_only=True, default=False)

    class Meta:
        model = Product
        fields = (
            "id", "product_id", "name", "slug", "short_description", "price", "compare_at_price", "currency",
            "delivery_fee", "stock_quantity", "minimum_order_quantity", "unit", "has_discount", "discount_percent",
            "views_count", "sold_count", "primary_media_url", "store", "category", "is_bookmarked", "created_at",
        )

    def get_primary_media_url(self, obj):
        media = obj.primary_media
        return file_url(media.file, self.context.get("request")) if media else None


class PublicProductDetailSerializer(PublicProductCardSerializer):
    related_products = PublicProductCardSerializer(many=True, read_only=True)
    media = serializers.SerializerMethodField()
    viewer_360 = serializers.SerializerMethodField()

    class Meta(PublicProductCardSerializer.Meta):
        fields = PublicProductCardSerializer.Meta.fields + ("description", "specifications", "view_360_enabled", "view_360_mode", "media", "viewer_360", "related_products")

    def get_media(self, obj):
        media = list(obj.media.all())
        gallery = [item for item in media if item.media_type in (ProductMedia.MediaType.IMAGE, ProductMedia.MediaType.POSTER)]
        videos = [item for item in media if item.media_type == ProductMedia.MediaType.CLIP]
        return {
            "gallery": PublicMediaSerializer(gallery, many=True, context=self.context).data,
            "videos": PublicMediaSerializer(videos, many=True, context=self.context).data,
        }

    def get_viewer_360(self, obj):
        media = list(obj.media.all())
        if obj.view_360_mode == Product.Viewer360Mode.MODEL:
            model = next((item for item in media if item.media_type == ProductMedia.MediaType.MODEL_3D), None)
            poster = next((item for item in media if item.media_type == ProductMedia.MediaType.POSTER), None) or obj.primary_media
            return {
                "enabled": obj.view_360_enabled,
                "ready": bool(obj.view_360_enabled and model),
                "mode": "model",
                "model_url": file_url(model.file, self.context.get("request")) if model else None,
                "poster_url": file_url(poster.file, self.context.get("request")) if poster else None,
            }
        frames = sorted([item for item in media if item.media_type == ProductMedia.MediaType.SPIN_FRAME], key=lambda item: (item.frame_index if item.frame_index is not None else item.sort_order, item.id))
        return {
            "enabled": obj.view_360_enabled,
            "ready": bool(obj.view_360_enabled and len(frames) >= ProductMedia.MIN_SPIN_FRAME_COUNT),
            "mode": "spin",
            "minimum_frame_count": ProductMedia.MIN_SPIN_FRAME_COUNT,
            "frames": PublicMediaSerializer(frames, many=True, context=self.context).data,
        }


class CartItemSerializer(serializers.ModelSerializer):
    product = PublicProductCardSerializer(read_only=True)
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = ("id", "product", "quantity", "line_total", "created_at", "updated_at")

    def get_line_total(self, obj):
        return obj.product.price * obj.quantity


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    subtotal = serializers.SerializerMethodField()
    delivery_fee = serializers.SerializerMethodField()
    grand_total = serializers.SerializerMethodField()
    total_quantity = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ("id", "items", "subtotal", "delivery_fee", "grand_total", "total_quantity", "updated_at")

    def get_subtotal(self, obj):
        return cart_subtotal(obj.items.all())

    def get_delivery_fee(self, obj):
        return cart_delivery_fee(obj.items.all())

    def get_grand_total(self, obj):
        items = obj.items.all()
        return cart_subtotal(items) + cart_delivery_fee(items)

    def get_total_quantity(self, obj):
        return sum(item.quantity for item in obj.items.all())


class CartItemWriteSerializer(serializers.Serializer):
    product = serializers.PrimaryKeyRelatedField(queryset=Product.objects.select_related("trader").all())
    quantity = serializers.IntegerField(min_value=1)

    def validate(self, attrs):
        product = attrs["product"]
        quantity = attrs["quantity"]
        if product.status != Product.Status.ACTIVE:
            raise serializers.ValidationError({"product": [f"{product.name} is no longer available."]})
        if not product.trader_id or product.trader.status != TraderProfile.Status.APPROVED:
            raise serializers.ValidationError({"product": [f"{product.name} is no longer available."]})
        if product.stock_quantity <= 0:
            raise serializers.ValidationError({"quantity": [f"{product.name} is currently out of stock."]})
        if quantity < product.minimum_order_quantity:
            raise serializers.ValidationError({"quantity": [f"Minimum order quantity for {product.name} is {product.minimum_order_quantity}."]})
        if product.stock_quantity < product.minimum_order_quantity:
            raise serializers.ValidationError({"quantity": [f"{product.name} is currently unavailable."]})
        if quantity > product.stock_quantity:
            raise serializers.ValidationError({"quantity": [f"Only {product.stock_quantity} units are currently available."]})
        return attrs


def cart_subtotal(items):
    return sum((item.product.price * item.quantity for item in items), Decimal("0.00"))


def cart_delivery_fee(items):
    product_ids = set()
    total = Decimal("0.00")
    for item in items:
        if item.product_id in product_ids:
            continue
        product_ids.add(item.product_id)
        total += item.product.delivery_fee
    return total


class BrandStatusPublicSerializer(serializers.ModelSerializer):
    media_url = serializers.SerializerMethodField()

    class Meta:
        model = BrandStatus
        fields = ("id", "media_url", "media_type", "caption", "display_duration_seconds", "starts_at", "expires_at", "sort_order", "updated_at")

    def get_media_url(self, obj):
        return file_url(obj.media, self.context.get("request"))


class SiteBrandingPublicSerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()
    statuses = serializers.SerializerMethodField()

    class Meta:
        model = SiteBranding
        fields = ("site_name", "logo_url", "logo_alt_text", "statuses", "updated_at")

    def get_logo_url(self, obj):
        return file_url(obj.logo, self.context.get("request"))

    def get_statuses(self, obj):
        return BrandStatusPublicSerializer(BrandStatus.active_public(), many=True, context=self.context).data


class NotificationOrderSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ("id", "order_number", "status", "payment_status", "total_amount", "currency", "items_count", "total_quantity")


class NotificationActivitySerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    trader_name = serializers.CharField(source="trader.business_name", read_only=True)

    class Meta:
        model = UserActivityLog
        fields = ("id", "action", "product_name", "trader_name", "metadata", "created_at")


class UserNotificationSerializer(serializers.ModelSerializer):
    order = NotificationOrderSummarySerializer(read_only=True)
    product = PublicProductCardSerializer(read_only=True)
    store = PublicStoreSummarySerializer(source="trader", read_only=True)
    activity = NotificationActivitySerializer(source="activity_log", read_only=True)

    class Meta:
        model = UserNotification
        fields = (
            "id", "notification_type", "title", "message", "lifecycle_state", "is_read", "read_at",
            "order", "product", "store", "activity", "metadata", "created_at", "updated_at", "completed_at",
        )


class CustomerOrderCreateSerializer(serializers.Serializer):
    customer_full_name = serializers.CharField(max_length=255)
    customer_phone = serializers.CharField(max_length=50)
    customer_email = serializers.EmailField(required=False, allow_blank=True)
    customer_country = serializers.CharField(max_length=100, required=False, default="Tanzania")
    customer_region = serializers.CharField(max_length=100, required=False, allow_blank=True)
    customer_district = serializers.CharField(max_length=100, required=False, allow_blank=True)
    customer_ward = serializers.CharField(max_length=100, required=False, allow_blank=True)
    customer_street = serializers.CharField(max_length=100, required=False, allow_blank=True)
    customer_address = serializers.CharField(required=False, allow_blank=True)
    delivery_note = serializers.CharField(required=False, allow_blank=True)

    def create(self, validated_data):
        request = self.context["request"]
        cart = Cart.objects.prefetch_related("items__product__trader", "items__product__branch", "items__product__media").get(user=request.user)
        items = list(cart.items.all())
        if not items:
            raise serializers.ValidationError({"cart": "Cart is empty."})
        for item in items:
            product = item.product
            if product.status != Product.Status.ACTIVE or product.trader.status != TraderProfile.Status.APPROVED:
                raise serializers.ValidationError({"cart": f"{product.name} is no longer available."})
            if item.quantity < product.minimum_order_quantity:
                raise serializers.ValidationError({"cart": f"{product.name} minimum order quantity is {product.minimum_order_quantity}."})
            if item.quantity > product.stock_quantity:
                raise serializers.ValidationError({"cart": f"{product.name} does not have enough stock."})
        meta = request_meta_snapshot(request)
        with transaction.atomic():
            delivery_fee = cart_delivery_fee(items)
            order = Order.objects.create(
                order_number=next_order_number(),
                customer_user=request.user,
                customer_full_name=validated_data["customer_full_name"],
                customer_phone=validated_data["customer_phone"],
                customer_email=validated_data.get("customer_email", request.user.email or ""),
                customer_country=validated_data.get("customer_country", "Tanzania"),
                customer_region=validated_data.get("customer_region", ""),
                customer_district=validated_data.get("customer_district", ""),
                customer_ward=validated_data.get("customer_ward", ""),
                customer_street=validated_data.get("customer_street", ""),
                customer_address=validated_data.get("customer_address", ""),
                delivery_note=validated_data.get("delivery_note", ""),
                source=Order.Source.WEB_PWA,
                status=Order.Status.REQUESTED,
                payment_status=Order.PaymentStatus.UNPAID,
                delivery_fee=delivery_fee,
                requested_ip_address=meta["ip_address"],
                requested_user_agent=meta["user_agent"],
                requested_device=meta["device_type"],
                requested_browser=meta["browser"],
                requested_os=meta["os"],
                created_by=request.user,
                updated_by=request.user,
            )
            for item in items:
                OrderItem.objects.create(order=order, product=item.product, quantity=item.quantity, unit_price=item.product.price)
            order.recalculate_totals()
            cart.items.all().delete()
        return order
