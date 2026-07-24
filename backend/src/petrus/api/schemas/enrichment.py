from __future__ import annotations

from pydantic import BaseModel


class GenerateRequest(BaseModel):
    fonte_id: str


class CreateEventRequest(BaseModel):
    tipo: str  # 'transferir' | 'editar'
    campo: str
    valor_novo: object
    valor_anterior: object | None = None
    origem_tipo: str = "manual"  # 'registro' | 'imovel' | 'manual'
    origem_id: str | None = None
    destino_tipo: str  # 'registro' | 'imovel'
    destino_id: str


class UndoRequest(BaseModel):
    event_id: str


class FinalizeRequest(BaseModel):
    criar_imovel: bool = True
