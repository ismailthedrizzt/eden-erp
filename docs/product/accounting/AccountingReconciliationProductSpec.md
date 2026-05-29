# Accounting Reconciliation Product Spec

## Amac

Muhasebe modulu cari kart/hareket MVP seviyesinden banka hesaplari, banka hareketleri, kredi karti hareketleri, e-Fatura/e-Arsiv kayitlari, belge eslestirme, otomatik mutabakat onerileri ve sermaye odeme mutabakati seviyesine tasinir.

Bu faz tam muhasebe, yevmiye, beyanname veya canli GIB/banka API entegrasyonu degildir. Accounting domain para ve belge hareketlerini izler; sirket lifecycle, ortaklik hakki veya temsil yetkisi dogurmaz.

## Kapsam

- Banka hesaplari
- Banka hareketleri
- Kredi karti hareketleri
- e-Fatura / e-Arsiv / manuel belge kayitlari
- Cari hareket, banka hareketi ve e-belge mutabakati
- Matching suggestion altyapisi
- Manual, partial ve unmatch aksiyonlari
- Belge aranacak / rejected / needs_review surecleri
- Sermaye odeme mutabakati
- Action Center uyarilari
- Reporting KPI ve rapor tanimlari
- Audit-ready metadata ve permission/scope kontrolu

Kapsam disi:

- Cift tarafli muhasebe fisi
- Yevmiye defteri
- KDV/stopaj/beyanname mantigi
- Canli e-Fatura/GIB entegrasyonu
- Canli banka API/open banking entegrasyonu
- Otomatik high-confidence posting

## Veri Modeli

Yeni tablolar:

- `accounting_bank_accounts`
- `accounting_bank_transactions`
- `accounting_card_transactions`
- `accounting_e_documents`
- `accounting_matching_suggestions`
- `accounting_capital_reconciliation`

Genisletilen tablo:

- `accounting_reconciliation_links`

Onemli kural: banka hareketi cari hareket yerine gecmez. Banka/e-belge kaydi once kendi tablosunda tutulur, daha sonra cari hareket veya sermaye kaydi ile mutabakat linki kurulur.

## Mutabakat

Desteklenen durumlar:

- `unmatched`
- `matched`
- `partially_matched`
- `needs_review`
- `ignored`

Desteklenen aksiyonlar:

- Eslestir
- Kismi eslestir
- Eslestirmeyi kaldir
- Yok say
- Incelemeye al
- Belge iste / belge aranacak

Matching score sinyalleri:

- Tutar birebir eslesme
- Tarih yakinligi
- Fatura/belge no eslesmesi
- VKN/TCKN eslesmesi
- IBAN eslesmesi
- Karsi taraf ad benzerligi
- Borc/alacak yon uyumu

## Sermaye Mutabakati

Sermaye artirimi ortaklik/sirket domaininde olusur. Muhasebe sadece beklenen sermaye odemesi ile cari/banka hareketini iliskilendirir.

- `expected_amount`
- `paid_amount`
- `outstanding_amount`
- `related_cari_transaction_id`
- `related_bank_transaction_id`

Odeme eksikse ortaklik transaction otomatik geri alinmaz; Action Center ve raporlama uyarisi uretilir.

## Permissions

- `accounting.bankAccountsView`
- `accounting.bankAccountsEdit`
- `accounting.bankTransactionsView`
- `accounting.bankTransactionsImport`
- `accounting.eDocumentsView`
- `accounting.eDocumentsImport`
- `accounting.reconciliationView`
- `accounting.reconciliationManage`
- `accounting.capitalReconciliationView`
- `accounting.capitalReconciliationManage`
- `accounting.export`

## Feature Flags ve Readiness

Feature flags:

- `accounting.bankAccounts`
- `accounting.bankTransactions`
- `accounting.cardTransactions`
- `accounting.eDocuments`
- `accounting.reconciliation`
- `accounting.autoMatching`
- `accounting.capitalReconciliation`
- `accounting.bankImport`
- `accounting.eDocumentImport`

Readiness:

- Cari kart ve cari hareket tabloları temel muhasebe ön koşuludur.
- Banka hesapları, banka hareketleri, e-belgeler ve mutabakat tabloları derinleştirme ön koşuludur.
- Document domain e-belge PDF/XML ilişkileri için önerilir.
- Import/Export domain banka ekstresi ve e-belge aktarımı için önerilir.

## Security ve Audit

- IBAN, hesap no ve karşı taraf IBAN bilgileri UI'da maskeli gösterilir.
- Banka/e-belge importu doğrudan cari hareket veya resmi işlem doğurmaz.
- Manual match, unmatch, invoice reject ve capital payment match audit-ready event olarak modellenir.
- Document signed URL veya raw storage secret muhasebe audit/log payloadına yazılmaz.

## API Endpoints

- `GET/POST /api/v1/accounting/bank-accounts`
- `GET/PATCH/DELETE /api/v1/accounting/bank-accounts/{id}`
- `GET/POST /api/v1/accounting/bank-transactions`
- `POST /api/v1/accounting/bank-transactions/import`
- `GET/PATCH /api/v1/accounting/bank-transactions/{id}`
- `POST /api/v1/accounting/bank-transactions/{id}/match`
- `POST /api/v1/accounting/bank-transactions/{id}/ignore`
- `GET/POST /api/v1/accounting/card-transactions`
- `GET/POST /api/v1/accounting/e-documents`
- `POST /api/v1/accounting/e-documents/import`
- `GET/PATCH /api/v1/accounting/e-documents/{id}`
- `POST /api/v1/accounting/e-documents/{id}/match`
- `POST /api/v1/accounting/e-documents/{id}/reject`
- `GET /api/v1/accounting/reconciliation/suggestions`
- `POST /api/v1/accounting/reconciliation/match`
- `POST /api/v1/accounting/reconciliation/unmatch`
- `GET /api/v1/accounting/reconciliation/unmatched`
- `GET /api/v1/accounting/reconciliation/summary`
- `GET /api/v1/accounting/capital-reconciliation`
- `GET /api/v1/accounting/capital-reconciliation/{capital_transaction_id}`
- `POST /api/v1/accounting/capital-reconciliation/{id}/match-payment`

## Action Center ve Reporting

Action Center kaynaklari:

- `accounting_bank_transaction`
- `accounting_e_document`
- `accounting_capital_reconciliation`

Reporting:

- `unmatched_bank_transactions_report`
- `unmatched_invoices_report`
- `missing_documents_report`
- `capital_reconciliation_report`
- `rejected_documents_report`

## Acceptance Criteria

- Banka hesaplari CRUD MVP calisir.
- Banka hareketleri import/dry-run altyapisi calisir.
- e-Fatura/e-Arsiv kayitlari import ve reject akislarini destekler.
- Matching suggestion skor ve reason uretir.
- Manual/partial/unmatch mutabakat baglantisi kurulabilir.
- Sermaye odeme mutabakati expected/paid/outstanding izler.
- IBAN ve hesap no UI/API payloadinda maskeli alan olarak sunulur.
- Action Center muhasebe uyarilari uretilebilir.
- Reporting KPI ve rapor tanimlari derinlestirme verisini kapsar.
- Next proxy route'lari FastAPI canonical endpointlere gider.
