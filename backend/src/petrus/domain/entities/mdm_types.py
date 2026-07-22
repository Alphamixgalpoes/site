from __future__ import annotations

from dataclasses import dataclass, field


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
