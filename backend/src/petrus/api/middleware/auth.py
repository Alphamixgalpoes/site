from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from petrus.config import settings

bearer_scheme = HTTPBearer(auto_error=False)

# Supabase usa HS256 por padrão; inclui HS384/HS512 como fallback
_ALLOWED_ALGS = ["HS256", "HS384", "HS512"]


def _decode_jwt(token: str) -> dict:
    """Decode JWT tentando os algoritmos HMAC permitidos."""
    try:
        header = jwt.get_unverified_header(token)
        alg = header.get("alg", "HS256")
    except JWTError:
        alg = "HS256"

    if alg not in _ALLOWED_ALGS:
        raise JWTError(f"Unsupported JWT algorithm: {alg}")

    return jwt.decode(
        token,
        settings.supabase_jwt_secret,
        algorithms=_ALLOWED_ALGS,
        options={"verify_aud": False},
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    try:
        payload = _decode_jwt(credentials.credentials)
    except JWTError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))

    return {"sub": payload.get("sub"), "role": payload.get("role")}


def optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict | None:
    if credentials is None:
        return None
    try:
        payload = _decode_jwt(credentials.credentials)
        return {"sub": payload.get("sub"), "role": payload.get("role")}
    except JWTError:
        return None
