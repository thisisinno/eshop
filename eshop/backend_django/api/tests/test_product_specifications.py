from decimal import Decimal

from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.test import TestCase
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from api.models import (
    CartItem, Product, ProductSpecificationGroup, ProductSpecificationOption,
    TraderProfile,
)
from api.services.specifications import resolve_product_specification_selection


class ProductSpecificationTests(TestCase):
    def setUp(self):
        self.store = TraderProfile.objects.create(
            trader_type=TraderProfile.TraderType.COMPANY,
            business_name="Fashion Store", phone="1",
            status=TraderProfile.Status.APPROVED,
        )
        self.product = Product.objects.create(
            trader=self.store, name="T-Shirt", price=Decimal("10000.00"),
            stock_quantity=20, status=Product.Status.ACTIVE,
            has_selectable_specifications=True,
        )
        self.size = ProductSpecificationGroup.objects.create(
            product=self.product, name="Size", selection_mode="single", is_required=True,
        )
        self.large = ProductSpecificationOption.objects.create(
            group=self.size, value="Large", price_adjustment=Decimal("1000.00"),
        )
        self.xl = ProductSpecificationOption.objects.create(
            group=self.size, value="XL", price_adjustment=Decimal("2000.00"),
        )
        self.extras = ProductSpecificationGroup.objects.create(
            product=self.product, name="Extras", selection_mode="multiple",
        )
        self.gift = ProductSpecificationOption.objects.create(
            group=self.extras, value="Gift box", price_adjustment=Decimal("-500.00"),
        )
        self.user = User.objects.create_user("buyer", password="password")
        self.client = APIClient()
        token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

    def test_positive_multiple_and_negative_adjustments(self):
        resolved = resolve_product_specification_selection(
            self.product, [self.large.id, self.gift.id]
        )
        self.assertEqual(resolved.unit_price, Decimal("10500.00"))
        self.assertEqual(len(resolved.snapshot), 2)

    def test_duplicate_ids_do_not_double_charge(self):
        resolved = resolve_product_specification_selection(
            self.product, [self.large.id, self.large.id]
        )
        self.assertEqual(resolved.unit_price, Decimal("11000.00"))

    def test_required_and_single_selection_are_enforced(self):
        with self.assertRaises(ValidationError):
            resolve_product_specification_selection(self.product, [])
        with self.assertRaises(ValidationError):
            resolve_product_specification_selection(self.product, [self.large.id, self.xl.id])

    def test_foreign_and_inactive_options_are_rejected(self):
        other = Product.objects.create(
            trader=self.store, name="Other", price=1, stock_quantity=1,
            status=Product.Status.DRAFT, has_selectable_specifications=True,
        )
        group = ProductSpecificationGroup.objects.create(product=other, name="Color")
        foreign = ProductSpecificationOption.objects.create(group=group, value="Black")
        with self.assertRaises(ValidationError):
            resolve_product_specification_selection(self.product, [foreign.id])
        self.large.is_active = False
        self.large.save()
        with self.assertRaises(ValidationError):
            resolve_product_specification_selection(self.product, [self.large.id])

    def test_no_spec_product_rejects_malicious_ids(self):
        plain = Product.objects.create(
            trader=self.store, name="Plain", price=100, stock_quantity=1,
            status=Product.Status.ACTIVE,
        )
        self.assertEqual(resolve_product_specification_selection(plain).unit_price, plain.price)
        with self.assertRaises(ValidationError):
            resolve_product_specification_selection(plain, [self.large.id])

    def test_cart_uses_authoritative_price_and_combination_identity(self):
        first = self.client.post("/api/storefront/cart/items/", {
            "product": self.product.id, "quantity": 2,
            "specification_option_ids": [self.large.id],
            "unit_price": "1.00",
        }, format="json")
        self.assertEqual(first.status_code, 201)
        self.assertEqual(first.data["items"][0]["unit_price"], "11000.00")
        self.assertEqual(first.data["items"][0]["line_total"], Decimal("22000.00"))
        second = self.client.post("/api/storefront/cart/items/", {
            "product": self.product.id, "quantity": 1,
            "specification_option_ids": [self.xl.id],
        }, format="json")
        self.assertEqual(second.status_code, 201)
        self.assertEqual(CartItem.objects.filter(cart__user=self.user).count(), 2)

    def test_same_selection_merges_cart_line(self):
        payload = {"product": self.product.id, "quantity": 1, "specification_option_ids": [self.large.id]}
        self.client.post("/api/storefront/cart/items/", payload, format="json")
        response = self.client.post("/api/storefront/cart/items/", payload, format="json")
        self.assertEqual(len(response.data["items"]), 1)
        self.assertEqual(response.data["items"][0]["quantity"], 2)

    def test_product_detail_exposes_groups_and_card_flag(self):
        detail = self.client.get(f"/api/storefront/products/{self.product.id}/")
        self.assertTrue(detail.data["has_selectable_specifications"])
        self.assertEqual(detail.data["specification_groups"][0]["name"], "Size")
        card = self.client.get("/api/storefront/products/").data["results"][0]
        self.assertIn("has_selectable_specifications", card)
