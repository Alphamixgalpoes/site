from __future__ import annotations

from dataclasses import dataclass, field
from uuid import UUID


@dataclass
class Fonte:
    id: UUID
    nome: str
    tipo: str
    prioridade: int = 50
    ativo: bool = True
    config: dict = field(default_factory=dict)
    schema_map: dict = field(default_factory=dict)
    baseline_registros: int | None = None
    baseline_preenchimento: dict = field(default_factory=dict)
    submission_type: str = "spreadsheet"
    url: str | None = None
    scraping_status: str = "pendente"
    processing_status: str = "pendente_raw"
    storage_path: str | None = None
    last_processed_at: str | None = None
    last_scraped_at: str | None = None
    notas: str | None = None
    created_at: str | None = None
    updated_at: str | None = None


@dataclass
class FonteRegistro:
    id: UUID
    fonte_id: UUID
    dados_brutos: dict
    importacao_id: UUID | None = None
    dados_normalizados: dict | None = None
    hash_dedup: str | None = None
    valid_from: str | None = None
    stage: str = "raw"
    raw_registro_id: UUID | None = None
    created_at: str | None = None


@dataclass
class ImovelFonte:
    id: UUID
    imovel_id: UUID
    fonte_registro_id: UUID
    recomendacao_id: UUID | None = None
    campos_usados: list[str] = field(default_factory=list)
    tipo_match: str | None = None
    score_match: float | None = None
    created_at: str | None = None


@dataclass
class ScrapingRun:
    id: UUID
    fonte_id: UUID
    url: str
    status: str = "pendente"
    registros_scraped: int = 0
    registros_novos: int = 0
    registros_duplicados: int = 0
    erro_mensagem: str | None = None
    notas_dev: str | None = None
    started_at: str | None = None
    finished_at: str | None = None
    created_at: str | None = None
