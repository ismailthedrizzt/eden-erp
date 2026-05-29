from __future__ import annotations

from typing import Any

PROJECTS: list[dict[str, Any]] = [
    {
        "key": "pilot_feedback",
        "company_key": "eden_tech",
        "project_key": "PILOT",
        "project_name": "Eden ERP Pilot Feedback",
        "project_type": "pilot",
        "status": "active",
        "priority": "high",
        "progress_percent": 35,
        "scenario_key": "pilot_feedback_tracking",
    },
    {
        "key": "planeguard_rollout",
        "company_key": "eden_tech",
        "project_key": "PG",
        "project_name": "PlaneGuard Servis Hazirligi",
        "project_type": "after_sales",
        "status": "active",
        "priority": "medium",
        "progress_percent": 55,
        "scenario_key": "service_project",
    },
]

TASKS: list[dict[str, Any]] = [
    {
        "key": "pilot_bug_task",
        "project_key": "pilot_feedback",
        "company_key": "eden_tech",
        "issue_key": "PILOT-1",
        "title": "Pilot demo yetki matrisi smoke testi",
        "issue_type": "task",
        "status": "todo",
        "priority": "high",
        "assignee_user_key": "admin",
        "labels": ["Pilot", "Security"],
        "scenario_key": "pilot_feedback_task",
    },
    {
        "key": "overdue_task",
        "project_key": "pilot_feedback",
        "company_key": "eden_tech",
        "issue_key": "PILOT-2",
        "title": "Geciken belge tamamlama gorevi",
        "issue_type": "bug",
        "status": "blocked",
        "priority": "urgent",
        "assignee_user_key": "operations",
        "labels": ["Document", "Overdue"],
        "scenario_key": "overdue_action_center_task",
    },
    {
        "key": "service_task",
        "project_key": "planeguard_rollout",
        "company_key": "eden_tech",
        "issue_key": "PG-12",
        "title": "PlaneGuard sahada servis kontrolu",
        "issue_type": "service",
        "status": "in_progress",
        "priority": "medium",
        "assignee_user_key": "operations",
        "labels": ["AfterSales", "PlaneGuard"],
        "scenario_key": "service_request_task",
    },
]

