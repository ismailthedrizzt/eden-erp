# Pilot Performance Smoke

Bu smoke testi large-data load testi degildir. Amac demo verisiyle pilot
anlatiminin akici oldugunu dogrulamaktir.

## Hedef Ekranlar

- Dashboard
- Sirket listesi
- Sube listesi
- Global Search / Command Palette
- Action Center counts
- Audit list
- Admin Console health
- Veri Kalitesi dashboard
- Belgeler listesi

## Hedefler

- Ilk sayfa yaniti kullaniciya bekletme hissi vermemeli.
- Global Search debounce ile onceki istegi iptal edebilmeli.
- Action Center pending/failed/warning itemlarini tek istekte ozetlemeli.
- Admin health teknik detaylari lazy/collapsible tutmali.

## Manuel Olcum

1. Browser devtools network ac.
2. Dashboard refresh yap.
3. `/api/reporting/dashboard` ve Action Center isteklerini izle.
4. Ctrl/Cmd+K ile "EDEN", "Ankara", "PlaneGuard" ara.
5. Admin health ekranini ac.

## Kabul

- Kritik endpointlerde 5xx yok.
- UI loading state profesyonel gorunur.
- Demo script sirasinda sayfa gecisleri akisi bozmaz.
- Teknik hata kullaniciya raw stack olarak gorunmez.

## Bilinen Limit

- Full text search, fuzzy search ve buyuk veri pagination performansi bu smoke
  kapsaminda degildir.

