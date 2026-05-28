# Audit Known Gaps

| gap | priority | target |
| --- | --- | --- |
| CSV/Excel export with `audit.export` permission | P1 | Add export endpoint, max row limit, mandatory date range and export audit event. |
| Auth/policy denial audit integration | P1 | Record real auth/permission/policy/scope denied attempts without logging eligibility checks. |
| Full DB-backed audit coverage tests | P1 | Seed company/ownership/authority/branch/process fixtures and assert audit writes. |
| Immutable audit storage | P2 | Evaluate append-only storage, WORM bucket or SIEM sink. |
| Long-term archival/partitioning | P2 | Add retention/archive strategy for high-volume audit logs. |
| SIEM integration | P2 | Forward critical audit/security events to external monitoring. |
| Advanced compliance dashboards | P2 | Add trend charts, anomaly detection and scheduled reports. |
| E-signature / official decision book integration | P3 | Link audit evidence with signed decisions and regulated records. |
