from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import TraderAgreement, TraderBranch, TraderDocument, TraderProfile
from api.permissions import HasModulePermission
from api.serializers import (TraderAgreementSerializer, TraderBranchSerializer,
    TraderDocumentSerializer, TraderProfileDetailSerializer, TraderProfileListSerializer,
    TraderProfileWriteSerializer)
from api.views.logs import record_admin_activity


class PermissionedAPIView(APIView):
    permission_classes = [HasModulePermission]
    parser_classes = [JSONParser, FormParser, MultiPartParser]
    permission_required = ""


class TradersAPIView(PermissionedAPIView):
    def get(self, request):
        self.permission_required = "api.view_traderprofile"
        queryset = TraderProfile.objects.all()
        if search := request.query_params.get("search"):
            queryset = queryset.filter(
                Q(business_name__icontains=search) | Q(owner_full_name__icontains=search)
                | Q(phone__icontains=search) | Q(email__icontains=search)
                | Q(trader_code__icontains=search) | Q(registration_number__icontains=search)
                | Q(tin_number__icontains=search)
            )
        for field in ("trader_type", "status", "is_verified", "is_featured", "region", "district"):
            if value := request.query_params.get(field): queryset = queryset.filter(**{field: value})
        if limit := request.query_params.get("limit"):
            try:
                queryset = queryset[:max(1, min(int(limit), 100))]
            except ValueError:
                pass
        return Response(TraderProfileListSerializer(queryset, many=True, context={"request": request}).data)

    def post(self, request):
        self.permission_required = "api.add_traderprofile"
        serializer = TraderProfileWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        trader = serializer.save(created_by=request.user)
        record_admin_activity(request, "registration", "create", trader, status.HTTP_201_CREATED)
        return Response(TraderProfileDetailSerializer(trader, context={"request": request}).data, status=status.HTTP_201_CREATED)


class TraderDetailAPIView(PermissionedAPIView):
    def get_object(self, pk): return get_object_or_404(TraderProfile, pk=pk)
    def get(self, request, pk):
        self.permission_required = "api.view_traderprofile"
        return Response(TraderProfileDetailSerializer(self.get_object(pk), context={"request": request}).data)
    def put(self, request, pk): return self.update(request, pk)
    def patch(self, request, pk): return self.update(request, pk, partial=True)
    def update(self, request, pk, partial=False):
        self.permission_required = "api.change_traderprofile"
        serializer = TraderProfileWriteSerializer(self.get_object(pk), data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True); trader = serializer.save()
        record_admin_activity(request, "registration", "update", trader, status.HTTP_200_OK)
        return Response(TraderProfileDetailSerializer(trader, context={"request": request}).data)
    def delete(self, request, pk):
        self.permission_required = "api.delete_traderprofile"; trader = self.get_object(pk); record_admin_activity(request, "registration", "delete", trader, status.HTTP_204_NO_CONTENT); trader.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class TraderActionAPIView(PermissionedAPIView):
    def patch(self, request, pk, action):
        trader = get_object_or_404(TraderProfile, pk=pk)
        if action == "approve":
            self.permission_required = "api.approve_traderprofile"; trader.status = TraderProfile.Status.APPROVED; trader.is_verified = True; trader.approved_by = request.user; trader.approved_at = timezone.now(); trader.rejected_reason = ""
        elif action == "reject":
            self.permission_required = "api.change_traderprofile"; trader.status = TraderProfile.Status.REJECTED; trader.is_verified = False; trader.rejected_reason = request.data.get("rejected_reason", "")
        elif action == "suspend":
            self.permission_required = "api.suspend_traderprofile"; trader.status = TraderProfile.Status.SUSPENDED; trader.is_verified = False
        elif action == "feature":
            self.permission_required = "api.change_traderprofile"; trader.is_featured = request.data.get("is_featured", not trader.is_featured)
        else: return Response({"detail": "Unknown action."}, status=status.HTTP_404_NOT_FOUND)
        trader.save(); record_admin_activity(request, "registration", action, trader, status.HTTP_200_OK); return Response(TraderProfileDetailSerializer(trader, context={"request": request}).data)


