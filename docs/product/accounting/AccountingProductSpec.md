# Accounting Product Spec

## Amac

Accounting domain, Eden ERP'de sirketin parasal hareketlerini ve cari iliskilerini
izler. Bu faz tam muhasebe paketi degildir; cari kartlar, cari hareketler,
odeme/tahsilat/gider iliskisi, belge/fatura/banka hareketi eslesmesine hazirlik
ve sermaye odeme mutabakati icin MVP temelini kurar.

> Sermaye artırımı ortaklık/şirket domain’inde oluşur. Sermaye ödemesi veya
> tahsilatı muhasebe domain’inde cari/banka hareketi olarak mutabakatlanır.

## Kapsam

Accounting domain'in sahip oldugu kavramlar:

- Cari kart
- Cari hareket
- Borc/alacak, odeme, tahsilat, gider ve gelir kaydi
- Belge/fatura referansi
- Banka/kasa/kart hareketi referansi
- Mutabakat durumu
- Odeme yapan, odeme alan ve gercek karsi taraf
- Sirket ici ve sirket disi cari iliskiler

Accounting domain'in sahip olmadigi kavramlar:

- Sirket acilisi, tasfiye, terkin
- Ortaklik hakki, pay orani, oy hakki, kar payi hakki
- Temsilci yetkisi
- Sube acilisi/kapanisi
- Personel lifecycle
- Resmi tescil islemi

## Cari Kart

Cari Kart, finansal iliski kurulabilen kisi veya kurumu temsil eder. Roller:
`customer`, `supplier`, `both`, `employee`, `partner`, `stakeholder`,
`public_institution`, `bank`, `miscellaneous`, `related_company`, `other`.

Master kayit baglantilari:

- `company_id`
- `person_id`
- `organization_id`
- `stakeholder_id`
- `partner_id`
- `representative_id`
- `employee_id`
- `bank_id`
- `public_institution_id`

Kural: Ayni kisi veya kurum icin farkli modullerde duplicate cari kart
yaratilmaz; cari kart master kisi/kurum kaydina baglanir. `Muhtelif
Tedarikciler` gibi toplu cari kartlar serbest/ozel senaryolar icin desteklenir.

Ana alanlar: `account_code`, `account_name`, `account_type`, `cari_role`,
`linked_entity_type`, `linked_entity_id`, `tax_number`, `tax_office`,
`identity_number`, iletisim/adres alanlari, `iban`, `currency`,
`opening_balance`, `current_balance`, `risk_limit`, `payment_terms`,
`record_status`, `notes`, `version`.

## Cari Hareket

Cari Hareket, bir cari kartla iliskili finansal hareket kaydidir. Hareket
turleri: `expense`, `income`, `invoice`, `payment`, `collection`,
`bank_transaction`, `card_transaction`, `cash_transaction`, `capital_payment`,
`capital_collection`, `adjustment`, `opening_balance`, `transfer`, `refund`,
`other`.

Ana alanlar: `account_id`, `transaction_date`, `document_date`, `due_date`,
`transaction_type`, `direction`, `amount`, `currency`, `exchange_rate`,
`local_amount`, `description`, `document_status`, `document_no`,
`document_type`, `real_counterparty_name`, `category`, `payment_method`,
`paid_by_entity_type`, `paid_by_entity_id`, `paid_to_entity_type`,
`paid_to_entity_id`, `related_module`, `related_entity_type`,
`related_entity_id`, `reconciliation_status`, `matched_bank_transaction_id`,
`matched_invoice_id`, `attachment_files`, `status`, `version`.

Kullanici dili:

- `debit`: Borc
- `credit`: Alacak
- `confirmed`: Onayli/Odendi/Tahsil edildi baglamina gore gosterilir
- `document_needed`: Belge aranacak
- `unmatched`: Eslesmedi
- `needs_review`: Mutabakat bekliyor

## Odeyen / Odenen

Her cari hareket su sorulari ayri tutar:

- Islem hangi sirket adina yapildi?
- Hangi cari kart etkilendi?
- Kim odedi?
- Kime odendi?
- Belge kimin adina?
- Gercek satici/karsi taraf kim?
- Odeme yontemi ne?
- Belge durumu ne?

