from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query

from petrus.api.middleware.auth import get_current_user
from petrus.api.deps import (
    get_mdm_fonte_service, get_mdm_submission_service,
    get_mdm_processing_service,
    get_mdm_quality_service, get_scraping_run_repo,
    get_fonte_registro_repo, get_enrichment_service,
)
from petrus.api.schemas.mdm import (
    FonteSubmitUrl, FonteUpdate, ProcessRequest, PushCleanRequest,
)
from petrus.application.mdm_fonte_service import MdmFonteService
from petrus.application.mdm_submission_service import MdmSubmissionService
from petrus.application.mdm_processing_service import MdmProcessingService
from petrus.application.mdm_quality_service import MdmQualityService
from petrus.application.enrichment_service import EnrichmentService

router = APIRouter(prefix="/api/v1/mdm", tags=["mdm"])


# --- Stats ---

@router.get("/stats")
async def mdm_stats(
    _user: dict = Depends(get_current_user),
    fonte_svc: MdmFonteService = Depends(get_mdm_fonte_service),
    enrichment_svc: EnrichmentService = Depends(get_enrichment_service),
):
    fontes = await fonte_svc.list_all()

    pendentes_processamento = sum(
        1 for f in fontes if f.processing_status in ("pendente_raw", "tem_raw")
    )

    enrichment_counts = await enrichment_svc.count_cards()

    return {
        "fontes": len(fontes),
        "pendentes_processamento": pendentes_processamento,
        "enrichment": enrichment_counts,
    }


# --- Submeter ---

@router.post("/submeter/planilha")
async def submit_spreadsheet(
    file: UploadFile = File(...),
    nome: str = Form(...),
    config: str = Form("{}"),
    _user: dict = Depends(get_current_user),
    svc: MdmSubmissionService = Depends(get_mdm_submission_service),
):
    import json
    content = await file.read()
    fonte_config = json.loads(config)
    return await svc.submit_spreadsheet(
        nome, content, file.filename or "file.csv", fonte_config,
    )


@router.post("/submeter/url")
async def submit_url(
    body: FonteSubmitUrl,
    _user: dict = Depends(get_current_user),
    svc: MdmSubmissionService = Depends(get_mdm_submission_service),
):
    return await svc.submit_url(body.nome, body.url, body.notas)


@router.post("/submeter/{fonte_id}/reenviar")
async def resubmit_spreadsheet(
    fonte_id: str,
    file: UploadFile = File(...),
    _user: dict = Depends(get_current_user),
    svc: MdmSubmissionService = Depends(get_mdm_submission_service),
):
    content = await file.read()
    return await svc.resubmit_spreadsheet(
        UUID(fonte_id), content, file.filename or "file.csv",
    )


# --- Fontes ---

@router.get("/fontes")
async def list_fontes(
    _user: dict = Depends(get_current_user),
    svc: MdmFonteService = Depends(get_mdm_fonte_service),
):
    return await svc.list_all()


@router.get("/fontes/{fonte_id}")
async def get_fonte(
    fonte_id: str,
    _user: dict = Depends(get_current_user),
    svc: MdmFonteService = Depends(get_mdm_fonte_service),
):
    fonte = await svc.get(UUID(fonte_id))
    if not fonte:
        raise HTTPException(status_code=404, detail="Fonte not found")
    return fonte


@router.put("/fontes/{fonte_id}")
async def update_fonte(
    fonte_id: str,
    body: FonteUpdate,
    _user: dict = Depends(get_current_user),
    svc: MdmFonteService = Depends(get_mdm_fonte_service),
):
    data = body.model_dump(exclude_none=True)
    return await svc.update(UUID(fonte_id), data)


@router.delete("/fontes/{fonte_id}")
async def delete_fonte(
    fonte_id: str,
    _user: dict = Depends(get_current_user),
    svc: MdmFonteService = Depends(get_mdm_fonte_service),
):
    await svc.delete(UUID(fonte_id))
    return {"ok": True}


@router.get("/fontes/{fonte_id}/raw")
async def get_fonte_raw(
    fonte_id: str,
    _user: dict = Depends(get_current_user),
    reg_repo=Depends(get_fonte_registro_repo),
):
    registros = await reg_repo.get_by_fonte_and_stage(UUID(fonte_id), "raw")
    return {"total": len(registros), "registros": registros}


@router.get("/fontes/{fonte_id}/clean")
async def get_fonte_clean(
    fonte_id: str,
    _user: dict = Depends(get_current_user),
    reg_repo=Depends(get_fonte_registro_repo),
):
    registros = await reg_repo.get_by_fonte_and_stage(UUID(fonte_id), "clean")
    return {"total": len(registros), "registros": registros}


# --- Push clean (developer API — from notebook) ---

@router.post("/fontes/{fonte_id}/clean")
async def push_clean_registros(
    fonte_id: str,
    body: PushCleanRequest,
    _user: dict = Depends(get_current_user),
    reg_repo=Depends(get_fonte_registro_repo),
    fonte_svc: MdmFonteService = Depends(get_mdm_fonte_service),
):
    """Replace clean registros for a fonte with notebook-processed data."""
    fid = UUID(fonte_id)
    fonte = await fonte_svc.get(fid)
    if not fonte:
        raise HTTPException(status_code=404, detail="Fonte not found")

    # Delete existing clean registros
    deleted = await reg_repo.delete_by_fonte_and_stage(fid, "clean")

    # Insert new clean registros
    from petrus.infrastructure.mdm.normalizer import DefaultNormalizer
    normalizer = DefaultNormalizer()

    batch = []
    for reg in body.registros:
        batch.append({
            "fonte_id": str(fid),
            "dados_brutos": reg,
            "dados_normalizados": reg,
            "hash_dedup": reg.get("hash_dedup") or normalizer.compute_hash(reg),
            "stage": "clean",
        })

    inserted = await reg_repo.create_batch(batch)

    await fonte_svc.update(fid, {"processing_status": "tem_clean"})

    return {
        "deleted_previous": deleted,
        "inserted": inserted,
        "total": len(body.registros),
    }


# --- Processar (developer API) ---

@router.post("/processar")
async def processar(
    body: ProcessRequest,
    _user: dict = Depends(get_current_user),
    svc: MdmProcessingService = Depends(get_mdm_processing_service),
):
    fonte_id = UUID(body.fonte_id)
    return await svc.process_raw_to_clean(fonte_id)


# --- Scraping ---

@router.get("/scraping/fila")
async def scraping_queue(
    _user: dict = Depends(get_current_user),
    repo=Depends(get_scraping_run_repo),
):
    return await repo.list_pending()


# --- Qualidade ---

@router.get("/qualidade/ranking")
async def qualidade_ranking(
    limit: int = Query(20),
    _user: dict = Depends(get_current_user),
    svc: MdmQualityService = Depends(get_mdm_quality_service),
):
    return await svc.ranking(limit)


@router.post("/qualidade/recalcular")
async def recalcular_qualidade(
    _user: dict = Depends(get_current_user),
    svc: MdmQualityService = Depends(get_mdm_quality_service),
):
    count = await svc.recalcular_todos()
    return {"recalculados": count}
