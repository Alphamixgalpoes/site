from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query

from petrus.api.middleware.auth import get_current_user
from petrus.api.deps import (
    get_mdm_fonte_service, get_mdm_import_service,
    get_recomendacao_service, get_mdm_quality_service,
    get_regra_enriquecimento_repo,
)
from petrus.api.schemas.mdm import (
    FonteCreate, FonteUpdate, ImportRequest,
    CardAprovar, CardRejeitar, BatchIds,
    RegraEnriquecimentoCreate, RegraEnriquecimentoUpdate,
)
from petrus.application.mdm_fonte_service import MdmFonteService
from petrus.application.mdm_import_service import MdmImportService
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
    return {
        "fontes": len(fontes),
        "cards_pendentes": resumo.total,
        "cards_por_tipo": {
            "criar": resumo.criar,
            "atualizar": resumo.atualizar,
            "mesclar": resumo.mesclar,
            "enriquecer": resumo.enriquecer,
            "alertar": resumo.alertar,
        },
    }


# --- Fontes ---

@router.get("/fontes")
async def list_fontes(
    _user: dict = Depends(get_current_user),
    svc: MdmFonteService = Depends(get_mdm_fonte_service),
):
    return await svc.list_all()


@router.post("/fontes")
async def create_fonte(
    body: FonteCreate,
    _user: dict = Depends(get_current_user),
    svc: MdmFonteService = Depends(get_mdm_fonte_service),
):
    return await svc.create(body.model_dump())


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


# --- Import ---

@router.post("/parse")
async def parse_file(
    file: UploadFile = File(...),
    _user: dict = Depends(get_current_user),
    svc: MdmImportService = Depends(get_mdm_import_service),
):
    content = await file.read()
    return await svc.parse(content, file.filename or "file.csv")


@router.post("/import")
async def import_file(
    file: UploadFile = File(...),
    fonte_id: str = Form(...),
    schema_map: str = Form(...),
    valid_from: str | None = Form(None),
    _user: dict = Depends(get_current_user),
    svc: MdmImportService = Depends(get_mdm_import_service),
):
    import json
    content = await file.read()
    mapping = json.loads(schema_map)
    return await svc.importar(
        UUID(fonte_id), content, file.filename or "file.csv", mapping, valid_from
    )


@router.get("/importacoes/{fonte_id}")
async def get_importacoes(
    fonte_id: str,
    _user: dict = Depends(get_current_user),
    svc: MdmImportService = Depends(get_mdm_import_service),
):
    return await svc.get_importacoes(UUID(fonte_id))


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


# --- Enriquecimento ---

@router.get("/enriquecimento/regras")
async def list_regras(
    _user: dict = Depends(get_current_user),
    repo=Depends(get_regra_enriquecimento_repo),
):
    return await repo.list_all()


@router.post("/enriquecimento/regras")
async def create_regra(
    body: RegraEnriquecimentoCreate,
    _user: dict = Depends(get_current_user),
    repo=Depends(get_regra_enriquecimento_repo),
):
    return await repo.create(body.model_dump())


@router.patch("/enriquecimento/regras/{regra_id}")
async def update_regra(
    regra_id: str,
    body: RegraEnriquecimentoUpdate,
    _user: dict = Depends(get_current_user),
    repo=Depends(get_regra_enriquecimento_repo),
):
    return await repo.update(UUID(regra_id), body.model_dump(exclude_none=True))
