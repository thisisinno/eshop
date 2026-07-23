from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from api.models import Order, Product, TraderProfile
from api.services.orders import create_order


class OrderAPITests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.admin = User.objects.create_superuser(username="admin", email="admin@example.com", password="pass")
        self.user = User.objects.create_user(username="plain", password="pass", is_staff=True)
        self.token = Token.objects.create(user=self.admin)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")
        self.trader = TraderProfile.objects.create(trader_type="company", business_name="Acme Traders", phone="123456")
        self.product = Product.objects.create(trader=self.trader, name="Rice", sku="RICE-1", price=Decimal("100.00"), stock_quantity=10)

    def test_create_order_api_and_filters(self):
        response = self.client.post("/api/orders/", {
            "customer_full_name": "Jane Customer",
            "customer_phone": "255700000001",
            "customer_email": "jane@example.com",
            "delivery_fee": "10.00",
            "items": [{"product": self.product.id, "quantity": 2, "unit_price": "100.00", "line_discount": "20.00"}],
        }, format="json")

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["total_amount"], "190.00")
        self.assertEqual(response.data["items_count"], 1)
        self.assertEqual(response.data["total_quantity"], 2)

        filtered = self.client.get("/api/orders/", {"search": "Rice", "status": "requested", "customer_phone": "255700"})
        self.assertEqual(filtered.status_code, 200)
        self.assertEqual(len(filtered.data), 1)
        self.assertEqual(filtered.data[0]["preview_items"][0]["product_name"], "Rice")

    def test_order_list_preview_uses_prefetched_items(self):
        for index in range(3):
            create_order({
                "customer_full_name": f"Customer {index}",
                "customer_phone": f"25570000000{index}",
                "customer_email": "",
                "delivery_fee": Decimal("0.00"),
            }, [{"product": self.product, "quantity": 1, "unit_price": Decimal("100.00")}], user=self.admin)

        with CaptureQueriesContext(connection) as captured:
            response = self.client.get("/api/orders/")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data[0]["preview_items"])
        self.assertLessEqual(len(captured), 10)

    def test_status_action_validates_transitions(self):
        order = create_order({
            "customer_full_name": "Jane Customer",
            "customer_phone": "255700000001",
            "customer_email": "",
            "delivery_fee": Decimal("0.00"),
        }, [{"product": self.product, "quantity": 1, "unit_price": Decimal("100.00")}], user=self.admin)

        invalid = self.client.patch(f"/api/orders/{order.id}/deliver/", {}, format="json")
        self.assertEqual(invalid.status_code, 400)
        self.assertIn("status", invalid.data)

        valid = self.client.patch(f"/api/orders/{order.id}/confirm/", {"note": "stock checked"}, format="json")
        self.assertEqual(valid.status_code, 200)
        self.assertEqual(valid.data["status"], Order.Status.CONFIRMED)
        self.assertEqual(len(valid.data["status_history"]), 2)

    def test_permission_enforced(self):
        token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
        response = self.client.get("/api/orders/")

        self.assertEqual(response.status_code, 403)
