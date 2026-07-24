"""Tests for enrichment card generation with auto-create threshold."""
from __future__ import annotations

from uuid import uuid4

import pytest

from petrus.application.enrichment_service import AUTO_CREATE_THRESHOLD, EnrichmentService
from petrus.domain.entities.imovel import Imovel
from petrus.domain.entities.mdm import Fonte, FonteRegistro
from tests.fakes.repositories import (
    InMemoryEnrichmentCardRepo,
    InMemoryEnrichmentEventRepo,
    InMemoryFonteRegistroRepo,
    InMemoryFonteRepo,
    InMemoryImovelFonteRepo,
    InMemoryImovelRepo,
)


def _make_imovel(**overrides) -> Imovel:
    defaults = dict(
        id=uuid4(),
        titulo="Galpão Teste",
        tipo="galpao",
        categoria="Galpão",
        cidade="Barueri",
        publicado=False,
        logradouro="Al. Africa",
        numero="100",
        bairro="Alphaville",
        area_construida_m2=500.0,
        area_total_m2=800.0,
    )
    defaults.update(overrides)
    return Imovel(**defaults)


def _make_fonte() -> Fonte:
    return Fonte(
        id=uuid4(),
        nome="Teste",
        tipo="planilha",
        processing_status="clean",
    )


def _make_registro(fonte_id, **data_overrides) -> FonteRegistro:
    dados = {
        "cidade": "Barueri",
        "logradouro": "Al. Africa",
        "numero": "100",
        "bairro": "Alphaville",
        "area_construida_m2": 500.0,
    }
    dados.update(data_overrides)
    return FonteRegistro(
        id=uuid4(),
        fonte_id=fonte_id,
        dados_brutos=dados,
        dados_normalizados=dados,
        stage="clean",
    )


def _build_service(
    imovel_repo=None,
    card_repo=None,
    event_repo=None,
    reg_repo=None,
    fonte_repo=None,
    imovel_fonte_repo=None,
):
    return EnrichmentService(
        card_repo=card_repo or InMemoryEnrichmentCardRepo(),
        event_repo=event_repo or InMemoryEnrichmentEventRepo(),
        imovel_repo=imovel_repo or InMemoryImovelRepo(),
        imovel_fonte_repo=imovel_fonte_repo or InMemoryImovelFonteRepo(),
        registro_repo=reg_repo or InMemoryFonteRegistroRepo(),
        fonte_repo=fonte_repo or InMemoryFonteRepo(),
    )


@pytest.mark.asyncio
async def test_no_match_auto_creates_imovel():
    """Registro with no similar golden record should be auto-created, not carded."""
    imovel_repo = InMemoryImovelRepo()
    card_repo = InMemoryEnrichmentCardRepo()
    reg_repo = InMemoryFonteRegistroRepo()
    fonte_repo = InMemoryFonteRepo()
    imovel_fonte_repo = InMemoryImovelFonteRepo()

    fonte = _make_fonte()
    fonte_repo._store[fonte.id] = fonte

    # Registro in a city with no golden records
    reg = _make_registro(fonte.id, cidade="Campinas", logradouro="Rua X", numero="99")
    reg_repo._store[reg.id] = reg

    svc = _build_service(
        imovel_repo=imovel_repo,
        card_repo=card_repo,
        reg_repo=reg_repo,
        fonte_repo=fonte_repo,
        imovel_fonte_repo=imovel_fonte_repo,
    )

    result = await svc.generate_cards(fonte.id)

    assert result["cards_gerados"] == 0
    assert result["auto_criados"] == 1
    assert len(imovel_repo._store) == 1
    assert len(card_repo._store) == 0

    # Check lineage was created
    created_imovel = list(imovel_repo._store.values())[0]
    lineage = await imovel_fonte_repo.get_by_imovel(created_imovel.id)
    assert len(lineage) == 1
    assert lineage[0].tipo_match == "auto_criar"


@pytest.mark.asyncio
async def test_high_match_creates_card():
    """Registro with high similarity to golden record should create a card."""
    imovel_repo = InMemoryImovelRepo()
    card_repo = InMemoryEnrichmentCardRepo()
    reg_repo = InMemoryFonteRegistroRepo()
    fonte_repo = InMemoryFonteRepo()

    fonte = _make_fonte()
    fonte_repo._store[fonte.id] = fonte

    # Golden record with same address
    golden = _make_imovel(cidade="Barueri", logradouro="Al. Africa", numero="100")
    imovel_repo._store[golden.id] = golden

    # Registro matching the golden record
    reg = _make_registro(fonte.id, cidade="Barueri", logradouro="Al. Africa", numero="100")
    reg_repo._store[reg.id] = reg

    svc = _build_service(
        imovel_repo=imovel_repo,
        card_repo=card_repo,
        reg_repo=reg_repo,
        fonte_repo=fonte_repo,
    )

    result = await svc.generate_cards(fonte.id)

    assert result["cards_gerados"] == 1
    assert result["auto_criados"] == 0
    # Original golden record stays, no new imóvel created
    assert len(imovel_repo._store) == 1
    assert len(card_repo._store) == 1


