from rest_framework import serializers

from api.models import Product, ProductCategory, ProductMedia, TraderBranch


class ProductCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductCategory
        fields = "__all__"
        read_only_fields = ("slug", "created_at", "updated_at")


class ProductMediaSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    file_name = serializers.SerializerMethodField()
    file_extension = serializers.SerializerMethodField()
    is_image = serializers.SerializerMethodField()
    is_clip = serializers.SerializerMethodField()

    class Meta:
        model = ProductMedia
        fields = (
            "id", "product", "media_type", "file", "file_url", "file_name", "file_extension", "is_image", "is_clip",
            "title", "alt_text", "is_primary", "sort_order", "created_by", "created_at",
        )
        read_only_fields = ("product", "created_by", "created_at")

    def get_file_url(self, obj):
        if not obj.file:
            return None
        try:
            url = obj.file.url
        except Exception:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(url) if request and url.startswith("/") else url

    def get_file_name(self, obj):
        return obj.file.name.rsplit("/", 1)[-1] if obj.file else ""

    def get_file_extension(self, obj):
        return obj.file.name.rsplit(".", 1)[-1].lower() if obj.file and "." in obj.file.name else ""

    def get_is_image(self, obj):
        return obj.media_type == ProductMedia.MediaType.IMAGE

    def get_is_clip(self, obj):
        return obj.media_type == ProductMedia.MediaType.CLIP


class ProductSummarySerializer(serializers.ModelSerializer):
    primary_media_url = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ("id", "product_id", "name", "slug", "price", "currency", "status", "primary_media_url")

    def get_primary_media_url(self, obj):
        media = obj.primary_media
        return ProductMediaSerializer(media, context=self.context).data["file_url"] if media else None


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
        return ProductMediaSerializer(media, context=self.context).data["file_url"] if media else None

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
            "views_count", "sold_count", "media", "related_products", "created_by", "created_by_name", "updated_by", "updated_by_name",
        )

    def get_created_by_name(self, obj):
        return obj.created_by.get_username() if obj.created_by else None

    def get_updated_by_name(self, obj):
        return obj.updated_by.get_username() if obj.updated_by else None


class ProductWriteSerializer(serializers.ModelSerializer):
    related_products = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all(), many=True, required=False)

    class Meta:
        model = Product
        fields = (
            "id", "trader", "branch", "category", "name", "short_description", "description", "sku", "price",
            "compare_at_price", "cost_price", "currency", "stock_quantity", "minimum_order_quantity", "unit", "status",
            "is_featured", "is_discountable", "position", "related_products", "product_id", "slug", "created_by", "updated_by", "created_at", "updated_at",
        )
        read_only_fields = ("id", "product_id", "slug", "created_by", "updated_by", "created_at", "updated_at")

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
