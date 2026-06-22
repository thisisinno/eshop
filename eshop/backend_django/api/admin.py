from django.contrib import admin

from .models import Product, ProductCategory, ProductMedia, TraderAgreement, TraderBranch, TraderDocument, TraderProfile


@admin.register(TraderProfile)
class TraderProfileAdmin(admin.ModelAdmin):
    list_display = ("business_name", "trader_code", "trader_type", "phone", "status", "is_verified", "is_featured", "created_at")
    list_filter = ("trader_type", "status", "is_verified", "is_featured", "region")
    search_fields = ("business_name", "trader_code", "owner_full_name", "phone", "email", "tin_number", "registration_number")
    readonly_fields = ("trader_code", "created_at", "updated_at", "approved_at")


@admin.register(TraderAgreement)
class TraderAgreementAdmin(admin.ModelAdmin):
    list_display = ("trader", "status", "commission_type", "commission_value", "start_date", "end_date")
    list_filter = ("status", "commission_type")
    search_fields = ("trader__business_name", "title")


@admin.register(TraderDocument)
class TraderDocumentAdmin(admin.ModelAdmin):
    list_display = ("title", "trader", "document_type", "verified", "uploaded_at")
    list_filter = ("document_type", "verified")
    search_fields = ("title", "trader__business_name")


@admin.register(TraderBranch)
class TraderBranchAdmin(admin.ModelAdmin):
    list_display = ("name", "trader", "region", "district", "is_main_branch", "is_active")
    list_filter = ("region", "is_main_branch", "is_active")
    search_fields = ("name", "trader__business_name", "phone", "email")


@admin.register(ProductCategory)
class ProductCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "parent", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("name", "slug")
    readonly_fields = ("slug", "created_at", "updated_at")


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("product_id", "name", "trader", "branch", "price", "compare_at_price", "status", "is_featured", "position", "created_at")
    list_filter = ("status", "is_featured", "category", "trader")
    search_fields = ("product_id", "name", "sku", "trader__business_name")
    readonly_fields = ("product_id", "slug", "created_at", "updated_at")


@admin.register(ProductMedia)
class ProductMediaAdmin(admin.ModelAdmin):
    list_display = ("product", "media_type", "is_primary", "sort_order", "created_at")
    list_filter = ("media_type", "is_primary")
    search_fields = ("product__product_id", "product__name", "title")
