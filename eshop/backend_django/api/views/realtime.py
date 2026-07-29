from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import OrderChat
from api.realtime_auth import TICKET_MAX_AGE, issue_ticket
from api.services.chats import can_admin_chat


class RealtimeTicketAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        scope_name = request.data.get("scope")
        chat_id = request.data.get("chat_id")
        if scope_name == "customer_realtime":
            if chat_id is not None:
                return Response({"chat_id": "Not valid for this scope."}, status=400)
        elif scope_name == "admin_realtime":
            if not can_admin_chat(request.user):
                return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
            if chat_id is not None:
                return Response({"chat_id": "Not valid for this scope."}, status=400)
        elif scope_name == "order_chat":
            chat = get_object_or_404(OrderChat, pk=chat_id)
            if chat.customer_user_id != request.user.id and not can_admin_chat(request.user):
                return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({"scope": "Invalid realtime scope."}, status=400)
        return Response({
            "ticket": issue_ticket(request.user, scope_name, chat_id),
            "expires_in": TICKET_MAX_AGE,
            "path": f"/ws/order-chats/{chat_id}/" if scope_name == "order_chat" else "/ws/realtime/",
        })

