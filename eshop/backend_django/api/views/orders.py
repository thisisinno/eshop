from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import Order
from api.permissions import HasModulePermission
from api.serializers import OrderDetailSerializer, OrderListSerializer, OrderWriteSerializer
from api.services.orders import ACTION_STATUS, transition_order
from api.utils.request_meta import request_meta_snapshot


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
        if phone := request.query_params.get("customer_phone"):
            queryset = queryset.filter(customer_phone__icontains=phone)
        if email := request.query_params.get("customer_email"):
            queryset = queryset.filter(customer_email__icontains=email)
        if product or trader or search:
            queryset = queryset.distinct()
        queryset = queryset.order_by("-created_at", "-id")
        return Response(OrderListSerializer(queryset, many=True, context={"request": request}).data)

    def post(self, request):
        data = request.data.copy()
        meta = request_meta_snapshot(request)
        data.setdefault("requested_ip_address", meta["ip_address"])
        data.setdefault("requested_user_agent", meta["user_agent"])
        data.setdefault("requested_device", meta["device_type"])
        data.setdefault("requested_browser", meta["browser"])
        data.setdefault("requested_os", meta["os"])
        serializer = OrderWriteSerializer(data=data, context={"request": request, "user": request.user})
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
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
        serializer = OrderWriteSerializer(self.get_object(pk), data=request.data, partial=partial, context={"request": request, "user": request.user})
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        return Response(OrderDetailSerializer(order_queryset().get(pk=order.pk), context={"request": request}).data)

    def delete(self, request, pk):
        order = self.get_object(pk)
        from api.services.orders import record_order_activity
        record_order_activity(request, "delete", order, status.HTTP_204_NO_CONTENT)
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
    def initial(self, request, *args, **kwargs):
        self.permission_required = self.action_permissions.get(kwargs.get("action"), "")
        APIView.initial(self, request, *args, **kwargs)

    def patch(self, request, pk, action):
        if action not in self.action_permissions:
            return Response({"detail": "Unknown action."}, status=status.HTTP_404_NOT_FOUND)
        order = get_object_or_404(order_queryset(), pk=pk)
        order = transition_order(order, ACTION_STATUS[action], user=request.user, note=request.data.get("note", ""), request=request, action=action)
        return Response(OrderDetailSerializer(order_queryset().get(pk=order.pk), context={"request": request}).data)
