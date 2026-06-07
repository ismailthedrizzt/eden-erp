from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

OnboardingStatus = Literal["not_started", "in_progress", "completed", "skipped"]
OnboardingStepKey = Literal[
    "welcome",
    "workspace_profile",
    "module_selection",
    "readiness_check",
    "first_company_draft",
    "first_company_opening",
    "guided_tour",
    "action_guide_intro",
    "action_center_intro",
    "finish",
]
HelpLevel = Literal["minimal", "guided", "detailed"]
PreferredHelpMode = Literal["tour", "guide", "both"]


class WorkspaceOnboardingPatch(BaseModel):
    status: OnboardingStatus | None = None
    current_step: OnboardingStepKey | None = None
    completed_steps: list[str] | None = None
    dismissed_steps: list[str] | None = None
    recommended_steps: list[dict[str, Any]] | None = None
    workspace_profile: dict[str, Any] | None = None
    selected_module_packages: list[str] | None = None


class CompleteWorkspaceStepRequest(BaseModel):
    step_key: OnboardingStepKey


class UserOnboardingPatch(BaseModel):
    hasSeenGlobalTour: bool | None = None
    hasSeenFirstRunWelcome: bool | None = None
    completedTourSteps: list[str] | None = None
    completedPageTours: list[str] | None = None
    dismissedHints: list[str] | None = None
    preferredHelpMode: PreferredHelpMode | None = None
    actionGuideIntroSeen: bool | None = None
    actionCenterIntroSeen: bool | None = None
    lastOnboardingVersion: str | None = None
    helpLevel: HelpLevel | None = None


class UserPreferencesPatch(BaseModel):
    uiPreferences: dict[str, Any] = Field(default_factory=dict)


class CompleteTourRequest(BaseModel):
    tour_key: str = Field(default="global")
    version: str | None = None


class DismissHintRequest(BaseModel):
    hint_key: str
