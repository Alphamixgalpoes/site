from pydantic import BaseModel


class FonteCreate(BaseModel):
    nome: str
    tipo: str
    prioridade: int = 50
    config: dict = {}
    schema_map: dict = {}


class FonteUpdate(BaseModel):
    nome: str | None = None
    tipo: str | None = None
    prioridade: int | None = None
    config: dict | None = None
    schema_map: dict | None = None
    ativo: bool | None = None


class ImportRequest(BaseModel):
    fonte_id: str
    schema_map: dict[str, str]
    valid_from: str | None = None


class CardAprovar(BaseModel):
    dados_editados: dict | None = None


class CardRejeitar(BaseModel):
    notas: str | None = None


class BatchIds(BaseModel):
    ids: list[str]
    notas: str | None = None


class RegraEnriquecimentoCreate(BaseModel):
    nome: str
    condicao: dict
    acao: str
    config: dict = {}
    ordem: int = 0


class RegraEnriquecimentoUpdate(BaseModel):
    nome: str | None = None
    condicao: dict | None = None
    acao: str | None = None
    config: dict | None = None
    ativo: bool | None = None
    ordem: int | None = None
