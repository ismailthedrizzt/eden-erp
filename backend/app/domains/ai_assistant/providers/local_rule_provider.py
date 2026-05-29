# ruff: noqa: E501,I001

from __future__ import annotations

from app.domains.ai_assistant.schemas import CopilotMode, CopilotResponse
from app.domains.ai_assistant.providers.base import AiProvider


class LocalRuleProvider(AiProvider):
    name = "local_rule"

    async def answer(self, *, query: str, mode: CopilotMode, context_payload: dict[str, object]) -> CopilotResponse:
        # The service injects concrete SuggestedAction objects after permission evaluation.
        _ = context_payload
        answer = query.strip() or "Bu ekranda uygun islemleri, eksikleri ve guvenli sonraki adimlari ozetleyebilirim."
        return CopilotResponse(
            mode=mode,
            title=title_for_mode(mode),
            answer=answer,
            confidence=0.62,
            next_steps=[
                "Onerilen aksiyonlari inceleyin.",
                "Form taslagi varsa kaydetmeden once alanlari dogrulayin.",
                "Kritik islemler icin ilgili sihirbaz ve backend precheck zorunludur.",
            ],
            safe_to_execute=False,
        )


def title_for_mode(mode: CopilotMode) -> str:
    labels = {
        "explain": "Sayfa ve islem aciklamasi",
        "record_summary": "Kayit ozeti",
        "action_guidance": "Guvenli islem onerisi",
        "form_assist": "Form taslak onerisi",
        "document_intelligence": "Belge zekasi onerisi",
        "insight": "Rapor ve KPI yorumu",
        "admin_assist": "Admin hazirlik ozeti",
    }
    return labels.get(mode, "AI Copilot")