class ModelCollectionAPIView(PermissionedAPIView):
    model = serializer_class = permission_prefix = None
    def get(self, request):
        self.permission_required = f"api.view_{self.permission_prefix}"
        return Response(self.serializer_class(self.model.objects.select_related("trader").all(), many=True, context={"request": request}).data)
    def post(self, request):
        self.permission_required = f"api.add_{self.permission_prefix}"
        serializer = self.serializer_class(data=request.data); serializer.is_valid(raise_exception=True)
        kwargs = {"created_by": request.user} if self.model is TraderAgreement else {"uploaded_by": request.user} if self.model is TraderDocument else {}
        obj = serializer.save(**kwargs)
        record_admin_activity(request, "registration", "create", obj, status.HTTP_201_CREATED)
        return Response(self.serializer_class(obj, context={"request": request}).data, status=status.HTTP_201_CREATED)


class ModelDetailAPIView(PermissionedAPIView):
    model = serializer_class = permission_prefix = None
    def object(self, pk): return get_object_or_404(self.model.objects.select_related("trader"), pk=pk)
    def get(self, request, pk): self.permission_required = f"api.view_{self.permission_prefix}"; return Response(self.serializer_class(self.object(pk), context={"request": request}).data)
    def put(self, request, pk): return self.update(request, pk)
    def patch(self, request, pk): return self.update(request, pk, True)
    def update(self, request, pk, partial=False):
        self.permission_required = f"api.change_{self.permission_prefix}"; serializer = self.serializer_class(self.object(pk), data=request.data, partial=partial); serializer.is_valid(raise_exception=True); obj = serializer.save(); record_admin_activity(request, "registration", "update", obj, status.HTTP_200_OK); return Response(self.serializer_class(obj, context={"request": request}).data)
    def delete(self, request, pk): self.permission_required = f"api.delete_{self.permission_prefix}"; obj = self.object(pk); record_admin_activity(request, "registration", "delete", obj, status.HTTP_204_NO_CONTENT); obj.delete(); return Response(status=status.HTTP_204_NO_CONTENT)


class AgreementsAPIView(ModelCollectionAPIView): model = TraderAgreement; serializer_class = TraderAgreementSerializer; permission_prefix = "traderagreement"
class AgreementDetailAPIView(ModelDetailAPIView): model = TraderAgreement; serializer_class = TraderAgreementSerializer; permission_prefix = "traderagreement"
class DocumentsAPIView(ModelCollectionAPIView): model = TraderDocument; serializer_class = TraderDocumentSerializer; permission_prefix = "traderdocument"
class DocumentDetailAPIView(ModelDetailAPIView): model = TraderDocument; serializer_class = TraderDocumentSerializer; permission_prefix = "traderdocument"
class BranchesAPIView(ModelCollectionAPIView): model = TraderBranch; serializer_class = TraderBranchSerializer; permission_prefix = "traderbranch"
class BranchDetailAPIView(ModelDetailAPIView): model = TraderBranch; serializer_class = TraderBranchSerializer; permission_prefix = "traderbranch"


class AgreementActionAPIView(PermissionedAPIView):
    def patch(self, request, pk, action):
        agreement = get_object_or_404(TraderAgreement, pk=pk)
        if action == "activate":
            self.permission_required = "api.activate_traderagreement"
            if not agreement.signed_by_trader or not agreement.signed_by_platform: return Response({"detail": "Both trader and platform must sign before activation."}, status=400)
            agreement.status = TraderAgreement.Status.ACTIVE
        elif action == "terminate": self.permission_required = "api.terminate_traderagreement"; agreement.status = TraderAgreement.Status.TERMINATED
        else: return Response({"detail": "Unknown action."}, status=404)
        agreement.save(); record_admin_activity(request, "registration", action, agreement, status.HTTP_200_OK); return Response(TraderAgreementSerializer(agreement, context={"request": request}).data)


class DocumentActionAPIView(PermissionedAPIView):
    def patch(self, request, pk, action):
        if action != "verify": return Response({"detail": "Unknown action."}, status=404)
        self.permission_required = "api.change_traderdocument"; document = get_object_or_404(TraderDocument, pk=pk); document.verified = True; document.verified_by = request.user; document.verified_at = timezone.now(); document.save(); record_admin_activity(request, "registration", "verify", document, status.HTTP_200_OK)
        return Response(TraderDocumentSerializer(document, context={"request": request}).data)
