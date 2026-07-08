def get_client_ip(request):
    forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if forwarded_for:
        return forwarded_for.split(",", 1)[0].strip()
    return request.META.get("REMOTE_ADDR")


def parse_user_agent(user_agent):
    value = user_agent or ""
    lower = value.lower()
    if "bot" in lower or "crawler" in lower or "spider" in lower:
        device_type = "bot"
    elif "ipad" in lower or "tablet" in lower:
        device_type = "tablet"
    elif "mobile" in lower or "iphone" in lower or "android" in lower:
        device_type = "mobile"
    elif value:
        device_type = "desktop"
    else:
        device_type = "unknown"

    if "edg/" in lower:
        browser = "Edge"
    elif "chrome/" in lower and "chromium" not in lower:
        browser = "Chrome"
    elif "firefox/" in lower:
        browser = "Firefox"
    elif "safari/" in lower and "chrome/" not in lower:
        browser = "Safari"
    elif "curl/" in lower:
        browser = "curl"
    else:
        browser = "Unknown"

    if "windows" in lower:
        os = "Windows"
    elif "iphone" in lower or "ipad" in lower or "ios" in lower:
        os = "iOS"
    elif "android" in lower:
        os = "Android"
    elif "mac os" in lower or "macintosh" in lower:
        os = "macOS"
    elif "linux" in lower:
        os = "Linux"
    else:
        os = "Unknown"

    return {"device_type": device_type, "browser": browser, "os": os}


def request_meta_snapshot(request):
    user_agent = request.META.get("HTTP_USER_AGENT", "")
    parsed = parse_user_agent(user_agent)
    return {
        "ip_address": get_client_ip(request),
        "user_agent": user_agent,
        "device_type": parsed["device_type"],
        "browser": parsed["browser"],
        "os": parsed["os"],
        "referer": request.META.get("HTTP_REFERER", ""),
        "origin": request.META.get("HTTP_ORIGIN", ""),
    }
