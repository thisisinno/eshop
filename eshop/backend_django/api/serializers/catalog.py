import os
import json
from copy import copy
from urllib.parse import urljoin

from django.conf import settings
from django.db import transaction
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from api.models import BrandStatus, BrandStatusView, Product, ProductCategory, ProductMedia, ProductSpecificationGroup, ProductSpecificationOption, SiteBranding, TraderBranch
from api.services.products import get_product_approval_readiness, validate_product_activation


def django_validation_to_drf(exc):
    detail = exc.message_dict if hasattr(exc, "message_dict") else {"detail": exc.messages}
    return serializers.ValidationError(detail)


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

    def validate_parent(self, parent):
        if parent is None:
            return parent
        if self.instance and parent.pk == self.instance.pk:
            raise serializers.ValidationError("A category cannot be its own parent.")
        ancestor = parent
        visited = {self.instance.pk} if self.instance else set()
        while ancestor is not None:
            if ancestor.pk in visited:
                raise serializers.ValidationError(
                    "This parent would create a cycle in the category hierarchy."
                )
            visited.add(ancestor.pk)
            ancestor = ancestor.parent
        return parent


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
            "delivery_fee", "is_featured", "has_selectable_specifications", "has_discount", "discount_amount", "discount_percent", "primary_media_url", "media_count", "created_at", "updated_at",
        )

    def get_primary_media_url(self, obj):
        media = obj.primary_media
        return product_media_file_url(media.file, self.context.get("request")) if media else None

    def get_media_count(self, obj):
        return len(obj.media.all())


class SpecificationOptionSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)

    class Meta:
        model = ProductSpecificationOption
        fields = ("id", "value", "price_adjustment", "is_active", "display_order")


class SpecificationGroupSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)
    options = SpecificationOptionSerializer(many=True)

    class Meta:
        model = ProductSpecificationGroup
        fields = ("id", "name", "selection_mode", "is_required", "is_active", "display_order", "options")


class ProductDetailSerializer(ProductListSerializer):
    media = ProductMediaSerializer(many=True, read_only=True)
    related_products = ProductSummarySerializer(many=True, read_only=True)
    created_by_name = serializers.SerializerMethodField()
    updated_by_name = serializers.SerializerMethodField()
    specification_groups = SpecificationGroupSerializer(many=True, read_only=True)
    approval_readiness = serializers.SerializerMethodField()

    class Meta(ProductListSerializer.Meta):
        fields = ProductListSerializer.Meta.fields + (
            "short_description", "description", "cost_price", "minimum_order_quantity", "unit", "is_discountable",
            "specifications", "specification_groups", "view_360_enabled", "view_360_mode", "approval_readiness", "views_count", "sold_count", "media", "related_products", "created_by", "created_by_name", "updated_by", "updated_by_name",
        )

    def get_created_by_name(self, obj):
        return obj.created_by.get_username() if obj.created_by else None

    def get_updated_by_name(self, obj):
        return obj.updated_by.get_username() if obj.updated_by else None

    def get_approval_readiness(self, obj):
        return get_product_approval_readiness(obj)


