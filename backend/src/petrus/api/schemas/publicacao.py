from pydantic import BaseModel


class PublicacaoCreate(BaseModel):
    titulo: str | None = None
    descricao: str | None = None
    slug: str | None = None
    destaque: bool = False
    seo_title: str | None = None
    seo_description: str | None = None


class PublicacaoUpdate(BaseModel):
    titulo: str | None = None
    descricao: str | None = None
    slug: str | None = None
    destaque: bool | None = None
    ativo: bool | None = None
    seo_title: str | None = None
    seo_description: str | None = None
