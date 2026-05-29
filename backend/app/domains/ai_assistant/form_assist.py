# ruff: noqa: E501,I001

from __future__ import annotations

import re
from typing import Any

from app.domains.ai_assistant.schemas import FormAssistRequest, FormSuggestion
from app.domains.ai_assistant.safety import mask_sensitive_text


AMOUNT_RE = re.compile(r"(?P<amount>\d+(?:[.,]\d{1,2})?)\s*(?P<currency>tl|try|usd|eur)?", re.IGNORECASE)


def build_form_suggestions(request: FormAssistRequest) -> list[FormSuggestion]:
    text = mask_sensitive_text(request.intent_text.strip())
    lowered = text.lower()
    form_key = (request.form_key or infer_form_key(lowered, request.module_key)).lower()
    if "company" in form_key or "sirket" in form_key:
        return company_suggestions(text, lowered)
    if "accounting" in form_key or "cari" in form_key or "muhasebe" in form_key:
        return accounting_suggestions(text, lowered)
    if "service" in form_key or "servis" in form_key or "after" in form_key:
        return service_request_suggestions(text, lowered)
    if "task" in form_key or "gorev" in form_key:
        return task_suggestions(text, lowered)
    if "crm" in form_key or "lead" in form_key or "opportunity" in form_key:
        return crm_suggestions(text, lowered)
    return [
        suggestion("notes", "Not", text, 0.55, "Metin guvenli not alanina taslak olarak onerildi."),
    ]


def infer_form_key(lowered: str, module_key: str | None) -> str:
    if module_key:
        return module_key
    if any(term in lowered for term in ["servis", "ariza", "planeguard"]):
        return "service_request"
    if any(term in lowered for term in ["tl", "odeme", "gider", "tahsilat", "cari"]):
        return "accounting_transaction"
    if any(term in lowered for term in ["gorev", "ali", "teklif hazirla"]):
        return "task"
    if any(term in lowered for term in ["lead", "fuar", "firsat", "musteri adayi"]):
        return "crm_lead"
    return "generic"


def company_suggestions(text: str, lowered: str) -> list[FormSuggestion]:
    city = "Ankara" if "ankara" in lowered else "Istanbul" if "istanbul" in lowered else None
    name = text.split(",")[0].strip()[:80] or "Yeni sirket taslagi"
    suggestions = [
        suggestion("trade_name", "Ticaret unvani", name, 0.64, "Kullanicinin metnindeki sirket tanimi unvan taslagi olarak alindi."),
        suggestion("short_name", "Kisa ad", name.split()[0] if name.split() else name, 0.55, "Unvanin ilk kelimesinden kisa ad onerildi."),
        suggestion("country", "Ulke", "TR", 0.7, "Yerel varsayilan ulke kullanildi."),
    ]
    if city:
        suggestions.append(suggestion("city", "Sehir", city, 0.75, "Metinde sehir geciyor."))
    return suggestions


def accounting_suggestions(text: str, lowered: str) -> list[FormSuggestion]:
    amount, currency = extract_amount(text)
    transaction_type = "expense" if any(term in lowered for term in ["gider", "odedim", "odeme", "foto"]) else "payment"
    suggestions = [
        suggestion("transaction_type", "Hareket tipi", transaction_type, 0.7, "Metindeki odeme/gider ifadesinden hareket tipi onerildi."),
        suggestion("description", "Aciklama", text, 0.68, "Kullanici metni aciklama taslagi olarak kullanildi."),
        suggestion("document_status", "Belge durumu", "document_missing" if "belge" in lowered else "pending", 0.72, "Belge aranacak ifadesi eksik belge takibine isaret ediyor."),
    ]
    if amount:
        suggestions.append(suggestion("amount", "Tutar", amount, 0.82, "Metinden tutar yakalandi."))
        suggestions.append(suggestion("currency", "Para birimi", currency or "TRY", 0.75, "Metindeki para birimi veya varsayilan TRY kullanildi."))
    if "sahsi" in lowered:
        suggestions.append(suggestion("payment_method", "Odeme yontemi", "personal_payment", 0.78, "Sahsi odeme ifadesi yakalandi."))
    return suggestions


def service_request_suggestions(text: str, lowered: str) -> list[FormSuggestion]:
    priority = "urgent" if any(term in lowered for term in ["acil", "urgent", "hemen"]) else "high" if "yok" in lowered else "normal"
    return [
        suggestion("service_type", "Servis tipi", "fault", 0.74, "Ariza/cihaz sorunu ifadesi servis talebine isaret ediyor."),
        suggestion("priority", "Oncelik", priority, 0.72, "Metindeki aciliyet ifadeleri oncelik icin kullanildi."),
        suggestion("subject", "Konu", text[:90], 0.67, "Kisa servis talebi konusu olusturuldu."),
        suggestion("description", "Aciklama", text, 0.76, "Kullanici metni detay aciklama olarak onerildi."),
    ]


def task_suggestions(text: str, lowered: str) -> list[FormSuggestion]:
    due = "next_friday" if "cuma" in lowered else None
    suggestions = [
        suggestion("title", "Gorev basligi", text[:90], 0.68, "Metinden gorev basligi olusturuldu."),
        suggestion("description", "Aciklama", text, 0.64, "Kullanici metni gorev aciklamasi olarak onerildi."),
    ]
    if due:
        suggestions.append(suggestion("due_date", "Termin", due, 0.55, "Goreceli tarih yakalandi; kullanici takvimden kesin tarih secmelidir."))
    if "ali" in lowered:
        suggestions.append(suggestion("assignee_hint", "Atanacak kisi", "Ali", 0.52, "Metinde kisi adi geciyor; sistem kullanici eslestirmesi kullanici onayi ister."))
    return suggestions


def crm_suggestions(text: str, lowered: str) -> list[FormSuggestion]:
    status = "qualified" if "qualified" in lowered or "nitelikli" in lowered else "new"
    source = "event" if any(term in lowered for term in ["fuar", "expo", "event"]) else "manual"
    return [
        suggestion("lead_name", "Lead adi", text[:80], 0.6, "Metinden lead adi taslagi olusturuldu."),
        suggestion("source", "Kaynak", source, 0.7, "Metindeki kaynak ifadesi kullanildi."),
        suggestion("lead_status", "Durum", status, 0.62, "Lead durumu taslak olarak onerildi."),
        suggestion("notes", "Not", text, 0.68, "Gorusme/lead notu olarak saklanabilir."),
    ]


def extract_amount(text: str) -> tuple[float | None, str | None]:
    match = AMOUNT_RE.search(text)
    if not match:
        return None, None
    amount = float(match.group("amount").replace(",", "."))
    raw_currency = (match.group("currency") or "").upper()
    currency = "TRY" if raw_currency in {"TL", "TRY"} else raw_currency or None
    return amount, currency


def suggestion(field: str, label: str, value: Any, confidence: float, reason: str) -> FormSuggestion:
    return FormSuggestion(field=field, label=label, suggested_value=value, confidence=confidence, reason=reason)
