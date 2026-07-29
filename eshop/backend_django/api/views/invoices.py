from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import Invoice
from api.serializers.invoices import InvoiceDetailSerializer, InvoiceListSerializer
from api.services.invoice_pdf import render_invoice_pdf
from api.services.invoices import create_order_invoice, create_proforma_from_cart


class CustomerInvoicesAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        invoices = request.user.invoices.select_related("order").prefetch_related("items")
        return Response(InvoiceListSerializer(invoices, many=True).data)


class CustomerInvoiceFromCartAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        invoice, created = create_proforma_from_cart(request.user)
        return Response(InvoiceDetailSerializer(invoice).data,
                        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class CustomerInvoiceDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, invoice_id):
        invoice = get_object_or_404(
            request.user.invoices.select_related("order").prefetch_related("items"), pk=invoice_id
        )
        return Response(InvoiceDetailSerializer(invoice).data)


class CustomerInvoicePDFAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, invoice_id):
        queryset = Invoice.objects.select_related("order").prefetch_related("items")
        if not (request.user.is_superuser or request.user.has_perm("api.view_invoice")):
            queryset = queryset.filter(customer_user=request.user)
        invoice = get_object_or_404(queryset, pk=invoice_id)
        response = HttpResponse(render_invoice_pdf(invoice), content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="SmartWear-{invoice.invoice_number}.pdf"'
        response["Cache-Control"] = "private, no-store"
        response["X-Content-Type-Options"] = "nosniff"
        return response


class AdminInvoicesAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not (request.user.is_superuser or request.user.has_perm("api.view_invoice")):
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        queryset = Invoice.objects.select_related("order", "customer_user")
        if query := request.query_params.get("q"):
            queryset = queryset.filter(invoice_number__icontains=query)
        if kind := request.query_params.get("type"):
            queryset = queryset.filter(document_type=kind)
        if invoice_status := request.query_params.get("status"):
            queryset = queryset.filter(status=invoice_status)
        return Response(InvoiceListSerializer(queryset, many=True).data)


class AdminInvoiceDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, invoice_id):
        if not (request.user.is_superuser or request.user.has_perm("api.view_invoice")):
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        invoice = get_object_or_404(Invoice.objects.prefetch_related("items"), pk=invoice_id)
        return Response(InvoiceDetailSerializer(invoice).data)

    def post(self, request, invoice_id):
        if not (request.user.is_superuser or request.user.has_perm("api.change_invoice")):
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        invoice = get_object_or_404(Invoice, pk=invoice_id)
        action = request.data.get("action")
        if action == "paid":
            invoice.status = Invoice.Status.PAID
            invoice.paid_at = timezone.now()
        elif action == "void":
            invoice.status = Invoice.Status.VOID
            invoice.voided_at = timezone.now()
            invoice.void_reason = str(request.data.get("reason", ""))[:500]
        else:
            return Response({"action": "Use paid or void."}, status=status.HTTP_400_BAD_REQUEST)
        invoice.save()
        return Response(InvoiceDetailSerializer(invoice).data)

