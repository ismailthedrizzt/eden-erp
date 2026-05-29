from __future__ import annotations

from app.domains.ai_assistant.providers.local_rule_provider import LocalRuleProvider


class OpenAiProvider(LocalRuleProvider):
    """Placeholder provider.

    The MVP keeps provider abstraction without requiring network calls or secrets.
    When AI_PROVIDER=openai is configured later, this class can be extended behind
    the same structured response and safety guard contract.
    """

    name = "openai_placeholder"
