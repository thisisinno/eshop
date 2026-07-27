from decimal import Decimal

from django.contrib.auth.models import User
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from rest_framework import serializers
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from api.models import (
    AdminActivityLog, Product, ProductCategory, ProductMedia,
    ProductSpecificationGroup, ProductSpecificationOption, TraderProfile,
)
from api.serializers.catalog import ProductWriteSerializer


class ProductActivationTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser("catalog-admin", password="password")
        token = Token.objects.create(user=self.admin)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
        self.store = TraderProfile.objects.create(
            trader_type=TraderProfile.TraderType.COMPANY,
            business_name="Activation Store",
            phone="255700000001",
            status=TraderProfile.Status.APPROVED,
        )

    def product(self, **overrides):
        values = {
            "trader": self.store,
            "name": f"Product {Product.objects.count() + 1}",
            "price": Decimal("100.00"),
            "stock_quantity": 20,
            "status": Product.Status.PENDING_REVIEW,
        }
        values.update(overrides)
        return Product.objects.create(**values)

    def add_spin_frames(self, product, count):
        return [
            ProductMedia.objects.create(
                product=product,
                media_type=ProductMedia.MediaType.SPIN_FRAME,
                file=SimpleUploadedFile(f"frame-{index}.jpg", b"frame", content_type="image/jpeg"),
                frame_index=index,
                sort_order=index,
            )
            for index in range(count)
        ]

    def add_model(self, product):
        return ProductMedia.objects.create(
            product=product,
            media_type=ProductMedia.MediaType.MODEL_3D,
            file=SimpleUploadedFile("product.glb", b"glb", content_type="model/gltf-binary"),
        )

    def approve(self, product):
        return self.client.patch(f"/api/catalog/products/{product.pk}/approve/", {}, format="json")

    def test_ordinary_product_approves_without_interactive_media(self):
        product = self.product(view_360_enabled=False)
        response = self.approve(product)
        self.assertEqual(response.status_code, 200)
        product.refresh_from_db()
        self.assertEqual(product.status, Product.Status.ACTIVE)

    def test_zero_stock_product_cannot_be_approved(self):
        product = self.product(stock_quantity=0)
        response = self.approve(product)
        self.assertEqual(response.status_code, 400)
        self.assertIn("Add stock before activating this product.", str(response.data))
        product.refresh_from_db()
        self.assertEqual(product.status, Product.Status.PENDING_REVIEW)

    def test_stock_below_minimum_cannot_be_approved(self):
        product = self.product(stock_quantity=2, minimum_order_quantity=5)
        response = self.approve(product)
        self.assertEqual(response.status_code, 400)
        self.assertIn("minimum order quantity is 5", str(response.data))
        product.refresh_from_db()
        self.assertEqual(product.status, Product.Status.PENDING_REVIEW)

    def test_approval_preserves_valid_stock(self):
        product = self.product(stock_quantity=10, minimum_order_quantity=1)
        response = self.approve(product)
        self.assertEqual(response.status_code, 200, response.data)
        product.refresh_from_db()
        self.assertEqual(product.stock_quantity, 10)

    def test_approval_locks_only_product_row_with_nullable_relations(self):
        product = self.product(
            branch=None,
            category=None,
            created_by=None,
            updated_by=None,
            view_360_enabled=False,
        )
        with CaptureQueriesContext(connection) as queries:
            response = self.approve(product)

        self.assertEqual(response.status_code, 200, response.data)
        for field in (
            "trader", "branch", "category", "media",
            "specification_groups", "approval_readiness",
        ):
            self.assertIn(field, response.data)
        self.assertIsNone(response.data["branch"])
        self.assertIsNone(response.data["category"])

        if connection.vendor == "postgresql":
            locking_queries = [
                query["sql"] for query in queries.captured_queries
                if "FOR UPDATE" in query["sql"].upper()
            ]
            self.assertTrue(locking_queries)
            product_lock = next(
                query for query in locking_queries
                if 'api_product' in query.lower()
            )
            self.assertNotIn(" JOIN ", product_lock.upper())

    def test_approval_succeeds_with_nullable_branch_and_category(self):
        category = ProductCategory.objects.create(name="Wearables")
        product = self.product(branch=None, category=category)

        response = self.approve(product)

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["category"], category.pk)
        self.assertIsNone(response.data["branch"])

    def test_spin_approval_returns_actionable_400_for_zero_and_eleven_frames(self):
        for count in (0, 11):
            product = self.product(
                view_360_enabled=True, view_360_mode=Product.Viewer360Mode.SPIN
            )
            self.add_spin_frames(product, count)
            response = self.approve(product)
            self.assertEqual(response.status_code, 400)
            self.assertIn("view_360_mode", response.data)
            self.assertIn(f"only {count} of 12", str(response.data))
            self.assertNotIn(
                "Active products require at least 12 ordered 360 frames.",
                str(response.data),
            )
            product.refresh_from_db()
            self.assertEqual(product.status, Product.Status.PENDING_REVIEW)
            self.assertFalse(
                AdminActivityLog.objects.filter(
                    action="approve", object_id=str(product.pk)
                ).exists()
            )

    def test_spin_approval_accepts_twelve_or_more_distinct_ordered_frames(self):
        for count in (12, 13):
            product = self.product(
                view_360_enabled=True, view_360_mode=Product.Viewer360Mode.SPIN
            )
            self.add_spin_frames(product, count)
            self.assertEqual(self.approve(product).status_code, 200)

    def test_model_approval_requires_glb(self):
        missing = self.product(
            view_360_enabled=True, view_360_mode=Product.Viewer360Mode.MODEL
        )
        response = self.approve(missing)
        self.assertEqual(response.status_code, 400)
        self.assertIn("no GLB model", str(response.data))

        ready = self.product(
            view_360_enabled=True, view_360_mode=Product.Viewer360Mode.MODEL
        )
        self.add_model(ready)
        self.assertEqual(self.approve(ready).status_code, 200)

    def test_patch_and_put_translate_model_validation_to_400(self):
        for method in ("patch", "put"):
            product = self.product(
                view_360_enabled=True, view_360_mode=Product.Viewer360Mode.SPIN
            )
            if method == "patch":
                response = self.client.patch(
                    f"/api/catalog/products/{product.pk}/",
                    {"status": Product.Status.ACTIVE},
                    format="json",
                )
            else:
                response = self.client.put(
                    f"/api/catalog/products/{product.pk}/",
                    {
                        "trader": self.store.pk,
                        "name": product.name,
                        "price": "100.00",
                        "status": Product.Status.ACTIVE,
                        "view_360_enabled": True,
                        "view_360_mode": Product.Viewer360Mode.SPIN,
                    },
                    format="json",
                )
            self.assertEqual(response.status_code, 400)
            self.assertIn("view_360_mode", response.data)
            product.refresh_from_db()
            self.assertEqual(product.status, Product.Status.PENDING_REVIEW)

    def test_serializer_update_never_leaks_django_validation_error(self):
        product = self.product(
            view_360_enabled=True, view_360_mode=Product.Viewer360Mode.SPIN
        )
        serializer = ProductWriteSerializer(
            product, data={"status": Product.Status.ACTIVE}, partial=True
        )
        serializer.is_valid(raise_exception=True)
        with self.assertRaises(serializers.ValidationError) as raised:
            serializer.save()
        self.assertNotIsInstance(raised.exception, DjangoValidationError)
        product.refresh_from_db()
        self.assertEqual(product.status, Product.Status.PENDING_REVIEW)

    def test_selectable_specification_readiness_is_still_enforced(self):
        product = self.product(has_selectable_specifications=True)
        ProductSpecificationGroup.objects.create(product=product, name="Size")
        response = self.approve(product)
        self.assertEqual(response.status_code, 400)
        self.assertIn("specification_groups", response.data)

    def test_interactive_and_specification_issues_are_returned_together(self):
        product = self.product(
            view_360_enabled=True,
            view_360_mode=Product.Viewer360Mode.SPIN,
            has_selectable_specifications=True,
        )
        response = self.approve(product)
        self.assertEqual(response.status_code, 400)
        self.assertIn("view_360_mode", response.data)
        self.assertIn("has_selectable_specifications", response.data)

    def test_incoming_specification_groups_are_saved_before_activation(self):
        product = self.product(has_selectable_specifications=False)
        response = self.client.patch(
            f"/api/catalog/products/{product.pk}/",
            {
                "status": Product.Status.ACTIVE,
                "has_selectable_specifications": True,
                "specification_groups": [{
                    "name": "Size",
                    "selection_mode": ProductSpecificationGroup.SelectionMode.SINGLE,
                    "is_required": True,
                    "is_active": True,
                    "display_order": 0,
                    "options": [{
                        "value": "Medium",
                        "price_adjustment": "0.00",
                        "is_active": True,
                        "display_order": 0,
                    }],
                }],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        product.refresh_from_db()
        self.assertEqual(product.status, Product.Status.ACTIVE)
        self.assertTrue(
            ProductSpecificationOption.objects.filter(
                group__product=product, value="Medium"
            ).exists()
        )

    def test_multipart_false_values_do_not_enable_interactive_view(self):
        for value in ("false", "0", None):
            data = {
                "trader": str(self.store.pk),
                "name": f"Multipart {value}",
                "price": "100.00",
                "stock_quantity": "1",
                "status": Product.Status.PENDING_REVIEW,
            }
            if value is not None:
                data["view_360_enabled"] = value
            response = self.client.post(
                "/api/catalog/products/", data, format="multipart"
            )
            self.assertEqual(response.status_code, 201, response.data)
            self.assertFalse(Product.objects.get(pk=response.data["id"]).view_360_enabled)

    def test_active_spin_media_deletion_preserves_readiness(self):
        product = self.product(
            view_360_enabled=True, view_360_mode=Product.Viewer360Mode.SPIN
        )
        frames = self.add_spin_frames(product, 13)
        self.assertEqual(self.approve(product).status_code, 200)
        allowed = self.client.delete(
            f"/api/catalog/products/{product.pk}/media/{frames[-1].pk}/"
        )
        self.assertEqual(allowed.status_code, 204)
        blocked = self.client.delete(
            f"/api/catalog/products/{product.pk}/media/{frames[0].pk}/"
        )
        self.assertEqual(blocked.status_code, 400)
        self.assertTrue(ProductMedia.objects.filter(pk=frames[0].pk).exists())

    def test_active_spin_media_patch_rolls_back_invalid_frame_change(self):
        product = self.product(
            view_360_enabled=True, view_360_mode=Product.Viewer360Mode.SPIN
        )
        frames = self.add_spin_frames(product, 12)
        self.assertEqual(self.approve(product).status_code, 200)

        response = self.client.patch(
            f"/api/catalog/products/{product.pk}/media/{frames[0].pk}/",
            {"frame_index": frames[1].frame_index},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        frames[0].refresh_from_db()
        self.assertEqual(frames[0].frame_index, 0)

    def test_generic_patch_with_nullable_relations_succeeds(self):
        product = self.product(branch=None, category=None)

        response = self.client.patch(
            f"/api/catalog/products/{product.pk}/",
            {"name": "Updated nullable product"},
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.data)
        product.refresh_from_db()
        self.assertEqual(product.name, "Updated nullable product")

    def test_active_model_cannot_delete_only_glb_but_draft_can(self):
        active = self.product(
            view_360_enabled=True, view_360_mode=Product.Viewer360Mode.MODEL
        )
        model = self.add_model(active)
        self.assertEqual(self.approve(active).status_code, 200)
        response = self.client.delete(
            f"/api/catalog/products/{active.pk}/media/{model.pk}/"
        )
        self.assertEqual(response.status_code, 400)
        self.assertTrue(ProductMedia.objects.filter(pk=model.pk).exists())

        draft = self.product(
            status=Product.Status.DRAFT,
            view_360_enabled=True,
            view_360_mode=Product.Viewer360Mode.MODEL,
        )
        draft_model = self.add_model(draft)
        response = self.client.delete(
            f"/api/catalog/products/{draft.pk}/media/{draft_model.pk}/"
        )
        self.assertEqual(response.status_code, 204)
