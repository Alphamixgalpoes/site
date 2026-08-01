from __future__ import annotations

from pydantic import BaseModel, Field


class RegistroCreate(BaseModel):
    texto: str | None = Field(None, max_length=10000)
    metadata: dict | None = None
