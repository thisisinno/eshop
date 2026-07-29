from rest_framework import serializers

from api.models import Invoice, InvoiceItem


class InvoiceItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceItem
        fields = (
            "id", "product_id_snapshot", "product_name_snapshot", "product_sku_snapshot",
            "product_media_url", "trader_name_snapshot", "selected_specifications_snapshot",
            "quantity", "unit_price", "line_discount", "line_total", "sort_order",
        )


class InvoiceListSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(source="order.order_number", read_only=True)
    pdf_url = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = (
            "id", "invoice_number", "document_type", "status", "currency",
            "total_amount", "order", "order_number", "issued_at", "pdf_url",
        )

    def get_pdf_url(self, obj):
        return f"/api/storefront/invoices/mine/{obj.id}/pdf/"


class InvoiceDetailSerializer(InvoiceListSerializer):
    items = InvoiceItemSerializer(many=True, read_only=True)

    class Meta(InvoiceListSerializer.Meta):
        fields = InvoiceListSerializer.Meta.fields + (
            "subtotal_amount", "discount_amount", "delivery_fee",
            "customer_name_snapshot", "customer_email_snapshot", "customer_phone_snapshot",
            "customer_address_snapshot", "company_name_snapshot", "items",
        )

