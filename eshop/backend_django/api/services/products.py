from django.core.exceptions import ValidationError

from api.models import Product, ProductMedia
from api.services.specifications import validate_product_specification_configuration


def _product_media(product):
    if not product.pk:
        return []
    prefetched = getattr(product, "_prefetched_objects_cache", {}).get("media")
    return list(prefetched) if prefetched is not None else list(product.media.all())


def get_interactive_view_readiness(product, media=None):
    media_items = list(_product_media(product) if media is None else media)
    spin_frames = [
        item for item in media_items
        if item.media_type == ProductMedia.MediaType.SPIN_FRAME and item.frame_index is not None
    ]
    # A duplicated frame index is not a distinct point in the rotation.
    frame_count = len({item.frame_index for item in spin_frames})
    minimum = ProductMedia.MIN_SPIN_FRAME_COUNT
    has_model = any(item.media_type == ProductMedia.MediaType.MODEL_3D for item in media_items)
    enabled = bool(product.view_360_enabled)
    mode = product.view_360_mode
    ready = not enabled or (
        frame_count >= minimum if mode == Product.Viewer360Mode.SPIN else has_model
    )
    return {
        "enabled": enabled,
        "mode": mode,
        "ready": ready,
        "frame_count": frame_count,
        "minimum_frame_count": minimum,
        "frames_remaining": max(0, minimum - frame_count),
        "has_model": has_model,
    }


def get_interactive_view_activation_issues(product, media=None):
    readiness = get_interactive_view_readiness(product, media=media)
    if not readiness["enabled"] or readiness["ready"]:
        return {}
    if readiness["mode"] == Product.Viewer360Mode.SPIN:
        count = readiness["frame_count"]
        minimum = readiness["minimum_frame_count"]
        remaining = readiness["frames_remaining"]
        return {
            "view_360_mode": [
                f"360 view is enabled but only {count} of {minimum} required frames are uploaded. "
                f"Upload {remaining} more frame{'s' if remaining != 1 else ''} or disable 360 / 3D before approval."
            ]
        }
    return {
        "view_360_mode": [
            "3D view is enabled but no GLB model is uploaded. "
            "Upload a GLB model or disable 360 / 3D before approval."
        ]
    }


def get_product_activation_issues(product):
    issues = get_interactive_view_activation_issues(product)
    try:
        validate_product_specification_configuration(product)
    except ValidationError as exc:
        details = exc.message_dict if hasattr(exc, "message_dict") else {"detail": exc.messages}
        for field, messages in details.items():
            issues.setdefault(field, []).extend(
                messages if isinstance(messages, list) else [messages]
            )
    return issues


def validate_product_activation(product):
    issues = get_product_activation_issues(product)
    if issues:
        raise ValidationError(issues)


def get_product_approval_readiness(product):
    issues = get_product_activation_issues(product)
    return {
        "ready": not issues,
        "issues": [message for messages in issues.values() for message in messages],
        "interactive_view": get_interactive_view_readiness(product),
    }
