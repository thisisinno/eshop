from rest_framework.permissions import BasePermission


class HasModulePermission(BasePermission):
    """Checks a permission codename declared by the view or view action."""

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        required = getattr(view, "permission_required", None)
        if not required:
            return user.is_staff
        if isinstance(required, str):
            required = (required,)
        return all(user.has_perm(permission) for permission in required)
