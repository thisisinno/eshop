from django.urls import path

from api.consumers import OrderChatConsumer, RealtimeConsumer

websocket_urlpatterns = [
    path("ws/realtime/", RealtimeConsumer.as_asgi()),
    path("ws/order-chats/<int:chat_id>/", OrderChatConsumer.as_asgi()),
]

