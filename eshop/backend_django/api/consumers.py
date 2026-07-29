from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from api.models import OrderChat
from api.services.chats import can_admin_chat
from api.services.realtime import ADMIN_INBOX_GROUP, chat_group, customer_group


@database_sync_to_async
def room_allowed(user, chat_id):
    chat = OrderChat.objects.filter(pk=chat_id).first()
    return bool(chat and (chat.customer_user_id == user.id or can_admin_chat(user)))


class RealtimeConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        ticket = self.scope["ticket"]
        user = self.scope["user"]
        if ticket["scope"] == "customer_realtime":
            self.group_name = customer_group(user.id)
        elif ticket["scope"] == "admin_realtime" and await database_sync_to_async(can_admin_chat)(user):
            self.group_name = ADMIN_INBOX_GROUP
        else:
            await self.close(code=4403)
            return
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def realtime_event(self, event):
        await self.send_json(event["event"])


class OrderChatConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.chat_id = int(self.scope["url_route"]["kwargs"]["chat_id"])
        ticket = self.scope["ticket"]
        if (
            ticket["scope"] != "order_chat"
            or int(ticket.get("chat_id", -1)) != self.chat_id
            or not await room_allowed(self.scope["user"], self.chat_id)
        ):
            await self.close(code=4403)
            return
        self.group_name = chat_group(self.chat_id)
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def receive_json(self, content, **kwargs):
        # Only ephemeral typing events are accepted over WS; messages persist through REST.
        event_type = content.get("type")
        if event_type not in {"chat.typing.started", "chat.typing.stopped"}:
            return
        await self.channel_layer.group_send(self.group_name, {
            "type": "realtime.event",
            "event": {"type": event_type, "version": 1, "chat_id": self.chat_id,
                      "user_id": self.scope["user"].id},
        })

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def realtime_event(self, event):
        await self.send_json(event["event"])

