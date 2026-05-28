# Search / Command Palette Real Data Scenarios

## Scenario 1 - Sirket arama

1. Kullanici Ctrl+K basar.
2. `eden` yazar.
3. Yetkili oldugu sirket sonucu Kayitlar grubunda gorunur.
4. Enter ile sirket detay/listesine gider.
5. Kayit son acilanlara yazilir.

## Scenario 2 - VKN ile arama

1. Kullanici VKN girer.
2. Sirket, cari kart veya paydas providerlari exact/contains match dondurur.
3. Kullanici yetkisiz ise sonuc gosterilmez.

## Scenario 3 - Ankara Subesi

1. Kullanici `Ankara Subesi` yazar.
2. Branch provider sube adi, sehir, ilce ve sirket adindan arar.
3. Sonuc subtitle icinde sirket ve lokasyon bilgisiyle gorunur.

## Scenario 4 - Gorev arama

1. Kullanici issue key veya gorev basligi yazar.
2. Project task sonucu Gorevler ve Onaylar grubunda gorunur.
3. Secim gorev ekranina yonlendirir.

## Scenario 5 - Seri no arama

1. Kullanici PlaneGuard seri numarasi yazar.
2. Kurulu urun sonucunda serial_no exact match yuksek confidence alir.
3. Kullanici kurulu urun veya servis kaydi ekranina gider.

## Scenario 6 - Islem arama

1. Kullanici `sermaye artir` yazar.
2. Action provider Sermaye Artirimi sonucunu dondurur.
3. Aktif sirket yoksa result disabled olur ve reason gosterilir.

## Scenario 7 - Audit arama

1. Kullanici request/operation id arar.
2. `audit.view` veya ilgili reporting yetkisi varsa audit sonucu gelir.
3. Yetki yoksa audit provider disabled kalir.

## Scenario 8 - Recent item

1. Kullanici bir sirket sonucunu acar.
2. `user_recent_items` kaydi upsert edilir.
3. Bir sonraki Ctrl+K acilisinda Son acilanlar listesinde gorunur.

## Scenario 9 - Yetkisiz sonuc

1. Kullanici scope disi bir sirket adini arar.
2. Company provider company scope clause uygular.
3. Sonuc gosterilmez; bilgi sizintisi olmaz.
