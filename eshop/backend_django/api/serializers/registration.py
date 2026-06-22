import os

from rest_framework import serializers

from api.models import TraderAgreement, TraderBranch, TraderDocument, TraderProfile


class TraderDocumentSerializer(serializers.ModelSerializer):
    trader_code = serializers.CharField(source="trader.trader_code", read_only=True)
    trader_name = serializers.CharField(source="trader.business_name", read_only=True)
    file_url = serializers.SerializerMethodField(read_only=True)
    file_name = serializers.SerializerMethodField(read_only=True)
    file_extension = serializers.SerializerMethodField(read_only=True)

    def get_file_url(self, obj):
        return self._absolute_file_url(obj.file)

    def get_file_name(self, obj):
        return os.path.basename(obj.file.name) if obj.file else ""

    def get_file_extension(self, obj):
        return os.path.splitext(obj.file.name)[1].lower().lstrip(".") if obj.file else ""

    def _absolute_file_url(self, file):
        if not file:
            return None
        url = file.url
        request = self.context.get("request")
        return request.build_absolute_uri(url) if request and url.startswith("/") else url

    class Meta:
        model = TraderDocument
        fields = "__all__"
        read_only_fields = ("uploaded_by", "verified_by", "uploaded_at", "verified_at")


class TraderBranchSerializer(serializers.ModelSerializer):
    trader_code = serializers.CharField(source="trader.trader_code", read_only=True)
    trader_name = serializers.CharField(source="trader.business_name", read_only=True)
    class Meta:
        model = TraderBranch
        fields = "__all__"
        read_only_fields = ("created_at",)


class TraderAgreementSerializer(serializers.ModelSerializer):
    is_active_agreement = serializers.ReadOnlyField()
    trader_code = serializers.CharField(source="trader.trader_code", read_only=True)
    trader_name = serializers.CharField(source="trader.business_name", read_only=True)
    agreement_file_url = serializers.SerializerMethodField(read_only=True)

    def get_agreement_file_url(self, obj):
        if not obj.agreement_file:
            return None
        url = obj.agreement_file.url
        request = self.context.get("request")
        return request.build_absolute_uri(url) if request and url.startswith("/") else url

    class Meta:
        model = TraderAgreement
        fields = "__all__"
        read_only_fields = ("created_by", "created_at", "updated_at")


class TraderProfileListSerializer(serializers.ModelSerializer):
    class Meta:
        model = TraderProfile
        fields = (
            "id", "trader_type", "business_name", "trader_code", "slug", "owner_full_name", "phone", "email",
            "region", "district", "status", "is_verified", "is_featured", "created_at", "updated_at",
        )


class TraderProfileDetailSerializer(serializers.ModelSerializer):
    agreement = TraderAgreementSerializer(read_only=True)
    documents = TraderDocumentSerializer(many=True, read_only=True)
    branches = TraderBranchSerializer(many=True, read_only=True)

    class Meta:
        model = TraderProfile
        fields = "__all__"
        read_only_fields = ("trader_code", "slug", "created_by", "approved_by", "approved_at", "created_at", "updated_at")


class TraderProfileWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = TraderProfile
        exclude = ("trader_code", "slug", "created_by", "approved_by", "approved_at", "created_at", "updated_at")
