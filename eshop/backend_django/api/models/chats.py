import uuid

from django.conf import settings
from django.db import models

from .orders import Order


class OrderChat(models.Model):
    class Status(models.TextChoices):
        REQUESTED = "requested", "Requested"
        OPEN = "open", "Open"
        CLOSED = "closed", "Closed"

    order = models.OneToOneField(Order, related_name="chat", on_delete=models.CASCADE)
    customer_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, related_name="order_chats", on_delete=models.PROTECT
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.REQUESTED)
    assigned_admin = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        related_name="assigned_order_chats", on_delete=models.SET_NULL,
    )
    requested_at = models.DateTimeField()
    opened_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    opened_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        related_name="opened_order_chats", on_delete=models.SET_NULL,
    )
    closed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        related_name="closed_order_chats", on_delete=models.SET_NULL,
    )
    close_reason = models.CharField(max_length=500, blank=True)
    last_message_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-last_message_at", "-requested_at", "-id")
        indexes = [
            models.Index(fields=("status", "last_message_at")),
            models.Index(fields=("assigned_admin", "status")),
            models.Index(fields=("customer_user", "status")),
        ]
        permissions = [("close_orderchat", "Can close order chat")]

    def __str__(self):
        return f"{self.order.order_number} ({self.status})"


class OrderChatMessage(models.Model):
    class SenderRole(models.TextChoices):
        CUSTOMER = "customer", "Customer"
        ADMIN = "admin", "Admin"
        SYSTEM = "system", "System"

    chat = models.ForeignKey(OrderChat, related_name="messages", on_delete=models.CASCADE)
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    sender_role = models.CharField(max_length=20, choices=SenderRole.choices)
    body = models.TextField(max_length=2000)
    client_message_id = models.UUIDField(default=uuid.uuid4)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("created_at", "id")
        constraints = [
            models.UniqueConstraint(
                fields=("chat", "sender", "client_message_id"),
                name="unique_order_chat_sender_message",
            )
        ]
        indexes = [models.Index(fields=("chat", "created_at"))]

    def __str__(self):
        return f"{self.chat_id}:{self.id}"


class OrderChatParticipant(models.Model):
    class Role(models.TextChoices):
        CUSTOMER = "customer", "Customer"
        ADMIN = "admin", "Admin"

    chat = models.ForeignKey(OrderChat, related_name="participants", on_delete=models.CASCADE)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, related_name="order_chat_participations", on_delete=models.CASCADE
    )
    role = models.CharField(max_length=20, choices=Role.choices)
    last_read_message = models.ForeignKey(
        OrderChatMessage, null=True, blank=True, related_name="+", on_delete=models.SET_NULL
    )
    last_read_at = models.DateTimeField(null=True, blank=True)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=("chat", "user"), name="unique_order_chat_participant")
        ]
        indexes = [models.Index(fields=("user", "chat"))]

