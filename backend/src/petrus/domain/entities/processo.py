from __future__ import annotations

from dataclasses import dataclass, field
from uuid import UUID


@dataclass
class ProcessoItem:
    id: UUID
    processo_id: UUID
    categoria: str
    titulo: str
    ordem: int
    feito: bool = False
    descricao: str | None = None
    arquivo_path: str | None = None
    arquivo_nome: str | None = None
    arquivo_tipo: str | None = None


@dataclass
class ProcessoCategoria:
    id: UUID
    processo_id: UUID
    slug: str
    label: str
    ordem: int


@dataclass
class ProcessoContato:
    id: UUID
    processo_id: UUID
    contato_id: UUID
    papel: str
    nome: str = ""
    tipo_principal: str = ""


@dataclass
class Processo:
    id: UUID
    titulo: str
    tipo: str
    status: str = "em_andamento"

    parte_a: str | None = None
    parte_b: str | None = None
    proprietario_id: UUID | None = None
    cliente_id: UUID | None = None
    galpao_id: UUID | None = None
    valor: float | None = None
    notas: str | None = None
    created_at: str | None = None

    itens: list[ProcessoItem] = field(default_factory=list)
    categorias: list[ProcessoCategoria] = field(default_factory=list)
    contatos: list[ProcessoContato] = field(default_factory=list)


@dataclass
class ProcessoTipo:
    id: UUID
    slug: str
    label: str
    ativo: bool = True
    ordem: int = 0
    descricao: str | None = None
