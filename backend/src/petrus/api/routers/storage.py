from __future__ import annotations

from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException

from petrus.api.middleware.auth import get_current_user
from petrus.api.deps import get_storage_service
from petrus.domain.services.storage_service import StorageService

router = APIRouter(prefix="/api/v1/storage", tags=["storage"])


@router.post("/upload/{bucket}")
async def upload_file(
    bucket: str,
    file: UploadFile = File(...),
    path: str = Form(...),
    _user: dict = Depends(get_current_user),
    storage: StorageService = Depends(get_storage_service),
):
    file_bytes = await file.read()
    url = await storage.upload(
        bucket, path, file_bytes, file.content_type or "application/octet-stream"
    )
    return {"url": url, "path": path}


@router.get("/signed-url/{bucket}")
async def get_signed_url(
    bucket: str,
    path: str,
    expires_in: int = 3600,
    _user: dict = Depends(get_current_user),
    storage: StorageService = Depends(get_storage_service),
):
    url = await storage.create_signed_url(bucket, path, expires_in)
    return {"url": url}
