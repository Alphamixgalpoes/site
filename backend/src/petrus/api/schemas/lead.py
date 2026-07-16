from pydantic import BaseModel, Field


class LeadCreate(BaseModel):
    nome: str = Field(..., max_length=120)
    telefone: str = Field(..., max_length=30)
    empresa: str | None = Field(None, max_length=120)
    galpao_id: str | None = None
    galpao_titulo: str | None = None
