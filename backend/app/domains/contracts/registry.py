from __future__ import annotations

CONTRACT_TYPES: dict[str, str] = {
    "sales_contract": "Sat?? S?zle?mesi",
    "purchase_contract": "Sat?n Alma S?zle?mesi",
    "supplier_contract": "Tedarik?i S?zle?mesi",
    "service_contract": "Hizmet S?zle?mesi",
    "maintenance_contract": "Bak?m S?zle?mesi",
    "warranty_extension_contract": "Garanti Uzatma S?zle?mesi",
    "project_contract": "Proje S?zle?mesi",
    "employment_contract": "?? S?zle?mesi",
    "lease_contract": "Kira S?zle?mesi",
    "nda": "Gizlilik S?zle?mesi",
    "partnership_contract": "?? Ortakl??? S?zle?mesi",
    "dealer_contract": "Bayilik S?zle?mesi",
    "framework_agreement": "?er?eve S?zle?me",
    "other": "Di?er",
}

CONTRACT_STATUSES: dict[str, str] = {
    "draft": "Taslak",
    "under_review": "?ncelemede",
    "approval_pending": "Onay Bekliyor",
    "approved": "Onayland?",
    "ready_for_signature": "?mzaya Haz?r",
    "signed": "?mzaland?",
    "active": "Aktif",
    "renewal_pending": "Yenileme Bekliyor",
    "amendment_pending": "Ek Protokol Bekliyor",
    "suspended": "Ask?da",
    "termination_pending": "Fesih Bekliyor",
    "terminated": "Feshedildi",
    "expired": "S?resi Doldu",
    "archived": "Ar?ivlendi",
    "cancelled": "?ptal",
}

RISK_LEVELS = {"low", "medium", "high", "critical"}
BILLING_FREQUENCIES = {"one_time", "monthly", "quarterly", "yearly", "milestone", "custom"}