class ProductWriteSerializer(serializers.ModelSerializer):
    related_products = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all(), many=True, required=False)
    sku = serializers.CharField(required=False, allow_blank=True, default="")
    specification_groups = serializers.JSONField(required=False)

    class Meta:
        model = Product
        fields = (
            "id", "trader", "branch", "category", "name", "short_description", "description", "sku", "price",
            "compare_at_price", "cost_price", "currency", "delivery_fee", "stock_quantity", "minimum_order_quantity", "unit", "status",
            "specifications", "has_selectable_specifications", "specification_groups", "view_360_enabled", "view_360_mode", "is_featured", "is_discountable", "position", "related_products", "product_id", "slug", "created_by", "updated_by", "created_at", "updated_at",
        )
        read_only_fields = ("id", "product_id", "slug", "created_by", "updated_by", "created_at", "updated_at")
        extra_kwargs = {
            "sku": {"required": False, "allow_blank": True},
            "short_description": {"required": False, "allow_blank": True},
            "description": {"required": False, "allow_blank": True},
            "currency": {"required": False},
            "unit": {"required": False, "allow_blank": True},
            "stock_quantity": {"required": False},
            "delivery_fee": {"required": False},
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
        delivery_fee = attrs.get("delivery_fee", getattr(self.instance, "delivery_fee", None))
        specifications = attrs.get("specifications", getattr(self.instance, "specifications", None))
        groups = attrs.get("specification_groups")
        if isinstance(groups, str):
            try:
                groups = json.loads(groups or "[]")
            except json.JSONDecodeError as exc:
                raise serializers.ValidationError({"specification_groups": "Selectable specifications must be valid JSON."}) from exc
            attrs["specification_groups"] = groups
        if groups is not None:
            nested = SpecificationGroupSerializer(data=groups, many=True)
            nested.is_valid(raise_exception=True)
            attrs["specification_groups"] = nested.validated_data
        if isinstance(specifications, str):
            try:
                specifications = json.loads(specifications or "{}")
            except json.JSONDecodeError as exc:
                raise serializers.ValidationError({"specifications": "Specifications must be valid JSON."}) from exc
            attrs["specifications"] = specifications
        if specifications is not None and not isinstance(specifications, dict):
            raise serializers.ValidationError({"specifications": "Specifications must be an object."})
        if branch and trader and branch.trader_id != trader.id:
            raise serializers.ValidationError({"branch": "The selected branch does not belong to the selected trader."})
        if compare_at_price is not None and price is not None and compare_at_price <= price:
            raise serializers.ValidationError({"compare_at_price": "Compare-at price must be greater than the current price."})
        if delivery_fee is not None and delivery_fee < 0:
            raise serializers.ValidationError({"delivery_fee": "Delivery fee cannot be negative."})
        return attrs

    def _save_groups(self, product, groups):
        retained_group_ids = []
        for group_data in groups:
            options = group_data.pop("options", [])
            group_id = group_data.pop("id", None)
            group = product.specification_groups.filter(pk=group_id).first() if group_id else None
            if group:
                for key, value in group_data.items():
                    setattr(group, key, value)
                group.save()
            else:
                group = ProductSpecificationGroup.objects.create(product=product, **group_data)
            retained_group_ids.append(group.id)
            retained_option_ids = []
            for option_data in options:
                option_id = option_data.pop("id", None)
                option = group.options.filter(pk=option_id).first() if option_id else None
                if option:
                    for key, value in option_data.items():
                        setattr(option, key, value)
                    option.save()
                else:
                    option = ProductSpecificationOption.objects.create(group=group, **option_data)
                retained_option_ids.append(option.id)
            group.options.exclude(pk__in=retained_option_ids).delete()
        product.specification_groups.exclude(pk__in=retained_group_ids).delete()

    def _activation_candidate(self, instance, validated_data):
        candidate = copy(instance)
        for field, value in validated_data.items():
            if field != "related_products":
                setattr(candidate, field, value)
        return candidate

    def _preflight_activation(self, instance, validated_data, groups):
        resulting_status = validated_data.get("status", instance.status)
        if resulting_status != Product.Status.ACTIVE:
            return
        candidate = self._activation_candidate(instance, validated_data)
        validate_product_activation(candidate, specification_groups=groups)

    def create(self, validated_data):
        groups = validated_data.pop("specification_groups", [])
        desired_status = validated_data.get("status", Product.Status.DRAFT)
        candidate = Product(**{
            key: value for key, value in validated_data.items()
            if key not in {"related_products", "status"}
        })
        candidate.status = desired_status
        try:
            if desired_status == Product.Status.ACTIVE:
                validate_product_activation(candidate, specification_groups=groups)
            with transaction.atomic():
                if desired_status == Product.Status.ACTIVE:
                    validated_data["status"] = Product.Status.DRAFT
                product = super().create(validated_data)
                self._save_groups(product, groups)
                if desired_status == Product.Status.ACTIVE:
                    validate_product_activation(product)
                    product.status = Product.Status.ACTIVE
                    product.save(update_fields=("status", "updated_at"))
                return product
        except DjangoValidationError as exc:
            raise django_validation_to_drf(exc) from exc

    def update(self, instance, validated_data):
        groups = validated_data.pop("specification_groups", None)
        desired_status = validated_data.get("status", instance.status)
        try:
            self._preflight_activation(instance, validated_data, groups)
            with transaction.atomic():
                write_data = dict(validated_data)
                if desired_status == Product.Status.ACTIVE:
                    write_data["status"] = (
                        instance.status
                        if instance.status != Product.Status.ACTIVE
                        else Product.Status.PENDING_REVIEW
                    )
                product = super().update(instance, write_data)
                if groups is not None:
                    self._save_groups(product, groups)
                if desired_status == Product.Status.ACTIVE:
                    validate_product_activation(product)
                    product.status = Product.Status.ACTIVE
                    product.save(update_fields=("status", "updated_at"))
                return product
        except DjangoValidationError as exc:
            try:
                instance.refresh_from_db()
            except Product.DoesNotExist:
                pass
            raise django_validation_to_drf(exc) from exc


class BrandStatusSerializer(serializers.ModelSerializer):
    media_url = serializers.SerializerMethodField()
    viewer_count = serializers.SerializerMethodField()
    total_views = serializers.SerializerMethodField()

    class Meta:
        model = BrandStatus
        fields = (
            "id", "media", "media_url", "media_type", "caption", "display_duration_seconds", "is_active",
            "starts_at", "expires_at", "sort_order", "viewer_count", "total_views", "created_by", "created_at", "updated_at",
        )
        read_only_fields = ("id", "media_url", "viewer_count", "total_views", "created_by", "created_at", "updated_at")
        extra_kwargs = {"media_type": {"required": False}, "expires_at": {"required": False}}

    def get_media_url(self, obj):
        return product_media_file_url(obj.media, self.context.get("request"))

    def get_viewer_count(self, obj):
        annotated = getattr(obj, "viewer_count", None)
        return annotated if annotated is not None else obj.views.count()

    def get_total_views(self, obj):
        annotated = getattr(obj, "total_views", None)
        return annotated if annotated is not None else sum(view.view_count for view in obj.views.all())


class BrandStatusViewSerializer(serializers.ModelSerializer):
    viewer_name = serializers.SerializerMethodField()
    viewer_type = serializers.SerializerMethodField()

    class Meta:
        model = BrandStatusView
        fields = ("id", "viewer_name", "viewer_type", "first_viewed_at", "last_viewed_at", "view_count")

    def get_viewer_name(self, obj):
        if obj.user_id:
            full_name = obj.user.get_full_name().strip()
            return full_name or obj.user.get_username()
        return "Anonymous viewer"

    def get_viewer_type(self, obj):
        return "user" if obj.user_id else "anonymous"


class SiteBrandingSerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = SiteBranding
        fields = ("site_name", "logo", "logo_url", "logo_alt_text", "updated_by", "created_at", "updated_at")
        read_only_fields = ("logo_url", "updated_by", "created_at", "updated_at")

    def get_logo_url(self, obj):
        return product_media_file_url(obj.logo, self.context.get("request"))
