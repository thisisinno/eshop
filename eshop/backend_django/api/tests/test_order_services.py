from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import serializers

from api.models import Order, OrderItem, OrderStatusHistory, Product, TraderProfile
from api.services.orders import create_order, next_order_number, transition_order, update_order


class OrderServiceTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="admin", password="pass", is_staff=True)
        self.trader = TraderProfile.objects.create(trader_type="company", business_name="Acme Traders", phone="123456")
        self.product = Product.objects.create(trader=self.trader, name="Rice", sku="RICE-1", price=Decimal("100.00"), stock_quantity=10)
        self.other_product = Product.objects.create(trader=self.trader, name="Beans", sku="BEAN-1", price=Decimal("50.00"), stock_quantity=10)

    def payload(self, items=None, **extra):
        data = {
            "customer_full_name": "Jane Customer",
            "customer_phone": "255700000001",
            "customer_email": "jane@example.com",
            "status": Order.Status.REQUESTED,
            "payment_status": Order.PaymentStatus.UNPAID,
            "source": Order.Source.ADMIN,
            "currency": "TZS",
            "delivery_fee": Decimal("10.00"),
        }
        data.update(extra)
        return data, items if items is not None else [{"product": self.product, "quantity": 2, "unit_price": Decimal("100.00"), "line_discount": Decimal("20.00")}]

    def test_create_order_with_one_item_totals_snapshot_and_initial_history(self):
        data, items = self.payload()
        order = create_order(data, items, user=self.user)

        self.assertTrue(order.order_number.startswith("ORD-"))
        self.assertEqual(order.items_count, 1)
        self.assertEqual(order.total_quantity, 2)
        self.assertEqual(order.subtotal_amount, Decimal("200.00"))
        self.assertEqual(order.discount_amount, Decimal("20.00"))
        self.assertEqual(order.total_amount, Decimal("190.00"))
        item = order.items.get()
        self.assertEqual(item.product_name_snapshot, "Rice")
        self.assertEqual(item.product_sku_snapshot, "RICE-1")
        self.assertEqual(item.trader_name_snapshot, "Acme Traders")
        self.assertEqual(order.status_history.get().from_status, "")
        self.assertEqual(order.status_history.get().to_status, Order.Status.REQUESTED)

    def test_create_order_with_multiple_items(self):
        data, items = self.payload(items=[
            {"product": self.product, "quantity": 2, "unit_price": Decimal("100.00"), "line_discount": Decimal("0.00")},
            {"product": self.other_product, "quantity": 3, "unit_price": Decimal("50.00"), "line_discount": Decimal("10.00")},
        ])
        order = create_order(data, items, user=self.user)

        self.assertEqual(order.items_count, 2)
        self.assertEqual(order.total_quantity, 5)
        self.assertEqual(order.subtotal_amount, Decimal("350.00"))
        self.assertEqual(order.discount_amount, Decimal("10.00"))
        self.assertEqual(order.total_amount, Decimal("350.00"))

    def test_snapshot_remains_after_product_change_and_delete(self):
        data, items = self.payload()
        order = create_order(data, items, user=self.user)
        self.product.name = "Changed"
        self.product.save()
        self.product.delete()

        item = OrderItem.objects.get(order=order)
        self.assertIsNone(item.product)
        self.assertEqual(item.product_name_snapshot, "Rice")

    def test_valid_and_invalid_status_transition_lifecycle_timestamps(self):
        data, items = self.payload()
        order = create_order(data, items, user=self.user)
        transition_order(order, Order.Status.CONFIRMED, user=self.user, note="ok")
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.CONFIRMED)
        self.assertIsNotNone(order.confirmed_at)
        self.assertEqual(order.status_history.count(), 2)

        with self.assertRaises(serializers.ValidationError):
            transition_order(order, Order.Status.DELIVERED, user=self.user)

    def test_nested_item_create_update_delete_and_wrong_id_rejection(self):
        data, items = self.payload()
        order = create_order(data, items, user=self.user)
        existing = order.items.get()
        other_data, other_items = self.payload(customer_phone="255700000002")
        other_order = create_order(other_data, other_items, user=self.user)
        other_item = other_order.items.get()

        update_order(order, {}, items=[
            {"id": existing.id, "product": self.product, "quantity": 4, "unit_price": Decimal("90.00"), "line_discount": Decimal("0.00")},
            {"product": self.other_product, "quantity": 1, "unit_price": Decimal("50.00"), "line_discount": Decimal("0.00")},
        ], user=self.user)
        order.refresh_from_db()
        self.assertEqual(order.items_count, 2)
        self.assertTrue(order.items.filter(id=existing.id, quantity=4).exists())

        with self.assertRaises(serializers.ValidationError):
            update_order(order, {}, items=[{"id": other_item.id, "product": self.product, "quantity": 1, "unit_price": Decimal("1.00")}], user=self.user)

    def test_transaction_rolls_back_when_item_is_invalid(self):
        data, _ = self.payload()
        with self.assertRaises(serializers.ValidationError):
            create_order(data, [{"product": self.product, "quantity": 1, "unit_price": Decimal("10.00"), "line_discount": Decimal("20.00")}], user=self.user)
        self.assertEqual(Order.objects.count(), 0)

    def test_order_number_sequence_is_monotonic_and_unique(self):
        first = next_order_number()
        second = next_order_number()
        self.assertNotEqual(first, second)
        self.assertLess(first, second)

    def test_deleting_order_cascades_items_and_history(self):
        data, items = self.payload()
        order = create_order(data, items, user=self.user)
        order_id = order.id
        order.delete()

        self.assertFalse(OrderItem.objects.filter(order_id=order_id).exists())
        self.assertFalse(OrderStatusHistory.objects.filter(order_id=order_id).exists())

    def test_logging_failure_does_not_break_order_creation(self):
        data, items = self.payload()
        order = create_order(data, items, user=self.user, request=object())
        self.assertTrue(Order.objects.filter(order_number=order.order_number).exists())
