from __future__ import annotations

import json
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, Request, UploadFile

from petrus.api.deps import get_registro_service
from petrus.api.middleware.auth import get_current_user, optional_user
from petrus.application.registro_service import RegistroAppService
from petrus.config import settings

router = APIRouter(prefix="/api/v1/registros", tags=["registros"])


def _check_api_key_or_jwt(
    x_api_key: str | None = Header(None),
    user: dict | None = Depends(optional_user),
) -> None:
    """Aceita JWT (admin) OU X-API-Key (iPhone Shortcut)."""
    if user:
        return
    if (
        x_api_key
        and settings.registro_api_key
        and x_api_key == settings.registro_api_key
    ):
        return
    raise HTTPException(status_code=401, detail="Not authenticated")


@router.post("/debug")
async def debug_registro(request: Request):
    """Endpoint temporario — mostra tudo que chega no request."""
    result: dict = {
        "method": request.method,
        "url": str(request.url),
        "headers": dict(request.headers),
        "content_type": request.headers.get("content-type", ""),
    }

    form = await request.form()
    fields = []
    for key in form:
        item = form[key]
        if hasattr(item, "filename"):
            content = await item.read()
            fields.append({
                "field_name": key,
                "type": "file",
                "filename": item.filename,
                "content_type": item.content_type,
                "size_bytes": len(content),
                "preview": content[:200].decode("utf-8", errors="replace")
                if item.content_type and "text" in item.content_type
                else f"(binary {len(content)} bytes)",
            })
        else:
            fields.append({
                "field_name": key,
                "type": "text",
                "value": str(item),
            })

    result["fields"] = fields
    result["total_fields"] = len(fields)
    return result


@router.post("")
async def create_registro(
    request: Request,
    _auth: None = Depends(_check_api_key_or_jwt),
    svc: RegistroAppService = Depends(get_registro_service),
):
    form = await request.form()

    texto = None
    meta = None
    file_tuples = []

    for key in form:
        item = form[key]
        if hasattr(item, "filename"):
            content = await item.read()
            ct = item.content_type or "application/octet-stream"
            file_tuples.append((content, item.filename or "file", ct))
        elif key == "texto":
            texto = str(item)
        elif key == "metadata":
            meta = json.loads(str(item))

    return await svc.create(
        texto=texto, metadata=meta, files=file_tuples or None,
    )


@router.post("/upload-arquivo")
async def upload_arquivo(
    request: Request,
    _auth: None = Depends(_check_api_key_or_jwt),
    svc: RegistroAppService = Depends(get_registro_service),
):
    form = await request.form()

    registro_id = None
    arquivo = None
    for key in form:
        item = form[key]
        if hasattr(item, "filename"):
            arquivo = item
        elif key == "registro_id":
            registro_id = str(item)

    if not registro_id:
        raise HTTPException(status_code=400, detail="registro_id obrigatorio")

    reg = await svc.get(UUID(registro_id))
    if not reg:
        raise HTTPException(status_code=404, detail="Registro nao encontrado")

    if not arquivo:
        raise HTTPException(status_code=400, detail="Nenhum arquivo enviado")

    content = await arquivo.read()
    ct = arquivo.content_type or "application/octet-stream"
    result = await svc.add_arquivo(
        UUID(registro_id), content, arquivo.filename or "file", ct,
    )
    return result


@router.get("")
async def list_registros(
    _user: dict = Depends(get_current_user),
    svc: RegistroAppService = Depends(get_registro_service),
):
    return await svc.list_all()


@router.get("/{registro_id}")
async def get_registro(
    registro_id: str,
    _user: dict = Depends(get_current_user),
    svc: RegistroAppService = Depends(get_registro_service),
):
    reg = await svc.get(UUID(registro_id))
    if not reg:
        raise HTTPException(
            status_code=404, detail="Registro nao encontrado",
        )
    return reg


@router.delete("/{registro_id}")
async def delete_registro(
    registro_id: str,
    _user: dict = Depends(get_current_user),
    svc: RegistroAppService = Depends(get_registro_service),
):
    await svc.delete(UUID(registro_id))
    return {"ok": True}


@router.post("/{registro_id}/notas")
async def add_nota(
    registro_id: str,
    request: Request,
    _auth: None = Depends(_check_api_key_or_jwt),
    svc: RegistroAppService = Depends(get_registro_service),
):
    reg = await svc.get(UUID(registro_id))
    if not reg:
        raise HTTPException(status_code=404, detail="Registro nao encontrado")

    form = await request.form()
    nota = None
    for key in form:
        item = form[key]
        if not hasattr(item, "filename"):
            nota = str(item)
            break

    if not nota:
        raise HTTPException(status_code=400, detail="Nenhuma nota enviada")

    await svc.append_nota(UUID(registro_id), nota)
    return {"ok": True}


@router.get("/{registro_id}/arquivo-url")
async def get_arquivo_url(
    registro_id: str,
    path: str,
    _user: dict = Depends(get_current_user),
    svc: RegistroAppService = Depends(get_registro_service),
):
    url = await svc.get_signed_url(path)
    return {"url": url}
