import re

from django.db import migrations, models


def normalise_name(name):
    value = re.sub(r"[^A-Z0-9-]+", "-", (name or "").upper().replace(" ", "-"))
    return (re.sub(r"-+", "-", value).strip("-") or "TRADER")[:173]


def populate_trader_codes(apps, schema_editor):
    TraderProfile = apps.get_model("api", "TraderProfile")
    next_number = 1
    used_codes = set(TraderProfile.objects.exclude(trader_code="").values_list("trader_code", flat=True))
    for trader in TraderProfile.objects.order_by("id").iterator():
        if trader.trader_code:
            continue
        while True:
            code = f"{normalise_name(trader.business_name)}/{next_number:06d}"
            next_number += 1
            if code not in used_codes:
                used_codes.add(code)
                break
        trader.trader_code = code
        trader.save(update_fields=["trader_code"])


class AddFieldIfNotExists(migrations.AddField):
    def database_forwards(self, app_label, schema_editor, from_state, to_state):
        model = to_state.apps.get_model(app_label, self.model_name)
        columns = {
            column.name
            for column in schema_editor.connection.introspection.get_table_description(schema_editor.connection.cursor(), model._meta.db_table)
        }
        if self.name in columns:
            return
        super().database_forwards(app_label, schema_editor, from_state, to_state)


class Migration(migrations.Migration):
    dependencies = [("api", "0002_productcategory_product_productmedia_and_more")]

    operations = [
        AddFieldIfNotExists(
            model_name="traderprofile",
            name="trader_code",
            field=models.CharField(blank=True, db_index=True, max_length=180, null=True, unique=True),
        ),
        migrations.RunPython(populate_trader_codes, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="traderprofile",
            name="trader_code",
            field=models.CharField(blank=True, db_index=True, max_length=180, unique=True),
        ),
    ]
