from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class CanonicalRecord:
    """Universal format produced by all source adapters.

    This is the data contract between the adapter layer (source-specific)
    and the pipeline (source-agnostic). Every field is optional — adapters
    fill what they can, the pipeline works with what it gets.
    """

    # --- Identity / Location ---
    endereco: str | None = None
    logradouro: str | None = None
    numero: str | None = None
    complemento: str | None = None
    unidade: str | None = None  # G1, Lj03, Módulo A
    bairro: str | None = None
    cidade: str | None = None
    uf: str | None = None
    cep: str | None = None
    latitude: float | None = None
    longitude: float | None = None

    # --- Physical attributes ---
    area_total_m2: float | None = None
    area_construida_m2: float | None = None
    area_piso_m2: float | None = None
    area_escritorio_m2: float | None = None
    area_mezanino_m2: float | None = None
    pe_direito_m: float | None = None
    numero_docas: int | None = None
    vagas_estacionamento: int | None = None
    potencia_eletrica_kva: int | None = None
    elevador: bool | None = None
    gerador: bool | None = None
    ponte_rolante: bool | None = None
    zoneamento: str | None = None

    # --- Commercial ---
    titulo: str | None = None
    tipo: str | None = None  # galpao, terreno, sala, loja
    categoria: str | None = None
    tipo_operacao: str | None = None  # venda, locacao, ambos
    valor_locacao: float | None = None
    valor_venda: float | None = None
    valor_condominio: float | None = None
    iptu_valor: float | None = None
    status: str | None = None  # vago, alugado, vendido
    inquilino: str | None = None

    # --- Contact (separate entity, resolved later) ---
    proprietario_nome: str | None = None
    proprietario_telefone: str | None = None
    proprietario_email: str | None = None

    # --- Metadata ---
    observacoes: str | None = None
    dados_extras: dict = field(default_factory=dict)
    source_url: str | None = None
    source_id: str | None = None
    data_coleta: datetime | None = None

    def to_dict(self) -> dict:
        """Convert to dict, excluding None values and empty dados_extras."""
        result: dict = {}
        for k, v in self.__dict__.items():
            if v is None:
                continue
            if k == "dados_extras" and not v:
                continue
            if isinstance(v, datetime):
                result[k] = v.isoformat()
            else:
                result[k] = v
        return result

    def to_imovel_dict(self) -> dict:
        """Convert to dict with only fields that map to imoveis table columns."""
        IMOVEL_FIELDS = {
            "titulo", "tipo", "categoria", "cidade", "bairro", "endereco",
            "logradouro", "numero", "complemento", "uf", "cep",
            "latitude", "longitude",
            "area_total_m2", "area_construida_m2", "area_piso_m2",
            "area_escritorio_m2", "pe_direito_m",
            "numero_docas", "vagas_estacionamento", "potencia_eletrica_kva",
            "valor_condominio", "observacoes", "status",
            "dados_extras",
        }
        result: dict = {}
        for k in IMOVEL_FIELDS:
            v = getattr(self, k, None)
            if v is not None:
                result[k] = v
        # Pack non-standard fields into dados_extras
        extras = dict(self.dados_extras) if self.dados_extras else {}
        EXTRA_FIELDS = {
            "unidade", "area_mezanino_m2", "elevador", "gerador",
            "ponte_rolante", "zoneamento", "tipo_operacao",
            "valor_locacao", "valor_venda", "iptu_valor", "inquilino",
        }
        for k in EXTRA_FIELDS:
            v = getattr(self, k, None)
            if v is not None:
                extras[k] = v
        if extras:
            result["dados_extras"] = extras
        return result


@dataclass
class ParseResult:
    colunas: list[str]
    amostra: list[dict]
    total_linhas: int
    encoding: str | None = None
    separador: str | None = None
    avisos: list[str] = field(default_factory=list)


@dataclass
class MatchResult:
    registro_id: str
    imovel_id: str | None
    score: float
    tipo: str  # 'match', 'candidato', 'novo'
    campos_diferentes: list[str] = field(default_factory=list)


@dataclass
class QualidadeCampo:
    campo: str
    completude: float = 0.0
    frescor: float = 0.0
    concordancia: float = 0.0
    verificacao: float = 0.0
    score: float = 0.0


@dataclass
class CardResumo:
    criar: int = 0
    atualizar: int = 0
    mesclar: int = 0
    enriquecer: int = 0
    alertar: int = 0
    total: int = 0
