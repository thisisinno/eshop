from rest_framework import serializers

from api.models import AdminActivityLog, SystemRequestLog, UserActivityLog


class UserActivityLogSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    trader_name = serializers.CharField(source="trader.business_name", read_only=True)

    class Meta:
        model = UserActivityLog
        fields = "__all__"
        read_only_fields = ("user", "username_snapshot", "ip_address", "user_agent", "device_type", "browser", "os", "created_at")

    def validate(self, attrs):
        if attrs.get("action") == UserActivityLog.Action.RATING and (attrs.get("rating_value") is None or not 1 <= attrs["rating_value"] <= 5):
            raise serializers.ValidationError({"rating_value": "Rating must be between 1 and 5."})
        return attrs


class AdminActivityLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdminActivityLog
        fields = "__all__"


class SystemRequestLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemRequestLog
        fields = "__all__"
