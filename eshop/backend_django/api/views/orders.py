from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import Order
from api.permissions import HasModulePermission
from api.serializers import OrderDetailSerializer, OrderListSerializer, OrderWriteSerializer
from api.utils.request_meta import request_meta_snapshot
from api.views.logs import record_admin_activity


def order_queryset():
    return Order.objects.select_related("customer_user", "created_by", "updated_by", "confirmed_by").prefetch_related(
        "items__product", "items__trader", "items__branch", "status_history__changed_by"
    )


class PermissionedOrdersAPIView(APIView):
    permission_classes = [HasModulePermission]
    parser_classes = [JSONParser, FormParser, MultiPartParser]
    permission_map = {}

    def initial(self, request, *args, **kwargs):
        self.permission_required = self.permission_map.get(request.method, "")
        super().initial(request, *args, **kwargs)


class OrdersAPIView(PermissionedOrdersAPIView):
    permission_map = {"GET": "api.view_order", "POST": "api.add_order"}

    def get(self, request):
        queryset = order_queryset()
        if search := request.query_params.get("search"):
            queryset = queryset.filter(
                Q(order_number__icontains=search) | Q(customer_full_name__icontains=search)
                | Q(customer_phone__icontains=search) | Q(customer_email__icontains=search)
                | Q(items__product_name_snapshot__icontains=search)
            ).distinct()
        for field in ("status", "payment_status", "source"):
            if value := request.query_params.get(field):
                queryset = queryset.filter(**{field: value})
        if date_from := request.query_params.get("date_from"):
            queryset = queryset.filter(created_at__date__gte=date_from)
        if date_to := request.query_params.get("date_to"):
            queryset = queryset.filter(created_at__date__lte=date_to)
        if product := request.query_params.get("product"):
            queryset = queryset.filter(items__product_id=product)
        if trader := request.query_params.get("trader"):
            queryset = queryset.filter(items__trader_id=trader)
        return Response(OrderListSerializer(queryset.distinct(), many=True, context={"request": request}).data)

    def post(self, request):
        data = request.data.copy()
        meta = request_meta_snapshot(request)
        data.setdefault("requested_ip_address", meta["ip_address"])
        data.setdefault("requested_user_agent", meta["user_agent"])
        data.setdefault("requested_device", meta["device_type"])
        data.setdefault("requested_browser", meta["browser"])
        data.setdefault("requested_os", meta["os"])
        serializer = OrderWriteSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        order = serializer.save(created_by=request.user, updated_by=request.user)
        record_admin_activity(request, "orders", "create", order, status.HTTP_201_CREATED)
        return Response(OrderDetailSerializer(order_queryset().get(pk=order.pk), context={"request": request}).data, status=status.HTTP_201_CREATED)


class OrderDetailAPIView(PermissionedOrdersAPIView):
    permission_map = {"GET": "api.view_order", "PUT": "api.change_order", "PATCH": "api.change_order", "DELETE": "api.delete_order"}

    def get_object(self, pk):
        return get_object_or_404(order_queryset(), pk=pk)

    def get(self, request, pk):
        return Response(OrderDetailSerializer(self.get_object(pk), context={"request": request}).data)

    def put(self, request, pk):
        return self.update(request, pk)

    def patch(self, request, pk):
        return self.update(request, pk, partial=True)

    def update(self, request, pk, partial=False):
        serializer = OrderWriteSerializer(self.get_object(pk), data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        order = serializer.save(updated_by=request.user)
        record_admin_activity(request, "orders", "update", order, status.HTTP_200_OK)
        return Response(OrderDetailSerializer(order_queryset().get(pk=order.pk), context={"request": request}).data)

    def delete(self, request, pk):
        order = self.get_object(pk)
        record_admin_activity(request, "orders", "delete", order, status.HTTP_204_NO_CONTENT)
        order.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class OrderActionAPIView(PermissionedOrdersAPIView):
    action_permissions = {
        "confirm": "api.confirm_order",
        "process": "api.change_order",
        "ready": "api.change_order",
        "ship": "api.change_order",
        "deliver": "api.mark_order_delivered",
        "cancel": "api.cancel_order",
        "reject": "api.cancel_order",
    }
    action_statuses = {
        "confirm": Order.Status.CONFIRMED,
        "process": Order.Status.PROCESSING,
        "ready": Order.Status.READY,
        "ship": Order.Status.SHIPPED,
        "deliver": Order.Status.DELIVERED,
        "cancel": Order.Status.CANCELLED,
        "reject": Order.Status.REJECTED,
    }

    def initial(self, request, *args, **kwargs):
        self.permission_required = self.action_permissions.get(kwargs.get("action"), "")
        APIView.initial(self, request, *args, **kwargs)

    def patch(self, request, pk, action):
        if action not in self.action_permissions:
            return Response({"detail": "Unknown action."}, status=status.HTTP_404_NOT_FOUND)
        order = get_object_or_404(order_queryset(), pk=pk)
        now = timezone.now()
        order.status = self.action_statuses[action]
        order.updated_by = request.user
        order._status_changed_by = request.user
        order._status_change_note = request.data.get("note", "")
        if action == "confirm":
            order.confirmed_by = request.user
            order.confirmed_at = now
        elif action == "deliver":
            order.delivered_at = now
        elif action in ("cancel", "reject"):
            order.cancelled_at = now
        order.save()
        record_admin_activity(request, "orders", action, order, status.HTTP_200_OK)
        return Response(OrderDetailSerializer(order_queryset().get(pk=order.pk), context={"request": request}).data)
