# Balance Calculation

Cari cards expose three balances:

- Resmi Bakiye: movements with `Onaylandı` or `Kesinleşti`
- Bekleyen Bakiye: movements with `Taslak` or `Onay Bekliyor`
- Tahmini Bakiye: official plus pending

Rejected and cancelled movements do not affect official balance.

The current implementation calculates balances in `v_account_cards`. Future settlement, bank, card, and invoice posting services should recalculate or refresh the read model after every approved movement or match-status transition.
