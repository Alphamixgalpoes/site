from __future__ import annotations

import logging

import jwt as pyjwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient

from petrus.config import settings

logger = logging.getLogger(__name__)

bearer_scheme = HTTPBearer(auto_error=False)

# JWKS client for asymmetric keys (ES256, RS256) — cached internally
_jwks_url = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
_jwks_client = PyJWKClient(_jwks_url, cache_keys=True, lifespan=600)


def _decode_jwt(token: str) -> dict:
    """Decode JWT supporting both asymmetric (ES256/RS256) and legacy HS256."""
    header = pyjwt.get_unverified_header(token)
    alg = header.get("alg", "HS256")

    if alg in ("ES256", "RS256", "EdDSA"):
        # Asymmetric: fetch public key from JWKS endpoint
        signing_key = _jwks_client.get_signing_key_from_jwt(token)
        return pyjwt.decode(
            token,
            signing_key.key,
            algorithms=[alg],
            options={"verify_aud": False},
        )

    # Legacy symmetric (HS256/HS384/HS512)
    return pyjwt.decode(
        token,
        settings.supabase_jwt_secret,
        algorithms=["HS256", "HS384", "HS512"],
        options={"verify_aud": False},
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    try:
        payload = _decode_jwt(credentials.credentials)
    except pyjwt.PyJWTError as e:
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
    except pyjwt.PyJWTError:
        return None
