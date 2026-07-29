from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from api.models import OrderChat, OrderChatMessage, OrderChatParticipant, UserNotification
from .realtime import ADMIN_INBOX_GROUP, broadcast_after_commit, chat_group, customer_group


def can_admin_chat(user):
    return bool(
        user and user.is_authenticated and (
            user.is_superuser
            or user.has_perm("api.view_orderchat")
            or user.has_perm("api.change_orderchat")
        )
    )


def message_payload(message):
    return {
        "id": message.id,
        "chat_id": message.chat_id,
        "sender_id": message.sender_id,
        "sender_name": message.sender.get_full_name() or message.sender.get_username(),
        "sender_role": message.sender_role,
        "body": message.body,
        "client_message_id": str(message.client_message_id),
        "created_at": message.created_at.isoformat(),
    }


@transaction.atomic
def request_chat(order):
    if not order.customer_user_id:
        raise ValidationError({"order": "Only registered customer orders support chat."})
    now = timezone.now()
    chat, created = OrderChat.objects.get_or_create(
        order=order,
        defaults={"customer_user": order.customer_user, "requested_at": now},
    )
    if not created and chat.status == OrderChat.Status.CLOSED:
        raise ValidationError({"chat": "Use the reopen action for a closed chat."})
    OrderChatParticipant.objects.get_or_create(
        chat=chat, user=order.customer_user,
        defaults={"role": OrderChatParticipant.Role.CUSTOMER},
    )
    event = {"type": "chat.summary.updated", "version": 1, "chat_id": chat.id,
             "order_id": order.id, "status": chat.status}
    broadcast_after_commit([ADMIN_INBOX_GROUP, customer_group(order.customer_user_id)], event)
    return chat, created


@transaction.atomic
def reopen_chat(chat, user):
    chat = OrderChat.objects.select_for_update().get(pk=chat.pk)
    if chat.customer_user_id != user.id:
        raise PermissionDenied()
    if chat.status != OrderChat.Status.CLOSED:
        raise ValidationError({"chat": "Only a closed chat can be reopened."})
    now = timezone.now()
    chat.status = OrderChat.Status.REQUESTED
    chat.requested_at = now
    chat.assigned_admin = None
    chat.opened_at = None
    chat.opened_by = None
    chat.closed_at = None
    chat.closed_by = None
    chat.close_reason = ""
    chat.save()
    broadcast_after_commit(
        [ADMIN_INBOX_GROUP, chat_group(chat.id), customer_group(user.id)],
        {"type": "chat.status.changed", "version": 1, "chat_id": chat.id,
         "order_id": chat.order_id, "status": chat.status},
    )
    return chat


@transaction.atomic
def join_chat(chat_id, admin):
    if not can_admin_chat(admin):
        raise PermissionDenied()
    chat = OrderChat.objects.select_for_update().get(pk=chat_id)
    if chat.status == OrderChat.Status.CLOSED:
        raise ValidationError({"chat": "This chat is closed."})
    if chat.assigned_admin_id and chat.assigned_admin_id != admin.id:
        raise ValidationError({
            "assigned_admin": f"Already assigned to {chat.assigned_admin.get_username()}."
        })
    now = timezone.now()
    chat.assigned_admin = admin
    if chat.status == OrderChat.Status.REQUESTED:
        chat.status = OrderChat.Status.OPEN
        chat.opened_at = now
        chat.opened_by = admin
    chat.save()
    OrderChatParticipant.objects.get_or_create(
        chat=chat, user=admin, defaults={"role": OrderChatParticipant.Role.ADMIN}
    )
    broadcast_after_commit(
        [ADMIN_INBOX_GROUP, chat_group(chat.id), customer_group(chat.customer_user_id)],
        {"type": "chat.assignment.changed", "version": 1, "chat_id": chat.id,
         "order_id": chat.order_id, "status": chat.status, "assigned_admin_id": admin.id,
         "assigned_admin_name": admin.get_full_name() or admin.get_username()},
    )
    return chat


