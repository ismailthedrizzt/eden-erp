# ruff: noqa: E501,I001

from __future__ import annotations

import re

from app.domains.ai_assistant.schemas import DocumentFinding, DocumentIntelligenceRequest
from app.domains.ai_assistant.safety import mask_sensitive_text

DATE_RE = re.compile(r"\b(\d{1,2})[./-](\d{1,2})[./-](20\d{2}|19\d{2})\b")
INVOICE_RE = re.compile(r"\b([A-Z]{1,4}\d{4,})\b")
AMOUNT_RE = re.compile(r"(?P<amount>\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})?|\d+(?:[.,]\d{1,2})?)\s*(TL|TRY|USD|EUR)\b", re.IGNORECASE)


def summarize_document(request: DocumentIntelligenceRequest) -> tuple[str, str | None, list[DocumentFinding], float]:
    raw_text = request.document_text or request.document_name or ""
    text = mask_sensitive_text(raw_text.strip())
    lowered = text.lower()
    doc_type = infer_document_type(lowered, request.document_type_hint)
    findings = extract_document_findings(text, doc_type)
    summary = build_summary(text, doc_type, findings)
    confidence = 0.72 if request.document_text else 0.48
    return summary, doc_type, findings, confidence


def infer_document_type(lowered: str, hint: str | None) -> str | None:
    if hint:
        return hint
    if "sgk" in lowered:
        return "sgk_document"
    if "ticaret sicil" in lowered or "sicil gazetesi" in lowered:
        return "trade_registry_gazette"
    if "imza sirk" in lowered:
        return "signature_circular"
    if "fatura" in lowered or "invoice" in lowered:
        return "invoice"
    if "dekont" in lowered or "banka" in lowered:
        return "bank_receipt"
    if "servis" in lowered and "rapor" in lowered:
        return "service_report"
    return "unknown_document"


def extract_document_findings(text: str, doc_type: str | None) -> list[DocumentFinding]:
    findings: list[DocumentFinding] = []
    if doc_type:
        findings.append(finding("document_type", doc_type, 0.7, None, "Belge turu AI onerisi olarak isaretlendi."))
    date_match = DATE_RE.search(text)
    if date_match:
        findings.append(finding("issue_date", date_match.group(0), 0.62, excerpt(text, date_match.start()), "Tarih belge tarihi veya islem tarihi olabilir."))
    invoice_match = INVOICE_RE.search(text)
    if invoice_match:
        findings.append(finding("invoice_no", invoice_match.group(1), 0.52, excerpt(text, invoice_match.start()), "Numara fatura/evrak no olabilir."))
    amount_match = AMOUNT_RE.search(text)
    if amount_match:
        findings.append(finding("amount", amount_match.group(0), 0.66, excerpt(text, amount_match.start()), "Tutar alaninin kullanici tarafindan dogrulanmasi gerekir."))
    return findings


def build_summary(text: str, doc_type: str | None, findings: list[DocumentFinding]) -> str:
    base = text[:260].strip()
    if not base:
        return "Belge metni bulunamadigi icin yalnizca metadata uzerinden sinirli yorum yapilabilir."
    type_label = doc_type or "belge"
    found = ", ".join(item.field for item in findings[:4]) or "alan bulunamadi"
    return f"{type_label} icin AI ozeti: {base}. Onerilen alanlar: {found}. Bu sonuc dogrulanmis resmi belge yorumu degildir."


def finding(field: str, value: object, confidence: float, source_excerpt: str | None, warning: str | None) -> DocumentFinding:
    return DocumentFinding(field=field, value=value, confidence=confidence, source_excerpt=source_excerpt, warning=warning, requires_verification=True)


def excerpt(text: str, start: int) -> str:
    return text[max(0, start - 40): start + 80].strip()
