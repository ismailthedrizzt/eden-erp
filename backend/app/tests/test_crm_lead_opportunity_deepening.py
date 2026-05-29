from __future__ import annotations

from datetime import date
from decimal import Decimal

from app.domains.crm.opportunities import calculate_weighted_value
from app.domains.crm.pipelines import DEFAULT_PIPELINE_STAGES
from app.domains.crm.schemas import (
    FollowupSnoozeRequest,
    InteractionCreateRequest,
    LeadCreateRequest,
    OpportunityCreateRequest,
    OpportunityLostRequest,
    OpportunityProposalUploadRequest,
)
from app.policies.permissions import permission_exists
from app.setup.readiness_registry import get_readiness_definition


def test_lead_contract_and_duplicate_ready_fields() -> None:
    request = LeadCreateRequest(
        company_id="00000000-0000-4000-8000-000000000001",
        lead_name="SAHA EXPO PlaneGuard",
        email="lead@example.com",
        phone="+905551112233",
        source="exhibition",
        product_interest="PlaneGuard",
        estimated_value=Decimal("250000"),
        next_followup_date=date(2026, 6, 3),
    )

    assert request.source == "exhibition"
    assert request.lead_status == "new"
    assert request.currency == "TRY"


def test_default_pipeline_stage_contract() -> None:
    keys = [stage["stage_key"] for stage in DEFAULT_PIPELINE_STAGES]

    assert keys[:3] == ["new_opportunity", "first_contact", "needs_analysis"]
    assert DEFAULT_PIPELINE_STAGES[-2]["stage_type"] == "won"
    assert DEFAULT_PIPELINE_STAGES[-1]["stage_type"] == "lost"


def test_opportunity_weighted_value_and_proposal_contract() -> None:
    opportunity = OpportunityCreateRequest(
        company_id="00000000-0000-4000-8000-000000000001",
        opportunity_name="PlaneGuard 2026",
        customer_name="GlassTech",
        estimated_value=Decimal("100000"),
        probability=Decimal("35"),
    )
    proposal = OpportunityProposalUploadRequest(
        proposal_document_id="00000000-0000-4000-8000-000000000099",
        proposal_amount=Decimal("110000"),
        proposal_valid_until=date(2026, 6, 30),
    )

    assert calculate_weighted_value(
        opportunity.estimated_value,
        opportunity.probability,
    ) == Decimal("35000")
    assert proposal.proposal_status == "sent"


def test_followup_interaction_and_lost_reason_contract() -> None:
    interaction = InteractionCreateRequest(
        lead_id="00000000-0000-4000-8000-000000000010",
        interaction_type="followup_completed",
        subject="Takip tamamlandi",
        direction="outbound",
    )
    lost = OpportunityLostRequest(lost_reason="Rakip fiyat avantaji")
    snooze = FollowupSnoozeRequest(next_followup_date=date(2026, 6, 5))

    assert interaction.lead_id is not None
    assert lost.lost_reason
    assert snooze.next_followup_date == date(2026, 6, 5)


def test_crm_deepening_permissions_and_readiness_are_registered() -> None:
    for key in [
        "crm.leadsView",
        "crm.leadsEdit",
        "crm.leadsConvert",
        "crm.opportunitiesView",
        "crm.opportunitiesEdit",
        "crm.opportunityStageChange",
        "crm.opportunityWinLoss",
        "crm.pipelineManage",
        "crm.followupManage",
        "crm.proposalManage",
    ]:
        assert permission_exists(key)

    definition = get_readiness_definition("crm")
    assert definition is not None
    assert "crm_leads" in definition.required_tables
    assert "crm_opportunities" in definition.required_tables
    assert "crm_pipelines" in definition.required_tables
