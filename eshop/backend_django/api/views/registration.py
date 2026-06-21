from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from api.models import TraderAgreement, TraderBranch, TraderDocument, TraderProfile
from api.permissions import HasModulePermission
from api.serializers import (
    TraderAgreementSerializer, TraderBranchSerializer, TraderDocumentSerializer,
    TraderProfileDetailSerializer, TraderProfileListSerializer, TraderProfileWriteSerializer,
)


class PermissionedModelViewSet(viewsets.ModelViewSet):
    permission_classes = [HasModulePermission]
    parser_classes = [JSONParser, FormParser, MultiPartParser]
    permission_prefix = ""
    action_permission_map = {}

    def get_permissions(self):
        if self.action in self.action_permission_map:
            self.permission_required = self.action_permission_map[self.action]
        action_permissions = {
            "list": "view", "retrieve": "view", "create": "add", "update": "change",
            "partial_update": "change", "destroy": "delete",
        }
        operation = action_permissions.get(self.action)
        if operation:
            self.permission_required = f"api.{operation}_{self.permission_prefix}"
        return super().get_permissions()


class TraderProfileViewSet(PermissionedModelViewSet):
    queryset = TraderProfile.objects.all()
    permission_prefix = "traderprofile"
    search_fields = ("business_name", "owner_full_name", "phone", "email", "tin_number", "registration_number")
    ordering_fields = ("created_at", "updated_at", "business_name")
    action_permission_map = {
        "approve": "api.approve_traderprofile",
        "reject": "api.change_traderprofile",
        "suspend": "api.suspend_traderprofile",
        "feature": "api.change_traderprofile",
    }

    def get_queryset(self):
        queryset = super().get_queryset()
        search = self.request.query_params.get("search")
        if search:
            from django.db.models import Q
            query = Q()
            for field in self.search_fields:
                query |= Q(**{f"{field}__icontains": search})
            queryset = queryset.filter(query)
        for field in ("trader_type", "status", "is_verified", "is_featured", "region", "district"):
            value = self.request.query_params.get(field)
            if value not in (None, ""):
                queryset = queryset.filter(**{field: value})
        ordering = self.request.query_params.get("ordering")
        if ordering and ordering.lstrip("-") in self.ordering_fields:
            queryset = queryset.order_by(ordering)
        return queryset

    def get_serializer_class(self):
        if self.action == "list":
            return TraderProfileListSerializer
        if self.action == "retrieve":
            return TraderProfileDetailSerializer
        return TraderProfileWriteSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["patch"])
    def approve(self, request, pk=None):
        self.permission_required = "api.approve_traderprofile"
        self.check_permissions(request)
        trader = self.get_object()
        trader.status = TraderProfile.Status.APPROVED
        trader.is_verified = True
        trader.approved_by = request.user
        trader.approved_at = timezone.now()
        trader.rejected_reason = ""
        trader.save()
        return Response(TraderProfileDetailSerializer(trader).data)

    @action(detail=True, methods=["patch"])
    def reject(self, request, pk=None):
        self.permission_required = "api.change_traderprofile"
        self.check_permissions(request)
        trader = self.get_object()
        trader.status = TraderProfile.Status.REJECTED
        trader.is_verified = False
        trader.rejected_reason = request.data.get("rejected_reason", "")
        trader.save()
        return Response(TraderProfileDetailSerializer(trader).data)

    @action(detail=True, methods=["patch"])
    def suspend(self, request, pk=None):
        self.permission_required = "api.suspend_traderprofile"
        self.check_permissions(request)
        trader = self.get_object()
        trader.status = TraderProfile.Status.SUSPENDED
        trader.is_verified = False
        trader.save()
        return Response(TraderProfileDetailSerializer(trader).data)

    @action(detail=True, methods=["patch"])
    def feature(self, request, pk=None):
        self.permission_required = "api.change_traderprofile"
        self.check_permissions(request)
        trader = self.get_object()
        trader.is_featured = request.data.get("is_featured", not trader.is_featured)
        trader.save(update_fields=["is_featured", "updated_at"])
        return Response(TraderProfileDetailSerializer(trader).data)


class TraderAgreementViewSet(PermissionedModelViewSet):
    queryset = TraderAgreement.objects.select_related("trader").all()
    serializer_class = TraderAgreementSerializer
    permission_prefix = "traderagreement"
    action_permission_map = {
        "activate": "api.activate_traderagreement",
        "terminate": "api.terminate_traderagreement",
    }

    def get_queryset(self):
        queryset = super().get_queryset()
        search = self.request.query_params.get("search")
        if search:
            from django.db.models import Q
            queryset = queryset.filter(Q(trader__business_name__icontains=search) | Q(title__icontains=search))
        for field in ("status", "commission_type"):
            if value := self.request.query_params.get(field):
                queryset = queryset.filter(**{field: value})
        return queryset

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["patch"])
    def activate(self, request, pk=None):
        self.permission_required = "api.activate_traderagreement"
        self.check_permissions(request)
        agreement = self.get_object()
        if not agreement.signed_by_trader or not agreement.signed_by_platform:
            return Response({"detail": "Both trader and platform must sign before activation."}, status=status.HTTP_400_BAD_REQUEST)
        agreement.status = TraderAgreement.Status.ACTIVE
        agreement.save(update_fields=["status", "updated_at"])
        return Response(self.get_serializer(agreement).data)

    @action(detail=True, methods=["patch"])
    def terminate(self, request, pk=None):
        self.permission_required = "api.terminate_traderagreement"
        self.check_permissions(request)
        agreement = self.get_object()
        agreement.status = TraderAgreement.Status.TERMINATED
        agreement.save(update_fields=["status", "updated_at"])
        return Response(self.get_serializer(agreement).data)


class TraderDocumentViewSet(PermissionedModelViewSet):
    queryset = TraderDocument.objects.select_related("trader").all()
    serializer_class = TraderDocumentSerializer
    permission_prefix = "traderdocument"
    action_permission_map = {"verify": "api.change_traderdocument"}

    def get_queryset(self):
        queryset = super().get_queryset()
        for field in ("trader", "document_type", "verified"):
            if value := self.request.query_params.get(field):
                queryset = queryset.filter(**{field: value})
        return queryset

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)

    @action(detail=True, methods=["patch"])
    def verify(self, request, pk=None):
        self.permission_required = "api.change_traderdocument"
        self.check_permissions(request)
        document = self.get_object()
        document.verified = True
        document.verified_by = request.user
        document.verified_at = timezone.now()
        document.save()
        return Response(self.get_serializer(document).data)


class TraderBranchViewSet(PermissionedModelViewSet):
    queryset = TraderBranch.objects.select_related("trader").all()
    serializer_class = TraderBranchSerializer
    permission_prefix = "traderbranch"

    def get_queryset(self):
        queryset = super().get_queryset()
        for field in ("trader", "region", "district", "is_active"):
            if value := self.request.query_params.get(field):
                queryset = queryset.filter(**{field: value})
        return queryset
