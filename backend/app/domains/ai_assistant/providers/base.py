# ruff: noqa: E501

from __future__ import annotations

from abc import ABC, abstractmethod

from app.domains.ai_assistant.schemas import CopilotMode, CopilotResponse


class AiProvider(ABC):
    name = "base"

    @abstractmethod
    async def answer(self, *, query: str, mode: CopilotMode, context_payload: dict[str, object]) -> CopilotResponse:
        raise NotImplementedError
