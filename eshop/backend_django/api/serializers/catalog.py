import os
from urllib.parse import urljoin

from django.conf import settings
from rest_framework import serializers

from api.models import Product, ProductCategory, ProductMedia, TraderBranch


def product_media_file_url(file, request=None):
    if not file:
        return None
    try:
        url = file.url
    except Exception:
        url = ""
    if url.startswith(("http://", "https://")):
        return url
    if url.startswith("/") and request:
        return request.build_absolute_uri(url)

    path = url or getattr(file, "name", "")
    if not path:
        return None
    media_url = getattr(settings, "MEDIA_URL", "/media/")
    if media_url.startswith(("http://", "https://")):
        return urljoin(media_url.rstrip("/") + "/", path.lstrip("/"))
    return request.build_absolute_uri(path if path.startswith("/") else urljoin(media_url, path)) if request else urljoin(media_url, path)


class ProductCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductCategory
        fields = "__all__"
        read_only_fields = ("slug", "created_at", "updated_at")


class ProductMediaSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    file_key = serializers.SerializerMethodField()
    storage_key = serializers.SerializerMethodField()
    file_name = serializers.SerializerMethodField()
    file_extension = serializers.SerializerMethodField()
    is_image = serializers.SerializerMethodField()
    is_clip = serializers.SerializerMethodField()

    class Meta:
        model = ProductMedia
        fields = (
            "id", "product", "media_type", "file", "file_url", "file_key", "storage_key", "file_name", "file_extension", "is_image", "is_clip",
            "title", "alt_text", "caption", "is_primary", "sort_order", "frame_index", "edit_metadata", "mime_type", "file_size", "created_by", "created_at",
        )
        read_only_fields = ("product", "file_key", "storage_key", "created_by", "created_at")

    def validate(self, attrs):
        file = attrs.get("file", getattr(self.instance, "file", None))
        media_type = attrs.get("media_type", getattr(self.instance, "media_type", None))
        if not file:
            return attrs

        filename = getattr(file, "name", "")
        extension = os.path.splitext(filename)[1].lower()
        if extension in ProductMedia.IMAGE_EXTENSIONS:
            detected_media_type = ProductMedia.MediaType.IMAGE
        elif extension in ProductMedia.CLIP_EXTENSIONS:
            detected_media_type = ProductMedia.MediaType.CLIP
        elif extension in ProductMedia.MODEL_EXTENSIONS:
            detected_media_type = ProductMedia.MediaType.MODEL_3D
        else:
            allowed = sorted(ProductMedia.IMAGE_EXTENSIONS | ProductMedia.CLIP_EXTENSIONS | ProductMedia.MODEL_EXTENSIONS)
            raise serializers.ValidationError({
                "file": f"{filename}: unsupported format. Allowed: {', '.join(allowed)}."
            })

        image_like = {ProductMedia.MediaType.IMAGE, ProductMedia.MediaType.POSTER, ProductMedia.MediaType.SPIN_FRAME}
        is_valid_image_alias = detected_media_type == ProductMedia.MediaType.IMAGE and media_type in image_like
        if media_type and media_type != detected_media_type and not is_valid_image_alias:
            raise serializers.ValidationError({
                "media_type": f"{filename}: media_type must be {detected_media_type} for {extension} files."
            })
        attrs["media_type"] = media_type or detected_media_type
        return attrs

    def get_file_url(self, obj):
        return product_media_file_url(obj.file, self.context.get("request"))

    def get_file_key(self, obj):
        return obj.file.name if obj.file else ""

    def get_storage_key(self, obj):
        return self.get_file_key(obj)

    def get_file_name(self, obj):
        return obj.file.name.rsplit("/", 1)[-1] if obj.file else ""

    def get_file_extension(self, obj):
        return obj.file.name.rsplit(".", 1)[-1].lower() if obj.file and "." in obj.file.name else ""

    def get_is_image(self, obj):
        return obj.media_type in (ProductMedia.MediaType.IMAGE, ProductMedia.MediaType.POSTER, ProductMedia.MediaType.SPIN_FRAME)

    def get_is_clip(self, obj):
        return obj.media_type == ProductMedia.MediaType.CLIP


