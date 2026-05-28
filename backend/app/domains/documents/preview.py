# ruff: noqa: E501

from __future__ import annotations


def preview_kind(mime_type: str, file_name: str) -> str:
    lower_name = file_name.lower()
    lower_type = mime_type.lower()
    if lower_type.startswith("image/"):
        return "image"
    if lower_type == "application/pdf" or lower_name.endswith(".pdf"):
        return "pdf"
    if "word" in lower_type or lower_name.endswith((".doc", ".docx")):
        return "office"
    if "excel" in lower_type or "spreadsheet" in lower_type or lower_name.endswith((".xls", ".xlsx", ".csv")):
        return "spreadsheet"
    if lower_type.startswith("text/") or lower_name.endswith((".txt", ".md", ".json", ".csv")):
        return "text"
    return "file"
