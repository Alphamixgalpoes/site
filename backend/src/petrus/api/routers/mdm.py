from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query

from petrus.api.middleware.auth import get_current_user
from petrus.api.deps import (
    get_mdm_fonte_service, get_mdm_submission_service,
    get_mdm_processing_service, get_recomendacao_service,
    get_mdm_quality_service, get_scraping_run_repo,
    get_fonte_registro_repo,
)
from petrus.api.schemas.mdm import (
    FonteSubmitUrl, FonteUpdate, ProcessRequest,
    CardAprovar, CardRejeitar, BatchIds,
)
from petrus.application.mdm_fonte_service import MdmFonteService
from petrus.application.mdm_submission_service import MdmSubmissionService
from petrus.application.mdm_processing_service import MdmProcessingService
from petrus.application.recomendacao_service import RecomendacaoService
from petrus.application.mdm_quality_service import MdmQualityService

router = APIRouter(prefix="/api/v1/mdm", tags=["mdm"])


# --- Stats ---

@router.get("/stats")
async def mdm_stats(
    _user: dict = Depends(get_current_user),
    fonte_svc: MdmFonteService = Depends(get_mdm_fonte_service),
    rec_svc: RecomendacaoService = Depends(get_recomendacao_service),
):
    fontes = await fonte_svc.list_all()
    resumo = await rec_svc.resumo()

    pendentes_processamento = sum(
        1 for f in fontes if f.processing_status in ("pendente_raw", "tem_raw")
    )

    return {
        "fontes": len(fontes),
        "pendentes_processamento": pendentes_processamento,
        "cards_pendentes": resumo.total,
        "cards_por_tipo": {
            "criar": resumo.criar,
            "atualizar": resumo.atualizar,
            "mesclar": resumo.mesclar,
            "enriquecer": resumo.enriquecer,
            "alertar": resumo.alertar,
        },
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


# --- Processar (developer API) ---

@router.post("/processar")
async def processar(
    body: ProcessRequest,
    _user: dict = Depends(get_current_user),
    svc: MdmProcessingService = Depends(get_mdm_processing_service),
):
    fonte_id = UUID(body.fonte_id)
    if body.step == "raw_to_clean":
        return await svc.process_raw_to_clean(fonte_id)
    elif body.step == "clean_to_cards":
        return await svc.generate_cards_for_fonte(fonte_id)
    else:
        return await svc.process_full(fonte_id)


# --- Scraping ---

@router.get("/scraping/fila")
async def scraping_queue(
    _user: dict = Depends(get_current_user),
    repo=Depends(get_scraping_run_repo),
):
    return await repo.list_pending()


# --- Cards ---

@router.get("/cards")
async def list_cards(
    tipo: str | None = Query(None),
    cidade: str | None = Query(None),
    area_min: float | None = Query(None),
    area_max: float | None = Query(None),
    valor_min: float | None = Query(None),
    valor_max: float | None = Query(None),
    confianca_min: float | None = Query(None),
    fonte_id: str | None = Query(None),
    _user: dict = Depends(get_current_user),
    svc: RecomendacaoService = Depends(get_recomendacao_service),
):
    filtros = {}
    if tipo:
        filtros["tipo"] = tipo
    if cidade:
        filtros["cidade"] = cidade
    if area_min:
        filtros["area_min"] = area_min
    if area_max:
        filtros["area_max"] = area_max
    if valor_min:
        filtros["valor_min"] = valor_min
    if valor_max:
        filtros["valor_max"] = valor_max
    if confianca_min:
        filtros["confianca_min"] = confianca_min
    if fonte_id:
        filtros["fonte_id"] = fonte_id
    return await svc.list_pendentes(filtros or None)


@router.get("/cards/resumo")
async def cards_resumo(
    _user: dict = Depends(get_current_user),
    svc: RecomendacaoService = Depends(get_recomendacao_service),
):
    return await svc.resumo()


@router.get("/cards/{card_id}")
async def get_card(
    card_id: str,
    _user: dict = Depends(get_current_user),
    svc: RecomendacaoService = Depends(get_recomendacao_service),
):
    card = await svc.get(UUID(card_id))
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    return card


@router.post("/cards/{card_id}/aprovar")
async def aprovar_card(
    card_id: str,
    body: CardAprovar | None = None,
    _user: dict = Depends(get_current_user),
    svc: RecomendacaoService = Depends(get_recomendacao_service),
):
    dados = body.dados_editados if body else None
    return await svc.aprovar(UUID(card_id), dados)


@router.post("/cards/{card_id}/rejeitar")
async def rejeitar_card(
    card_id: str,
    body: CardRejeitar | None = None,
    _user: dict = Depends(get_current_user),
    svc: RecomendacaoService = Depends(get_recomendacao_service),
):
    notas = body.notas if body else None
    return await svc.rejeitar(UUID(card_id), notas)


@router.post("/cards/aprovar-lote")
async def aprovar_lote(
    body: BatchIds,
    _user: dict = Depends(get_current_user),
    svc: RecomendacaoService = Depends(get_recomendacao_service),
):
    count = await svc.batch_aprovar([UUID(i) for i in body.ids])
    return {"aprovados": count}


@router.post("/cards/rejeitar-lote")
async def rejeitar_lote(
    body: BatchIds,
    _user: dict = Depends(get_current_user),
    svc: RecomendacaoService = Depends(get_recomendacao_service),
):
    count = await svc.batch_rejeitar([UUID(i) for i in body.ids], body.notas)
    return {"rejeitados": count}


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
