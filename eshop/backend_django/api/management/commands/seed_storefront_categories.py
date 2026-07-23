from django.core.management.base import BaseCommand

from api.models import ProductCategory


class Command(BaseCommand):
    help = "Create useful storefront categories without deleting, renaming, or duplicating existing categories."

    DEFAULTS = [
        ("Fashion", "shirt", 10),
        ("Shoes", "footprints", 20),
        ("Phones", "smartphone", 30),
        ("Electronics", "cpu", 40),
        ("Beauty", "sparkles", 50),
        ("Home", "home", 60),
        ("Sports", "dumbbell", 70),
    ]

    def handle(self, *args, **options):
        created = 0
        for name, icon, display_order in self.DEFAULTS:
            category, was_created = ProductCategory.objects.get_or_create(
                name=name,
                defaults={"icon": icon, "display_order": display_order, "is_featured": True, "is_active": True},
            )
            if was_created:
                created += 1
                self.stdout.write(self.style.SUCCESS(f"Created {category.name}"))
        self.stdout.write(self.style.SUCCESS(f"Done. Created {created} categories."))
