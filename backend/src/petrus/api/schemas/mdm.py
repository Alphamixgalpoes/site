from pydantic import BaseModel


class FonteSubmitUrl(BaseModel):
    nome: str
    url: str
    notas: str | None = None


class FonteUpdate(BaseModel):
    nome: str | None = None
    tipo: str | None = None
    prioridade: int | None = None
    config: dict | None = None
    ativo: bool | None = None
    notas: str | None = None


class ProcessRequest(BaseModel):
    fonte_id: str


class PushCleanRequest(BaseModel):
    registros: list[dict]
