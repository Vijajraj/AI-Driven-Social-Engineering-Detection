# api/rate_limiter.py

import time
from collections import defaultdict
from fastapi import Request, HTTPException

# 20 requests per 1 hour (3,600 seconds)
WINDOW_SECONDS = 1 * 3600  # 3,600 seconds
MAX_REQUESTS = 20

# Storage: ip -> list of timestamps
_ip_request_timestamps: dict[str, list[float]] = defaultdict(list)


def get_client_ip(request: Request) -> str:
    """Extract client IP handling proxies / X-Forwarded-For."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "127.0.0.1"


def check_rate_limit(request: Request) -> None:
    """
    Enforces rate limit of MAX_REQUESTS per WINDOW_SECONDS per IP.
    Raises HTTPException 429 if limit is reached.
    """
    ip = get_client_ip(request)
    now = time.time()
    cutoff = now - WINDOW_SECONDS

    # Clean old timestamps
    timestamps = [ts for ts in _ip_request_timestamps[ip] if ts > cutoff]
    _ip_request_timestamps[ip] = timestamps

    if len(timestamps) >= MAX_REQUESTS:
        # Calculate retry after seconds until oldest timestamp expires
        oldest = timestamps[0]
        retry_after_seconds = int((oldest + WINDOW_SECONDS) - now) + 1
        raise HTTPException(
            status_code=429,
            detail={
                "error": "rate_limited",
                "message": "Analysis limit reached (20 checks per hour). Try again later.",
                "retry_after_seconds": max(1, retry_after_seconds),
            },
        )

    # Record this request
    _ip_request_timestamps[ip].append(now)


def reset_rate_limit():
    """Helper for unit tests to reset state."""
    _ip_request_timestamps.clear()
