from django.db.models import F, Q
from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import Product, ProductCategory, ProductMedia
from api.permissions import HasModulePermission
from api.serializers import ProductCategorySerializer, ProductDetailSerializer, ProductListSerializer, ProductMediaSerializer, ProductWriteSerializer


class PermissionedCatalogAPIView(APIView):
    permission_classes = [HasModulePermission]
    parser_classes = [JSONParser, FormParser, MultiPartParser]
    permission_map = {}

    def initial(self, request, *args, **kwargs):
        self.permission_required = self.permission_map.get(request.method, "")
        super().initial(request, *args, **kwargs)


class CategoriesAPIView(PermissionedCatalogAPIView):
    permission_map = {"GET": "api.view_productcategory", "POST": "api.add_productcategory"}

    def get(self, request):
        queryset = ProductCategory.objects.select_related("parent").all()
        if request.query_params.get("active") in ("true", "false"):
            queryset = queryset.filter(is_active=request.query_params["active"] == "true")
        return Response(ProductCategorySerializer(queryset, many=True, context={"request": request}).data)

    def post(self, request):
        serializer = ProductCategorySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(ProductCategorySerializer(serializer.save(), context={"request": request}).data, status=status.HTTP_201_CREATED)


class CategoryDetailAPIView(PermissionedCatalogAPIView):
    permission_map = {"GET": "api.view_productcategory", "PUT": "api.change_productcategory", "PATCH": "api.change_productcategory", "DELETE": "api.delete_productcategory"}

    def get_object(self, pk):
        return get_object_or_404(ProductCategory, pk=pk)

    def get(self, request, pk):
        return Response(ProductCategorySerializer(self.get_object(pk), context={"request": request}).data)

    def put(self, request, pk):
        return self.update(request, pk)

    def patch(self, request, pk):
        return self.update(request, pk, partial=True)

    def update(self, request, pk, partial=False):
        serializer = ProductCategorySerializer(self.get_object(pk), data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        return Response(ProductCategorySerializer(serializer.save(), context={"request": request}).data)

    def delete(self, request, pk):
        self.get_object(pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


def product_queryset():
    return Product.objects.select_related("trader", "branch", "category", "created_by", "updated_by").prefetch_related("media", "related_products__media")


class ProductsAPIView(PermissionedCatalogAPIView):
    permission_map = {"GET": "api.view_product", "POST": "api.add_product"}

    def get(self, request):
        queryset = product_queryset()
        if search := request.query_params.get("search"):
            queryset = queryset.filter(Q(product_id__icontains=search) | Q(name__icontains=search) | Q(sku__icontains=search) | Q(trader__business_name__icontains=search))
        for field in ("status", "trader", "branch", "category", "is_featured"):
            if value := request.query_params.get(field):
                queryset = queryset.filter(**{field: value})
        if request.query_params.get("has_discount") in ("true", "false"):
            discounted = Q(is_discountable=True, compare_at_price__gt=F("price"))
            queryset = queryset.filter(discounted if request.query_params["has_discount"] == "true" else ~discounted)
        if value := request.query_params.get("min_price"):
            queryset = queryset.filter(price__gte=value)
        if value := request.query_params.get("max_price"):
            queryset = queryset.filter(price__lte=value)
        return Response(ProductListSerializer(queryset, many=True, context={"request": request}).data)

    def post(self, request):
        serializer = ProductWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product = serializer.save(created_by=request.user, updated_by=request.user)
        return Response(ProductDetailSerializer(product_queryset().get(pk=product.pk), context={"request": request}).data, status=status.HTTP_201_CREATED)


class ProductDetailAPIView(PermissionedCatalogAPIView):
    permission_map = {"GET": "api.view_product", "PUT": "api.change_product", "PATCH": "api.change_product", "DELETE": "api.delete_product"}

    def get_object(self, pk):
        return get_object_or_404(product_queryset(), pk=pk)

    def get(self, request, pk):
        return Response(ProductDetailSerializer(self.get_object(pk), context={"request": request}).data)

    def put(self, request, pk):
        return self.update(request, pk)

    def patch(self, request, pk):
        return self.update(request, pk, partial=True)

    def update(self, request, pk, partial=False):
        serializer = ProductWriteSerializer(self.get_object(pk), data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        product = serializer.save(updated_by=request.user)
        return Response(ProductDetailSerializer(product_queryset().get(pk=product.pk), context={"request": request}).data)

    def delete(self, request, pk):
        self.get_object(pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProductActionAPIView(PermissionedCatalogAPIView):
    action_permissions = {"approve": "api.approve_product", "feature": "api.feature_product", "archive": "api.archive_product"}

    def initial(self, request, *args, **kwargs):
        self.permission_required = self.action_permissions.get(kwargs.get("action"), "")
        APIView.initial(self, request, *args, **kwargs)

    def patch(self, request, pk, action):
        if action not in self.action_permissions:
            return Response({"detail": "Unknown action."}, status=status.HTTP_404_NOT_FOUND)
        product = get_object_or_404(product_queryset(), pk=pk)
        if action == "approve":
            product.status = Product.Status.ACTIVE
        elif action == "feature":
            product.is_featured = request.data.get("is_featured", not product.is_featured)
        else:
            product.status = Product.Status.ARCHIVED
        product.updated_by = request.user
        product.save()
        return Response(ProductDetailSerializer(product_queryset().get(pk=product.pk), context={"request": request}).data)


class ProductMediaAPIView(PermissionedCatalogAPIView):
    permission_map = {"POST": "api.change_product"}

    def post(self, request, pk):
        product = get_object_or_404(Product, pk=pk)
        serializer = ProductMediaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        filename = getattr(request.FILES.get("file"), "name", "media file")
        try:
            media = serializer.save(product=product, created_by=request.user)
        except serializers.ValidationError:
            raise
        except Exception as exc:
            return Response({"file": [f"{filename}: upload failed. {exc}"]}, status=status.HTTP_400_BAD_REQUEST)
        return Response(ProductMediaSerializer(media, context={"request": request}).data, status=status.HTTP_201_CREATED)


class ProductMediaDetailAPIView(PermissionedCatalogAPIView):
    permission_map = {"DELETE": "api.change_product", "PATCH": "api.change_product"}

    def get_object(self, pk, media_id):
        return get_object_or_404(ProductMedia, product_id=pk, pk=media_id)

    def delete(self, request, pk, media_id):
        self.get_object(pk, media_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def patch(self, request, pk, media_id):
        media = self.get_object(pk, media_id)
        serializer = ProductMediaSerializer(media, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        filename = getattr(request.FILES.get("file"), "name", "media file")
        try:
            media = serializer.save()
        except serializers.ValidationError:
            raise
        except Exception as exc:
            return Response({"file": [f"{filename}: update failed. {exc}"]}, status=status.HTTP_400_BAD_REQUEST)
        return Response(ProductMediaSerializer(media, context={"request": request}).data)


class ProductMediaPrimaryAPIView(PermissionedCatalogAPIView):
    permission_map = {"PATCH": "api.change_product"}

    def patch(self, request, pk, media_id):
        media = get_object_or_404(ProductMedia, product_id=pk, pk=media_id)
        media.is_primary = True
        media.save()
        return Response(ProductMediaSerializer(media, context={"request": request}).data)
