from django.db import transaction
from django.db.models import Q

from api.models import StoreFollow


ANONYMOUS_SESSION_ERROR = "Anonymous session could not be established. Refresh and try again."


def normalized_session_key(value):
    # Anonymous follows are browser-session/device scoped. The value originates
    # from SmartWear's HttpOnly cookie and is never returned in API payloads.
    return str(value or "").strip()[:100]


def viewer_store_follow_filter(*, user=None, session_key=""):
    if user is not None and getattr(user, "is_authenticated", False):
        return Q(user=user, session_key="")
    key = normalized_session_key(session_key)
    if not key:
        return None
    return Q(user__isnull=True, session_key=key)


def followed_trader_ids(*, user=None, session_key=""):
    identity = viewer_store_follow_filter(user=user, session_key=session_key)
    if identity is None:
        return []
    return list(
        StoreFollow.objects.filter(identity).values_list("trader_id", flat=True)
    )


def follow_store(*, trader, user=None, session_key=""):
    if user is not None and getattr(user, "is_authenticated", False):
        return StoreFollow.objects.get_or_create(
            user=user, trader=trader, defaults={"session_key": ""}
        )
    key = normalized_session_key(session_key)
    if not key:
        raise ValueError(ANONYMOUS_SESSION_ERROR)
    return StoreFollow.objects.get_or_create(
        user=None, session_key=key, trader=trader
    )


def unfollow_store(*, trader, user=None, session_key=""):
    identity = viewer_store_follow_filter(user=user, session_key=session_key)
    if identity is None:
        raise ValueError(ANONYMOUS_SESSION_ERROR)
    deleted, _ = StoreFollow.objects.filter(identity, trader=trader).delete()
    return deleted > 0


@transaction.atomic
def claim_anonymous_store_follows(user, session_key):
    key = normalized_session_key(session_key)
    if not key:
        return 0
    anonymous_follows = list(
        StoreFollow.objects.select_for_update().filter(
            user__isnull=True, session_key=key
        )
    )
    for follow in anonymous_follows:
        StoreFollow.objects.get_or_create(
            user=user, trader_id=follow.trader_id, defaults={"session_key": ""}
        )
    if anonymous_follows:
        StoreFollow.objects.filter(
            pk__in=[follow.pk for follow in anonymous_follows]
        ).delete()
    return len(anonymous_follows)
