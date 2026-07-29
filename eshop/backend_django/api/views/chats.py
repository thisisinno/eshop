from django.db.models import OuterRef, Prefetch, Q, Subquery
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.pagination import CursorPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import OrderChat, OrderChatMessage, OrderChatParticipant
from api.serializers.chats import (
    ChatCloseSerializer, MessageCreateSerializer, OrderChatMessageSerializer, OrderChatSerializer,
)
from api.services.chats import (
    can_admin_chat, close_chat, create_message, join_chat, mark_chat_read, reopen_chat, request_chat,
)


def customer_order(request, order_id):
    return get_object_or_404(request.user.orders.all(), pk=order_id)


def customer_chat(request, order_id):
    return get_object_or_404(
        OrderChat.objects.select_related("order", "assigned_admin"),
        order_id=order_id, customer_user=request.user,
    )


class CustomerChatAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, order_id):
        order = customer_order(request, order_id)
        chat = OrderChat.objects.select_related("order", "assigned_admin").filter(order=order).first()
        return Response(OrderChatSerializer(chat, context={"request": request}).data if chat else None)


class CustomerChatRequestAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, order_id):
        chat, created = request_chat(customer_order(request, order_id))
        return Response(OrderChatSerializer(chat, context={"request": request}).data,
                        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class CustomerChatReopenAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, order_id):
        chat = reopen_chat(customer_chat(request, order_id), request.user)
        return Response(OrderChatSerializer(chat, context={"request": request}).data)


class MessageCursorPagination(CursorPagination):
    page_size = 50
    ordering = "-created_at"


class CustomerChatMessagesAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, order_id):
        chat = customer_chat(request, order_id)
        paginator = MessageCursorPagination()
        page = paginator.paginate_queryset(chat.messages.select_related("sender"), request)
        # Cursor pages are newest-first; return each page chronologically for rendering.
        return paginator.get_paginated_response(OrderChatMessageSerializer(
            list(reversed(page)), many=True
        ).data)

    def post(self, request, order_id):
        chat = customer_chat(request, order_id)
        serializer = MessageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message, created = create_message(chat, request.user, **serializer.validated_data)
        return Response(OrderChatMessageSerializer(message).data,
                        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class CustomerChatReadAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, order_id):
        chat = customer_chat(request, order_id)
        message_id = request.data.get("message_id")
        message = get_object_or_404(chat.messages, pk=message_id) if message_id else None
        mark_chat_read(chat, request.user, message)
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminChatsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not can_admin_chat(request.user):
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        queryset = OrderChat.objects.select_related("order", "customer_user", "assigned_admin")
        state = request.query_params.get("state", "unresolved")
        if state == "unresolved":
            queryset = queryset.exclude(status=OrderChat.Status.CLOSED)
        elif state in OrderChat.Status.values:
            queryset = queryset.filter(status=state)
        latest = OrderChatMessage.objects.filter(chat=OuterRef("pk")).order_by("-created_at", "-id")
        queryset = queryset.annotate(latest_message_body=Subquery(latest.values("body")[:1]))
        return Response(OrderChatSerializer(queryset, many=True, context={"request": request}).data)


class AdminChatDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, chat_id):
        if not can_admin_chat(request.user):
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        chat = get_object_or_404(OrderChat.objects.select_related("order", "assigned_admin"), pk=chat_id)
        return Response(OrderChatSerializer(chat, context={"request": request}).data)


class AdminChatJoinAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, chat_id):
        return Response(OrderChatSerializer(
            join_chat(chat_id, request.user), context={"request": request}
        ).data)


class AdminChatMessagesAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def _chat(self, request, chat_id):
        if not can_admin_chat(request.user):
            return None
        return get_object_or_404(OrderChat, pk=chat_id)

    def get(self, request, chat_id):
        chat = self._chat(request, chat_id)
        if chat is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        paginator = MessageCursorPagination()
        page = paginator.paginate_queryset(chat.messages.select_related("sender"), request)
        return paginator.get_paginated_response(
            OrderChatMessageSerializer(list(reversed(page)), many=True).data
        )

    def post(self, request, chat_id):
        chat = self._chat(request, chat_id)
        if chat is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = MessageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message, created = create_message(chat, request.user, **serializer.validated_data)
        return Response(OrderChatMessageSerializer(message).data,
                        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class AdminChatReadAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, chat_id):
        if not can_admin_chat(request.user):
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        chat = get_object_or_404(OrderChat, pk=chat_id)
        message_id = request.data.get("message_id")
        message = get_object_or_404(chat.messages, pk=message_id) if message_id else None
        mark_chat_read(chat, request.user, message)
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminChatCloseAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, chat_id):
        serializer = ChatCloseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        chat = close_chat(chat_id, request.user, serializer.validated_data.get("reason", ""))
        return Response(OrderChatSerializer(chat, context={"request": request}).data)

