import secrets
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core import signing
from django.core.cache import cache

TICKET_SALT = "smartwear.websocket.ticket.v1"
TICKET_MAX_AGE = 60


def issue_ticket(user, scope_name, chat_id=None):
    nonce = secrets.token_urlsafe(24)
    payload = {"user_id": user.id, "scope": scope_name, "nonce": nonce}
    if chat_id is not None:
        payload["chat_id"] = int(chat_id)
    cache.set(f"ws-ticket:{nonce}", True, timeout=TICKET_MAX_AGE)
    return signing.dumps(payload, salt=TICKET_SALT, compress=True)


@database_sync_to_async
def consume_ticket(ticket):
    try:
        payload = signing.loads(ticket, salt=TICKET_SALT, max_age=TICKET_MAX_AGE)
    except signing.BadSignature:
        return None, None
    nonce = payload.get("nonce")
    cache_key = f"ws-ticket:{nonce}"
    if not nonce or not cache.get(cache_key):
        return None, None
    cache.delete(cache_key)
    user = get_user_model().objects.filter(pk=payload.get("user_id"), is_active=True).first()
    return user, payload


class TicketAuthMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        origin = dict(scope.get("headers", [])).get(b"origin", b"").decode().rstrip("/")
        allowed = getattr(settings, "WEBSOCKET_ALLOWED_ORIGINS", [])
        if allowed and origin not in allowed:
            await send({"type": "websocket.close", "code": 4403})
            return
        query = parse_qs(scope.get("query_string", b"").decode())
        ticket = query.get("ticket", [""])[0]
        user, payload = await consume_ticket(ticket)
        if user is None:
            await send({"type": "websocket.close", "code": 4401})
            return
        scope["user"] = user
        scope["ticket"] = payload
        return await self.app(scope, receive, send)

