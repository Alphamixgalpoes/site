from pydantic import BaseModel, Field


class LeadCreate(BaseModel):
    nome: str = Field(..., max_length=120)
    telefone: str = Field(..., max_length=30)
    empresa: str | None = Field(None, max_length=120)
    imovel_id: str | None = None
    imovel_titulo: str | None = None
