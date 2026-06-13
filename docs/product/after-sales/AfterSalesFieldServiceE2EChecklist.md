# After-Sales Field Service E2E Checklist

<!-- source-of-truth-standard: contract overrides markdown -->

- Maintenance plan create
- Maintenance due item appears
- Create service request from due item
- Assign technician
- Technician sees field assignment / Action Center item
- Open mobile service page
- Accept field assignment
- Start service
- Fill checklist
- Upload service photo through Document domain
- Add parts used on service record
- Complete service
- Follow-up task creation when result is `follow_up_required`
- Warranty check returns expected status
- Service report preview visible
- Unauthorized user blocked
- Technical errors hidden behind user-facing messages

## Seed Data

- Active company
- PlaneGuard serviceable product
- Installed asset with warranty dates
- Maintenance plan
- Maintenance due item
- Technician user/employee
- Open service request
- Checklist template

Playwright config bu repoda bulunmadigi icin bu dosya regression hazirligi olarak tutulur.
