from __future__ import annotations

from dataclasses import dataclass, field
from uuid import UUID


@dataclass
class Recomendacao:
    id: UUID
    tipo: str
    status: str = "pendente"
    imovel_id: UUID | None = None
    imovel_secundario_id: UUID | None = None
    dados_propostos: dict = field(default_factory=dict)
    dados_atuais: dict = field(default_factory=dict)
    campos_alterados: list[str] = field(default_factory=list)
    mensagem: str | None = None
    fonte_id: UUID | None = None
    fonte_registro_id: UUID | None = None
    importacao_id: UUID | None = None
    confianca: float = 0.0
    score_match: float | None = None
    cidade: str | None = None
    bairro: str | None = None
    area: float | None = None
    valor: float | None = None
    dados_aprovados: dict | None = None
    resolvido_em: str | None = None
    notas_resolucao: str | None = None
    regra_auto_id: UUID | None = None
    created_at: str | None = None