class ProductSummarySerializer(serializers.ModelSerializer):
    primary_media_url = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ("id", "product_id", "name", "slug", "price", "currency", "status", "primary_media_url")

    def get_primary_media_url(self, obj):
        media = obj.primary_media
        return product_media_file_url(media.file, self.context.get("request")) if media else None


class ProductListSerializer(serializers.ModelSerializer):
    trader_name = serializers.CharField(source="trader.business_name", read_only=True)
    branch_name = serializers.CharField(source="branch.name", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    has_discount = serializers.ReadOnlyField()
    discount_amount = serializers.ReadOnlyField()
    discount_percent = serializers.ReadOnlyField()
    primary_media_url = serializers.SerializerMethodField()
    media_count = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            "id", "product_id", "trader", "trader_name", "branch", "branch_name", "category", "category_name",
            "name", "slug", "sku", "price", "compare_at_price", "currency", "stock_quantity", "position", "status",
            "is_featured", "has_discount", "discount_amount", "discount_percent", "primary_media_url", "media_count", "created_at", "updated_at",
        )

    def get_primary_media_url(self, obj):
        media = obj.primary_media
        return product_media_file_url(media.file, self.context.get("request")) if media else None

    def get_media_count(self, obj):
        return len(obj.media.all())


class ProductDetailSerializer(ProductListSerializer):
    media = ProductMediaSerializer(many=True, read_only=True)
    related_products = ProductSummarySerializer(many=True, read_only=True)
    created_by_name = serializers.SerializerMethodField()
    updated_by_name = serializers.SerializerMethodField()

    class Meta(ProductListSerializer.Meta):
        fields = ProductListSerializer.Meta.fields + (
            "short_description", "description", "cost_price", "minimum_order_quantity", "unit", "is_discountable",
            "specifications", "view_360_enabled", "view_360_mode", "views_count", "sold_count", "media", "related_products", "created_by", "created_by_name", "updated_by", "updated_by_name",
        )

    def get_created_by_name(self, obj):
        return obj.created_by.get_username() if obj.created_by else None

    def get_updated_by_name(self, obj):
        return obj.updated_by.get_username() if obj.updated_by else None


class ProductWriteSerializer(serializers.ModelSerializer):
    related_products = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all(), many=True, required=False)
    sku = serializers.CharField(required=False, allow_blank=True, default="")

    class Meta:
        model = Product
        fields = (
            "id", "trader", "branch", "category", "name", "short_description", "description", "sku", "price",
            "compare_at_price", "cost_price", "currency", "stock_quantity", "minimum_order_quantity", "unit", "status",
            "specifications", "view_360_enabled", "view_360_mode", "is_featured", "is_discountable", "position", "related_products", "product_id", "slug", "created_by", "updated_by", "created_at", "updated_at",
        )
        read_only_fields = ("id", "product_id", "slug", "created_by", "updated_by", "created_at", "updated_at")
        extra_kwargs = {
            "sku": {"required": False, "allow_blank": True},
            "short_description": {"required": False, "allow_blank": True},
            "description": {"required": False, "allow_blank": True},
            "currency": {"required": False},
            "unit": {"required": False, "allow_blank": True},
            "stock_quantity": {"required": False},
            "minimum_order_quantity": {"required": False},
            "specifications": {"required": False},
            "view_360_enabled": {"required": False},
            "view_360_mode": {"required": False},
        }

    def validate(self, attrs):
        trader = attrs.get("trader", getattr(self.instance, "trader", None))
        branch = attrs.get("branch", getattr(self.instance, "branch", None))
        price = attrs.get("price", getattr(self.instance, "price", None))
        compare_at_price = attrs.get("compare_at_price", getattr(self.instance, "compare_at_price", None))
        if branch and trader and branch.trader_id != trader.id:
            raise serializers.ValidationError({"branch": "The selected branch does not belong to the selected trader."})
        if compare_at_price is not None and price is not None and compare_at_price <= price:
            raise serializers.ValidationError({"compare_at_price": "Compare-at price must be greater than the current price."})
        return attrs
