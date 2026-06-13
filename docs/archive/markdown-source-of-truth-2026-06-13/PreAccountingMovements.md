# Ön Muhasebe Hareketleri

Ön Muhasebe Hareketleri is the primary simple financial entry screen. Users record who performed a transaction, the counterparty, amount, date, payment method, document status, and explanation.

Stored record:

- performer: `performed_by_person_id`
- counterparty: `counterparty_kind`, `counterparty_person_id`, `counterparty_organization_id`
- money fields: direction, amount, currency, exchange rate, local amount
- readiness fields: document, invoice match, bank match, reconciliation, row health, workflow status

Free-text counterparties are not final records. If a person or organization is missing, the user must create it through the correct source form.

Draft and pending records affect projected balance. Approved and finalized records affect official balance.
