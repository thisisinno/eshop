import ipaddress
import socket
from io import BytesIO
from urllib.error import HTTPError
from urllib.parse import urljoin, urlparse
from urllib.request import HTTPRedirectHandler, Request, build_opener

from django.conf import settings
from django.core.files.storage import default_storage
from PIL import Image as PillowImage

MAX_REMOTE_IMAGE_BYTES = 8 * 1024 * 1024
MAX_IMAGE_PIXELS = 20_000_000


def _configured_hosts():
    hosts = set()
    for value in (
        getattr(settings, "AWS_S3_CUSTOM_DOMAIN", ""),
        getattr(settings, "AWS_STORAGE_BUCKET_NAME", ""),
    ):
        if not value:
            continue
        parsed = urlparse(value if "://" in value else f"https://{value}")
        if parsed.hostname:
            hosts.add(parsed.hostname.lower().rstrip("."))
    bucket = getattr(settings, "AWS_STORAGE_BUCKET_NAME", "")
    if bucket:
        hosts.update({f"{bucket}.s3.amazonaws.com", f"{bucket}.s3.amazonaws.com".lower()})
    configured = getattr(settings, "PDF_IMAGE_ALLOWED_HOSTS", ())
    if isinstance(configured, str):
        configured = configured.split(",")
    hosts.update(str(host).strip().lower().rstrip(".") for host in configured if str(host).strip())
    return hosts


def is_safe_remote_image_url(url):
    try:
        parsed = urlparse(url)
        if parsed.scheme != "https" or not parsed.hostname:
            return False
        host = parsed.hostname.lower().rstrip(".")
        allowed = _configured_hosts()
        if host not in allowed and not any(host.endswith(f".{entry}") for entry in allowed):
            return False
        addresses = socket.getaddrinfo(host, parsed.port or 443, type=socket.SOCK_STREAM)
        for address in addresses:
            ip = ipaddress.ip_address(address[4][0])
            if not ip.is_global:
                return False
        return True
    except (OSError, ValueError):
        return False


class _NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, request, file_pointer, code, message, headers, new_url):
        return None


def _fetch_remote(url):
    opener = build_opener(_NoRedirect)
    current = url
    for _ in range(4):
        if not is_safe_remote_image_url(current):
            return None
        request = Request(current, headers={"User-Agent": "SmartWear-PDF/1.0", "Accept": "image/*"})
        try:
            response = opener.open(request, timeout=4)
        except HTTPError as error:
            if error.code not in (301, 302, 303, 307, 308):
                return None
            target = error.headers.get("Location")
            if not target:
                return None
            current = urljoin(current, target)
            continue
        content_length = response.headers.get("Content-Length")
        if content_length and int(content_length) > MAX_REMOTE_IMAGE_BYTES:
            return None
        data = response.read(MAX_REMOTE_IMAGE_BYTES + 1)
        return data if len(data) <= MAX_REMOTE_IMAGE_BYTES else None
    return None


def _read_storage(name):
    normalized = str(name or "").split("?", 1)[0].lstrip("/")
    if normalized.startswith("media/"):
        normalized = normalized[6:]
    if not normalized or ".." in normalized.split("/"):
        return None
    try:
        with default_storage.open(normalized, "rb") as source:
            data = source.read(MAX_REMOTE_IMAGE_BYTES + 1)
        return data if len(data) <= MAX_REMOTE_IMAGE_BYTES else None
    except (OSError, ValueError):
        return None


def _normalize_image(data, max_size=(900, 900)):
    if not data:
        return None
    previous_limit = PillowImage.MAX_IMAGE_PIXELS
    PillowImage.MAX_IMAGE_PIXELS = MAX_IMAGE_PIXELS
    try:
        with PillowImage.open(BytesIO(data)) as source:
            source.verify()
        with PillowImage.open(BytesIO(data)) as source:
            source.thumbnail(max_size)
            if source.mode not in ("RGB", "RGBA"):
                source = source.convert("RGBA" if "transparency" in source.info else "RGB")
            output = BytesIO()
            output_format = "PNG" if source.mode == "RGBA" else "JPEG"
            source.save(output, format=output_format, optimize=True, quality=86)
            output.seek(0)
            return output
    except (OSError, ValueError, PillowImage.DecompressionBombError):
        return None
    finally:
        PillowImage.MAX_IMAGE_PIXELS = previous_limit


class PDFImageLoader:
    def __init__(self):
        self.cache = {}

    def load(self, snapshot_url="", file_field=None, max_size=(900, 900)):
        field_name = getattr(file_field, "name", "") if file_field else ""
        key = (str(snapshot_url or ""), str(field_name or ""), max_size)
        if key in self.cache:
            cached = self.cache[key]
            return BytesIO(cached) if cached else None
        data = None
        value = str(snapshot_url or "").strip()
        if value:
            parsed = urlparse(value)
            data = _fetch_remote(value) if parsed.scheme else _read_storage(value)
        if not data and file_field:
            try:
                file_field.open("rb")
                data = file_field.read(MAX_REMOTE_IMAGE_BYTES + 1)
                file_field.close()
                if len(data) > MAX_REMOTE_IMAGE_BYTES:
                    data = None
            except (OSError, ValueError):
                data = None
        normalized = _normalize_image(data, max_size)
        payload = normalized.getvalue() if normalized else None
        self.cache[key] = payload
        return BytesIO(payload) if payload else None
