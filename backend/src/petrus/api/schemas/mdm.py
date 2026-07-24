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
    step: str = "full"  # 'raw_to_clean' | 'clean_to_cards' | 'full'


class CardAprovar(BaseModel):
    dados_editados: dict | None = None


class CardRejeitar(BaseModel):
    notas: str | None = None


class BatchIds(BaseModel):
    ids: list[str]
    notas: str | None = None
