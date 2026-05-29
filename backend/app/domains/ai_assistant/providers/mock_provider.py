from __future__ import annotations

from app.domains.ai_assistant.providers.local_rule_provider import LocalRuleProvider


class MockAiProvider(LocalRuleProvider):
    name = "mock"
