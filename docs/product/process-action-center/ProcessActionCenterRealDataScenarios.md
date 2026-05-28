# Process / Action Center Real Data Scenarios

## Scenario 1 - Branch Closing Task

1. Start Branch Closing for an active branch.
2. The process creates an impact-analysis task.
3. Action Center shows "Sube Kapanisi Etki Analizi Bekliyor".
4. The user opens the process from Action Center.
5. The user records organization/facility actions and completes the task.
6. The process advances to the next step.

## Scenario 2 - Capital Increase Approval

1. Start a capital increase for an active company.
2. The process creates a pending approval.
3. The approver sees it in Action Center.
4. The approver opens Process Center detail.
5. The approver adds a decision note and approves.
6. The operation executes and the process is completed.

## Scenario 3 - Representative Authority Rejection

1. Start representation authority.
2. The approval is routed to the required approver.
3. The approver rejects with a reason.
4. The process becomes rejected/failed according to process policy.
5. The initiator sees the rejection reason in process detail/history.

## Scenario 4 - Failed Operation

1. Simulate a failed operation request.
2. Action Center shows "Tamamlanamayan islem var".
3. The user opens the source record or process.
4. Retry is disabled unless the operation is explicitly retry-safe.
5. Support can use operation/request identifiers for investigation.

## Scenario 5 - Outbox Failed Event

1. Simulate an outbox handler failure.
2. Admin/system user sees "Sistem guncellemesi tamamlanamadi".
3. Normal users only see business-level record impact if relevant.
4. Admin retries or investigates from system tooling.

## Scenario 6 - Record Pending Actions

1. Open a company or branch detail with an open task/approval.
2. RecordPendingActionsPanel shows related work.
3. The user opens the process or task directly.

## Scenario 7 - Overdue Task

1. Create a task with a past due date.
2. Action Center marks it as high-priority/warning.
3. Completing the task removes it from open work.

## Scenario 8 - Module Readiness Warning

1. A required module is not ready.
2. Action Center shows a setup/readiness warning.
3. The user is routed to setup/readiness rather than a technical table name.
