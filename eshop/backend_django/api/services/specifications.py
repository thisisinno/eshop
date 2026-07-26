import hashlib
from dataclasses import dataclass
from decimal import Decimal

from django.core.exceptions import ValidationError

from api.models import ProductSpecificationGroup, ProductSpecificationOption


@dataclass(frozen=True)
class ResolvedSpecificationSelection:
    option_ids: tuple[int, ...]
    snapshot: list[dict]
    adjustment_total: Decimal
    unit_price: Decimal
    signature: str


def specification_signature(option_ids):
    normalized = ",".join(str(value) for value in sorted(set(option_ids)))
    return hashlib.sha256(normalized.encode()).hexdigest() if normalized else "none"


def resolve_product_specification_selection(product, option_ids=None):
    try:
        normalized_ids = sorted({int(value) for value in (option_ids or [])})
    except (TypeError, ValueError):
        raise ValidationError({"specification_option_ids": "Option IDs must be integers."})

    if not product.has_selectable_specifications:
        if normalized_ids:
            raise ValidationError({"specification_option_ids": "This product does not accept selectable specifications."})
        return ResolvedSpecificationSelection((), [], Decimal("0.00"), product.price, "none")

    groups = list(
        ProductSpecificationGroup.objects.filter(product=product)
        .prefetch_related("options")
        .order_by("display_order", "id")
    )
    active_groups = [group for group in groups if group.is_active]
    if not active_groups:
        raise ValidationError({"specification_option_ids": "This product has no available specification options."})

    options = {
        option.id: option
        for group in groups
        for option in group.options.all()
        if option.id in normalized_ids
    }
    if set(options) != set(normalized_ids):
        raise ValidationError({"specification_option_ids": "One or more options do not belong to this product."})

    selected_by_group = {}
    snapshot = []
    adjustment_total = Decimal("0.00")
    for option_id in normalized_ids:
        option = options[option_id]
        group = option.group
        if not group.is_active:
            raise ValidationError({"specification_option_ids": f"{group.name} is no longer available."})
        if not option.is_active:
            raise ValidationError({"specification_option_ids": f"{option.value} is no longer available."})
        selected_by_group.setdefault(group.id, []).append(option)
        adjustment_total += option.price_adjustment
        snapshot.append({
            "group_id": group.id,
            "group_name": group.name,
            "option_id": option.id,
            "value": option.value,
            "price_adjustment": str(option.price_adjustment),
        })

    for group in active_groups:
        selected = selected_by_group.get(group.id, [])
        if group.is_required and not selected:
            raise ValidationError({"specification_option_ids": f"Choose an option for {group.name}."})
        if group.selection_mode == ProductSpecificationGroup.SelectionMode.SINGLE and len(selected) > 1:
            raise ValidationError({"specification_option_ids": f"Choose only one option for {group.name}."})

    unit_price = product.price + adjustment_total
    if unit_price < 0:
        raise ValidationError({"specification_option_ids": "The selected options produce an invalid price below zero."})
    return ResolvedSpecificationSelection(
        tuple(normalized_ids), snapshot, adjustment_total, unit_price,
        specification_signature(normalized_ids),
    )


def validate_product_specification_configuration(product):
    if not product.has_selectable_specifications:
        return
    groups = list(product.specification_groups.prefetch_related("options").all())
    active_groups = [group for group in groups if group.is_active]
    if not active_groups:
        raise ValidationError({"has_selectable_specifications": "Active products need at least one active specification group."})
    for group in active_groups:
        if not any(option.is_active for option in group.options.all()):
            raise ValidationError({"specification_groups": f"{group.name} needs at least one active option."})
