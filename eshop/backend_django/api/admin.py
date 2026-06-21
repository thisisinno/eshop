from django.contrib import admin

from .models import TraderAgreement, TraderBranch, TraderDocument, TraderProfile


@admin.register(TraderProfile)
class TraderProfileAdmin(admin.ModelAdmin):
    list_display = ("business_name", "trader_type", "phone", "status", "is_verified", "is_featured", "created_at")
    list_filter = ("trader_type", "status", "is_verified", "is_featured", "region")
    search_fields = ("business_name", "owner_full_name", "phone", "email", "tin_number", "registration_number")
    readonly_fields = ("created_at", "updated_at", "approved_at")


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
