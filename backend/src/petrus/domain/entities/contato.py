from __future__ import annotations

from dataclasses import dataclass, field
from uuid import UUID


@dataclass
class Contato:
    id: UUID
    nome: str
    tipo_principal: str
    ativo: bool = True

    tags: list[str] = field(default_factory=list)
    telefone: str | None = None
    email: str | None = None
    empresa: str | None = None
    cpf_cnpj: str | None = None
    notas: str | None = None


@dataclass
class ContatoResumido:
    id: UUID
    nome: str
    empresa: str | None = None
    tipo_principal: str = ""
