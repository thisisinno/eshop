from django.contrib.auth.models import Group, Permission, User
from rest_framework import serializers


class PermissionSerializer(serializers.ModelSerializer):
    app_label = serializers.CharField(source="content_type.app_label", read_only=True)
    model = serializers.CharField(source="content_type.model", read_only=True)

    class Meta:
        model = Permission
        fields = ("id", "name", "codename", "app_label", "model", "content_type")


class RoleSerializer(serializers.ModelSerializer):
    permissions = serializers.PrimaryKeyRelatedField(many=True, queryset=Permission.objects.all(), required=False)
    permission_details = PermissionSerializer(source="permissions", many=True, read_only=True)
    user_count = serializers.SerializerMethodField()

    class Meta:
        model = Group
        fields = ("id", "name", "permissions", "permission_details", "user_count")

    def get_user_count(self, obj):
        return obj.user_set.count()


class AdminUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, min_length=8)
    groups = serializers.PrimaryKeyRelatedField(many=True, queryset=Group.objects.all(), required=False)
    user_permissions = serializers.PrimaryKeyRelatedField(many=True, queryset=Permission.objects.all(), required=False)
    group_details = RoleSerializer(source="groups", many=True, read_only=True)
    permission_details = PermissionSerializer(source="user_permissions", many=True, read_only=True)

    class Meta:
        model = User
        fields = (
            "id", "username", "email", "first_name", "last_name", "password", "is_active", "is_staff",
            "is_superuser", "groups", "group_details", "user_permissions", "permission_details",
            "date_joined", "last_login",
        )
        read_only_fields = ("date_joined", "last_login")

    def create(self, validated_data):
        password = validated_data.pop("password")
        groups = validated_data.pop("groups", [])
        permissions = validated_data.pop("user_permissions", [])
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        user.groups.set(groups)
        user.user_permissions.set(permissions)
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        groups = validated_data.pop("groups", None)
        permissions = validated_data.pop("user_permissions", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        if groups is not None:
            instance.groups.set(groups)
        if permissions is not None:
            instance.user_permissions.set(permissions)
        return instance
