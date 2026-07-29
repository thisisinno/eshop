import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction

logger = logging.getLogger(__name__)


def customer_group(user_id):
    return f"customer_user_{user_id}"


def chat_group(chat_id):
    return f"order_chat_{chat_id}"


ADMIN_INBOX_GROUP = "admin_chat_inbox"


def _send(group, event):
    try:
        async_to_sync(get_channel_layer().group_send)(
            group, {"type": "realtime.event", "event": event}
        )
    except Exception:
        # Persistence is authoritative. A channel-layer outage must never roll back a message.
        logger.exception("Realtime broadcast failed for group %s", group)


def broadcast_after_commit(groups, event):
    transaction.on_commit(lambda: [_send(group, event) for group in set(groups)])

