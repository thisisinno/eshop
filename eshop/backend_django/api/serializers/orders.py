from rest_framework import serializers
from django.core.exceptions import ObjectDoesNotExist

from api.models import Order, OrderItem, OrderStatusHistory, Product
from api.services.orders import create_order, update_order


class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = OrderItem
        fields = (
            "id", "order", "product", "product_name", "product_media_url", "product_id_snapshot",
            "product_name_snapshot", "product_sku_snapshot", "trader", "trader_name_snapshot",
            "branch", "branch_name_snapshot", "quantity", "unit_price", "delivery_fee_snapshot", "line_discount",
            "line_total", "note", "created_at", "updated_at",
            "selected_specifications_snapshot",
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
            "quantity", "unit_price", "delivery_fee_snapshot", "line_discount", "note",
        )
        extra_kwargs = {
            "unit_price": {"required": False},
            "product_name_snapshot": {"required": False, "allow_blank": True},
        }

    def validate(self, attrs):
        product = attrs.get("product")
        if product and attrs.get("unit_price") is None:
            attrs["unit_price"] = product.price
        if product and attrs.get("delivery_fee_snapshot") is None:
            attrs["delivery_fee_snapshot"] = product.delivery_fee
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
    chat = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = (
            "id", "order_number", "customer_full_name", "customer_phone", "customer_email",
            "status", "payment_status", "source", "total_amount", "currency", "items_count",
            "total_quantity", "preview_items", "chat", "created_at", "updated_at",
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

    def get_chat(self, obj):
        chat_id = getattr(obj, "chat_summary_id", None)
        if not chat_id:
            return None
        return {
            "id": chat_id,
            "status": obj.chat_summary_status,
            "unread_count": obj.chat_unread_count,
            "latest_message_preview": obj.chat_latest_message or "",
            "latest_message_at": obj.chat_latest_message_at,
            "assigned_admin_name": obj.chat_assigned_admin_name or None,
        }


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


class CustomerOrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = (
            "id", "product", "product_media_url", "product_id_snapshot",
            "product_name_snapshot", "product_sku_snapshot", "trader_name_snapshot",
            "branch_name_snapshot", "quantity", "unit_price", "delivery_fee_snapshot",
            "line_discount", "line_total", "note", "selected_specifications_snapshot",
        )


def _person_name(user):
    return (user.get_full_name() or user.get_username()) if user else None


def build_order_journey(order):
    events = []

    def add(event_id, event_type, title, created_at, description="", actor=None,
            actor_role=None, metadata=None, tie=0):
        if not created_at:
            return
        events.append({
            "id": event_id, "event_type": event_type, "title": title,
            "description": description, "actor_name": _person_name(actor),
            "actor_role": actor_role, "created_at": created_at,
            "metadata": metadata or {}, "_tie": tie,
        })

    add(f"order-created-{order.pk}", "order_created", "Order submitted", order.created_at,
        f"Order {order.order_number} was submitted.", order.customer_user, "customer", tie=0)
    for history in order.status_history.all():
        add(f"status-{history.pk}", "order_status",
            f"Order {history.to_status.replace('_', ' ')}", history.created_at,
            history.note or f"Status changed from {history.from_status or 'created'} to {history.to_status}.",
            history.changed_by, "admin" if history.changed_by else "system",
            {"from_status": history.from_status, "to_status": history.to_status}, tie=10)
    add(f"payment-current-{order.pk}", "payment_status", "Current payment state",
        order.updated_at, f"Payment is {order.payment_status.replace('_', ' ')}.",
        actor_role="system", metadata={"payment_status": order.payment_status}, tie=90)

    try:
        chat = order.chat
    except ObjectDoesNotExist:
        chat = None
    if chat:
        add(f"chat-requested-{chat.pk}", "chat_requested", "Support chat requested",
            chat.requested_at, actor=order.customer_user, actor_role="customer", tie=20)
        add(f"chat-opened-{chat.pk}", "chat_opened", "Support chat opened",
            chat.opened_at, f"Assigned to {_person_name(chat.assigned_admin) or 'an administrator'}.",
            chat.opened_by or chat.assigned_admin, "admin", tie=30)
        for message in chat.messages.all():
            add(f"chat-message-{message.pk}", "chat_message",
                "Customer message" if message.sender_role == "customer" else "Administrator message",
                message.created_at, message.body, message.sender, message.sender_role, tie=40)
        add(f"chat-closed-{chat.pk}", "chat_closed", "Support chat closed",
            chat.closed_at, chat.close_reason or "Conversation closed.",
            chat.closed_by, "admin" if chat.closed_by else "system",
            {"close_reason": chat.close_reason}, tie=50)

    try:
        invoice = order.invoice
    except ObjectDoesNotExist:
        invoice = None
    if invoice:
        add(f"invoice-issued-{invoice.pk}", "invoice_issued", "Invoice issued",
            invoice.issued_at, f"Invoice {invoice.invoice_number} was issued.",
            actor_role="system", metadata={"invoice_number": invoice.invoice_number, "status": invoice.status}, tie=60)
        add(f"invoice-paid-{invoice.pk}", "invoice_paid", "Invoice paid",
            invoice.paid_at, f"Invoice {invoice.invoice_number} was paid.",
            actor_role="system", metadata={"invoice_number": invoice.invoice_number}, tie=70)
        add(f"invoice-voided-{invoice.pk}", "invoice_voided", "Invoice voided",
            invoice.voided_at, invoice.void_reason or f"Invoice {invoice.invoice_number} was voided.",
            actor_role="system", metadata={"invoice_number": invoice.invoice_number}, tie=70)
    events.sort(key=lambda event: (event["created_at"], event["_tie"], event["id"]))
    for event in events:
        event.pop("_tie", None)
    return events


class CustomerOrderDetailSerializer(serializers.ModelSerializer):
    items = CustomerOrderItemSerializer(many=True, read_only=True)
    status_history = OrderStatusHistorySerializer(many=True, read_only=True)
    chat_snapshot = serializers.SerializerMethodField()
    journey = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = (
            "id", "order_number", "customer_full_name", "customer_phone", "customer_email",
            "customer_country", "customer_region", "customer_district", "customer_ward",
            "customer_street", "customer_address", "delivery_note", "status", "payment_status",
            "currency", "subtotal_amount", "discount_amount", "delivery_fee", "total_amount",
            "items_count", "total_quantity", "created_at", "updated_at", "confirmed_at",
            "delivered_at", "cancelled_at", "items", "status_history", "chat_snapshot", "journey",
        )

    def get_chat_snapshot(self, obj):
        try:
            chat = obj.chat
        except ObjectDoesNotExist:
            return None
        return {
            "id": chat.id, "status": chat.status, "requested_at": chat.requested_at,
            "opened_at": chat.opened_at, "closed_at": chat.closed_at,
            "close_reason": chat.close_reason,
            "assigned_admin_name": _person_name(chat.assigned_admin),
        }

    def get_journey(self, obj):
        return build_order_journey(obj)


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
