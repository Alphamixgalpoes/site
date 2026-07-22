from __future__ import annotations

from dataclasses import dataclass, field
from uuid import UUID

from petrus.domain.entities.contato import ContatoResumido


@dataclass
class ImovelImagem:
    id: UUID
    storage_path: str
    ordem: int
    visivel_site: bool
    is_capa: bool
    imovel_id: UUID | None = None


@dataclass
class ImovelResumido:
    id: UUID
    titulo: str
    tipo: str
    area_total_m2: float | None = None


@dataclass
class Imovel:
    id: UUID
    titulo: str
    tipo: str
    categoria: str
    cidade: str
    publicado: bool

    uso_terreno: str | None = None
    valor: float | None = None
    bairro: str | None = None
    endereco: str | None = None
    logradouro: str | None = None
    numero: str | None = None
    complemento: str | None = None
    uf: str | None = None
    cep: str | None = None
    geojson: dict | None = None

    area_construida_m2: float | None = None
    area_total_m2: float | None = None
    area_piso_m2: float | None = None
    pe_direito_m: float | None = None
    area_escritorio_m2: float | None = None

    numero_docas: int = 0
    acesso_carreta: bool = False
    truck_court_m: float | None = None
    vagas_estacionamento: int = 0

    sprinklers: bool = False
    sprinkler_tipo: str | None = None
    guarita: bool = False
    potencia_eletrica_kva: float | None = None
    capacidade_piso_ton_m2: float | None = None

    avcb_numero: str | None = None
    avcb_validade: str | None = None
    acessos_viarios: str | None = None

    video_url: str | None = None
    planta_baixa_url: str | None = None

    condominio: bool = False
    valor_condominio: float | None = None
    descricao: str | None = None
    observacoes: str | None = None

    campos_visibilidade: dict = field(default_factory=dict)
    latitude: float | None = None
    longitude: float | None = None
    proprietario_id: UUID | None = None
    created_at: str | None = None
    updated_at: str | None = None

    # MDM fields
    dados_extras: dict = field(default_factory=dict)
    status: str | None = None
    qualidade_campos: dict = field(default_factory=dict)
    qualidade_score: float = 0.0
    notas: str | None = None
    visitado: bool = False
    ultima_revisao: str | None = None
    motivo_arquivo: str | None = None
    origem: str | None = None
    enriquecido_em: str | None = None

    proprietario: ContatoResumido | None = None
    imovel_imagens: list[ImovelImagem] = field(default_factory=list)
