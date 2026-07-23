from decimal import Decimal

from django.contrib.auth.models import Permission, User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from api.models import Cart, CartItem, Product, ProductCategory, ProductMedia, StoreFollow, TraderProfile


class StorefrontAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.category = ProductCategory.objects.create(name="Phones", is_active=True)
        self.store = TraderProfile.objects.create(trader_type=TraderProfile.TraderType.COMPANY, business_name="Approved Store", phone="123", status=TraderProfile.Status.APPROVED)
        self.pending_store = TraderProfile.objects.create(trader_type=TraderProfile.TraderType.COMPANY, business_name="Pending Store", phone="124", status=TraderProfile.Status.PENDING)
        self.product = Product.objects.create(trader=self.store, category=self.category, name="Active Phone", price=Decimal("100.00"), stock_quantity=5, status=Product.Status.ACTIVE)
        self.draft = Product.objects.create(trader=self.store, category=self.category, name="Draft Phone", price=Decimal("90.00"), stock_quantity=5, status=Product.Status.DRAFT)
        self.pending_store_product = Product.objects.create(trader=self.pending_store, category=self.category, name="Hidden Phone", price=Decimal("80.00"), stock_quantity=5, status=Product.Status.ACTIVE)
        self.customer = User.objects.create_user(username="customer", password="password123", email="c@example.com")
        self.staff = User.objects.create_user(username="staff", password="password123", is_staff=True)
        self.staff.user_permissions.add(Permission.objects.get(codename="add_product"))

    def auth(self, user):
        token, _ = Token.objects.get_or_create(user=user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

    def test_public_signup_creates_non_staff_customer(self):
        response = self.client.post("/api/auth/signup/", {"username": "newcustomer", "email": "new@example.com", "password": "password123", "confirm_password": "password123"}, format="json")
        self.assertEqual(response.status_code, 201)
        user = User.objects.get(username="newcustomer")
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertTrue(user.is_active)

    def test_customer_cannot_access_admin_catalog_creation(self):
        self.auth(self.customer)
        response = self.client.post("/api/catalog/products/", {"trader": self.store.id, "category": self.category.id, "name": "Nope", "price": "12.00", "stock_quantity": 1}, format="json")
        self.assertEqual(response.status_code, 403)

    def test_staff_with_add_product_permission_can_create_products(self):
        self.auth(self.staff)
        response = self.client.post("/api/catalog/products/", {"trader": self.store.id, "category": self.category.id, "name": "Staff Product", "price": "12.00", "stock_quantity": 1}, format="json")
        self.assertEqual(response.status_code, 201)

    def test_anonymous_public_list_filters_visibility_and_private_fields(self):
        response = self.client.get("/api/storefront/products/")
        self.assertEqual(response.status_code, 200)
        names = [item["name"] for item in response.data["results"]]
        self.assertIn(self.product.name, names)
        self.assertNotIn(self.draft.name, names)
        self.assertNotIn(self.pending_store_product.name, names)
        self.assertNotIn("cost_price", response.data["results"][0])

    def test_follow_unfollow_is_unique_and_counts(self):
        self.auth(self.customer)
        first = self.client.post(f"/api/storefront/stores/{self.store.slug}/follow/")
        second = self.client.post(f"/api/storefront/stores/{self.store.slug}/follow/")
        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 201)
        self.assertEqual(StoreFollow.objects.filter(user=self.customer, trader=self.store).count(), 1)
        detail = self.client.get(f"/api/storefront/stores/{self.store.slug}/")
        self.assertEqual(detail.data["store"]["follower_count"], 1)
        self.client.delete(f"/api/storefront/stores/{self.store.slug}/follow/")
        self.assertFalse(StoreFollow.objects.filter(user=self.customer, trader=self.store).exists())

    def test_store_detail_returns_only_public_products(self):
        response = self.client.get(f"/api/storefront/stores/{self.store.slug}/")
        names = [item["name"] for item in response.data["results"]]
        self.assertEqual(names, [self.product.name])

    def test_product_bookmark_works(self):
        self.auth(self.customer)
        response = self.client.post(f"/api/storefront/products/{self.product.id}/bookmark/")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(self.product.bookmarks.count(), 1)

    def test_cart_quantity_and_stock_validation(self):
        self.auth(self.customer)
        response = self.client.post("/api/storefront/cart/items/", {"product": self.product.id, "quantity": 99}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_customer_order_totals_and_ownership(self):
        cart = Cart.objects.create(user=self.customer)
        CartItem.objects.create(cart=cart, product=self.product, quantity=2)
        self.auth(self.customer)
        response = self.client.post("/api/storefront/orders/", {"customer_full_name": "Customer One", "customer_phone": "555"}, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["total_amount"], "200.00")
        other = User.objects.create_user(username="other", password="password123")
        self.auth(other)
        forbidden = self.client.get(f"/api/storefront/orders/mine/{response.data['id']}/")
        self.assertEqual(forbidden.status_code, 404)

    def test_media_validation_and_primary_behavior(self):
        image = SimpleUploadedFile("frame.jpg", b"x", content_type="image/jpeg")
        media = ProductMedia.objects.create(product=self.product, media_type=ProductMedia.MediaType.SPIN_FRAME, file=image, sort_order=1)
        self.assertEqual(media.frame_index, 1)
        bad = ProductMedia(product=self.product, media_type=ProductMedia.MediaType.MODEL_3D, file=SimpleUploadedFile("model.obj", b"x"))
        with self.assertRaises(Exception):
            bad.full_clean()
        primary_one = ProductMedia.objects.create(product=self.product, media_type=ProductMedia.MediaType.IMAGE, file=SimpleUploadedFile("one.jpg", b"x"), is_primary=True)
        primary_two = ProductMedia.objects.create(product=self.product, media_type=ProductMedia.MediaType.IMAGE, file=SimpleUploadedFile("two.jpg", b"x"), is_primary=True)
        primary_one.refresh_from_db()
        self.assertFalse(primary_one.is_primary)
        self.assertTrue(primary_two.is_primary)

    def test_home_recommendations_return_active_products(self):
        response = self.client.get("/api/storefront/home/")
        self.assertEqual(response.status_code, 200)
        returned = [product for shelf in response.data["shelves"] for product in shelf["products"]]
        self.assertTrue(returned)
        self.assertTrue(all("cost_price" not in product for product in returned))
