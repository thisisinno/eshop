from rest_framework import serializers

from api.models import TraderAgreement, TraderBranch, TraderDocument, TraderProfile


class TraderDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = TraderDocument
        fields = "__all__"
        read_only_fields = ("uploaded_by", "verified_by", "uploaded_at", "verified_at")


class TraderBranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = TraderBranch
        fields = "__all__"
        read_only_fields = ("created_at",)


class TraderAgreementSerializer(serializers.ModelSerializer):
    is_active_agreement = serializers.ReadOnlyField()

    class Meta:
        model = TraderAgreement
        fields = "__all__"
        read_only_fields = ("created_by", "created_at", "updated_at")


class TraderProfileListSerializer(serializers.ModelSerializer):
    class Meta:
        model = TraderProfile
        fields = (
            "id", "trader_type", "business_name", "slug", "owner_full_name", "phone", "email",
            "region", "district", "status", "is_verified", "is_featured", "created_at", "updated_at",
        )


class TraderProfileDetailSerializer(serializers.ModelSerializer):
    agreement = TraderAgreementSerializer(read_only=True)
    documents = TraderDocumentSerializer(many=True, read_only=True)
    branches = TraderBranchSerializer(many=True, read_only=True)

    class Meta:
        model = TraderProfile
        fields = "__all__"
        read_only_fields = ("slug", "created_by", "approved_by", "approved_at", "created_at", "updated_at")


class TraderProfileWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = TraderProfile
        exclude = ("created_by", "approved_by", "approved_at", "created_at", "updated_at")
        read_only_fields = ("slug",)
