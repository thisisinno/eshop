from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from api.models import Order, UserActivityLog, UserNotification


FINAL_ORDER_STATUSES = {Order.Status.DELIVERED, Order.Status.CANCELLED, Order.Status.REJECTED}
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
    UserActivityLog.Action.STORE_FOLLOW: ("store", "Store followed", "Followed {store}."),
    UserActivityLog.Action.STORE_UNFOLLOW: ("store", "Store unfollowed", "Unfollowed {store}."),
    UserActivityLog.Action.LIKE: ("like", "Liked product", "Liked {product}."),
    UserActivityLog.Action.UNLIKE: ("like", "Removed like", "Removed like from {product}."),
    UserActivityLog.Action.RATING: ("review", "Rating submitted", "Rated {product}."),
    UserActivityLog.Action.REVIEW: ("review", "Review submitted", "Reviewed {product}."),
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


@transaction.atomic
def sync_order_notification(order):
    if not order.customer_user_id:
        return None
    now = timezone.now()
    lifecycle_state = UserNotification.LifecycleState.COMPLETED if order.status in FINAL_ORDER_STATUSES else UserNotification.LifecycleState.PENDING
    title = ORDER_STATUS_TITLES.get(order.status, "Order updated")
    notification, _ = UserNotification.objects.update_or_create(
        recipient=order.customer_user,
        order=order,
        notification_type=UserNotification.NotificationType.ORDER,
        defaults={
            "title": f"{title}: {order.order_number}",
            "message": f"{order.order_number} is {order.status.replace('_', ' ')}.",
            "lifecycle_state": lifecycle_state,
            "is_read": False,
            "read_at": None,
            "product": None,
            "trader": None,
            "metadata": {"status": order.status, "payment_status": order.payment_status},
            "completed_at": now if lifecycle_state == UserNotification.LifecycleState.COMPLETED else None,
        },
    )
    return notification


def notify_admin_of_new_order(order):
    recipients = get_user_model().objects.filter(is_active=True).filter(is_superuser=True)
    for recipient in recipients:
        UserNotification.objects.update_or_create(
            recipient=recipient,
            order=order,
            notification_type=UserNotification.NotificationType.ORDER,
            defaults={
                "title": f"New order {order.order_number}",
                "message": f"{order.customer_full_name} placed an order.",
                "lifecycle_state": UserNotification.LifecycleState.PENDING,
                "is_read": False,
                "read_at": None,
                "metadata": {"admin": True, "status": order.status, "payment_status": order.payment_status},
            },
        )


def create_activity_notification(log):
    if not log.user_id or log.action in PASSIVE_ACTIONS:
        return None
    template = ACTION_COPY.get(log.action)
    if not template:
        return None
    notification_type, title, message = template
    product_name = log.product.name if log.product_id else "product"
    store_name = log.trader.business_name if log.trader_id else "store"
    return UserNotification.objects.create(
        recipient=log.user,
        notification_type=notification_type,
        title=title,
        message=message.format(product=product_name, store=store_name),
        lifecycle_state=UserNotification.LifecycleState.COMPLETED,
        is_read=False,
        product=log.product,
        trader=log.trader,
        activity_log=log,
        metadata={"action": log.action, **(log.metadata or {})},
        completed_at=timezone.now(),
    )


def mark_notification_read(notification):
    notification.mark_read()
    return notification


def mark_all_read(user, queryset=None):
    now = timezone.now()
    qs = queryset or UserNotification.objects.filter(recipient=user, is_read=False)
    return qs.update(is_read=True, read_at=now, updated_at=now)
