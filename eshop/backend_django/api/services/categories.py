from collections import defaultdict, deque

from api.models import ProductCategory
from api.models import Product


def active_category_subtree_ids(category):
    """Return an active category and every active descendant in one category query."""
    if not category.is_active:
        return []

    children_by_parent = defaultdict(list)
    for category_id, parent_id in ProductCategory.objects.filter(
        is_active=True
    ).values_list("id", "parent_id"):
        children_by_parent[parent_id].append(category_id)

    subtree_ids = []
    pending = deque([category.id])
    visited = set()
    while pending:
        category_id = pending.popleft()
        if category_id in visited:
            continue
        visited.add(category_id)
        subtree_ids.append(category_id)
        pending.extend(children_by_parent.get(category_id, ()))
    return subtree_ids


def filter_products_by_category_subtree(queryset, category):
    return queryset.filter(category_id__in=active_category_subtree_ids(category))


def store_category_hierarchy(trader):
    """Relevant active leaf categories plus active ancestors, excluding broken inactive paths."""
    categories = list(ProductCategory.objects.all().only(
        "id", "parent_id", "name", "slug", "description", "icon", "image",
        "display_order", "is_featured", "is_active",
    ))
    by_id = {category.id: category for category in categories}
    direct_ids = set(Product.objects.filter(
        trader=trader, status=Product.Status.ACTIVE, category__isnull=False
    ).values_list("category_id", flat=True))
    included = set()
    for category_id in direct_ids:
        path = []
        current = by_id.get(category_id)
        valid = True
        visited = set()
        while current:
            if not current.is_active or current.id in visited:
                valid = False
                break
            visited.add(current.id)
            path.append(current.id)
            current = by_id.get(current.parent_id)
        if valid:
            included.update(path)
    return sorted(
        (by_id[category_id] for category_id in included),
        key=lambda category: (category.display_order, category.name, category.id),
    )
