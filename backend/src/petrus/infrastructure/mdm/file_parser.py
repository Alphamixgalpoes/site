from __future__ import annotations

import csv
import io

from petrus.domain.entities.mdm_types import ParseResult


def parse_csv(content: bytes, filename: str) -> ParseResult:
    """Parse CSV content and return structure info + sample rows."""
    avisos: list[str] = []
    encoding = "utf-8"

    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        try:
            text = content.decode("latin-1")
            encoding = "latin-1"
            avisos.append("Arquivo detectado como Latin-1 (não UTF-8)")
        except UnicodeDecodeError:
            text = content.decode("utf-8", errors="replace")
            avisos.append("Encoding não identificado, caracteres podem estar corrompidos")

    # Detect separator
    separador = ","
    first_line = text.split("\n")[0] if text else ""
    if first_line.count(";") > first_line.count(","):
        separador = ";"
    elif first_line.count("\t") > first_line.count(","):
        separador = "\t"

    reader = csv.DictReader(io.StringIO(text), delimiter=separador)
    colunas = reader.fieldnames or []

    if not colunas:
        return ParseResult(colunas=[], amostra=[], total_linhas=0, encoding=encoding, separador=separador, avisos=["Arquivo vazio ou sem cabeçalho"])

    rows = []
    for i, row in enumerate(reader):
        rows.append(dict(row))
        if i >= 4:
            break

    # Count total
    text_io = io.StringIO(text)
    total = sum(1 for _ in text_io) - 1  # subtract header

    return ParseResult(
        colunas=list(colunas),
        amostra=rows,
        total_linhas=max(total, len(rows)),
        encoding=encoding,
        separador=separador,
        avisos=avisos,
    )


def parse_xlsx(content: bytes, filename: str) -> ParseResult:
    """Parse Excel content. Requires openpyxl."""
    try:
        import openpyxl
    except ImportError:
        return ParseResult(
            colunas=[], amostra=[], total_linhas=0,
            avisos=["openpyxl não instalado — não é possível ler XLSX"],
        )

    wb = openpyxl.load_workbook(io.BytesIO(content), read_only=True, data_only=True)
    ws = wb.active
    if ws is None:
        return ParseResult(colunas=[], amostra=[], total_linhas=0, avisos=["Planilha vazia"])

    rows_iter = ws.iter_rows(values_only=True)
    header_row = next(rows_iter, None)
    if not header_row:
        return ParseResult(colunas=[], amostra=[], total_linhas=0, avisos=["Sem cabeçalho"])

    colunas = [str(c) if c else f"col_{i}" for i, c in enumerate(header_row)]
    amostra = []
    total = 0
    for row in rows_iter:
        total += 1
        if len(amostra) < 5:
            amostra.append({c: v for c, v in zip(colunas, row)})

    wb.close()
    return ParseResult(colunas=colunas, amostra=amostra, total_linhas=total)


def parse_file(content: bytes, filename: str) -> ParseResult:
    """Auto-detect format and parse."""
    lower = filename.lower()
    if lower.endswith(".xlsx") or lower.endswith(".xls"):
        return parse_xlsx(content, filename)
    return parse_csv(content, filename)
