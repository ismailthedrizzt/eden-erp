# Account Cards Passive Model

Cari Kartlar is a passive financial view over master identity and role records. It does not own identity creation.

Data model:

- `persons` and `organizations` hold identity.
- `account_card_settings` stores financial settings only.
- `account_movements` stores financial activity.
- `v_account_cards` exposes the read model used by the SmartList.

Editable financial settings:

- account code
- default currency
- payment and collection terms
- risk limit
- credit limit
- notes

Identity fields are read-only in Cari Kart detail. Users must open the linked source module if identity data needs to change.
