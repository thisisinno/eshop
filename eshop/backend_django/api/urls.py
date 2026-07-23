from django.urls import path

from api.views.auth import MeAPIView, SigninAPIView, SignoutAPIView, SignupAPIView
from api.views.registration import (AgreementActionAPIView, AgreementDetailAPIView, AgreementsAPIView,
    BranchDetailAPIView, BranchesAPIView, DocumentActionAPIView, DocumentDetailAPIView, DocumentsAPIView,
    TraderActionAPIView, TraderDetailAPIView, TradersAPIView)
from api.views.users import (PermissionsAPIView, RoleDetailAPIView, RolesAPIView, UserActionAPIView,
    UserDetailAPIView, UsersAPIView)
from api.views.catalog import (CategoriesAPIView, CategoryDetailAPIView, ProductActionAPIView,
    ProductDetailAPIView, ProductMediaAPIView, ProductMediaDetailAPIView, ProductMediaPrimaryAPIView, ProductsAPIView)
from api.views.logs import AdminActivityLogsAPIView, ProductInteractionAPIView, SystemRequestLogsAPIView, UserActivityLogsAPIView
from api.views.orders import OrderActionAPIView, OrderDetailAPIView, OrdersAPIView
from api.views.storefront import (
    CartAPIView, CartItemDetailAPIView, CartItemsAPIView, CustomerOrderCreateAPIView,
    MyOrderDetailAPIView, MyOrdersAPIView, ProductBookmarkAPIView, ProductBookmarksAPIView, StoreFollowAPIView,
    StorefrontCategoriesAPIView, StorefrontCategoryDetailAPIView, StorefrontHomeAPIView,
    StorefrontProductDetailAPIView, StorefrontProductsAPIView, StorefrontStoreDetailAPIView,
    StorefrontStoresAPIView,
)

urlpatterns = [
    path("auth/signup/", SignupAPIView.as_view()), path("auth/signin/", SigninAPIView.as_view()),
    path("auth/signout/", SignoutAPIView.as_view()), path("auth/me/", MeAPIView.as_view()),
    path("registration/traders/", TradersAPIView.as_view()), path("registration/traders/<int:pk>/", TraderDetailAPIView.as_view()), path("registration/traders/<int:pk>/<str:action>/", TraderActionAPIView.as_view()),
    path("registration/agreements/", AgreementsAPIView.as_view()), path("registration/agreements/<int:pk>/", AgreementDetailAPIView.as_view()), path("registration/agreements/<int:pk>/<str:action>/", AgreementActionAPIView.as_view()),
    path("registration/documents/", DocumentsAPIView.as_view()), path("registration/documents/<int:pk>/", DocumentDetailAPIView.as_view()), path("registration/documents/<int:pk>/<str:action>/", DocumentActionAPIView.as_view()),
    path("registration/branches/", BranchesAPIView.as_view()), path("registration/branches/<int:pk>/", BranchDetailAPIView.as_view()),
    path("users/", UsersAPIView.as_view()), path("users/<int:pk>/", UserDetailAPIView.as_view()), path("users/<int:pk>/<str:action>/", UserActionAPIView.as_view()),
    path("roles/", RolesAPIView.as_view()), path("roles/<int:pk>/", RoleDetailAPIView.as_view()), path("permissions/", PermissionsAPIView.as_view()),
    path("catalog/categories/", CategoriesAPIView.as_view()), path("catalog/categories/<int:pk>/", CategoryDetailAPIView.as_view()),
    path("catalog/products/", ProductsAPIView.as_view()), path("catalog/products/<int:pk>/", ProductDetailAPIView.as_view()),
    path("catalog/products/<int:pk>/media/", ProductMediaAPIView.as_view()),
    path("catalog/products/<int:pk>/media/<int:media_id>/", ProductMediaDetailAPIView.as_view()),
    path("catalog/products/<int:pk>/media/<int:media_id>/primary/", ProductMediaPrimaryAPIView.as_view()),
    path("catalog/products/<int:pk>/<str:action>/", ProductActionAPIView.as_view()),
    path("orders/", OrdersAPIView.as_view()), path("orders/<int:pk>/", OrderDetailAPIView.as_view()), path("orders/<int:pk>/<str:action>/", OrderActionAPIView.as_view()),
    path("logs/user-activity/", UserActivityLogsAPIView.as_view()), path("logs/admin-activity/", AdminActivityLogsAPIView.as_view()), path("logs/system/", SystemRequestLogsAPIView.as_view()),
    path("track/product-interaction/", ProductInteractionAPIView.as_view()),
    path("storefront/home/", StorefrontHomeAPIView.as_view()),
    path("storefront/categories/", StorefrontCategoriesAPIView.as_view()),
    path("storefront/categories/<slug:slug>/", StorefrontCategoryDetailAPIView.as_view()),
    path("storefront/products/", StorefrontProductsAPIView.as_view()),
    path("storefront/bookmarks/", ProductBookmarksAPIView.as_view()),
    path("storefront/products/<int:pk>/", StorefrontProductDetailAPIView.as_view()),
    path("storefront/products/<int:pk>/bookmark/", ProductBookmarkAPIView.as_view()),
    path("storefront/stores/", StorefrontStoresAPIView.as_view()),
    path("storefront/stores/<slug:slug>/", StorefrontStoreDetailAPIView.as_view()),
    path("storefront/stores/<slug:slug>/follow/", StoreFollowAPIView.as_view()),
    path("storefront/cart/", CartAPIView.as_view()),
    path("storefront/cart/items/", CartItemsAPIView.as_view()),
    path("storefront/cart/items/<int:item_id>/", CartItemDetailAPIView.as_view()),
    path("storefront/orders/", CustomerOrderCreateAPIView.as_view()),
    path("storefront/orders/mine/", MyOrdersAPIView.as_view()),
    path("storefront/orders/mine/<int:pk>/", MyOrderDetailAPIView.as_view()),
]
