"""Authentication and authorization layer for MPLADS AI Sentinel.

Enforces server-side authentication using bcrypt password hashing and JWT
bearer tokens. Client-controlled role headers (X-User-Role) are completely
untrusted and ignored for access control.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Tuple
import time
import threading

import bcrypt
import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer

from backend.config import settings
from backend.database import users

ROLE_MOSPI_REVIEWER = "MoSPI Reviewer"
ROLE_DISTRICT_AUDITOR = "District Authority Auditor"
ROLE_PUBLIC_TIER = "Read-Only Public Tier"

VALID_ROLES = {ROLE_MOSPI_REVIEWER, ROLE_DISTRICT_AUDITOR, ROLE_PUBLIC_TIER}
DEFAULT_ROLE = ROLE_PUBLIC_TIER

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/auth/login",
    auto_error=False
)


# ------------------------------------------------------------------------------
# Password Hashing (Bcrypt)
# ------------------------------------------------------------------------------

def get_password_hash(password: str) -> str:
    """Hash a plaintext password with bcrypt and return the UTF-8 encoded string."""
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Safely verify a password against its bcrypt hash."""
    if not plain_password or not hashed_password:
        return False
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )
    except Exception:
        return False


# ------------------------------------------------------------------------------
# JWT Token Handling
# ------------------------------------------------------------------------------

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Generate a signed JWT token containing user identity and verified role."""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({
        "exp": expire,
        "iat": now,
    })
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Decode and validate a signed JWT token."""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM]
        )
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing subject claim",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )


from backend.database import users, rate_limits
from pymongo import ReturnDocument

# ------------------------------------------------------------------------------
# Distributed & In-Memory Rate Limiting
# ------------------------------------------------------------------------------
# IMPORTANT DEPLOYMENT CAVEAT:
# Standard in-process rate limiting (e.g. dict or memory-based sliding windows)
# is bound to a single Python OS process. On multi-worker application servers
# (e.g. Uvicorn/Gunicorn with multiple workers) or serverless platforms (Vercel,
# AWS Lambda) that scale horizontally, process-local memory is isolated across
# instances and evaporates when instances scale down.
#
# To ensure reliable protection, DistributedRateLimiter uses MongoDB's atomic
# operations on the `rate_limits` collection with automatic TTL index cleanup.
# If MongoDB is unavailable or in offline test suites (mongomock), it falls back
# cleanly to the thread-safe in-memory sliding window limiter.

