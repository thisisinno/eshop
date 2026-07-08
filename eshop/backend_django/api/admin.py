from django.contrib import admin

from .models import (
    AdminActivityLog, Order, OrderItem, OrderStatusHistory, Product, ProductCategory,
    ProductMedia, SystemRequestLog, TraderAgreement, TraderBranch, TraderDocument,
    TraderProfile, UserActivityLog,
)


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


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ("line_total", "created_at", "updated_at")


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("order_number", "customer_full_name", "customer_phone", "status", "payment_status", "total_amount", "items_count", "created_at")
    list_filter = ("status", "payment_status", "source", "created_at")
    search_fields = ("order_number", "customer_full_name", "customer_phone", "customer_email", "items__product_name_snapshot")
    readonly_fields = ("order_number", "subtotal_amount", "discount_amount", "total_amount", "items_count", "created_at", "updated_at")
    inlines = [OrderItemInline]


@admin.register(OrderStatusHistory)
class OrderStatusHistoryAdmin(admin.ModelAdmin):
    list_display = ("order", "from_status", "to_status", "changed_by", "created_at")
    list_filter = ("to_status", "created_at")
    search_fields = ("order__order_number", "note")


@admin.register(UserActivityLog)
class UserActivityLogAdmin(admin.ModelAdmin):
    list_display = ("action", "username_snapshot", "product", "trader", "ip_address", "device_type", "created_at")
    list_filter = ("action", "device_type", "created_at")
    search_fields = ("username_snapshot", "session_key", "product__name", "search_query", "ip_address")


@admin.register(AdminActivityLog)
class AdminActivityLogAdmin(admin.ModelAdmin):
    list_display = ("actor_username", "module", "action", "object_type", "object_id", "status_code", "created_at")
    list_filter = ("module", "action", "status_code", "created_at")
    search_fields = ("actor_username", "object_type", "object_id", "object_repr", "ip_address")


@admin.register(SystemRequestLog)
class SystemRequestLogAdmin(admin.ModelAdmin):
    list_display = ("method", "path", "username_snapshot", "status_code", "duration_ms", "is_error", "created_at")
    list_filter = ("method", "status_code", "is_error", "created_at")
    search_fields = ("path", "username_snapshot", "ip_address", "error_message")
