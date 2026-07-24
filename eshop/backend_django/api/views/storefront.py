from django.db.models import BooleanField, Count, Exists, F, OuterRef, Q, Value
from django.core.exceptions import ValidationError as DjangoValidationError
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import Cart, CartItem, Product, ProductBookmark, ProductCategory, SiteBranding, StoreFollow, TraderProfile, UserActivityLog, UserNotification
from api.serializers.orders import OrderDetailSerializer, OrderListSerializer
from api.serializers.storefront import (
    CartItemWriteSerializer, CartSerializer, CustomerOrderCreateSerializer, PublicCategorySerializer,
    PublicProductCardSerializer, PublicProductDetailSerializer, PublicStoreDetailSerializer, PublicStoreSummarySerializer,
    SiteBrandingPublicSerializer, UserNotificationSerializer,
)
from api.services.notifications import create_activity_notification, mark_all_read, mark_notification_read, notify_admin_of_new_order, sync_order_notification, visible_notifications_for
from api.services.recommendations import build_home_shelves, public_products_queryset


class StorefrontPagination(PageNumberPagination):
    page_size = 24
    page_size_query_param = "page_size"
    max_page_size = 60

    def get_paginated_response(self, data):
        return Response({
            "count": self.page.paginator.count,
            "page": self.page.number,
            "page_size": self.get_page_size(self.request),
            "total_pages": self.page.paginator.num_pages,
            "next": self.get_next_link(),
            "previous": self.get_previous_link(),
            "results": data,
        })

    def response_with_extra(self, data, **extra):
        payload = {
            "count": self.page.paginator.count,
            "page": self.page.number,
            "page_size": self.get_page_size(self.request),
            "total_pages": self.page.paginator.num_pages,
            "next": self.get_next_link(),
            "previous": self.get_previous_link(),
            "results": data,
        }
        payload.update(extra)
        return Response(payload)


def session_key(request):
    return request.headers.get("X-Anonymous-Session", "")[:100]


def annotate_products(queryset, request):
    if request.user.is_authenticated:
        return queryset.annotate(is_bookmarked=Exists(ProductBookmark.objects.filter(user=request.user, product=OuterRef("pk"))))
    return queryset.annotate(is_bookmarked=Value(False, output_field=BooleanField()))


def annotate_stores(queryset, request):
    active_product_filter = Q(products__status=Product.Status.ACTIVE, products__trader__status=TraderProfile.Status.APPROVED)
    queryset = queryset.annotate(follower_count=Count("followers", distinct=True), product_count=Count("products", filter=active_product_filter, distinct=True))
    if request.user.is_authenticated:
        return queryset.annotate(is_following=Exists(StoreFollow.objects.filter(user=request.user, trader=OuterRef("pk"))))
    return queryset.annotate(is_following=Value(False, output_field=BooleanField()))


def record_activity(request, action, product=None, trader=None, metadata=None):
    log = UserActivityLog.objects.create(
        user=request.user if request.user.is_authenticated else None,
        session_key=session_key(request),
        action=action,
        product=product,
        trader=trader,
        metadata=metadata or {},
    )
    create_activity_notification(log)
    return log


SHARE_CHANNELS = {"native", "whatsapp", "facebook", "instagram", "email", "copy", "other"}
ALL_CATEGORY = {
    "id": 0,
    "name": "All",
    "slug": "all",
    "description": "All products",
    "icon": "Grid2X2",
    "image_url": None,
    "display_order": 0,
    "is_featured": True,
}


def validate_cart_quantity(product, quantity):
    if product.status != Product.Status.ACTIVE:
        raise ValidationError({"product": [f"{product.name} is no longer available."]})
    if not product.trader_id or product.trader.status != TraderProfile.Status.APPROVED:
        raise ValidationError({"product": [f"{product.name} is no longer available."]})
    if product.stock_quantity <= 0:
        raise ValidationError({"quantity": [f"{product.name} is currently out of stock."]})
    if quantity < product.minimum_order_quantity:
        raise ValidationError({"quantity": [f"Minimum order quantity for {product.name} is {product.minimum_order_quantity}."]})
    if product.stock_quantity < product.minimum_order_quantity:
        raise ValidationError({"quantity": [f"{product.name} is currently unavailable."]})
    if quantity > product.stock_quantity:
        raise ValidationError({"quantity": [f"Only {product.stock_quantity} units are currently available."]})


class StorefrontHomeAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        shelves = build_home_shelves(request.user if request.user.is_authenticated else None, session_key(request))
        return Response({
            "shelves": [
                {"key": shelf["key"], "title": shelf["title"], "products": PublicProductCardSerializer(annotate_products(Product.objects.filter(pk__in=[p.pk for p in shelf["products"]]).select_related("trader", "category").prefetch_related("media"), request), many=True, context={"request": request}).data}
                for shelf in shelves
            ]
        })


class StorefrontCategoriesAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        queryset = ProductCategory.objects.filter(is_active=True).order_by("display_order", "name")
        categories = [ALL_CATEGORY]
        categories.extend(PublicCategorySerializer(queryset, many=True, context={"request": request}).data)
        return Response(categories)


class StorefrontCategoryDetailAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, slug):
        if slug == ALL_CATEGORY["slug"]:
            category_payload = ALL_CATEGORY
            record_activity(request, UserActivityLog.Action.CATEGORY_OPEN, metadata={"category": ALL_CATEGORY["slug"], "virtual": True})
            queryset = filter_public_products(request, public_products_queryset())
        else:
            category = get_object_or_404(ProductCategory, slug=slug, is_active=True)
            category_payload = PublicCategorySerializer(category, context={"request": request}).data
            record_activity(request, UserActivityLog.Action.CATEGORY_OPEN, metadata={"category": category.slug})
            queryset = filter_public_products(request, public_products_queryset().filter(category=category))
        paginator = StorefrontPagination()
        page = paginator.paginate_queryset(annotate_products(queryset, request), request)
        return paginator.response_with_extra(
            PublicProductCardSerializer(page, many=True, context={"request": request}).data,
            category=category_payload,
        )


SORTS = {
    "newest": "-created_at",
    "price_asc": "price",
    "price_desc": "-price",
    "popularity": "-views_count",
    "best_selling": "-sold_count",
}


def filter_public_products(request, queryset):
    params = request.query_params
    if search := params.get("search", "").strip():
        queryset = queryset.filter(Q(name__icontains=search) | Q(short_description__icontains=search) | Q(trader__business_name__icontains=search))
        record_activity(request, UserActivityLog.Action.SEARCH, metadata={"query": search})
    if category := params.get("category"):
        if category.lower() == ALL_CATEGORY["slug"]:
            category = ""
    if category:
        queryset = queryset.filter(category__slug=category)
    if store := params.get("store"):
        queryset = queryset.filter(trader__slug=store)
    if min_price := params.get("min_price"):
        queryset = queryset.filter(price__gte=min_price)
    if max_price := params.get("max_price"):
        queryset = queryset.filter(price__lte=max_price)
    if params.get("in_stock") == "true":
        queryset = queryset.filter(stock_quantity__gt=0)
    if params.get("discounted") == "true":
        queryset = queryset.filter(is_discountable=True, compare_at_price__gt=F("price"))
    return queryset.order_by(SORTS.get(params.get("sort", "newest"), "-created_at"), "-id")


class StorefrontProductsAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        queryset = annotate_products(filter_public_products(request, public_products_queryset()), request)
        paginator = StorefrontPagination()
        page = paginator.paginate_queryset(queryset, request)
        return paginator.get_paginated_response(PublicProductCardSerializer(page, many=True, context={"request": request}).data)


class StorefrontProductDetailAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        product = get_object_or_404(annotate_products(public_products_queryset(), request), pk=pk)
        Product.objects.filter(pk=product.pk).update(views_count=F("views_count") + 1)
        record_activity(request, UserActivityLog.Action.PRODUCT_OPEN, product=product, trader=product.trader)
        return Response(PublicProductDetailSerializer(product, context={"request": request}).data)


class StorefrontProductShareAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, pk):
        product = get_object_or_404(public_products_queryset(), pk=pk)
        channel = str(request.data.get("channel") or "other").lower()
        if channel not in SHARE_CHANNELS:
            channel = "other"
        record_activity(request, UserActivityLog.Action.SHARE, product=product, trader=product.trader, metadata={"channel": channel})
        return Response({"recorded": True})


class StorefrontBrandingAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(SiteBrandingPublicSerializer(SiteBranding.get_current(), context={"request": request}).data)


class StorefrontStoresAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        queryset = annotate_stores(TraderProfile.objects.filter(status=TraderProfile.Status.APPROVED), request)
        if search := request.query_params.get("search", "").strip():
            queryset = queryset.filter(Q(business_name__icontains=search) | Q(region__icontains=search) | Q(district__icontains=search))
        return Response(PublicStoreSummarySerializer(queryset.order_by("-is_featured", "business_name"), many=True, context={"request": request}).data)


class StorefrontStoreDetailAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, slug):
        store = get_object_or_404(annotate_stores(TraderProfile.objects.filter(status=TraderProfile.Status.APPROVED), request), slug=slug)
        record_activity(request, UserActivityLog.Action.TRADER_OPEN, trader=store)
        products = annotate_products(filter_public_products(request, public_products_queryset().filter(trader=store)), request)
        paginator = StorefrontPagination()
        page = paginator.paginate_queryset(products, request)
        return paginator.response_with_extra(
            PublicProductCardSerializer(page, many=True, context={"request": request}).data,
            store=PublicStoreDetailSerializer(store, context={"request": request}).data,
        )


class StoreFollowAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, slug):
        trader = get_object_or_404(TraderProfile, slug=slug, status=TraderProfile.Status.APPROVED)
        StoreFollow.objects.get_or_create(user=request.user, trader=trader)
        record_activity(request, UserActivityLog.Action.STORE_FOLLOW, trader=trader)
        return Response({"is_following": True}, status=status.HTTP_201_CREATED)

    def delete(self, request, slug):
        trader = get_object_or_404(TraderProfile, slug=slug, status=TraderProfile.Status.APPROVED)
        StoreFollow.objects.filter(user=request.user, trader=trader).delete()
        record_activity(request, UserActivityLog.Action.STORE_UNFOLLOW, trader=trader)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProductBookmarkAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        product = get_object_or_404(public_products_queryset(), pk=pk)
        ProductBookmark.objects.get_or_create(user=request.user, product=product)
        record_activity(request, UserActivityLog.Action.BOOKMARK, product=product, trader=product.trader)
        return Response({"is_bookmarked": True}, status=status.HTTP_201_CREATED)

    def delete(self, request, pk):
        product = get_object_or_404(public_products_queryset(), pk=pk)
        ProductBookmark.objects.filter(user=request.user, product=product).delete()
        record_activity(request, UserActivityLog.Action.UNBOOKMARK, product=product, trader=product.trader)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProductBookmarksAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset = annotate_products(
            public_products_queryset().filter(bookmarks__user=request.user).order_by("-bookmarks__created_at"),
            request,
        )
        paginator = StorefrontPagination()
        page = paginator.paginate_queryset(queryset, request)
        return paginator.get_paginated_response(PublicProductCardSerializer(page, many=True, context={"request": request}).data)


def get_cart(user):
    return Cart.objects.prefetch_related("items__product__trader", "items__product__category", "items__product__media").get_or_create(user=user)[0]


class CartAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(CartSerializer(get_cart(request.user), context={"request": request}).data)


class CartItemsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CartItemWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product = get_object_or_404(public_products_queryset(), pk=serializer.validated_data["product"].pk)
        quantity = serializer.validated_data["quantity"]
        validate_cart_quantity(product, quantity)
        try:
            item, created = CartItem.objects.get_or_create(cart=get_cart(request.user), product=product, defaults={"quantity": quantity})
        except DjangoValidationError as exc:
            raise ValidationError(exc.message_dict if hasattr(exc, "message_dict") else exc.messages) from exc
        if not created:
            new_quantity = item.quantity + quantity
            validate_cart_quantity(product, new_quantity)
            item.quantity = new_quantity
            try:
                item.save()
            except DjangoValidationError as exc:
                raise ValidationError(exc.message_dict if hasattr(exc, "message_dict") else exc.messages) from exc
        record_activity(request, UserActivityLog.Action.ADD_TO_CART, product=product, trader=product.trader, metadata={"quantity": quantity})
        return Response(CartSerializer(get_cart(request.user), context={"request": request}).data, status=status.HTTP_201_CREATED)


class CartItemDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, item_id):
        item = get_object_or_404(CartItem.objects.select_related("cart", "product"), pk=item_id, cart__user=request.user)
        quantity = int(request.data.get("quantity", item.quantity))
        validate_cart_quantity(item.product, quantity)
        item.quantity = quantity
        try:
            item.save()
        except DjangoValidationError as exc:
            raise ValidationError(exc.message_dict if hasattr(exc, "message_dict") else exc.messages) from exc
        record_activity(request, UserActivityLog.Action.CART_QUANTITY_CHANGE, product=item.product, trader=item.product.trader, metadata={"quantity": quantity})
        return Response(CartSerializer(get_cart(request.user), context={"request": request}).data)

    def delete(self, request, item_id):
        item = get_object_or_404(CartItem.objects.select_related("cart", "product"), pk=item_id, cart__user=request.user)
        record_activity(request, UserActivityLog.Action.REMOVE_FROM_CART, product=item.product, trader=item.product.trader)
        item.delete()
        return Response(CartSerializer(get_cart(request.user), context={"request": request}).data)


class CustomerOrderCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CustomerOrderCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        record_activity(request, UserActivityLog.Action.ORDER_REQUEST, metadata={"order_id": order.pk})
        sync_order_notification(order)
        notify_admin_of_new_order(order)
        return Response(OrderDetailSerializer(order, context={"request": request}).data, status=status.HTTP_201_CREATED)


class MyOrdersAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        orders = request.user.orders.prefetch_related("items").order_by("-created_at")
        return Response(OrderListSerializer(orders, many=True, context={"request": request}).data)


class MyOrderDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        order = get_object_or_404(request.user.orders.prefetch_related("items", "status_history"), pk=pk)
        return Response(OrderDetailSerializer(order, context={"request": request}).data)


class StorefrontNotificationsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        audience = request.query_params.get("audience", "customer")
        if audience == "admin" and not (request.user.is_staff or request.user.is_superuser):
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        queryset = visible_notifications_for(request.user, audience).select_related(
            "order", "product__trader", "product__category", "trader", "activity_log__product", "activity_log__trader",
        ).prefetch_related("product__media").order_by("is_read", "-updated_at", "-created_at", "-id")
        if state := request.query_params.get("state"):
            queryset = queryset.filter(lifecycle_state=state)
        paginator = StorefrontPagination()
        page = paginator.paginate_queryset(queryset, request)
        return paginator.get_paginated_response(UserNotificationSerializer(page, many=True, context={"request": request}).data)


class StorefrontNotificationUnreadCountAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        audience = request.query_params.get("audience", "customer")
        if audience == "admin" and not (request.user.is_staff or request.user.is_superuser):
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response({"count": visible_notifications_for(request.user, audience).filter(is_read=False).count()})


class StorefrontNotificationDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        audience = request.query_params.get("audience", "customer")
        if audience == "admin" and not (request.user.is_staff or request.user.is_superuser):
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        notification = get_object_or_404(
            visible_notifications_for(request.user, audience).select_related(
                "order", "product__trader", "product__category", "trader", "activity_log__product", "activity_log__trader",
            ).prefetch_related("product__media"),
            pk=pk,
        )
        return Response(UserNotificationSerializer(notification, context={"request": request}).data)


class StorefrontNotificationReadAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        audience = request.query_params.get("audience", "customer")
        if audience == "admin" and not (request.user.is_staff or request.user.is_superuser):
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        notification = get_object_or_404(visible_notifications_for(request.user, audience), pk=pk)
        mark_notification_read(notification)
        return Response(UserNotificationSerializer(notification, context={"request": request}).data)


class StorefrontNotificationReadAllAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        audience = request.query_params.get("audience", "customer")
        if audience == "admin" and not (request.user.is_staff or request.user.is_superuser):
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        queryset = visible_notifications_for(request.user, audience).filter(is_read=False)
        if state := request.query_params.get("state"):
            queryset = queryset.filter(lifecycle_state=state)
        updated = mark_all_read(request.user, queryset)
        return Response({"updated": updated})
