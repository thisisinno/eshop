from django.contrib.auth.models import Group, Permission, User
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from api.permissions import HasModulePermission
from api.serializers import AdminUserSerializer, PermissionSerializer, RoleSerializer


class AuthManagementViewSet(viewsets.ModelViewSet):
    permission_classes = [HasModulePermission]

    def get_permissions(self):
        self.permission_required = "auth.view_user" if self.action in ("list", "retrieve") else "auth.change_user"
        return super().get_permissions()


class AdminUserViewSet(AuthManagementViewSet):
    queryset = User.objects.prefetch_related("groups", "user_permissions").all().order_by("username")
    serializer_class = AdminUserSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        if search := self.request.query_params.get("search"):
            from django.db.models import Q
            queryset = queryset.filter(Q(username__icontains=search) | Q(email__icontains=search) | Q(first_name__icontains=search) | Q(last_name__icontains=search))
        return queryset

    def get_permissions(self):
        if self.action == "create":
            self.permission_required = "auth.add_user"
        elif self.action == "destroy":
            self.permission_required = "auth.delete_user"
        elif self.action in ("list", "retrieve"):
            self.permission_required = "auth.view_user"
        else:
            self.permission_required = "auth.change_user"
        return super(AuthManagementViewSet, self).get_permissions()

    @action(detail=True, methods=["patch"])
    def activate(self, request, pk=None):
        user = self.get_object(); user.is_active = True; user.save(update_fields=["is_active"])
        return Response(self.get_serializer(user).data)

    @action(detail=True, methods=["patch"])
    def deactivate(self, request, pk=None):
        user = self.get_object(); user.is_active = False; user.save(update_fields=["is_active"])
        return Response(self.get_serializer(user).data)

    @action(detail=True, methods=["patch"])
    def set_password(self, request, pk=None):
        password = request.data.get("password")
        if not password:
            return Response({"password": ["This field is required."]}, status=400)
        user = self.get_object(); user.set_password(password); user.save(update_fields=["password"])
        return Response({"detail": "Password updated."})

    @action(detail=True, methods=["patch"])
    def assign_roles(self, request, pk=None):
        user = self.get_object(); user.groups.set(request.data.get("groups", []))
        return Response(self.get_serializer(user).data)


class RoleViewSet(viewsets.ModelViewSet):
    queryset = Group.objects.prefetch_related("permissions", "user_set").all().order_by("name")
    serializer_class = RoleSerializer
    permission_classes = [HasModulePermission]

    def get_permissions(self):
        self.permission_required = "auth.view_group" if self.action in ("list", "retrieve") else "auth.change_group"
        if self.action == "create": self.permission_required = "auth.add_group"
        if self.action == "destroy": self.permission_required = "auth.delete_group"
        return super().get_permissions()


class PermissionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Permission.objects.select_related("content_type").all().order_by("content_type__app_label", "content_type__model", "codename")
    serializer_class = PermissionSerializer
    permission_classes = [HasModulePermission]
    permission_required = "auth.view_permission"

    def get_queryset(self):
        queryset = super().get_queryset()
        if app_label := self.request.query_params.get("app_label"):
            queryset = queryset.filter(content_type__app_label=app_label)
        if model := self.request.query_params.get("model"):
            queryset = queryset.filter(content_type__model=model)
        if search := self.request.query_params.get("search"):
            from django.db.models import Q
            queryset = queryset.filter(Q(codename__icontains=search) | Q(name__icontains=search))
        return queryset
