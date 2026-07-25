from collections import defaultdict, deque

from api.models import ProductCategory


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
