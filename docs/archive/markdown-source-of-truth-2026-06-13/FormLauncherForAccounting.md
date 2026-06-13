# Form Launcher for Accounting

The Cari Kart add flow is a guided launcher, not an empty manual form.

Flow:

1. Select entity kind: real person or legal entity.
2. Enter unique identity fields.
3. Search the master identity table.
4. If found, show existing roles and current cari status.
5. If not found, launch the appropriate reusable business form.

Target form examples:

- person: employee, partner, stakeholder, representative
- organization: company, partner, stakeholder, representative, customer/supplier

The launcher passes identity fields as initial values and sets source context to accounting, so the target form can continue the master identity flow without creating duplicate identity records.
