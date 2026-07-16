from __future__ import annotations

from typing import Any

from petrus.domain.repositories.processo_repo import ProcessoRepository


class ProcessoAppService:
    def __init__(self, repo: ProcessoRepository) -> None:
        self._repo = repo

    async def create_with_template(
        self, data: dict[str, Any], tipo_slug: str
    ) -> dict[str, Any]:
        proc = await self._repo.create(data)
        proc_id = proc["id"]

        template = await self._repo.get_type_template(tipo_slug)
        if not template or not template.get("processo_tipo_categorias"):
            return proc

        categorias = sorted(
            template["processo_tipo_categorias"], key=lambda c: c["ordem"]
        )

        await self._repo.create_categories(
            [
                {
                    "processo_id": proc_id,
                    "slug": c["slug"],
                    "label": c["label"],
                    "ordem": c["ordem"],
                }
                for c in categorias
            ]
        )

        itens = []
        for cat in categorias:
            for item in cat.get("processo_tipo_itens", []):
                itens.append(
                    {
                        "processo_id": proc_id,
                        "categoria": cat["slug"],
                        "titulo": item["titulo"],
                        "descricao": item.get("descricao"),
                        "ordem": item["ordem"],
                    }
                )

        if itens:
            for item in itens:
                await self._repo.create_item(item)

        return proc
