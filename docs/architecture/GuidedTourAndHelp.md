# Guided Tour and Contextual Help

Guided Tour and Contextual Help, Eden ERP kullanicisinin dogru islem yolunu bulmasi icin tasarlanir. Kullaniciya teknik katmanlar anlatilmaz; ekranin o anki is baglaminda ne yapabilecegi gosterilir.

## Temel Ilke

Kullanici bir islemi yapamiyorsa sistem bunu sessizce engellemez. Nedenini aciklar ve dogru sayfa, kayit veya sihirbaz yoluna yonlendirir.

## + Ekle ve Taslak Kayit

Standart liste sayfalarinda `+ Ekle` metni korunur. Bu buton resmi sonuc doguran bir islem degil, kart taslagi olusturur.

- Sirket taslagi, Sirket Acilisi sihirbaziyla aktif hale gelir.
- Ortak karti taslagi, Ilk Ortaklik Girisi veya ortaklik islemleriyle hak kazanir.
- Temsilci karti taslagi, Temsilcilik Baslatma veya yetki islemleriyle yetki kazanir.
- Sube serbest kayitla olusturulmaz; Sube Acilisi sihirbaziyla acilir.

## Genel Tur

Genel tur ilk giriste backend kullanici tercihine gore acilir. Tamamlanan veya tekrar gosterme secilen tur, kullanici calisma alani tercihleri icinde saklanir.

Tur adimlari:

1. Taslak kayit ve resmi islem ayrimi.
2. Sol menu ve modul gecisleri.
3. Liste sayfalarinda arama, filtreleme ve detay acma.
4. `+ Ekle` butonunun taslak kayit olusturdugu.
5. Form detayinin kart, belge ve gecmis bilgilerini gosterdigi.
6. Resmi islemlerin sihirbazlarla yapildigi.
7. Kilitli alanlarda yardim ikonunun nedeni acikladigi.
8. AI Islem Rehberi'nin dogru sayfa ve isleme yonlendirdigi.

## Sayfa Mini Turlari

`PageContextTour`, ana sayfalar icin kisa mini tur sunar:

- Sirketlerimiz
- Ortaklarimiz
- Temsilcilerimiz
- Subelerimiz

Mini tur durumu da backend kullanici tercihinde saklanir. Kullanici yardim alanindan sayfa turunu yeniden baslatabilir.

## Operation Hint

`OperationHint`, bulundugu sayfada kritik kuralin kisa is dilindeki aciklamasini verir. Varsa ilgili islem butonu veya AI Islem Rehberi baglantisi gosterir.

Ornekler:

- Sirket create formu: taslak sirket kaydi aciklamasi.
- Ortak create formu: ortaklik haklarinin islemle olusacagi aciklamasi.
- Temsilci create formu: yetki bilgilerinin yetki islemleriyle verilecegi aciklamasi.
- Sube listesi: subenin aktif sirket kartindan acilacagi aciklamasi.

## Locked Field Helper

EntityForm, Field Control Registry'den gelen kilitli alanlarda label yaninda yardim ikonu gosterir. Popover:

- alani neden degistiremedigini,
- hangi sihirbaz veya resmi islemle degisecegini,
- yetki, modul veya kayit durumu engelini,
- opsiyonel modul uyarilarini,
- AI Islem Rehberi baglantisini

is dilinde gosterir.

## Action Guide Iliskisi

Tur ve helper sistemi AI Islem Rehberi ile ayni action sozlesmesini kullanmaya hazirlanir. Rehber veri degistirmez; yalnizca kullaniciyi dogru sayfa, kayit veya sihirbaza yonlendirir.
