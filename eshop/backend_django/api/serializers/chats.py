from django.db.models import Count, Q
from rest_framework import serializers

from api.models import OrderChat, OrderChatMessage


class OrderChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()

    class Meta:
        model = OrderChatMessage
        fields = ("id", "chat", "sender", "sender_name", "sender_role", "body",
                  "client_message_id", "created_at")
        read_only_fields = fields

    def get_sender_name(self, obj):
        return obj.sender.get_full_name() or obj.sender.get_username()


class OrderChatSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(source="order.order_number", read_only=True)
    order_status = serializers.CharField(source="order.status", read_only=True)
    customer_name = serializers.CharField(source="order.customer_full_name", read_only=True)
    customer_phone = serializers.CharField(source="order.customer_phone", read_only=True)
    assigned_admin_name = serializers.SerializerMethodField()
    latest_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = OrderChat
        fields = (
            "id", "order", "order_number", "order_status", "customer_name", "customer_phone",
            "status", "assigned_admin", "assigned_admin_name", "requested_at", "opened_at",
            "closed_at", "close_reason", "last_message_at", "latest_message", "unread_count",
            "created_at", "updated_at",
        )

    def get_assigned_admin_name(self, obj):
        if not obj.assigned_admin:
            return None
        return obj.assigned_admin.get_full_name() or obj.assigned_admin.get_username()

    def get_latest_message(self, obj):
        message = getattr(obj, "latest_message_obj", None)
        if message is None:
            message = obj.messages.order_by("-created_at", "-id").first()
        return OrderChatMessageSerializer(message).data if message else None

    def get_unread_count(self, obj):
        annotated = getattr(obj, "viewer_unread_count", None)
        if annotated is not None:
            return annotated
        user = self.context["request"].user
        participant = obj.participants.filter(user=user).first()
        return obj.messages.filter(
            Q(created_at__gt=participant.last_read_at) if participant and participant.last_read_at
            else Q()
        ).exclude(sender=user).count()


class MessageCreateSerializer(serializers.Serializer):
    body = serializers.CharField(max_length=2000, trim_whitespace=True)
    client_message_id = serializers.UUIDField()


class ChatCloseSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=500, required=False, allow_blank=True)

