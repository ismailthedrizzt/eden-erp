# Record Lifecycle

Ana kayitlarda operasyonel durumun tek kaynagi `record_status` alanidir.

## Status Degerleri

- `draft`: Kayit olusturuldu, ancak operasyonel olarak aktif degil.
- `active`: Kayit yururlukte ve kullaniliyor.
- `passive`: Kayit artik aktif kullanilmiyor, ancak gecmisi ve yeniden islem alma kabiliyeti korunuyor.

Soft delete yoktur. Ana kayitlarda `is_deleted`, `deleted_at`, `deleted_by` kullanilmaz.

## Form Modlari

`draft`
- Form duzenlenebilir.
- `Duzenle` butonu gorunur.
- Modul lifecycle aksiyonu gorunur.
- Aksiyon dogrudan status degistirmez; wizard veya modal acar.

`active`
- Form duzenlenebilir.
- `Duzenle` butonu gorunur.
- Modul lifecycle aksiyonu gorunur.
- Aksiyon cikis, pasiflestirme, devir veya kapatma gibi modul akisini baslatir.

`passive`
- Ana form salt okunurdur.
- `Duzenle` butonu gorunmez.
- Modul lifecycle aksiyonu gorunur.
- Aksiyon kaydi yeniden operasyonel hale getirebilecek wizard veya iliskisel islem akisini baslatir.
- Gecmis gorunur.

Sil butonu hicbir form modunda gorunmez.

## Modul Aksiyonlari

Calisanlar:
- `draft`: Ise Giris Yap
- `active`: Isten Cikis Yap
- `passive`: Yeniden Ise Al

Ortaklar:
- `draft`: Yeni Ortaklik
- `active`: Ortaklik Islemi
- `passive`: Yeni Ortaklik

Passive ortak, yeni ortaklik wizardi ile veya baska aktif ortagin hisse devriyle yeniden `active` hale gelebilir.
