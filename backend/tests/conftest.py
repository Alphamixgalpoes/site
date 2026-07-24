"""Central test configuration. Must set env vars BEFORE any petrus imports."""

from __future__ import annotations

import os

# --- Set dummy env vars before Settings() singleton is triggered ---
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_ANON_KEY", "test-anon-key")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key")
os.environ.setdefault("SUPABASE_JWT_SECRET", "test-jwt-secret-minimum-32-chars-long-for-hs256")

from collections.abc import AsyncGenerator  # noqa: E402
from contextlib import asynccontextmanager  # noqa: E402

import pytest  # noqa: E402
from fastapi import FastAPI  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from petrus.api.deps import (  # noqa: E402
    get_config_service,
    get_contato_service,
    get_fonte_registro_repo,
    get_geocoding_service,
    get_image_service,
    get_imovel_image_service,
    get_imovel_service,
    get_lead_service,
    get_mdm_fonte_service,
    get_mdm_processing_service,
    get_mdm_quality_service,
    get_mdm_submission_service,
    get_processo_file_service,
    get_processo_service,
    get_publicacao_service,
    get_recomendacao_service,
    get_scraping_run_repo,
)
from petrus.api.middleware.auth import get_current_user, optional_user  # noqa: E402
from petrus.api.routers import (  # noqa: E402
    config,
    contatos,
    geocode,
    health,
    images,
    imoveis,
    leads,
    mdm,
    processos,
    publicacao,
    staticmap,
    storage,
)
from petrus.application.config_service import ConfigService  # noqa: E402
from petrus.application.contato_service import ContatoService  # noqa: E402
from petrus.application.imovel_image_service import ImovelImageService  # noqa: E402
from petrus.application.imovel_service import ImovelService  # noqa: E402
from petrus.application.lead_service import LeadAppService  # noqa: E402
from petrus.application.mdm_fonte_service import MdmFonteService  # noqa: E402
from petrus.application.mdm_processing_service import MdmProcessingService  # noqa: E402
from petrus.application.mdm_quality_service import MdmQualityService  # noqa: E402
from petrus.application.mdm_submission_service import MdmSubmissionService  # noqa: E402
from petrus.application.processo_file_service import ProcessoFileService  # noqa: E402
from petrus.application.processo_service import ProcessoAppService  # noqa: E402
from petrus.application.publicacao_service import PublicacaoService  # noqa: E402
from petrus.application.recomendacao_service import RecomendacaoService  # noqa: E402
from petrus.infrastructure.mdm.quality import DefaultQualityService  # noqa: E402
from tests.fakes.repositories import (  # noqa: E402
    InMemoryConfigRepo,
    InMemoryContatoRepo,
    InMemoryFonteRegistroRepo,
    InMemoryFonteRepo,
    InMemoryImovelFonteRepo,
    InMemoryImovelRepo,
    InMemoryLeadRepo,
    InMemoryProcessoRepo,
    InMemoryPublicacaoRepo,
    InMemoryRecomendacaoRepo,
    InMemoryScrapingRunRepo,
)
from tests.fakes.services import (  # noqa: E402
    FakeEmailService,
    FakeGeocodingService,
    FakeImageService,
    FakeStorageService,
)

FAKE_USER = {"sub": "00000000-0000-0000-0000-000000000001", "role": "authenticated"}


def _build_test_app() -> FastAPI:
    """Create a FastAPI app identical to production but with no-op lifespan."""

    @asynccontextmanager
    async def noop_lifespan(app: FastAPI) -> AsyncGenerator[None]:
        yield

    app = FastAPI(lifespan=noop_lifespan)

    # Include all routers (same as main.py)
    for router_module in [
        health,
        leads,
        geocode,
        images,
        staticmap,
        imoveis,
        contatos,
        processos,
        config,
        storage,
        publicacao,
        mdm,
    ]:
        app.include_router(router_module.router)

    # --- Create fresh in-memory fakes ---
    lead_repo = InMemoryLeadRepo()
    imovel_repo = InMemoryImovelRepo()
    contato_repo = InMemoryContatoRepo()
    processo_repo = InMemoryProcessoRepo()
    config_repo = InMemoryConfigRepo()
    publicacao_repo = InMemoryPublicacaoRepo()
    recomendacao_repo = InMemoryRecomendacaoRepo()
    fonte_repo = InMemoryFonteRepo()
    fonte_registro_repo = InMemoryFonteRegistroRepo()
    imovel_fonte_repo = InMemoryImovelFonteRepo()
    scraping_run_repo = InMemoryScrapingRunRepo()

    email_svc = FakeEmailService()
    storage_svc = FakeStorageService()

    # --- Override auth ---
    app.dependency_overrides[get_current_user] = lambda: FAKE_USER
    app.dependency_overrides[optional_user] = lambda: FAKE_USER

    # --- Override infrastructure services ---
    app.dependency_overrides[get_image_service] = lambda: FakeImageService()
    app.dependency_overrides[get_geocoding_service] = lambda: FakeGeocodingService()

    # --- Override application services ---
    app.dependency_overrides[get_lead_service] = lambda: LeadAppService(lead_repo, email_svc)
    app.dependency_overrides[get_imovel_service] = lambda: ImovelService(imovel_repo)
    app.dependency_overrides[get_imovel_image_service] = lambda: ImovelImageService(
        imovel_repo,
        storage_svc,
    )
    app.dependency_overrides[get_contato_service] = lambda: ContatoService(contato_repo)
    app.dependency_overrides[get_processo_service] = lambda: ProcessoAppService(processo_repo)
    app.dependency_overrides[get_processo_file_service] = lambda: ProcessoFileService(
        processo_repo,
        storage_svc,
    )
    app.dependency_overrides[get_config_service] = lambda: ConfigService(config_repo)
    app.dependency_overrides[get_publicacao_service] = lambda: PublicacaoService(publicacao_repo)
    app.dependency_overrides[get_recomendacao_service] = lambda: RecomendacaoService(
        recomendacao_repo,
        imovel_repo,
        imovel_fonte_repo,
    )
    app.dependency_overrides[get_mdm_fonte_service] = lambda: MdmFonteService(fonte_repo)
    app.dependency_overrides[get_mdm_submission_service] = lambda: MdmSubmissionService(
        fonte_repo,
        fonte_registro_repo,
        scraping_run_repo,
        storage_svc,
    )
    app.dependency_overrides[get_mdm_processing_service] = lambda: MdmProcessingService(
        fonte_repo,
        fonte_registro_repo,
        recomendacao_repo,
        imovel_repo,
    )
    app.dependency_overrides[get_mdm_quality_service] = lambda: MdmQualityService(
        imovel_repo,
        DefaultQualityService(),
    )
    app.dependency_overrides[get_fonte_registro_repo] = lambda: fonte_registro_repo
    app.dependency_overrides[get_scraping_run_repo] = lambda: scraping_run_repo

    return app


@pytest.fixture
def client() -> TestClient:
    """TestClient with all dependencies overridden to in-memory fakes."""
    app = _build_test_app()
    return TestClient(app)


@pytest.fixture
def anon_client() -> TestClient:
    """TestClient WITHOUT auth override — simulates unauthenticated requests."""
    app = _build_test_app()
    # Remove the auth override so requests without token get 401
    app.dependency_overrides.pop(get_current_user, None)
    app.dependency_overrides.pop(optional_user, None)
    return TestClient(app)
