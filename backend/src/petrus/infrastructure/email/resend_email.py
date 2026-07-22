from __future__ import annotations

import html
import re

import resend

from petrus.config import settings
from petrus.domain.services.email_service import EmailService


class ResendEmailService(EmailService):
    async def send_lead_notification(
        self,
        nome: str,
        telefone: str,
        empresa: str | None,
        imovel_titulo: str | None,
    ) -> None:
        if not settings.resend_api_key or not settings.resend_to_email:
            return

        resend.api_key = settings.resend_api_key

        nome_esc = html.escape(nome)
        telefone_esc = html.escape(telefone)
        empresa_esc = html.escape(empresa) if empresa else None
        titulo_esc = html.escape(imovel_titulo) if imovel_titulo else None
        tel_digits = re.sub(r"\D", "", telefone)

        empresa_row = ""
        if empresa_esc:
            empresa_row = f"""
            <tr>
              <td style="padding: 8px 0; color: #666;">Empresa</td>
              <td style="padding: 8px 0; font-weight: 500;">{empresa_esc}</td>
            </tr>"""

        imovel_row = ""
        if titulo_esc:
            imovel_row = f"""
            <tr>
              <td style="padding: 8px 0; color: #666;">Imovel</td>
              <td style="padding: 8px 0; font-weight: 500;">{titulo_esc}</td>
            </tr>"""

        body = f"""
        <div style="font-family: sans-serif; max-width: 480px; color: #111;">
          <p style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">Novo lead pelo site</p>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666; width: 120px;">Nome</td>
              <td style="padding: 8px 0; font-weight: 500;">{nome_esc}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Telefone</td>
              <td style="padding: 8px 0; font-weight: 500;">
                <a href="https://wa.me/55{tel_digits}" style="color: #111;">{telefone_esc}</a>
              </td>
            </tr>{empresa_row}{imovel_row}
          </table>
          <div style="margin-top: 24px; border-top: 1px solid #eee; padding-top: 16px;">
            <a href="https://wa.me/55{tel_digits}"
               style="display: inline-block; background: #111; color: #fff; padding: 10px 20px; text-decoration: none; font-size: 14px;">
              Abrir WhatsApp
            </a>
          </div>
          <p style="margin-top: 24px; font-size: 12px; color: #999;">Alphamix Galpoes</p>
        </div>
        """

        to_list = [e.strip() for e in settings.resend_to_email.split(",")]
        resend.Emails.send(
            {
                "from": settings.resend_from_email,
                "to": to_list,
                "subject": f"Novo lead: {nome_esc}",
                "html": body,
            }
        )
