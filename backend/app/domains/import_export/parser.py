from __future__ import annotations

import base64
import csv
import importlib
import io
from typing import Any, cast

from fastapi import status

from app.core.errors import DomainError
from app.domains.import_export.schemas import FileType, ImportUploadRequest, ParsedFile

MAX_IMPORT_ROWS = 5000
MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024


def infer_file_type(file_name: str, explicit: FileType | None = None) -> FileType:
    if explicit:
        return explicit
    lowered = file_name.lower()
    if lowered.endswith(".xlsx"):
        return "xlsx"
    if lowered.endswith(".csv"):
        return "csv"
    raise DomainError(
        "Sadece CSV veya XLSX dosyalari desteklenir.",
        "IMPORT_FILE_TYPE_UNSUPPORTED",
        status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
    )


def parse_upload(request: ImportUploadRequest) -> ParsedFile:
    file_type = infer_file_type(request.source_file_name, request.file_type)
    if request.rows is not None:
        rows = [_clean_row(row) for row in request.rows]
        _assert_row_count(rows)
        return ParsedFile(rows=rows, columns=_columns(rows), file_type=file_type)
    if request.content_text is not None:
        content = request.content_text.encode("utf-8")
    elif request.content_base64 is not None:
        content = base64.b64decode(request.content_base64)
    else:
        raise DomainError(
            "Dosya icerigi veya parse edilmis satirlar gonderilmelidir.",
            "IMPORT_FILE_CONTENT_REQUIRED",
            status.HTTP_400_BAD_REQUEST,
        )
    if len(content) > MAX_IMPORT_FILE_BYTES:
        raise DomainError(
            "Dosya boyutu izin verilen limiti asiyor.",
            "IMPORT_FILE_TOO_LARGE",
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            {"max_bytes": MAX_IMPORT_FILE_BYTES},
        )
    rows = parse_bytes(content, file_type)
    _assert_row_count(rows)
    return ParsedFile(rows=rows, columns=_columns(rows), file_type=file_type)


def parse_bytes(content: bytes, file_type: FileType) -> list[dict[str, Any]]:
    if file_type == "csv":
        return parse_csv(content)
    return parse_xlsx(content)


def parse_csv(content: bytes) -> list[dict[str, Any]]:
    text = content.decode("utf-8-sig")
    sample = text[:4096]
    try:
        dialect = csv.Sniffer().sniff(sample)
    except csv.Error:
        dialect = csv.excel
    reader = csv.DictReader(io.StringIO(text), dialect=dialect)
    return [_clean_row(row) for row in reader]


def parse_xlsx(content: bytes) -> list[dict[str, Any]]:
    try:
        openpyxl = cast(Any, importlib.import_module("openpyxl"))
    except ModuleNotFoundError as exc:
        raise DomainError(
            "XLSX parser hazir degil. CSV kullanin veya backend openpyxl bagimliligini kurun.",
            "XLSX_PARSER_UNAVAILABLE",
            status.HTTP_503_SERVICE_UNAVAILABLE,
        ) from exc

    workbook = openpyxl.load_workbook(io.BytesIO(content), data_only=True, read_only=True)
    sheet = workbook.active
    values = list(sheet.iter_rows(values_only=True))
    if not values:
        return []
    headers = [str(value or "").strip() for value in values[0]]
    rows: list[dict[str, Any]] = []
    for row_values in values[1:]:
        row = {
            headers[index]: value
            for index, value in enumerate(cast(tuple[Any, ...], row_values))
            if index < len(headers) and headers[index]
        }
        if any(str(value or "").strip() for value in row.values()):
            rows.append(_clean_row(row))
    return rows


def _clean_row(row: dict[str, Any]) -> dict[str, Any]:
    cleaned: dict[str, Any] = {}
    for key, value in row.items():
        header = str(key or "").strip()
        if not header:
            continue
        if isinstance(value, str):
            cleaned[header] = value.strip()
        else:
            cleaned[header] = value
    return cleaned


def _columns(rows: list[dict[str, Any]]) -> list[str]:
    seen: list[str] = []
    for row in rows:
        for key in row:
            if key not in seen:
                seen.append(key)
    return seen


def _assert_row_count(rows: list[dict[str, Any]]) -> None:
    if not rows:
        raise DomainError(
            "Dosyada aktarilacak satir bulunamadi.",
            "IMPORT_FILE_EMPTY",
            status.HTTP_400_BAD_REQUEST,
        )
    if len(rows) > MAX_IMPORT_ROWS:
        raise DomainError(
            "Dosya satir sayisi izin verilen limiti asiyor.",
            "IMPORT_ROW_LIMIT_EXCEEDED",
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            {"max_rows": MAX_IMPORT_ROWS},
        )