class SlidingWindowRateLimiter:
    """Thread-safe in-memory rate limiter per client key (used as fallback)."""
    def __init__(self, max_requests: int, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._records: Dict[str, list[float]] = {}
        self._lock = threading.Lock()

    def is_allowed(self, key: str) -> Tuple[bool, int]:
        """Returns (is_allowed, remaining_requests_or_seconds_to_wait)."""
        now = time.time()
        cutoff = now - self.window_seconds
        with self._lock:
            timestamps = self._records.get(key, [])
            timestamps = [t for t in timestamps if t > cutoff]
            if len(timestamps) >= self.max_requests:
                wait_sec = int(timestamps[0] + self.window_seconds - now) + 1
                self._records[key] = timestamps
                return False, max(1, wait_sec)
            timestamps.append(now)
            self._records[key] = timestamps
            return True, self.max_requests - len(timestamps)

    def reset(self, key: Optional[str] = None):
        with self._lock:
            if key:
                self._records.pop(key, None)
            else:
                self._records.clear()


class DistributedRateLimiter:
    """MongoDB-backed atomic rate limiter with in-memory fallback."""
    def __init__(self, namespace: str, max_requests: int, window_seconds: int = 60):
        self.namespace = namespace
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._fallback = SlidingWindowRateLimiter(max_requests, window_seconds)

    @property
    def _records(self):
        return self._fallback._records

    @_records.setter
    def _records(self, val):
        self._fallback._records = val

    def is_allowed(self, key: str) -> Tuple[bool, int]:
        if settings.ENVIRONMENT == "test":
            return self._fallback.is_allowed(key)

        now = time.time()
        window_start = int(now // self.window_seconds) * self.window_seconds
        expires_at = datetime.fromtimestamp(window_start + self.window_seconds * 2, tz=timezone.utc)
        record_key = f"{self.namespace}:{key}"

        try:
            doc = rate_limits.find_one_and_update(
                {"key": record_key, "window_start": window_start},
                {
                    "$inc": {"count": 1},
                    "$setOnInsert": {"expires_at": expires_at}
                },
                upsert=True,
                return_document=ReturnDocument.AFTER
            )
            if doc:
                count = doc.get("count", 1)
                if count > self.max_requests:
                    wait_sec = max(1, int(window_start + self.window_seconds - now))
                    return False, wait_sec
                return True, max(0, self.max_requests - count)
        except Exception:
            # Fallback to local memory limiter if Mongo unavailable/in mock test
            pass

        return self._fallback.is_allowed(key)

    def reset(self, key: Optional[str] = None):
        try:
            if key:
                rate_limits.delete_many({"key": f"{self.namespace}:{key}"})
            else:
                rate_limits.delete_many({"key": {"$regex": f"^{self.namespace}:"}})
        except Exception:
            pass
        self._fallback.reset(key)


login_limiter = DistributedRateLimiter(
    namespace="login",
    max_requests=settings.RATE_LIMIT_LOGIN_PER_MINUTE,
    window_seconds=60
)
public_review_limiter = DistributedRateLimiter(
    namespace="public_review",
    max_requests=settings.RATE_LIMIT_PUBLIC_REVIEW_PER_MINUTE,
    window_seconds=60
)
export_limiter = DistributedRateLimiter(
    namespace="export",
    max_requests=10,
    window_seconds=60
)


def get_client_ip(request: Request) -> str:
    """Extract client IP, honoring X-Forwarded-For if behind a reverse proxy."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"


# ------------------------------------------------------------------------------
# FastAPI Dependencies for Role-Based Access Control
# ------------------------------------------------------------------------------

def get_current_user_optional(
    token: Optional[str] = Depends(oauth2_scheme)
) -> Optional[dict]:
    """Resolves the authenticated user from the Bearer token if provided.
    Does NOT throw if unauthenticated; returns None so public routes work."""
    if not token:
        return None
    try:
        payload = decode_access_token(token)
        username = payload.get("sub")
        if not username:
            return None
        user = users.find_one({"username": username})
        if not user:
            return None
        # Never leak password hash in user context
        user_clean = {k: v for k, v in user.items() if k not in ("password", "password_hash")}
        # Use authoritative role from database
        user_clean["role"] = user.get("role", ROLE_PUBLIC_TIER)
        return user_clean
    except HTTPException:
        return None


def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme)
) -> dict:
    """Authoritative user dependency. Requires a valid JWT bearer token."""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Missing Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_access_token(token)
    username = payload.get("sub")
    user = users.find_one({"username": username})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated user no longer exists.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_clean = {k: v for k, v in user.items() if k not in ("password", "password_hash")}
    user_clean["role"] = user.get("role", ROLE_PUBLIC_TIER)
    return user_clean


def get_current_role(
    user: Optional[dict] = Depends(get_current_user_optional)
) -> str:
    """Derives role strictly from the authenticated user record.
    Unauthenticated requests always safely resolve to 'Read-Only Public Tier'."""
    if not user:
        return ROLE_PUBLIC_TIER
    role = user.get("role", ROLE_PUBLIC_TIER)
    return role if role in VALID_ROLES else ROLE_PUBLIC_TIER


def require_reviewer_role(
    user: dict = Depends(get_current_user)
) -> str:
    """Restricts access to MoSPI Reviewer or District Authority Auditor."""
    role = user.get("role", "")
    if role not in {ROLE_MOSPI_REVIEWER, ROLE_DISTRICT_AUDITOR}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Only authorized MoSPI Reviewers or District Auditors may record or alter reviews."
        )
    return role


def require_mospi_admin_role(
    user: dict = Depends(get_current_user)
) -> str:
    """Restricts access exclusively to MoSPI Reviewers (admin operations)."""
    role = user.get("role", "")
    if role != ROLE_MOSPI_REVIEWER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Only MoSPI Reviewers can perform governance and sync operations."
        )
    return role