Ornek: Sirket kurulusunda fotografciya sahsi odeme.

- `company_id`: EDEN
- `account_id`: Muhtelif Tedarikciler
- `real_counterparty_name`: Fotografci - bulunacak
- `transaction_type`: expense
- `category`: kurulus gideri
- `amount`: 500
- `payment_method`: sahsi odeme
- `paid_by_entity_type`: person
- `paid_by_entity_id`: Ismail
- `paid_to_entity_type`: miscellaneous_supplier
- `document_status`: document_needed
- `status`: confirmed

## Belge ve Mutabakat Durumu

Belge durumlari: `no_document`, `document_needed`, `document_uploaded`,
`e_invoice_pending`, `e_archive_pending`, `invoice_matched`, `rejected`.

Mutabakat durumlari: `unmatched`, `matched`, `partially_matched`,
`needs_review`, `ignored`.

Bu fazda e-Fatura, e-Arsiv, banka API, kart hareketi API, OCR ve otomatik
mutabakat entegrasyonu yoktur. Veri modeli ve UI alanlari bu entegrasyonlara
hazirdir.

## Sermaye / Ownership Iliskisi

`related_module` alanlari `ownership`, `capital`, `company`, `partner`,
`representative`, `branch`, `accounting` degerlerini destekler.

Sermaye odeme/tahsilat hareketleri:

- `transaction_type`: `capital_payment` veya `capital_collection`
- `related_entity_type`: `capital_increase`, `ownership_transaction`,
  `partner`

Kural: Sermaye Artirimi ortaklik/sirket domain'inde dogar. Ortak sermaye
odemesi Cari Hareket olarak kaydedilir. Bu iki kayit mutabakatlanabilir ama
biri digerinin yerine gecmez.

## Permissions

- `accounting.view`
- `accounting.edit`
- `accounting.transactionCreate`
- `accounting.transactionApprove`
- `accounting.reconcile`
- `accounting.export`

## Module Readiness

Zorunlu altyapi:

- `accounting_cari_accounts`
- `accounting_cari_transactions`

Opsiyonel altyapi:

- `accounting_transaction_attachments`
- `accounting_reconciliation_links`
- `bank_transactions`
- `invoices`
- `e_invoice` entegrasyonu

Feature flags:

- `accounting.enabled`
- `accounting.cariAccounts`
- `accounting.cariTransactions`
- `accounting.bankReconciliation`
- `accounting.invoiceMatching`
- `accounting.capitalReconciliation`

## API Endpoints

- `GET /api/v1/accounting/cari-accounts`
- `POST /api/v1/accounting/cari-accounts`
- `GET /api/v1/accounting/cari-accounts/{account_id}`
- `PATCH /api/v1/accounting/cari-accounts/{account_id}`
- `DELETE /api/v1/accounting/cari-accounts/{account_id}`
- `GET /api/v1/accounting/cari-accounts/{account_id}/summary`
- `GET /api/v1/accounting/company/{company_id}/summary`
- `GET /api/v1/accounting/cari-transactions`
- `POST /api/v1/accounting/cari-transactions`
- `GET /api/v1/accounting/cari-transactions/{transaction_id}`
- `PATCH /api/v1/accounting/cari-transactions/{transaction_id}`
- `DELETE /api/v1/accounting/cari-transactions/{transaction_id}`

## Acceptance Criteria

- Cari Kartlar MVP list/create/detail/update/delete calisir.
- Cari Hareketler MVP list/create/detail/update/delete calisir.
- `Muhtelif Tedarikciler` senaryosu desteklenir.
- Odeyen, odenen ve gercek karsi taraf alanlari UI/API kontratinda vardir.
- Bakiye summary `opening_balance + debit - credit` olarak hesaplanir.
- Belge ve mutabakat durumlari UI filtreleri ve API alanlariyla hazirdir.
- Sermaye/ownership mutabakati icin `related_module` ve related entity alanlari hazirdir.
- Next route'lari proxy-only kalir; business karar FastAPI/Python tarafindadir.

## Known Gaps

Known gaps are tracked in [AccountingKnownGaps.md](./AccountingKnownGaps.md) and summarized in the final release gate risk list.
