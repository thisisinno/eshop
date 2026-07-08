from django.db.models import Q
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import AdminActivityLog, SystemRequestLog, UserActivityLog
from api.permissions import HasModulePermission
from api.serializers import AdminActivityLogSerializer, SystemRequestLogSerializer, UserActivityLogSerializer
from api.utils.request_meta import request_meta_snapshot


def record_admin_activity(request, module, action, obj=None, status_code=None, metadata=None):
    try:
        user = getattr(request, "user", None)
        actor = user if getattr(user, "is_authenticated", False) else None
        meta = request_meta_snapshot(request)
        AdminActivityLog.objects.create(
            actor=actor,
            actor_username=actor.get_username() if actor else "",
            ip_address=meta["ip_address"],
            user_agent=meta["user_agent"],
            device_type=meta["device_type"],
            browser=meta["browser"],
            os=meta["os"],
            module=module,
            action=action,
            object_type=obj.__class__.__name__ if obj is not None else "",
            object_id=str(getattr(obj, "pk", "")) if obj is not None else "",
            object_repr=str(obj)[:255] if obj is not None else "",
            path=getattr(request, "path", "")[:500],
            method=getattr(request, "method", ""),
            status_code=status_code,
            metadata=metadata or {},
        )
    except Exception:
        pass


class LogsListAPIView(APIView):
    permission_classes = [HasModulePermission]
    permission_required = ""
    model = None
    serializer_class = None
    search_fields = ()

    def get_queryset(self, request):
        queryset = self.model.objects.all()
        if search := request.query_params.get("search"):
            query = Q()
            for field in self.search_fields:
                query |= Q(**{f"{field}__icontains": search})
            queryset = queryset.filter(query)
        if date_from := request.query_params.get("date_from"):
            queryset = queryset.filter(created_at__date__gte=date_from)
        if date_to := request.query_params.get("date_to"):
            queryset = queryset.filter(created_at__date__lte=date_to)
        return queryset

    def get(self, request):
        queryset = self.get_queryset(request)
        return Response(self.serializer_class(queryset[:500], many=True, context={"request": request}).data)


class UserActivityLogsAPIView(LogsListAPIView):
    permission_required = "api.view_useractivitylog"
    model = UserActivityLog
    serializer_class = UserActivityLogSerializer
    search_fields = ("username_snapshot", "session_key", "search_query", "product__name", "ip_address")

    def get_queryset(self, request):
        queryset = super().get_queryset(request).select_related("user", "product", "product_media", "trader")
        for field in ("action", "product"):
            if value := request.query_params.get(field):
                queryset = queryset.filter(**{field: value})
        return queryset


class AdminActivityLogsAPIView(LogsListAPIView):
    permission_required = "api.view_adminactivitylog"
    model = AdminActivityLog
    serializer_class = AdminActivityLogSerializer
    search_fields = ("actor_username", "module", "action", "object_type", "object_id", "object_repr", "ip_address")

    def get_queryset(self, request):
        queryset = super().get_queryset(request).select_related("actor")
        for field in ("actor", "module", "action"):
            if value := request.query_params.get(field):
                queryset = queryset.filter(**{field: value})
        return queryset


class SystemRequestLogsAPIView(LogsListAPIView):
    permission_required = "api.view_systemrequestlog"
    model = SystemRequestLog
    serializer_class = SystemRequestLogSerializer
    search_fields = ("username_snapshot", "method", "path", "ip_address", "error_message")

    def get_queryset(self, request):
        queryset = super().get_queryset(request).select_related("user")
        for field in ("method", "status_code"):
            if value := request.query_params.get(field):
                queryset = queryset.filter(**{field: value})
        if request.query_params.get("is_error") in ("true", "false"):
            queryset = queryset.filter(is_error=request.query_params["is_error"] == "true")
        return queryset


class ProductInteractionAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = UserActivityLogSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = request.user if getattr(request.user, "is_authenticated", False) else None
        meta = request_meta_snapshot(request)
        session_key = getattr(getattr(request, "session", None), "session_key", "") or request.data.get("session_key", "")
        log = serializer.save(
            user=user,
            username_snapshot=user.get_username() if user else "",
            session_key=session_key,
            ip_address=meta["ip_address"],
            user_agent=meta["user_agent"],
            device_type=meta["device_type"],
            browser=meta["browser"],
            os=meta["os"],
        )
        return Response(UserActivityLogSerializer(log, context={"request": request}).data, status=status.HTTP_201_CREATED)
