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
    created_at: str | None = None
    updated_at: str | None = None


@dataclass
class Importacao:
    id: UUID
    fonte_id: UUID
    status: str = "pendente"
    arquivo_nome: str | None = None
    registros_total: int = 0
    registros_importados: int = 0
    registros_erro: int = 0
    erros: list = field(default_factory=list)
    stats: dict = field(default_factory=dict)
    alertas: list = field(default_factory=list)
    cards_gerados: int = 0
    started_at: str | None = None
    finished_at: str | None = None
    created_at: str | None = None


@dataclass
class FonteRegistro:
    id: UUID
    fonte_id: UUID
    dados_brutos: dict
    importacao_id: UUID | None = None
    dados_normalizados: dict | None = None
    hash_dedup: str | None = None
    valid_from: str | None = None
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
class ConsolidacaoLog:
    id: UUID
    status: str = "rodando"
    fontes_processadas: list[str] = field(default_factory=list)
    registros_entrada: int = 0
    cards_criar: int = 0
    cards_atualizar: int = 0
    cards_mesclar: int = 0
    cards_total: int = 0
    started_at: str | None = None
    finished_at: str | None = None


@dataclass
class RegraEnriquecimento:
    id: UUID
    nome: str
    condicao: dict
    acao: str
    config: dict = field(default_factory=dict)
    ativo: bool = True
    ordem: int = 0
    created_at: str | None = None


@dataclass
class RegraAprovacao:
    id: UUID
    nome: str
    condicao: dict
    ativo: bool = False
    ordem: int = 0
    aprovacoes_total: int = 0
    created_at: str | None = None


@dataclass
class MercadoSnapshot:
    id: UUID
    fonte: str
    data_coleta: str | None = None
    endereco: str | None = None
    bairro: str | None = None
    cidade: str | None = None
    area: float | None = None
    valor_venda: float | None = None
    valor_locacao: float | None = None
    url_anuncio: str | None = None
    dados_raw: dict = field(default_factory=dict)
    created_at: str | None = None


@dataclass
class CacheConsulta:
    id: UUID
    tipo: str
    chave: str
    dados: dict
    created_at: str | None = None
    expires_at: str | None = None
