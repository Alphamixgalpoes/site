from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from petrus.config import settings
from petrus.api.routers import health, leads, geocode, images, staticmap
from petrus.api.routers import imoveis, contatos, processos, config, storage, publicacao, mdm
from petrus.infrastructure.database.supabase_client import init_supabase, get_supabase


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    init_supabase()
    yield


app = FastAPI(
    title="Petrus API",
    description="Backend API for Alphamix Galpoes",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Phase 2: core
app.include_router(health.router)

# Phase 3: migrated API routes
app.include_router(leads.router)
app.include_router(geocode.router)
app.include_router(images.router)
app.include_router(staticmap.router)

# Phase 4: CRUD
app.include_router(imoveis.router)
app.include_router(contatos.router)
app.include_router(processos.router)
app.include_router(config.router)
app.include_router(storage.router)
app.include_router(publicacao.router)
app.include_router(mdm.router)
