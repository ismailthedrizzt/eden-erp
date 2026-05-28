# ruff: noqa: E501
from __future__ import annotations

import csv
import io
from typing import Any

FORMULA_PREFIXES = ("=", "+", "-", "@")


def build_error_report(rows: list[dict[str, Any]]) -> str:
    output = io.StringIO()
    fieldnames = ["row_number", "status", "field", "code", "message", "suggested_fix", "original_value"]
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    for row in rows:
        for issue in (row.get("errors") or []) + (row.get("warnings") or []):
            writer.writerow(
                {
                    "row_number": row.get("row_number"),
                    "status": row.get("status"),
                    "field": _escape(issue.get("field")),
                    "code": _escape(issue.get("code")),
                    "message": _escape(issue.get("message")),
                    "suggested_fix": _escape(issue.get("suggested_fix")),
                    "original_value": _escape(issue.get("original_value")),
                }
            )
    return output.getvalue()


def rows_to_csv(rows: list[dict[str, Any]], columns: list[str]) -> str:
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=columns, extrasaction="ignore")
    writer.writeheader()
    for row in rows:
        writer.writerow({column: _escape(row.get(column)) for column in columns})
    return output.getvalue()


def _escape(value: Any) -> Any:
    if value is None:
        return ""
    text = str(value)
    if text.startswith(FORMULA_PREFIXES):
        return f"'{text}"
    return text