@pytest.mark.asyncio
async def test_low_match_auto_creates():
    """Registro with weak similarity (< threshold) should be auto-created."""
    imovel_repo = InMemoryImovelRepo()
    card_repo = InMemoryEnrichmentCardRepo()
    reg_repo = InMemoryFonteRegistroRepo()
    fonte_repo = InMemoryFonteRepo()

    fonte = _make_fonte()
    fonte_repo._store[fonte.id] = fonte

    # Golden record in same city but very different address/area
    golden = _make_imovel(
        cidade="Barueri", logradouro="Av. Brasil", numero="5000",
        bairro="Centro", area_construida_m2=5000.0,
    )
    imovel_repo._store[golden.id] = golden

    # Registro with completely different address
    reg = _make_registro(
        fonte.id, cidade="Barueri", logradouro="Rua Tokio", numero="42",
        bairro="Tamboré", area_construida_m2=200.0,
    )
    reg_repo._store[reg.id] = reg

    svc = _build_service(
        imovel_repo=imovel_repo,
        card_repo=card_repo,
        reg_repo=reg_repo,
        fonte_repo=fonte_repo,
    )

    result = await svc.generate_cards(fonte.id)

    # Score should be below threshold — auto-create
    assert result["auto_criados"] == 1
    assert result["cards_gerados"] == 0
    # Golden + auto-created
    assert len(imovel_repo._store) == 2


@pytest.mark.asyncio
async def test_mixed_batch():
    """Batch with mix of matches and no-matches splits correctly."""
    imovel_repo = InMemoryImovelRepo()
    card_repo = InMemoryEnrichmentCardRepo()
    reg_repo = InMemoryFonteRegistroRepo()
    fonte_repo = InMemoryFonteRepo()
    imovel_fonte_repo = InMemoryImovelFonteRepo()

    fonte = _make_fonte()
    fonte_repo._store[fonte.id] = fonte

    # One golden record
    golden = _make_imovel(cidade="Barueri", logradouro="Al. Africa", numero="100")
    imovel_repo._store[golden.id] = golden

    # Registro 1: matches golden (same address)
    reg1 = _make_registro(fonte.id, cidade="Barueri", logradouro="Al. Africa", numero="100")
    reg_repo._store[reg1.id] = reg1

    # Registro 2: different city, no match
    reg2 = _make_registro(fonte.id, cidade="Campinas", logradouro="Rua Y", numero="1")
    reg_repo._store[reg2.id] = reg2

    # Registro 3: same city, totally different address
    reg3 = _make_registro(
        fonte.id, cidade="Barueri", logradouro="Rua Tokio", numero="42",
        bairro="Tamboré", area_construida_m2=200.0,
    )
    reg_repo._store[reg3.id] = reg3

    svc = _build_service(
        imovel_repo=imovel_repo,
        card_repo=card_repo,
        reg_repo=reg_repo,
        fonte_repo=fonte_repo,
        imovel_fonte_repo=imovel_fonte_repo,
    )

    result = await svc.generate_cards(fonte.id)

    assert result["total_registros"] == 3
    # reg1 matches → card, reg2+reg3 no match → auto-create
    assert result["cards_gerados"] == 1
    assert result["auto_criados"] == 2
    assert result["threshold"] == AUTO_CREATE_THRESHOLD


@pytest.mark.asyncio
async def test_auto_create_sets_origem():
    """Auto-created imóveis should have origem='enrichment_auto'."""
    imovel_repo = InMemoryImovelRepo()
    reg_repo = InMemoryFonteRegistroRepo()
    fonte_repo = InMemoryFonteRepo()

    fonte = _make_fonte()
    fonte_repo._store[fonte.id] = fonte

    reg = _make_registro(fonte.id, cidade="Campinas")
    reg_repo._store[reg.id] = reg

    svc = _build_service(
        imovel_repo=imovel_repo,
        reg_repo=reg_repo,
        fonte_repo=fonte_repo,
    )

    await svc.generate_cards(fonte.id)

    created = list(imovel_repo._store.values())[0]
    assert created.origem == "enrichment_auto"
