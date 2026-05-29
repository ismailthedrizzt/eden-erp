from __future__ import annotations

from typing import Any

REPRESENTATIVES: list[dict[str, Any]] = [
    {
        "key": "eden_rep_aylin",
        "company_key": "eden_tech",
        "person_key": "aylin_kaya",
        "display_name": "Aylin Kaya",
        "email": "aylin.kaya@example.com",
        "phone": "+90 532 000 10 10",
        "job_title": "Genel Mudur",
        "record_status": "active",
        "scenario_key": "company_wide_signature_authority",
    },
    {
        "key": "eden_rep_mert_branch_bank",
        "company_key": "eden_tech",
        "person_key": "mert_demir",
        "display_name": "Mert Demir",
        "email": "mert.demir@example.com",
        "phone": "+90 532 000 20 20",
        "job_title": "Finans Yoneticisi",
        "record_status": "active",
        "scenario_key": "branch_scoped_bank_authority",
    },
    {
        "key": "quattro_rep_draft",
        "company_key": "quattro",
        "person_key": "elif_sahin",
        "display_name": "Elif Sahin",
        "email": "elif.sahin@example.com",
        "phone": "+90 532 000 30 30",
        "job_title": "Kurucu Temsilci",
        "record_status": "draft",
        "scenario_key": "draft_representative_card",
    },
]

