from __future__ import annotations

# ruff: noqa: E501, I001

from dataclasses import dataclass, field


EDEN_PRODUCT_KEY = "eden_erp"
EDEN_PRODUCT_NAME = "EDEN ERP"

PLAN_ORDER = ["development", "micro", "small", "medium", "large", "enterprise"]

RELEASE_CORE_MODULES = [
    "companies",
    "branches",
    "partners",
    "representatives",
    "organization",
    "facilities",
    "accounting",
    "hr",
    "documents",
    "audit",
    "actionCenter",
    "adminConsole",
    "settings",
    "security",
    "notifications",
    "search",
]

ADVANCED_MODULES = [
    "project_management",
    "contracts",
    "crm",
    "after_sales",
    "product_services",
    "reporting",
    "dataQuality",
    "importExport",
]

ENTERPRISE_MODULES = [
    "customerPortal",
    "integrations",
    "automation",
    "aiCopilot",
    "process",
    "outbox",
]

DEVELOPMENT_ONLY_MODULES = [
    "development",
    "design_lab",
    "diagnostics",
    "theme_lab",
    "feature_preview",
    "portal_test",
    "integration_test",
    "automation_test",
    "ai_test",
]


@dataclass(frozen=True)
class PlanDefinition:
    plan_key: str
    plan_name: str
    business_size_label: str
    description: str
    support_level: str
    visible_in_setup: bool = True
    is_development_plan: bool = False
    base_price: float = 0
    currency: str = "TRY"
    default_billing_period: str = "monthly"
    trial_days: int = 14
    modules: list[str] = field(default_factory=list)
    features: dict[str, bool] = field(default_factory=dict)
    limits: dict[str, int | None] = field(default_factory=dict)


PLAN_DEFINITIONS: dict[str, PlanDefinition] = {
    "development": PlanDefinition(
        plan_key="development",
        plan_name="Development",
        business_size_label="Development / internal tenant",
        description="Internal development, test and preview tenant plan.",
        support_level="internal",
        visible_in_setup=False,
        is_development_plan=True,
        default_billing_period="custom",
        trial_days=0,
        modules=sorted(set(RELEASE_CORE_MODULES + ADVANCED_MODULES + ENTERPRISE_MODULES + DEVELOPMENT_ONLY_MODULES)),
        features={
            "development.designLab": True,
            "development.diagnostics": True,
            "development.featurePreview": True,
            "licensing.manage": True,
        },
        limits={"max_users": None, "max_companies": None, "max_branches": None, "max_storage_mb": None},
    ),
    "micro": PlanDefinition(
        plan_key="micro",
        plan_name="Mikro Isletme",
        business_size_label="1-3 users / single company",
        description="Simple company, cari account and document tracking.",
        support_level="self_service",
        base_price=0,
        modules=["companies", "accounting", "documents", "adminConsole", "settings", "security", "search"],
        features={"documents.basic": True, "accounting.basic": True, "reporting.simple": True},
        limits={"max_users": 3, "max_companies": 1, "max_branches": 1, "max_storage_mb": 1024},
    ),
    "small": PlanDefinition(
        plan_key="small",
        plan_name="Kucuk Isletme",
        business_size_label="4-10 users / basic operations",
        description="Company, partner, representative, branch, employee and basic operations.",
        support_level="standard",
        base_price=0,
        modules=[
            "companies",
            "partners",
            "representatives",
            "branches",
            "accounting",
            "hr",
            "documents",
            "audit",
            "actionCenter",
            "adminConsole",
            "settings",
            "security",
            "notifications",
            "search",
        ],
        features={"audit.view": True, "actionCenter.basic": True, "documents.basic": True},
        limits={"max_users": 10, "max_companies": 2, "max_branches": 3, "max_storage_mb": 5120},
    ),
    "medium": PlanDefinition(
        plan_key="medium",
        plan_name="Orta Isletme",
        business_size_label="11-50 users / multi-company operations",
        description="Multi-company structure, HR, accounting, documents, tasks and audit.",
        support_level="standard",
        base_price=0,
        modules=sorted(set(RELEASE_CORE_MODULES + ["project_management", "contracts"])),
        features={"documents.requirements": True, "audit.view": True, "tasks.basic": True, "contracts.basic": True},
        limits={"max_users": 50, "max_companies": 5, "max_branches": 10, "max_storage_mb": 10240},
    ),
    "large": PlanDefinition(
        plan_key="large",
        plan_name="Buyuk Isletme",
        business_size_label="51-300 users / advanced workflows",
        description="CRM, after-sales, products/services, reporting and advanced documents.",
        support_level="priority",
        base_price=0,
        modules=sorted(set(RELEASE_CORE_MODULES + ADVANCED_MODULES)),
        features={"crm.enabled": True, "afterSales.enabled": True, "reporting.advanced": True, "dataImport.enabled": True},
        limits={"max_users": 300, "max_companies": 20, "max_branches": 50, "max_storage_mb": 51200},
    ),
    "enterprise": PlanDefinition(
        plan_key="enterprise",
        plan_name="Enterprise",
        business_size_label="Enterprise / custom scope",
        description="Portal, integration hub, automation, AI and custom modules.",
        support_level="enterprise",
        base_price=0,
        modules=sorted(set(RELEASE_CORE_MODULES + ADVANCED_MODULES + ENTERPRISE_MODULES)),
        features={"portal.enabled": True, "integrations.enabled": True, "automation.enabled": True, "aiCopilot.enabled": True},
        limits={"max_users": None, "max_companies": None, "max_branches": None, "max_storage_mb": None},
    ),
}


def list_plan_definitions(include_development: bool = True) -> list[PlanDefinition]:
    plans = [PLAN_DEFINITIONS[key] for key in PLAN_ORDER]
    if include_development:
        return plans
    return [plan for plan in plans if not plan.is_development_plan]


def get_plan_definition(plan_key: str) -> PlanDefinition | None:
    return PLAN_DEFINITIONS.get(plan_key)


def fallback_plan_key() -> str:
    return "medium"


def plan_module_keys(plan_key: str) -> list[str]:
    return list(PLAN_DEFINITIONS.get(plan_key, PLAN_DEFINITIONS[fallback_plan_key()]).modules)


def plan_feature_keys(plan_key: str) -> list[str]:
    plan = PLAN_DEFINITIONS.get(plan_key, PLAN_DEFINITIONS[fallback_plan_key()])
    return [key for key, enabled in plan.features.items() if enabled]


def plan_limits(plan_key: str) -> dict[str, int | None]:
    plan = PLAN_DEFINITIONS.get(plan_key, PLAN_DEFINITIONS[fallback_plan_key()])
    return dict(plan.limits)