@transaction.atomic
def create_message(chat, sender, body, client_message_id):
    body = (body or "").strip()
    if not body:
        raise ValidationError({"body": "Message cannot be empty."})
    if len(body) > 2000:
        raise ValidationError({"body": "Message cannot exceed 2,000 characters."})
    chat = OrderChat.objects.select_for_update().select_related("order").get(pk=chat.pk)
    is_customer = sender.id == chat.customer_user_id
    if not is_customer and not can_admin_chat(sender):
        raise PermissionDenied()
    if chat.status == OrderChat.Status.CLOSED:
        raise ValidationError({"chat": "This chat is closed."})
    role = OrderChatMessage.SenderRole.CUSTOMER if is_customer else OrderChatMessage.SenderRole.ADMIN
    message, created = OrderChatMessage.objects.get_or_create(
        chat=chat, sender=sender, client_message_id=client_message_id,
        defaults={"sender_role": role, "body": body},
    )
    if not created:
        if message.body != body:
            raise ValidationError({"client_message_id": "This message ID was already used."})
        return message, False
    chat.last_message_at = message.created_at
    chat.save(update_fields=("last_message_at", "updated_at"))
    recipient_ids = []
    if is_customer:
        recipient_ids = list(
            get_user_model().objects.filter(is_active=True).filter(
                is_superuser=True
            ).values_list("id", flat=True)
        )
        if chat.assigned_admin_id:
            recipient_ids = [chat.assigned_admin_id]
    else:
        recipient_ids = [chat.customer_user_id]
    for recipient_id in recipient_ids:
        notification = UserNotification.objects.filter(
            recipient_id=recipient_id, notification_type=UserNotification.NotificationType.CHAT,
            metadata__chat_id=chat.id, is_read=False,
        ).first()
        defaults = {
            "title": f"Order chat {chat.order.order_number}",
            "message": body[:240],
            "order": chat.order,
            "metadata": {"chat_id": chat.id, "order_id": chat.order_id,
                         "admin": bool(is_customer), "action": f"/chats/{chat.id}" if is_customer else f"/orders/{chat.order_id}/chat"},
        }
        if notification:
            for key, value in defaults.items():
                setattr(notification, key, value)
            notification.save()
        else:
            UserNotification.objects.create(recipient_id=recipient_id,
                                            notification_type=UserNotification.NotificationType.CHAT,
                                            **defaults)
    payload = {"type": "chat.message.created", "version": 1, "message": message_payload(message),
               "order_id": chat.order_id}
    groups = [chat_group(chat.id), ADMIN_INBOX_GROUP]
    groups.extend(customer_group(user_id) for user_id in recipient_ids)
    broadcast_after_commit(groups, payload)
    return message, True


@transaction.atomic
def mark_chat_read(chat, user, message=None):
    participant, _ = OrderChatParticipant.objects.get_or_create(
        chat=chat, user=user,
        defaults={"role": OrderChatParticipant.Role.CUSTOMER
                  if user.id == chat.customer_user_id else OrderChatParticipant.Role.ADMIN},
    )
    if message is None:
        message = chat.messages.order_by("-created_at", "-id").first()
    participant.last_read_message = message
    participant.last_read_at = timezone.now()
    participant.save(update_fields=("last_read_message", "last_read_at"))
    UserNotification.objects.filter(
        recipient=user, notification_type=UserNotification.NotificationType.CHAT,
        metadata__chat_id=chat.id, is_read=False,
    ).update(is_read=True, read_at=timezone.now(), updated_at=timezone.now())
    broadcast_after_commit(
        [chat_group(chat.id), ADMIN_INBOX_GROUP, customer_group(chat.customer_user_id)],
        {"type": "chat.message.read", "version": 1, "chat_id": chat.id,
         "user_id": user.id, "message_id": message.id if message else None},
    )
    return participant


@transaction.atomic
def close_chat(chat_id, admin, reason=""):
    if not (can_admin_chat(admin) and
            (admin.is_superuser or admin.has_perm("api.close_orderchat"))):
        raise PermissionDenied()
    chat = OrderChat.objects.select_for_update().get(pk=chat_id)
    chat.status = OrderChat.Status.CLOSED
    chat.closed_at = timezone.now()
    chat.closed_by = admin
    chat.close_reason = (reason or "").strip()[:500]
    chat.save()
    broadcast_after_commit(
        [chat_group(chat.id), ADMIN_INBOX_GROUP, customer_group(chat.customer_user_id)],
        {"type": "chat.status.changed", "version": 1, "chat_id": chat.id,
         "order_id": chat.order_id, "status": chat.status, "close_reason": chat.close_reason},
    )
    return chat
