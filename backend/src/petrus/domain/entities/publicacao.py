from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID


@dataclass
class ImovelPublicacao:
    imovel_id: UUID
    ativo: bool = True
    destaque: bool = False
    titulo: str | None = None
    descricao: str | None = None
    slug: str | None = None
    ordem_fotos: list[str] | None = None
    seo_title: str | None = None
    seo_description: str | None = None
    published_at: str | None = None
    updated_at: str | None = None
