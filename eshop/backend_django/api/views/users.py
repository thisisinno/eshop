from django.contrib.auth.models import Group, Permission, User
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from api.permissions import HasModulePermission
from api.serializers import AdminUserSerializer, PermissionSerializer, RoleSerializer


class ManagedAPIView(APIView):
    permission_classes = [HasModulePermission]
    permission_required = ""


class UsersAPIView(ManagedAPIView):
    def get(self, request):
        self.permission_required = "auth.view_user"
        users = User.objects.prefetch_related("groups", "user_permissions").all().order_by("username")
        if search := request.query_params.get("search"):
            users = users.filter(Q(username__icontains=search) | Q(email__icontains=search) | Q(first_name__icontains=search) | Q(last_name__icontains=search))
        return Response(AdminUserSerializer(users, many=True).data)
    def post(self, request):
        self.permission_required = "auth.add_user"; serializer = AdminUserSerializer(data=request.data); serializer.is_valid(raise_exception=True)
        return Response(AdminUserSerializer(serializer.save()).data, status=status.HTTP_201_CREATED)


class UserDetailAPIView(ManagedAPIView):
    def object(self, pk): return get_object_or_404(User.objects.prefetch_related("groups", "user_permissions"), pk=pk)
    def get(self, request, pk): self.permission_required = "auth.view_user"; return Response(AdminUserSerializer(self.object(pk)).data)
    def put(self, request, pk): return self.update(request, pk)
    def patch(self, request, pk): return self.update(request, pk, True)
    def update(self, request, pk, partial=False):
        self.permission_required = "auth.change_user"; serializer = AdminUserSerializer(self.object(pk), data=request.data, partial=partial); serializer.is_valid(raise_exception=True); return Response(AdminUserSerializer(serializer.save()).data)
    def delete(self, request, pk): self.permission_required = "auth.delete_user"; self.object(pk).delete(); return Response(status=status.HTTP_204_NO_CONTENT)


class UserActionAPIView(ManagedAPIView):
    def patch(self, request, pk, action):
        user = get_object_or_404(User, pk=pk)
        if action == "activate": self.permission_required = "auth.change_user"; user.is_active = True; user.save(update_fields=["is_active"]); return Response(AdminUserSerializer(user).data)
        if action == "deactivate": self.permission_required = "auth.change_user"; user.is_active = False; user.save(update_fields=["is_active"]); return Response(AdminUserSerializer(user).data)
        if action == "set_password":
            self.permission_required = "auth.change_user"; password = request.data.get("password")
            if not password: return Response({"password": ["This field is required."]}, status=400)
            user.set_password(password); user.save(update_fields=["password"]); return Response({"detail": "Password updated."})
        if action == "assign_roles": self.permission_required = "auth.change_user"; user.groups.set(request.data.get("groups", [])); return Response(AdminUserSerializer(user).data)
        return Response({"detail": "Unknown action."}, status=404)


class RolesAPIView(ManagedAPIView):
    def get(self, request): self.permission_required = "auth.view_group"; return Response(RoleSerializer(Group.objects.prefetch_related("permissions", "user_set").all().order_by("name"), many=True).data)
    def post(self, request): self.permission_required = "auth.add_group"; serializer = RoleSerializer(data=request.data); serializer.is_valid(raise_exception=True); return Response(RoleSerializer(serializer.save()).data, status=201)


class RoleDetailAPIView(ManagedAPIView):
    def object(self, pk): return get_object_or_404(Group.objects.prefetch_related("permissions", "user_set"), pk=pk)
    def get(self, request, pk): self.permission_required = "auth.view_group"; return Response(RoleSerializer(self.object(pk)).data)
    def put(self, request, pk): return self.update(request, pk)
    def patch(self, request, pk): return self.update(request, pk, True)
    def update(self, request, pk, partial=False): self.permission_required = "auth.change_group"; serializer = RoleSerializer(self.object(pk), data=request.data, partial=partial); serializer.is_valid(raise_exception=True); return Response(RoleSerializer(serializer.save()).data)
    def delete(self, request, pk): self.permission_required = "auth.delete_group"; self.object(pk).delete(); return Response(status=status.HTTP_204_NO_CONTENT)


class PermissionsAPIView(ManagedAPIView):
    def get(self, request):
        self.permission_required = "auth.view_permission"; permissions = Permission.objects.select_related("content_type").all().order_by("content_type__app_label", "content_type__model", "codename")
        for field, lookup in (("app_label", "content_type__app_label"), ("model", "content_type__model")):
            if value := request.query_params.get(field): permissions = permissions.filter(**{lookup: value})
        if search := request.query_params.get("search"): permissions = permissions.filter(Q(codename__icontains=search) | Q(name__icontains=search))
        return Response(PermissionSerializer(permissions, many=True).data)
