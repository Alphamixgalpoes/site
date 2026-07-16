from __future__ import annotations

from petrus.domain.repositories.lead_repo import LeadRepository
from petrus.domain.services.email_service import EmailService


class LeadAppService:
    def __init__(self, repo: LeadRepository, email: EmailService) -> None:
        self._repo = repo
        self._email = email

    async def submit_lead(
        self,
        nome: str,
        telefone: str,
        empresa: str | None = None,
        galpao_id: str | None = None,
        galpao_titulo: str | None = None,
    ) -> dict:
        data = {
            "nome": nome,
            "telefone": telefone,
            "empresa": empresa,
            "galpao_id": galpao_id,
            "galpao_titulo": galpao_titulo,
        }
        result = await self._repo.create(data)
        await self._email.send_lead_notification(nome, telefone, empresa, galpao_titulo)
        return result
