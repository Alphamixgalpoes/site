from __future__ import annotations

from abc import ABC, abstractmethod


class EmailService(ABC):
    @abstractmethod
    async def send_lead_notification(
        self,
        nome: str,
        telefone: str,
        empresa: str | None,
        galpao_titulo: str | None,
    ) -> None: ...
