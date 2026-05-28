from __future__ import annotations

ROLE_CREATED = "security.role_created"
ROLE_UPDATED = "security.role_updated"
ROLE_DELETED = "security.role_deleted"
ROLE_PERMISSION_CHANGED = "security.role_permission_changed"
USER_ROLE_ASSIGNED = "security.user_role_assigned"
USER_ROLE_REMOVED = "security.user_role_removed"
USER_SCOPE_CHANGED = "security.user_scope_changed"
POLICY_TEST_RUN = "security.policy_test_run"
PERMISSION_DENIED = "security.permission_denied"
SCOPE_DENIED = "security.scope_denied"

SECURITY_EVENT_TYPES = [
    ROLE_CREATED,
    ROLE_UPDATED,
    ROLE_DELETED,
    ROLE_PERMISSION_CHANGED,
    USER_ROLE_ASSIGNED,
    USER_ROLE_REMOVED,
    USER_SCOPE_CHANGED,
    POLICY_TEST_RUN,
    PERMISSION_DENIED,
    SCOPE_DENIED,
]
