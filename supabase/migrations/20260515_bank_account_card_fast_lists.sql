create index if not exists idx_bank_accounts_active_created_fast
on public.bank_accounts (is_deleted, created_at desc, id);

create index if not exists idx_bank_accounts_active_name_fast
on public.bank_accounts (is_deleted, account_name, id);

create index if not exists idx_bank_accounts_active_iban_fast
on public.bank_accounts (is_deleted, iban, id);

create index if not exists idx_bank_cards_active_created_fast
on public.bank_cards (is_deleted, created_at desc, id);

create index if not exists idx_bank_cards_active_name_fast
on public.bank_cards (is_deleted, card_name, id);

create index if not exists idx_bank_connections_id_bank_name_fast
on public.bank_connections (id, bank_name);
