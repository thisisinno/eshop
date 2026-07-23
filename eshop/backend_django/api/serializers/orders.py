from rest_framework import serializers

from api.models import Order, OrderItem, OrderStatusHistory, Product
from api.services.orders import create_order, update_order


class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = OrderItem
        fields = (
            "id", "order", "product", "product_name", "product_media_url", "product_id_snapshot",
            "product_name_snapshot", "product_sku_snapshot", "trader", "trader_name_snapshot",
            "branch", "branch_name_snapshot", "quantity", "unit_price", "line_discount",
            "line_total", "note", "created_at", "updated_at",
        )
        read_only_fields = ("order", "line_total", "created_at", "updated_at")


class OrderItemWriteSerializer(serializers.ModelSerializer):
    product = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all(), required=False, allow_null=True)
    id = serializers.IntegerField(required=False)

    class Meta:
        model = OrderItem
        fields = (
            "id", "product", "product_media_url", "product_id_snapshot", "product_name_snapshot",
            "product_sku_snapshot", "trader", "trader_name_snapshot", "branch", "branch_name_snapshot",
            "quantity", "unit_price", "line_discount", "note",
        )
        extra_kwargs = {
            "unit_price": {"required": False},
            "product_name_snapshot": {"required": False, "allow_blank": True},
        }

    def validate(self, attrs):
        product = attrs.get("product")
        if product and attrs.get("unit_price") is None:
            attrs["unit_price"] = product.price
        if not product and not attrs.get("product_name_snapshot"):
            raise serializers.ValidationError({"product_name_snapshot": "Provide a product or product name snapshot."})
        if attrs.get("quantity", 1) < 1:
            raise serializers.ValidationError({"quantity": "Quantity must be at least 1."})
        unit_price = attrs.get("unit_price")
        if unit_price is None:
            raise serializers.ValidationError({"unit_price": "This field is required."})
        discount = attrs.get("line_discount", 0)
        if discount > attrs.get("quantity", 1) * unit_price:
            raise serializers.ValidationError({"line_discount": "Line discount cannot exceed quantity times unit price."})
        return attrs


class OrderStatusHistorySerializer(serializers.ModelSerializer):
    changed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = OrderStatusHistory
        fields = ("id", "from_status", "to_status", "note", "changed_by", "changed_by_name", "created_at")

    def get_changed_by_name(self, obj):
        return obj.changed_by.get_username() if obj.changed_by else None


class OrderListSerializer(serializers.ModelSerializer):
    preview_items = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = (
            "id", "order_number", "customer_full_name", "customer_phone", "customer_email",
            "status", "payment_status", "source", "total_amount", "currency", "items_count",
            "total_quantity", "preview_items", "created_at", "updated_at",
        )

    def get_preview_items(self, obj):
        items = list(obj.items.all())[:3]
        return [
            {
                "product_name": item.product_name_snapshot,
                "product_media_url": item.product_media_url,
                "quantity": item.quantity,
            }
            for item in items
        ]


class OrderDetailSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    status_history = OrderStatusHistorySerializer(many=True, read_only=True)
    created_by_name = serializers.SerializerMethodField()
    updated_by_name = serializers.SerializerMethodField()
    confirmed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = "__all__"

    def get_created_by_name(self, obj):
        return obj.created_by.get_username() if obj.created_by else None

    def get_updated_by_name(self, obj):
        return obj.updated_by.get_username() if obj.updated_by else None

    def get_confirmed_by_name(self, obj):
        return obj.confirmed_by.get_username() if obj.confirmed_by else None


class OrderWriteSerializer(serializers.ModelSerializer):
    items = OrderItemWriteSerializer(many=True, required=False)
    allow_price_override = serializers.BooleanField(required=False, write_only=True, default=False)

    class Meta:
        model = Order
        fields = (
            "customer_user", "customer_username", "customer_full_name", "customer_phone", "customer_email",
            "customer_country", "customer_region", "customer_district", "customer_ward", "customer_street",
            "customer_address", "delivery_note", "admin_note", "source", "status", "payment_status",
            "currency", "delivery_fee", "requested_ip_address", "requested_user_agent",
            "requested_device", "requested_browser", "requested_os", "allow_price_override", "items",
        )

    def create(self, validated_data):
        items = validated_data.pop("items", [])
        user = self.context.get("user")
        request = self.context.get("request")
        return create_order(validated_data, items, user=user, request=request)

    def update(self, instance, validated_data):
        items = validated_data.pop("items", None)
        user = self.context.get("user")
        request = self.context.get("request")
        return update_order(instance, validated_data, items=items, user=user, request=request)
