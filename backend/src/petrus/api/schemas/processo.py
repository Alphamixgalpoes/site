from pydantic import BaseModel


class ProcessoCreate(BaseModel):
    titulo: str
    tipo: str
    proprietario_id: str | None = None
    cliente_id: str | None = None
    parte_a: str | None = None
    parte_b: str | None = None
    valor: float | None = None
    notas: str | None = None


class ProcessoUpdate(BaseModel):
    titulo: str | None = None
    tipo: str | None = None
    status: str | None = None
    parte_a: str | None = None
    parte_b: str | None = None
    proprietario_id: str | None = None
    cliente_id: str | None = None
    valor: float | None = None
    notas: str | None = None


class ItemCreate(BaseModel):
    categoria: str
    titulo: str
    descricao: str | None = None
    ordem: int = 0


class ItemUpdate(BaseModel):
    titulo: str | None = None
    feito: bool | None = None
    descricao: str | None = None
    ordem: int | None = None


class LinkContact(BaseModel):
    contato_id: str
    papel: str


class LinkImovel(BaseModel):
    imovel_id: str
