from django.db.models import Count, F, Q

from api.models import Product, StoreFollow, TraderProfile, UserActivityLog


INTERACTION_WEIGHTS = {
    UserActivityLog.Action.ADD_TO_CART: 6,
    UserActivityLog.Action.BOOKMARK: 5,
    UserActivityLog.Action.LIKE: 4,
    UserActivityLog.Action.PRODUCT_OPEN: 2,
    UserActivityLog.Action.PRODUCT_VIEW: 1,
}


def public_products_queryset():
    return Product.objects.filter(status=Product.Status.ACTIVE, trader__status=TraderProfile.Status.APPROVED).select_related("trader", "category", "branch").prefetch_related("media", "related_products__media", "related_products__trader")


def build_home_shelves(user=None, session_key=""):
    base = public_products_queryset()
    shelves = []
    used_ids = set()

    def add_shelf(key, title, queryset, limit=18):
        items = list(queryset.exclude(id__in=used_ids)[:limit])
        if not items:
            items = list(queryset[:limit])
        if items:
            used_ids.update(item.id for item in items)
            shelves.append({"key": key, "title": title, "products": items})

    followed_trader_ids = []
    if user and user.is_authenticated:
        followed_trader_ids = list(StoreFollow.objects.filter(user=user).values_list("trader_id", flat=True))
        add_shelf("following", "From Stores You Follow", base.filter(trader_id__in=followed_trader_ids).order_by("-created_at"))

    affinity_filter = Q()
    activity = UserActivityLog.objects.filter(product__isnull=False)
    if user and user.is_authenticated:
        activity = activity.filter(user=user)
    elif session_key:
        activity = activity.filter(session_key=session_key)
    else:
        activity = activity.none()
    categories = activity.values("product__category_id").annotate(score=Count("id")).order_by("-score").values_list("product__category_id", flat=True)[:5]
    traders = activity.values("product__trader_id").annotate(score=Count("id")).order_by("-score").values_list("product__trader_id", flat=True)[:5]
    if categories:
        affinity_filter |= Q(category_id__in=list(categories))
    if traders:
        affinity_filter |= Q(trader_id__in=list(traders))
    if followed_trader_ids:
        affinity_filter |= Q(trader_id__in=followed_trader_ids)

    add_shelf("for_you", "For You", base.filter(affinity_filter).order_by("-is_featured", "-sold_count", "-views_count", "-created_at") if affinity_filter else base.order_by("-is_featured", "-sold_count", "-views_count", "-created_at"))
    add_shelf("trending", "Trending", base.annotate(interaction_count=Count("activity_logs")).order_by("-interaction_count", "-views_count", "-created_at"))
    add_shelf("new_arrivals", "New Arrivals", base.order_by("-created_at"))
    add_shelf("best_sellers", "Best Sellers", base.order_by("-sold_count", "-created_at"))
    add_shelf("featured_deals", "Featured Deals", base.filter(is_discountable=True, compare_at_price__gt=F("price")).order_by("-is_featured", "-created_at"))
    add_shelf("recently_viewed", "Recently Viewed", base.filter(activity_logs__in=activity).distinct().order_by("-activity_logs__created_at"))
    return shelves
