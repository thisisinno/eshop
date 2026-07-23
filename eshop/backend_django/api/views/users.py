from django.contrib.auth.models import Group, Permission, User
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from api.permissions import HasModulePermission
from api.serializers import AdminUserSerializer, PermissionSerializer, RoleSerializer
from api.views.logs import record_admin_activity


class ManagedAPIView(APIView):
    permission_classes = [HasModulePermission]
    permission_required = ""
    permission_map = {}

    def initial(self, request, *args, **kwargs):
        self.permission_required = self.permission_map.get(request.method, "")
        super().initial(request, *args, **kwargs)


class UsersAPIView(ManagedAPIView):
    permission_map = {"GET": "auth.view_user", "POST": "auth.add_user"}

    def get(self, request):
        users = User.objects.prefetch_related("groups", "user_permissions").all().order_by("username")
        if search := request.query_params.get("search"):
            users = users.filter(Q(username__icontains=search) | Q(email__icontains=search) | Q(first_name__icontains=search) | Q(last_name__icontains=search))
        return Response(AdminUserSerializer(users, many=True).data)
    def post(self, request):
        serializer = AdminUserSerializer(data=request.data); serializer.is_valid(raise_exception=True)
        user = serializer.save(); record_admin_activity(request, "users", "create", user, status.HTTP_201_CREATED); return Response(AdminUserSerializer(user).data, status=status.HTTP_201_CREATED)


class UserDetailAPIView(ManagedAPIView):
    permission_map = {"GET": "auth.view_user", "PUT": "auth.change_user", "PATCH": "auth.change_user", "DELETE": "auth.delete_user"}

    def object(self, pk): return get_object_or_404(User.objects.prefetch_related("groups", "user_permissions"), pk=pk)
    def get(self, request, pk): return Response(AdminUserSerializer(self.object(pk)).data)
    def put(self, request, pk): return self.update(request, pk)
    def patch(self, request, pk): return self.update(request, pk, True)
    def update(self, request, pk, partial=False):
        serializer = AdminUserSerializer(self.object(pk), data=request.data, partial=partial); serializer.is_valid(raise_exception=True); user = serializer.save(); record_admin_activity(request, "users", "update", user, status.HTTP_200_OK); return Response(AdminUserSerializer(user).data)
    def delete(self, request, pk): user = self.object(pk); record_admin_activity(request, "users", "delete", user, status.HTTP_204_NO_CONTENT); user.delete(); return Response(status=status.HTTP_204_NO_CONTENT)


class UserActionAPIView(ManagedAPIView):
    permission_map = {"PATCH": "auth.change_user"}

    def patch(self, request, pk, action):
        user = get_object_or_404(User, pk=pk)
        if action == "activate": user.is_active = True; user.save(update_fields=["is_active"]); record_admin_activity(request, "users", "activate", user, status.HTTP_200_OK); return Response(AdminUserSerializer(user).data)
        if action == "deactivate": user.is_active = False; user.save(update_fields=["is_active"]); record_admin_activity(request, "users", "deactivate", user, status.HTTP_200_OK); return Response(AdminUserSerializer(user).data)
        if action == "set_password":
            password = request.data.get("password")
            if not password: return Response({"password": ["This field is required."]}, status=400)
            user.set_password(password); user.save(update_fields=["password"]); record_admin_activity(request, "users", "set_password", user, status.HTTP_200_OK); return Response({"detail": "Password updated."})
        if action == "assign_roles": user.groups.set(request.data.get("groups", [])); record_admin_activity(request, "users", "assign_roles", user, status.HTTP_200_OK); return Response(AdminUserSerializer(user).data)
        return Response({"detail": "Unknown action."}, status=404)


class RolesAPIView(ManagedAPIView):
    permission_map = {"GET": "auth.view_group", "POST": "auth.add_group"}

    def get(self, request): return Response(RoleSerializer(Group.objects.prefetch_related("permissions", "user_set").all().order_by("name"), many=True).data)
    def post(self, request): serializer = RoleSerializer(data=request.data); serializer.is_valid(raise_exception=True); return Response(RoleSerializer(serializer.save()).data, status=201)


class RoleDetailAPIView(ManagedAPIView):
    permission_map = {"GET": "auth.view_group", "PUT": "auth.change_group", "PATCH": "auth.change_group", "DELETE": "auth.delete_group"}

    def object(self, pk): return get_object_or_404(Group.objects.prefetch_related("permissions", "user_set"), pk=pk)
    def get(self, request, pk): return Response(RoleSerializer(self.object(pk)).data)
    def put(self, request, pk): return self.update(request, pk)
    def patch(self, request, pk): return self.update(request, pk, True)
    def update(self, request, pk, partial=False): serializer = RoleSerializer(self.object(pk), data=request.data, partial=partial); serializer.is_valid(raise_exception=True); return Response(RoleSerializer(serializer.save()).data)
    def delete(self, request, pk): self.object(pk).delete(); return Response(status=status.HTTP_204_NO_CONTENT)


class PermissionsAPIView(ManagedAPIView):
    permission_map = {"GET": "auth.view_permission"}

    def get(self, request):
        permissions = Permission.objects.select_related("content_type").all().order_by("content_type__app_label", "content_type__model", "codename")
        for field, lookup in (("app_label", "content_type__app_label"), ("model", "content_type__model")):
            if value := request.query_params.get(field): permissions = permissions.filter(**{lookup: value})
        if search := request.query_params.get("search"): permissions = permissions.filter(Q(codename__icontains=search) | Q(name__icontains=search))
        return Response(PermissionSerializer(permissions, many=True).data)
