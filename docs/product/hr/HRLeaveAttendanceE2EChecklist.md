# HR Leave Attendance E2E Checklist

<!-- source-of-truth-standard: contract overrides markdown -->

- Leave type list opens and tenant defaults are seeded
- Leave type create/update
- Leave balance recalculate for active employee
- Leave request create
- Leave request submit
- Leave approve
- Leave reject
- Leave cancel
- Overlapping leave blocked
- Document required warning/blocking
- Terminated employee leave blocked
- Attendance record create
- Attendance import preview/create path
- Work schedule create
- Employee work schedule assignment
- Timesheet period create
- Timesheet period calculate
- Timesheet approve
- Timesheet lock
- Payroll prep visible after mark-ready
- Payroll prep screen states that it does not calculate payroll
- Action Center shows pending leave/timesheet/attendance items where infra exists
- Unauthorized user blocked
- Technical errors hidden behind user-facing messages

## Seed Data

- Active company
- Active employee
- Manager/approver user
- Default annual leave type
- Leave balance for annual leave
- Sick leave type requiring document
- Attendance records
- Work schedule
- Timesheet period

Playwright config bu repoda bulunmadigi icin bu dosya regression hazirligi olarak tutulur.
