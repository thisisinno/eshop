import uuid
from decimal import Decimal
from io import BytesIO
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone
from PIL import Image as PillowImage

from api.models import Invoice, InvoiceItem, Order, OrderChat, OrderChatMessage
from api.services.chats import close_chat, create_message, join_chat, reopen_chat, request_chat
from api.services.invoice_pdf import render_invoice_pdf
from api.services.invoices import create_order_invoice
from api.services.pdf_assets import PDFImageLoader, _normalize_image, is_safe_remote_image_url
from rest_framework.test import APIClient


@override_settings(CHANNEL_LAYERS={"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}})
class ChatInvoiceFeatureTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.customer = User.objects.create_user("customer", email="customer@example.com")
        self.other = User.objects.create_user("other")
        self.admin = User.objects.create_superuser("admin", "admin@example.com", "password")
        self.order = Order.objects.create(
            order_number="ORD-2026-000001", customer_user=self.customer,
            customer_full_name="Smart Customer", customer_phone="0712345678",
            customer_email="customer@example.com", subtotal_amount=Decimal("100.00"),
            delivery_fee=Decimal("10.00"), total_amount=Decimal("110.00"),
        )

    def test_request_is_owned_and_unique(self):
        chat, created = request_chat(self.order)
        self.assertTrue(created)
        again, created = request_chat(self.order)
        self.assertFalse(created)
        self.assertEqual(chat.id, again.id)
        self.assertEqual(chat.customer_user, self.customer)
        self.assertEqual(chat.participants.get().user, self.customer)

    def test_join_does_not_steal_assignment(self):
        chat, _ = request_chat(self.order)
        join_chat(chat.id, self.admin)
        second_admin = get_user_model().objects.create_superuser(
            "admin2", "admin2@example.com", "password"
        )
        with self.assertRaises(Exception):
            join_chat(chat.id, second_admin)
        chat.refresh_from_db()
        self.assertEqual(chat.assigned_admin, self.admin)

    def test_message_is_idempotent_and_plain_text(self):
        chat, _ = request_chat(self.order)
        client_id = uuid.uuid4()
        first, created = create_message(chat, self.customer, "<b>plain</b>", client_id)
        second, duplicate_created = create_message(chat, self.customer, "<b>plain</b>", client_id)
        self.assertTrue(created)
        self.assertFalse(duplicate_created)
        self.assertEqual(first.id, second.id)
        self.assertEqual(chat.messages.count(), 1)
        self.assertEqual(first.body, "<b>plain</b>")

    def test_close_rejects_message_and_reopen_preserves_history(self):
        chat, _ = request_chat(self.order)
        join_chat(chat.id, self.admin)
        create_message(chat, self.customer, "Before close", uuid.uuid4())
        close_chat(chat.id, self.admin, "Resolved")
        chat.refresh_from_db()
        with self.assertRaises(Exception):
            create_message(chat, self.customer, "Too late", uuid.uuid4())
        reopened = reopen_chat(chat, self.customer)
        self.assertEqual(reopened.status, OrderChat.Status.REQUESTED)
        self.assertEqual(reopened.messages.count(), 1)

    def test_final_invoice_uses_order_snapshots_and_is_unique(self):
        invoice, created = create_order_invoice(self.order)
        duplicate, duplicate_created = create_order_invoice(self.order)
        self.assertTrue(created)
        self.assertFalse(duplicate_created)
        self.assertEqual(invoice.id, duplicate.id)
        self.assertEqual(invoice.total_amount, self.order.total_amount)
        self.assertEqual(invoice.customer_name_snapshot, self.order.customer_full_name)

    def test_pdf_has_signature_and_snapshot_text(self):
        invoice, _ = create_order_invoice(self.order)
        InvoiceItem.objects.create(
            invoice=invoice, product_name_snapshot="Snapshot Jacket",
            quantity=2, unit_price=Decimal("50.00"), line_total=Decimal("100.00"),
        )
        pdf = render_invoice_pdf(Invoice.objects.prefetch_related("items").get(pk=invoice.pk))
        self.assertTrue(pdf.startswith(b"%PDF"))
        self.assertGreater(len(pdf), 1000)

    def test_customer_order_list_includes_annotated_chat_summary(self):
        chat, _ = request_chat(self.order)
        create_message(chat, self.admin, "Your order is ready", uuid.uuid4())
        client = APIClient()
        client.force_authenticate(self.customer)
        response = client.get("/api/storefront/orders/mine/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data[0]["chat"]["id"], chat.id)
        self.assertEqual(response.data[0]["chat"]["unread_count"], 1)
        self.assertEqual(response.data[0]["chat"]["latest_message_preview"], "Your order is ready")

    def test_customer_detail_contains_ordered_transcript_without_internal_audit(self):
        self.order.admin_note = "private admin note"
        self.order.requested_ip_address = "192.0.2.10"
        self.order.requested_user_agent = "private agent"
        self.order.requested_browser = "private browser"
        self.order.requested_os = "private os"
        self.order.save()
        chat, _ = request_chat(self.order)
        join_chat(chat.id, self.admin)
        customer_message, _ = create_message(chat, self.customer, "Customer transcript", uuid.uuid4())
        admin_message, _ = create_message(chat, self.admin, "Administrator transcript", uuid.uuid4())
        close_chat(chat.id, self.admin, "Everything delivered")
        invoice, _ = create_order_invoice(self.order)
        invoice.status = Invoice.Status.PAID
        invoice.paid_at = timezone.now()
        invoice.save()

        client = APIClient()
        client.force_authenticate(self.customer)
        response = client.get(f"/api/storefront/orders/mine/{self.order.id}/")
        self.assertEqual(response.status_code, 200)
        for field in (
            "admin_note", "requested_ip_address", "requested_user_agent",
            "requested_device", "requested_browser", "requested_os",
        ):
            self.assertNotIn(field, response.data)
        events = response.data["journey"]
        self.assertEqual(
            [event["created_at"] for event in events],
            sorted(event["created_at"] for event in events),
        )
        messages = [event for event in events if event["event_type"] == "chat_message"]
        self.assertEqual([event["id"] for event in messages], [
            f"chat-message-{customer_message.id}", f"chat-message-{admin_message.id}",
        ])
        self.assertEqual([event["actor_role"] for event in messages], ["customer", "admin"])
        self.assertTrue(any(event["metadata"].get("close_reason") == "Everything delivered" for event in events))
        self.assertTrue(any(event["event_type"] == "invoice_issued" for event in events))
        self.assertTrue(any(event["event_type"] == "invoice_paid" for event in events))

    def test_customer_cannot_read_another_customers_detail_or_transcript(self):
        chat, _ = request_chat(self.order)
        create_message(chat, self.customer, "Owner only transcript", uuid.uuid4())
        client = APIClient()
        client.force_authenticate(self.other)
        response = client.get(f"/api/storefront/orders/mine/{self.order.id}/")
        self.assertEqual(response.status_code, 404)
        self.assertNotIn(b"Owner only transcript", response.content)

    def test_order_history_export_is_scoped_to_authenticated_customer(self):
        other_order = Order.objects.create(
            order_number="ORD-2026-000002", customer_user=self.other,
            customer_full_name="Other Customer", customer_phone="0700000000",
            subtotal_amount=Decimal("90.00"), total_amount=Decimal("90.00"),
        )
        captured = {}

        def fake_render(user, orders):
            captured["user"] = user
            captured["ids"] = list(orders.values_list("id", flat=True))
            return b"%PDF-1.4 customer export"

        client = APIClient()
        client.force_authenticate(self.customer)
        with patch("api.views.invoices.render_order_history_pdf", side_effect=fake_render):
            response = client.get("/api/storefront/orders/mine/export/pdf/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(captured["user"], self.customer)
        self.assertEqual(captured["ids"], [self.order.id])
        self.assertNotIn(other_order.id, captured["ids"])
        self.assertEqual(response["Cache-Control"], "private, no-store")

    def test_order_history_pdf_contains_status_and_conversation(self):
        chat, _ = request_chat(self.order)
        create_message(chat, self.customer, "Transcript marker 8675309", uuid.uuid4())
        client = APIClient()
        client.force_authenticate(self.customer)
        response = client.get("/api/storefront/orders/mine/export/pdf/")
        self.assertTrue(response.content.startswith(b"%PDF"))
        self.assertIn(b"Transcript marker 8675309", response.content)
        self.assertIn(b"Order Requested", response.content)

    @staticmethod
    def _image_bytes(image_format="PNG"):
        output = BytesIO()
        PillowImage.new("RGB", (24, 16), "black").save(output, format=image_format)
        return output.getvalue()

    def test_invoice_pdf_embeds_valid_logo_and_product_images(self):
        invoice, _ = create_order_invoice(self.order)
        InvoiceItem.objects.create(
            invoice=invoice, product_name_snapshot="Image product",
            quantity=1, unit_price=Decimal("10.00"), line_total=Decimal("10.00"),
        )
        image = self._image_bytes()
        with patch.object(PDFImageLoader, "load", side_effect=lambda *args, **kwargs: BytesIO(image)):
            pdf = render_invoice_pdf(Invoice.objects.prefetch_related("items__product__media").get(pk=invoice.pk))
        self.assertIn(b"/Subtype /Image", pdf)

    def test_invalid_or_missing_invoice_images_do_not_break_pdf(self):
        invoice, _ = create_order_invoice(self.order)
        InvoiceItem.objects.create(
            invoice=invoice, product_name_snapshot="No image product",
            product_media_url="https://invalid.example/image.jpg",
            quantity=1, unit_price=Decimal("10.00"), line_total=Decimal("10.00"),
        )
        with patch.object(PDFImageLoader, "load", return_value=None):
            pdf = render_invoice_pdf(Invoice.objects.prefetch_related("items__product__media").get(pk=invoice.pk))
        self.assertTrue(pdf.startswith(b"%PDF"))

    def test_webp_is_converted_to_reportlab_safe_stream(self):
        normalized = _normalize_image(self._image_bytes("WEBP"))
        self.assertIsNotNone(normalized)
        with PillowImage.open(normalized) as converted:
            self.assertIn(converted.format, ("JPEG", "PNG"))

    @override_settings(PDF_IMAGE_ALLOWED_HOSTS=("media.example.com",))
    def test_remote_image_host_restrictions_reject_unsafe_hosts(self):
        self.assertFalse(is_safe_remote_image_url("http://media.example.com/image.png"))
        self.assertFalse(is_safe_remote_image_url("https://localhost/image.png"))
        self.assertFalse(is_safe_remote_image_url("https://127.0.0.1/image.png"))
        with patch("api.services.pdf_assets.socket.getaddrinfo", return_value=[
            (2, 1, 6, "", ("10.0.0.2", 443)),
        ]):
            self.assertFalse(is_safe_remote_image_url("https://media.example.com/image.png"))
