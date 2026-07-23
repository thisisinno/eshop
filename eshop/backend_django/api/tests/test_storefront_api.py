from decimal import Decimal

from django.contrib.auth.models import Permission, User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from api.models import BrandStatus, Cart, CartItem, Order, Product, ProductBookmark, ProductCategory, ProductMedia, SiteBranding, StoreFollow, TraderProfile, UserActivityLog, UserNotification
from api.services.notifications import create_activity_notification, notify_admin_of_new_order, sync_order_notification
from api.services.orders import transition_order


@override_settings(MEDIA_ROOT="/tmp/eshop-test-media")
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
        self.staff.user_permissions.add(Permission.objects.get(codename="change_sitebranding"))
        self.staff.user_permissions.add(Permission.objects.get(codename="add_brandstatus"))

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

    def test_bookmark_list_endpoint_auth_visibility_and_privacy(self):
        anonymous = self.client.get("/api/storefront/bookmarks/")
        self.assertIn(anonymous.status_code, (401, 403))

        self.auth(self.customer)
        response = self.client.get("/api/storefront/bookmarks/")
        self.assertEqual(response.status_code, 200)

        self.client.post(f"/api/storefront/products/{self.product.id}/bookmark/")
        response = self.client.get("/api/storefront/bookmarks/")
        names = [item["name"] for item in response.data["results"]]
        self.assertIn(self.product.name, names)

        self.client.delete(f"/api/storefront/products/{self.product.id}/bookmark/")
        response = self.client.get("/api/storefront/bookmarks/")
        names = [item["name"] for item in response.data["results"]]
        self.assertNotIn(self.product.name, names)

        ProductBookmark.objects.create(user=self.customer, product=self.product)
        other = User.objects.create_user(username="other-list", password="password123")
        self.auth(other)
        response = self.client.get("/api/storefront/bookmarks/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["results"], [])

    def test_bookmark_list_excludes_inactive_and_unapproved_store_products(self):
        ProductBookmark.objects.create(user=self.customer, product=self.product)
        ProductBookmark.objects.create(user=self.customer, product=self.draft)
        ProductBookmark.objects.create(user=self.customer, product=self.pending_store_product)
        self.auth(self.customer)
        response = self.client.get("/api/storefront/bookmarks/")
        self.assertEqual(response.status_code, 200)
        names = [item["name"] for item in response.data["results"]]
        self.assertEqual(names, [self.product.name])

    def test_action_notifications_and_passive_activity_rules(self):
        self.auth(self.customer)
        self.client.post(f"/api/storefront/products/{self.product.id}/bookmark/")
        self.client.delete(f"/api/storefront/products/{self.product.id}/bookmark/")
        self.client.post("/api/storefront/cart/items/", {"product": self.product.id, "quantity": 1}, format="json")
        item = CartItem.objects.get(cart__user=self.customer, product=self.product)
        self.client.patch(f"/api/storefront/cart/items/{item.id}/", {"quantity": 2}, format="json")
        self.client.delete(f"/api/storefront/cart/items/{item.id}/")
        self.client.post(f"/api/storefront/stores/{self.store.slug}/follow/")
        titles = list(UserNotification.objects.filter(recipient=self.customer, notification_type__in=("my_list", "cart")).values_list("title", flat=True))
        self.assertEqual(titles, [])
        for action in (
            UserActivityLog.Action.BOOKMARK,
            UserActivityLog.Action.UNBOOKMARK,
            UserActivityLog.Action.ADD_TO_CART,
            UserActivityLog.Action.CART_QUANTITY_CHANGE,
            UserActivityLog.Action.REMOVE_FROM_CART,
            UserActivityLog.Action.STORE_FOLLOW,
        ):
            self.assertTrue(UserActivityLog.objects.filter(user=self.customer, action=action).exists())
        self.assertFalse(UserNotification.objects.filter(recipient=self.customer, activity_log__action=UserActivityLog.Action.STORE_FOLLOW).exists())
        self.assertFalse(UserNotification.objects.filter(recipient=self.customer, lifecycle_state=UserNotification.LifecycleState.COMPLETED, notification_type__in=("my_list", "cart")).exists())
        self.assertEqual(self.client.get("/api/storefront/notifications/unread-count/").data["count"], 0)

        self.client.get(f"/api/storefront/products/{self.product.id}/")
        self.assertFalse(UserNotification.objects.filter(recipient=self.customer, activity_log__action=UserActivityLog.Action.PRODUCT_OPEN).exists())
        search = self.client.get("/api/storefront/products/?search=phone")
        self.assertEqual(search.status_code, 200)
        self.assertFalse(UserNotification.objects.filter(recipient=self.customer, activity_log__action=UserActivityLog.Action.SEARCH).exists())

        like_log = UserActivityLog.objects.create(user=self.customer, action=UserActivityLog.Action.LIKE, product=self.product, trader=self.store)
        create_activity_notification(like_log)
        self.assertFalse(UserNotification.objects.filter(recipient=self.customer, activity_log=like_log).exists())

    def test_notification_api_ownership_read_and_unread_count(self):
        other = User.objects.create_user(username="other-notification", password="password123")
        own = UserNotification.objects.create(recipient=self.customer, notification_type="system", title="Own", lifecycle_state="pending")
        hidden = UserNotification.objects.create(recipient=self.customer, notification_type="like", title="Hidden", lifecycle_state="pending")
        admin_hidden = UserNotification.objects.create(recipient=self.customer, notification_type="order", title="Admin", lifecycle_state="pending", metadata={"admin": True})
        other_notification = UserNotification.objects.create(recipient=other, notification_type="system", title="Other", lifecycle_state="pending")
        self.auth(self.customer)
        response = self.client.get("/api/storefront/notifications/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["id"] for item in response.data["results"]], [own.id])
        self.assertEqual(self.client.get(f"/api/storefront/notifications/{hidden.id}/").status_code, 404)
        self.assertEqual(self.client.get(f"/api/storefront/notifications/{admin_hidden.id}/").status_code, 404)
        self.assertEqual(self.client.get(f"/api/storefront/notifications/{other_notification.id}/").status_code, 404)
        self.assertEqual(self.client.patch(f"/api/storefront/notifications/{other_notification.id}/read/").status_code, 404)
        count = self.client.get("/api/storefront/notifications/unread-count/")
        self.assertEqual(count.data["count"], 1)
        read = self.client.patch(f"/api/storefront/notifications/{own.id}/read/")
        self.assertEqual(read.status_code, 200)
        count = self.client.get("/api/storefront/notifications/unread-count/")
        self.assertEqual(count.data["count"], 0)

        self.client.credentials()
        self.assertIn(self.client.get("/api/storefront/notifications/").status_code, (401, 403))

    def test_cart_quantity_and_stock_validation(self):
        self.auth(self.customer)
        response = self.client.post("/api/storefront/cart/items/", {"product": self.product.id, "quantity": 99}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_cart_minimum_stock_and_visibility_validation(self):
        min_product = Product.objects.create(trader=self.store, category=self.category, name="Bulk Bulb", price=Decimal("10.00"), stock_quantity=10, minimum_order_quantity=5, status=Product.Status.ACTIVE)
        low_stock = Product.objects.create(trader=self.store, category=self.category, name="Low Bulb", price=Decimal("10.00"), stock_quantity=3, minimum_order_quantity=5, status=Product.Status.ACTIVE)
        zero_stock = Product.objects.create(trader=self.store, category=self.category, name="Zero Bulb", price=Decimal("10.00"), stock_quantity=0, status=Product.Status.ACTIVE)
        self.auth(self.customer)
        self.assertEqual(self.client.post("/api/storefront/cart/items/", {"product": self.product.id, "quantity": 1}, format="json").status_code, 201)
        self.assertEqual(self.client.post("/api/storefront/cart/items/", {"product": min_product.id, "quantity": 1}, format="json").status_code, 400)
        self.assertEqual(self.client.post("/api/storefront/cart/items/", {"product": min_product.id, "quantity": 5}, format="json").status_code, 201)
        self.assertEqual(self.client.post("/api/storefront/cart/items/", {"product": min_product.id, "quantity": 6}, format="json").status_code, 400)
        self.assertEqual(self.client.post("/api/storefront/cart/items/", {"product": self.draft.id, "quantity": 1}, format="json").status_code, 400)
        self.assertEqual(self.client.post("/api/storefront/cart/items/", {"product": self.pending_store_product.id, "quantity": 1}, format="json").status_code, 400)
        self.assertEqual(self.client.post("/api/storefront/cart/items/", {"product": zero_stock.id, "quantity": 1}, format="json").status_code, 400)
        self.assertEqual(self.client.post("/api/storefront/cart/items/", {"product": low_stock.id, "quantity": 5}, format="json").status_code, 400)
        cart = self.client.get("/api/storefront/cart/").data
        self.assertEqual(cart["total_quantity"], 6)

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

    def test_order_delivery_fee_is_flat_per_cart_line(self):
        product = Product.objects.create(trader=self.store, category=self.category, name="Delivered Bulb", price=Decimal("10000.00"), delivery_fee=Decimal("5000.00"), stock_quantity=10, status=Product.Status.ACTIVE)
        cart = Cart.objects.create(user=self.customer)
        CartItem.objects.create(cart=cart, product=product, quantity=3)
        self.auth(self.customer)
        cart_response = self.client.get("/api/storefront/cart/")
        self.assertEqual(cart_response.data["subtotal"], Decimal("30000.00"))
        self.assertEqual(cart_response.data["delivery_fee"], Decimal("5000.00"))
        self.assertEqual(cart_response.data["grand_total"], Decimal("35000.00"))
        response = self.client.post("/api/storefront/orders/", {"customer_full_name": "Customer One", "customer_phone": "555"}, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["subtotal_amount"], "30000.00")
        self.assertEqual(response.data["delivery_fee"], "5000.00")
        self.assertEqual(response.data["total_amount"], "35000.00")
        self.assertEqual(response.data["items"][0]["delivery_fee_snapshot"], "5000.00")

    def test_share_activity_has_no_visible_notification(self):
        self.auth(self.customer)
        response = self.client.post(f"/api/storefront/products/{self.product.id}/share/", {"channel": "whatsapp"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(UserActivityLog.objects.filter(user=self.customer, action=UserActivityLog.Action.SHARE, metadata__channel="whatsapp").exists())
        self.assertFalse(UserNotification.objects.filter(recipient=self.customer, activity_log__action=UserActivityLog.Action.SHARE).exists())

    def test_branding_and_status_permissions_and_public_visibility(self):
        self.assertEqual(self.client.get("/api/storefront/branding/").status_code, 200)
        self.auth(self.customer)
        self.assertEqual(self.client.patch("/api/site/branding/", {"site_name": "Shop"}, format="json").status_code, 403)
        self.assertEqual(self.client.post("/api/site/statuses/", {}, format="json").status_code, 403)
        self.auth(self.staff)
        png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc```\x00\x00\x00\x04\x00\x01\xf6\x178U\x00\x00\x00\x00IEND\xaeB`\x82"
        logo = SimpleUploadedFile("logo.png", png, content_type="image/png")
        response = self.client.patch("/api/site/branding/", {"site_name": "Shop", "logo_alt_text": "Shop logo", "logo": logo}, format="multipart")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(SiteBranding.get_current().logo.name)
        media = SimpleUploadedFile("status.jpg", b"x", content_type="image/jpeg")
        active = self.client.post("/api/site/statuses/", {"media": media, "caption": "Today"}, format="multipart")
        self.assertEqual(active.status_code, 201)
        BrandStatus.objects.filter(pk=active.data["id"]).update(starts_at=timezone.now() - timezone.timedelta(minutes=1), expires_at=timezone.now() + timezone.timedelta(hours=1), is_active=True)
        BrandStatus.objects.create(media=SimpleUploadedFile("future.jpg", b"x", content_type="image/jpeg"), starts_at=timezone.now() + timezone.timedelta(hours=1))
        BrandStatus.objects.create(media=SimpleUploadedFile("expired.jpg", b"x", content_type="image/jpeg"), starts_at=timezone.now() - timezone.timedelta(days=2), expires_at=timezone.now() - timezone.timedelta(days=1))
        BrandStatus.objects.create(media=SimpleUploadedFile("inactive.jpg", b"x", content_type="image/jpeg"), is_active=False)
        public = self.client.get("/api/storefront/branding/").data
        self.assertEqual(len(public["statuses"]), 1)
        self.assertEqual(public["statuses"][0]["caption"], "Today")

    def test_order_notifications_lifecycle_and_cart_clear(self):
        admin = User.objects.create_superuser(username="order-admin", password="password123")
        cart = Cart.objects.create(user=self.customer)
        CartItem.objects.create(cart=cart, product=self.product, quantity=2)
        self.auth(self.customer)
        response = self.client.post("/api/storefront/orders/", {"customer_full_name": "Customer One", "customer_phone": "555"}, format="json")
        self.assertEqual(response.status_code, 201)
        order = Order.objects.get(pk=response.data["id"])
        self.assertFalse(CartItem.objects.filter(cart=cart).exists())
        notification = UserNotification.objects.get(recipient=self.customer, order=order)
        self.assertEqual(notification.lifecycle_state, UserNotification.LifecycleState.PENDING)
        self.assertFalse(notification.is_read)
        self.assertEqual(UserNotification.objects.filter(recipient=self.customer, order=order, metadata__admin=False).count(), 1)
        notification.mark_read()

        for status in (Order.Status.CONFIRMED, Order.Status.PROCESSING, Order.Status.READY, Order.Status.SHIPPED):
            order = transition_order(order, status, user=admin)
            notification.refresh_from_db()
            self.assertEqual(notification.lifecycle_state, UserNotification.LifecycleState.PENDING)
            self.assertFalse(notification.is_read)
            self.assertEqual(UserNotification.objects.filter(recipient=self.customer, order=order, metadata__admin=False).count(), 1)
            notification.mark_read()

        order = transition_order(order, Order.Status.DELIVERED, user=admin)
        notification.refresh_from_db()
        self.assertEqual(notification.lifecycle_state, UserNotification.LifecycleState.COMPLETED)
        self.assertFalse(notification.is_read)
        self.assertIsNotNone(notification.completed_at)
        self.assertEqual(UserNotification.objects.filter(recipient=self.customer, order=order, metadata__admin=False).count(), 1)
        self.auth(self.customer)
        self.assertEqual(self.client.get("/api/storefront/notifications/unread-count/").data["count"], 1)
        self.client.patch(f"/api/storefront/notifications/{notification.id}/read/")
        self.assertEqual(self.client.get("/api/storefront/notifications/unread-count/").data["count"], 0)

    def test_admin_audience_and_superuser_customer_order_notifications_do_not_collide(self):
        super_customer = User.objects.create_superuser(username="super-customer", password="password123", email="super@example.com")
        cart = Cart.objects.create(user=super_customer)
        CartItem.objects.create(cart=cart, product=self.product, quantity=1)
        self.auth(super_customer)
        response = self.client.post("/api/storefront/orders/", {"customer_full_name": "Super Customer", "customer_phone": "555"}, format="json")
        self.assertEqual(response.status_code, 201)
        order = Order.objects.get(pk=response.data["id"])
        sync_order_notification(order)
        notify_admin_of_new_order(order)
        self.assertEqual(UserNotification.objects.filter(recipient=super_customer, order=order, metadata__admin=False).count(), 1)
        self.assertEqual(UserNotification.objects.filter(recipient=super_customer, order=order, metadata__admin=True).count(), 1)

        customer_feed = self.client.get("/api/storefront/notifications/")
        self.assertEqual([item["id"] for item in customer_feed.data["results"]], list(UserNotification.objects.filter(recipient=super_customer, order=order, metadata__admin=False).values_list("id", flat=True)))
        admin_feed = self.client.get("/api/storefront/notifications/?audience=admin")
        self.assertEqual([item["id"] for item in admin_feed.data["results"]], list(UserNotification.objects.filter(recipient=super_customer, order=order, metadata__admin=True).values_list("id", flat=True)))

        normal = User.objects.create_user(username="normal-admin-guess", password="password123")
        self.auth(normal)
        self.assertEqual(self.client.get("/api/storefront/notifications/?audience=admin").status_code, 404)

    def test_cancelled_and_rejected_orders_complete_notifications(self):
        admin = User.objects.create_superuser(username="order-admin-2", password="password123")
        for final_status in (Order.Status.CANCELLED, Order.Status.REJECTED):
            cart = Cart.objects.create(user=User.objects.create_user(username=f"customer-{final_status}", password="password123"))
            CartItem.objects.create(cart=cart, product=self.product, quantity=1)
            self.auth(cart.user)
            response = self.client.post("/api/storefront/orders/", {"customer_full_name": "Customer One", "customer_phone": "555"}, format="json")
            order = Order.objects.get(pk=response.data["id"])
            order = transition_order(order, final_status, user=admin)
            notification = UserNotification.objects.get(recipient=cart.user, order=order, metadata__admin=False)
            self.assertEqual(notification.lifecycle_state, UserNotification.LifecycleState.COMPLETED)

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
