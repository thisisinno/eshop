from rest_framework.routers import DefaultRouter

from api.views import AdminUserViewSet, PermissionViewSet, RoleViewSet, TraderAgreementViewSet, TraderBranchViewSet, TraderDocumentViewSet, TraderProfileViewSet

router = DefaultRouter()
router.register("registration/traders", TraderProfileViewSet, basename="trader")
router.register("registration/agreements", TraderAgreementViewSet, basename="agreement")
router.register("registration/documents", TraderDocumentViewSet, basename="document")
router.register("registration/branches", TraderBranchViewSet, basename="branch")
router.register("users", AdminUserViewSet, basename="user")
router.register("roles", RoleViewSet, basename="role")
router.register("permissions", PermissionViewSet, basename="permission")

urlpatterns = router.urls
