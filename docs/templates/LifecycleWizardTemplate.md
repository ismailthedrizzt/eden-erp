# System Lifecycle Wizard Template

<!-- source-of-truth-standard: contract overrides markdown -->

Bu şablon sistem genelindeki yaşam döngüsü süreçleri için temel sözleşmedir. Şirket açılışı, tasfiye ve terkin yalnızca ilk süreç tanımlarıdır; çalışan, ortaklık, araç, sözleşme veya başka modüller aynı şablonu kullanmalıdır.

## Standart Akış

1. `Bilgiler`: Sürecin karar, tescil, kamu ve operasyon alanları burada toplanır.
2. `Belgeler`: Sürecin belge slotları burada yüklenir. Wizard içinde yeni belge yükleme esas alınır.
3. `Onay`: Backend payload'u doğrular, sürecin hedef form alanlarına yazar ve lifecycle event üretir.
4. `Geçmiş`: Formların `Geçmiş` sekmesi hem alan değişikliklerini hem de yaşam döngüsü olaylarını gösterir.

## Kod Sözleşmesi

- Genel sözleşme: `lib/lifecycle/lifecycleWizardTemplate.ts`
- Sistem süreç kayıtları: `lib/lifecycle/processes/index.ts`
- Şirket süreç tanımları: `lib/lifecycle/processes/companyLifecycleProcesses.ts`
- UI adım yardımcıları: `components/ui/lifecycleWizardTemplate.ts`

Her süreç şunları tanımlar:

- `id`, `title`, `endpoint`, `submitLabel`
- Standart adımlar: `info` ve `documents`
- `completion.formWrites`: Onaydan sonra yazılacak form alanları
- `completion.documentWrites`: Onaydan sonra ilişkilendirilecek belge slotları
- `completion.history`: Form geçmişinin okuyacağı `field_history` ve `lifecycle_events` kaynakları

## Yeni Süreç Ekleme

1. Süreç tanımını ilgili `lib/lifecycle/processes/*` dosyasına ekle.
2. `formWrites` ile wizard alanı -> hedef form alanı eşleşmelerini tanımla.
3. `documentWrites` ile wizard belge alanı -> hedef belge slotu eşleşmelerini tanımla.
4. Wizard UI'ında `createLifecycleInformationStep` ve `createLifecycleDocumentsStep` kullan.
5. Complete endpoint'inde aynı template'in hedeflerini kullanarak alan yazımı, belge yazımı ve event üretimini tamamla.
6. Form ekranında `history` sekmesini `field_history` ve `lifecycle_events` ile besle.
