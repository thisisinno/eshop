from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from api.models import Order, UserActivityLog, UserNotification


FINAL_ORDER_STATUSES = {Order.Status.DELIVERED, Order.Status.CANCELLED, Order.Status.REJECTED}
CUSTOMER_VISIBLE_TYPES = {
    UserNotification.NotificationType.ORDER,
    UserNotification.NotificationType.SYSTEM,
}
ACTIVITY_NOTIFICATION_ACTIONS = set()
PASSIVE_ACTIONS = {
    UserActivityLog.Action.PRODUCT_VIEW,
    UserActivityLog.Action.PRODUCT_OPEN,
    UserActivityLog.Action.MEDIA_VIEW,
    UserActivityLog.Action.MEDIA_PLAY,
    UserActivityLog.Action.MEDIA_PAUSE,
    UserActivityLog.Action.MEDIA_COMPLETE,
    UserActivityLog.Action.IMAGE_ZOOM,
    UserActivityLog.Action.SEARCH,
    UserActivityLog.Action.FILTER,
    UserActivityLog.Action.CATEGORY_OPEN,
    UserActivityLog.Action.TRADER_OPEN,
}

ACTION_COPY = {
    UserActivityLog.Action.BOOKMARK: ("my_list", "Added to My List", "Saved {product} to My List."),
    UserActivityLog.Action.UNBOOKMARK: ("my_list", "Removed from My List", "Removed {product} from My List."),
    UserActivityLog.Action.ADD_TO_CART: ("cart", "Added to cart", "Added {product} to your cart."),
    UserActivityLog.Action.REMOVE_FROM_CART: ("cart", "Removed from cart", "Removed {product} from your cart."),
    UserActivityLog.Action.CART_QUANTITY_CHANGE: ("cart", "Cart updated", "Updated {product} quantity."),
}

ORDER_STATUS_TITLES = {
    Order.Status.REQUESTED: "Order received",
    Order.Status.CONFIRMED: "Order confirmed",
    Order.Status.PROCESSING: "Order processing",
    Order.Status.READY: "Order ready",
    Order.Status.SHIPPED: "Order shipped",
    Order.Status.DELIVERED: "Order delivered",
    Order.Status.CANCELLED: "Order cancelled",
    Order.Status.REJECTED: "Order rejected",
}


def customer_visible_notifications(user):
    return UserNotification.objects.filter(
        recipient=user,
        notification_type__in=CUSTOMER_VISIBLE_TYPES,
    ).filter(Q(metadata__admin=False) | Q(metadata__admin__isnull=True))


def admin_visible_notifications(user):
    if not (user and user.is_authenticated and (user.is_staff or user.is_superuser)):
        return UserNotification.objects.none()
    return UserNotification.objects.filter(recipient=user, metadata__admin=True)


def visible_notifications_for(user, audience="customer"):
    if audience == "admin":
        return admin_visible_notifications(user)
    return customer_visible_notifications(user)


def _upsert_order_notification(recipient, order, defaults, admin=False):
    queryset = UserNotification.objects.filter(
        recipient=recipient,
        order=order,
        notification_type=UserNotification.NotificationType.ORDER,
    )
    queryset = queryset.filter(metadata__admin=True) if admin else queryset.filter(Q(metadata__admin=False) | Q(metadata__admin__isnull=True))
    notification = queryset.order_by("-created_at").first()
    if notification:
        for field, value in defaults.items():
            setattr(notification, field, value)
        notification.save(update_fields=[*defaults.keys(), "updated_at"])
        return notification
    return UserNotification.objects.create(
        recipient=recipient,
        order=order,
        notification_type=UserNotification.NotificationType.ORDER,
        **defaults,
    )


@transaction.atomic
def sync_order_notification(order):
    if not order.customer_user_id:
        return None
    now = timezone.now()
    lifecycle_state = UserNotification.LifecycleState.COMPLETED if order.status in FINAL_ORDER_STATUSES else UserNotification.LifecycleState.PENDING
    title = ORDER_STATUS_TITLES.get(order.status, "Order updated")
    notification = _upsert_order_notification(
        order.customer_user,
        order,
        {
            "title": f"{title}: {order.order_number}",
            "message": f"{order.order_number} is {order.status.replace('_', ' ')}.",
            "lifecycle_state": lifecycle_state,
            "is_read": False,
            "read_at": None,
            "product": None,
            "trader": None,
            "metadata": {"audience": "customer", "admin": False, "status": order.status, "payment_status": order.payment_status},
            "completed_at": now if lifecycle_state == UserNotification.LifecycleState.COMPLETED else None,
        },
        admin=False,
    )
    return notification


def notify_admin_of_new_order(order):
    recipients = get_user_model().objects.filter(is_active=True).filter(is_superuser=True)
    for recipient in recipients:
        _upsert_order_notification(
            recipient,
            order,
            {
                "title": f"New order {order.order_number}",
                "message": f"{order.customer_full_name} placed an order.",
                "lifecycle_state": UserNotification.LifecycleState.PENDING,
                "is_read": False,
                "read_at": None,
                "metadata": {"admin": True, "status": order.status, "payment_status": order.payment_status},
            },
            admin=True,
        )


def create_activity_notification(log):
    # Visible customer notifications are reserved for important order/admin updates.
    # Ordinary product, My List, cart, share, store follow, search, and view events
    # remain available through UserActivityLog only.
    return None
    if not log.user_id or log.action in PASSIVE_ACTIONS or log.action not in ACTIVITY_NOTIFICATION_ACTIONS:
        return None
    template = ACTION_COPY.get(log.action)
    if not template:
        return None
    notification_type, title, message = template
    product_name = log.product.name if log.product_id else "product"
    store_name = log.trader.business_name if log.trader_id else "store"
    now = timezone.now()
    return UserNotification.objects.create(
        recipient=log.user,
        notification_type=notification_type,
        title=title,
        message=message.format(product=product_name, store=store_name),
        lifecycle_state=UserNotification.LifecycleState.COMPLETED,
        is_read=True,
        read_at=now,
        product=log.product,
        trader=log.trader,
        activity_log=log,
        metadata={"action": log.action, **(log.metadata or {})},
        completed_at=now,
    )


def mark_notification_read(notification):
    notification.mark_read()
    return notification


def mark_all_read(user, queryset=None):
    now = timezone.now()
    qs = queryset or customer_visible_notifications(user).filter(is_read=False)
    return qs.update(is_read=True, read_at=now, updated_at=now)
