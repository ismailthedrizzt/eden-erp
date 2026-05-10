# Current Ownership View

`v_current_ownership`, onaylı ortaklık işlemlerinden hesaplanan güncel hakların read model katmanıdır.

Alanlar:

```text
company_id
partner_id
owner_kind
person_id
organization_id
display_name
current_share_ratio
current_voting_ratio
current_profit_ratio
current_capital_amount
current_share_units
has_control_right
control_type
has_veto_right
has_board_nomination_right
has_privileged_share
is_beneficial_owner
beneficial_ratio
last_transaction_date
warnings
```

Ortaklar sayfası pay, oy hakkı, kar payı, sermaye, kontrol hakkı, imtiyaz ve nihai faydalanıcı bilgisini doğrudan ortak kaydından değil bu view üzerinden okur.

API:

```text
GET /api/companies/{company_id}/current-ownership
```
