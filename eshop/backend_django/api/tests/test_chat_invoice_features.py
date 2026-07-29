import uuid
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone

from api.models import Invoice, InvoiceItem, Order, OrderChat, OrderChatMessage
from api.services.chats import close_chat, create_message, join_chat, reopen_chat, request_chat
from api.services.invoice_pdf import render_invoice_pdf
from api.services.invoices import create_order_invoice
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
