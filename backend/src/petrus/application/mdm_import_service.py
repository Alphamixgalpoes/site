from __future__ import annotations

from typing import Any
from uuid import UUID

from petrus.domain.entities.mdm import Importacao
from petrus.domain.entities.mdm_types import ParseResult
from petrus.domain.repositories.mdm_repo import (
    FonteRepository, ImportacaoRepository, FonteRegistroRepository,
)
from petrus.domain.repositories.recomendacao_repo import RecomendacaoRepository
from petrus.domain.repositories.imovel_repo import ImovelRepository
from petrus.infrastructure.mdm.file_parser import parse_file
from petrus.infrastructure.mdm.normalizer import DefaultNormalizer
from petrus.infrastructure.mdm.matcher import AdaptiveMatcher
from petrus.infrastructure.mdm.card_generator import generate_cards


class MdmImportService:
    def __init__(
        self,
        fonte_repo: FonteRepository,
        importacao_repo: ImportacaoRepository,
        registro_repo: FonteRegistroRepository,
        rec_repo: RecomendacaoRepository,
        imovel_repo: ImovelRepository,
    ) -> None:
        self._fonte_repo = fonte_repo
        self._imp_repo = importacao_repo
        self._reg_repo = registro_repo
        self._rec_repo = rec_repo
        self._imovel_repo = imovel_repo
        self._normalizer = DefaultNormalizer()
        self._matcher = AdaptiveMatcher()

    async def parse(self, content: bytes, filename: str) -> ParseResult:
        return parse_file(content, filename)

    async def importar(
        self,
        fonte_id: UUID,
        content: bytes,
        filename: str,
        schema_map: dict[str, str],
        valid_from: str | None = None,
    ) -> Importacao:
        fonte = await self._fonte_repo.get_by_id(fonte_id)
        if not fonte:
            raise ValueError("Fonte não encontrada")

        # Create import record
        imp = await self._imp_repo.create({
            "fonte_id": str(fonte_id),
            "status": "processando",
            "arquivo_nome": filename,
            "started_at": "now()",
        })

        # Parse file
        parsed = parse_file(content, filename)
        registros_total = parsed.total_linhas
        registros_importados = 0
        registros_erro = 0
        erros: list[dict] = []

        # Process rows
        batch: list[dict[str, Any]] = []
        for i, row in enumerate(self._iter_all_rows(content, filename)):
            try:
                normalized = self._normalizer.normalize(row, schema_map)
                if not normalized:
                    registros_erro += 1
                    erros.append({"linha": i + 2, "erro": "Nenhum campo mapeado"})
                    continue

                hash_dedup = self._normalizer.compute_hash(normalized)

                batch.append({
                    "fonte_id": str(fonte_id),
                    "importacao_id": str(imp.id),
                    "dados_brutos": row,
                    "dados_normalizados": normalized,
                    "hash_dedup": hash_dedup,
                    "valid_from": valid_from,
                })
                registros_importados += 1
            except Exception as e:
                registros_erro += 1
                erros.append({"linha": i + 2, "erro": str(e)})

        # Batch insert
        if batch:
            await self._reg_repo.create_batch(batch)

        # Consolidate: generate cards
        cards_gerados = await self._consolidar(imp.id, fonte_id)

        # Update import record
        return await self._imp_repo.update(imp.id, {
            "status": "concluida",
            "registros_total": registros_total,
            "registros_importados": registros_importados,
            "registros_erro": registros_erro,
            "erros": erros[:50],  # limit stored errors
            "cards_gerados": cards_gerados,
            "finished_at": "now()",
        })

    async def _consolidar(self, importacao_id: UUID, fonte_id: UUID) -> int:
        registros = await self._reg_repo.get_by_importacao(importacao_id)
        golden = await self._imovel_repo.list_all()
        cards_count = 0

        for reg in registros:
            if not reg.dados_normalizados:
                continue
            matches = self._matcher.find_matches(reg.dados_normalizados, golden)
            cards = generate_cards(
                reg.dados_normalizados,
                matches,
                fonte_id=str(fonte_id),
                fonte_registro_id=str(reg.id),
                importacao_id=str(importacao_id),
            )
            for card in cards:
                await self._rec_repo.create(card)
                cards_count += 1

        return cards_count

    async def get_importacoes(self, fonte_id: UUID) -> list[Importacao]:
        return await self._imp_repo.get_by_fonte(fonte_id)

    def _iter_all_rows(self, content: bytes, filename: str):
        """Re-parse and yield all rows."""
        import csv
        import io

        lower = filename.lower()
        if lower.endswith(".xlsx") or lower.endswith(".xls"):
            try:
                import openpyxl
                wb = openpyxl.load_workbook(io.BytesIO(content), read_only=True, data_only=True)
                ws = wb.active
                if ws:
                    rows = ws.iter_rows(values_only=True)
                    header = [str(c) if c else f"col_{i}" for i, c in enumerate(next(rows, ()) or ())]
                    for row in rows:
                        yield dict(zip(header, row))
                wb.close()
            except ImportError:
                pass
            return

        try:
            text = content.decode("utf-8")
        except UnicodeDecodeError:
            text = content.decode("latin-1")

        first_line = text.split("\n")[0] if text else ""
        sep = ","
        if first_line.count(";") > first_line.count(","):
            sep = ";"
        elif first_line.count("\t") > first_line.count(","):
            sep = "\t"

        reader = csv.DictReader(io.StringIO(text), delimiter=sep)
        yield from reader
