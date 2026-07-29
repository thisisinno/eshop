# SmartWear real-time deployment

Keep ordinary HTTP and `/api/` on the existing Gunicorn service. Route only
`/ws/` to a private Daphne ASGI listener.

Required environment:

```dotenv
REDIS_URL=redis://127.0.0.1:6379/0
WEBSOCKET_ALLOWED_ORIGINS=https://eshop.schoolsoft.online,https://admin.example.com
NEXT_PUBLIC_DJANGO_WS_URL=wss://eshop.schoolsoft.online
```

Before installing the examples, inspect active services and listening ports,
choose a free private port, update both templates, verify Redis with
`redis-cli ping`, run `nginx -t`, then reload Nginx. Do not expose Daphne's
private listener publicly and do not route WebSockets to Gunicorn.
