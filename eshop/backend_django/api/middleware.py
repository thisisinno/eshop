import logging
import time

from django.conf import settings
from django.db import connection

from api.models import SystemRequestLog
from api.utils.request_meta import request_meta_snapshot

logger = logging.getLogger(__name__)


class SystemRequestLogMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        started = time.monotonic()
        error = None
        response = None
        try:
            response = self.get_response(request)
            return response
        except Exception as exc:
            error = exc
            raise
        finally:
            self._record(request, response, started, error)

    def _record(self, request, response, started, error):
        if not getattr(settings, "SYSTEM_REQUEST_LOGGING_ENABLED", True):
            return
        path = getattr(request, "path", "")
        excluded = getattr(settings, "SYSTEM_REQUEST_LOG_EXCLUDED_PREFIXES", ("/static/", "/media/", "/favicon.ico"))
        if any(path.startswith(prefix) for prefix in excluded):
            return
        try:
            if SystemRequestLog._meta.db_table not in connection.introspection.table_names():
                return
            user = getattr(request, "user", None)
            if not getattr(user, "is_authenticated", False):
                user = None
            meta = request_meta_snapshot(request)
            resolver_match = getattr(request, "resolver_match", None)
            status_code = getattr(response, "status_code", None)
            duration_ms = int((time.monotonic() - started) * 1000)
            SystemRequestLog.objects.create(
                user=user,
                username_snapshot=user.get_username() if user else "",
                ip_address=meta["ip_address"],
                user_agent=meta["user_agent"],
                device_type=meta["device_type"],
                browser=meta["browser"],
                os=meta["os"],
                method=request.method,
                path=path[:500],
                query_string=request.META.get("QUERY_STRING", ""),
                view_name=getattr(resolver_match, "view_name", "") or "",
                status_code=status_code,
                duration_ms=max(duration_ms, 0),
                referer=meta["referer"],
                origin=meta["origin"],
                is_error=bool(error) or (status_code is not None and status_code >= 500),
                error_message=str(error)[:2000] if error else "",
                metadata={},
            )
        except Exception:
            logger.warning("Could not record system request log", exc_info=True)
