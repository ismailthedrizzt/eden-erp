# Data Integrity Guards

Data Integrity Guard, Eden ERP'de bir islemin veri tutarliligi acisindan guvenli olup olmadigini kontrol eden katmandir.

## Ayrim

- Policy Engine: Kullanici bu islemi yapabilir mi?
- Setup Readiness: Modul ve altyapi hazir mi?
- Data Integrity Guard: Veriler bu islem icin tutarli mi?
- Process Engine: Islem hangi adimlarla yurutulur?
- Operation Orchestrator: Islem nasil uygulanir?

Integrity Guard permission karari vermez. Verinin sirket, sube, ortak, temsilci, organizasyon ve tesis/lokasyon iliskilerinde tutarli olup olmadigini kontrol eder.

## Sonuc Modeli

Her kontrol `IntegrityCheckResult` dondurur:

- `ok`
- `severity`: info, warning, blocking, critical
- `message`
- `reasons`
- `warnings`
- `affectedEntities`
- `suggestedActions`

`blocking` ve `critical` sonuclar mutation oncesi islemi durdurur. `warning` sonuclari wizard/precheck tarafinda kullaniciya gosterilebilir ve kullanici onayi ile islem devam edebilir.

## Ilk Entegrasyon

Sube Acilisi ve Sube Kapanisi orchestratorlari mutation oncesinde `runIntegrityForOperation` cagirir. Blocking sonuc varsa operation request failed olarak isaretlenir ve kullaniciya is diliyle sebep doner. Warning sonuc varsa operation devam eder ve warning bilgisi operation sonucuna, audit metadata'ya ve outbox payload'ina tasinir.

## Kullanici Dili

Teknik hata yerine yapilacak is gosterilir:

- "Bu sube icin devam eden bir surec var."
- "Bu sube kapsaminda aktif temsilci yetkileri var."
- "Ayni sirket altinda ayni adla aktif bir sube bulunuyor."
- "Sermaye Artirimi icin Ortaklarimiz modulu ve guncel ortaklik dagilimi aktif olmalidir."

## Action Guide ve Action Center

Integrity summary, AI Islem Rehberi tarafindan blocking/warning aciklamasi olarak kullanilabilecek formattadir. Action Center icin `integrity_warning` source type hazirlanmistir; operasyon precheck veya surec impact adimlari bu sonuclari kullanici is listesine donusturebilir.
