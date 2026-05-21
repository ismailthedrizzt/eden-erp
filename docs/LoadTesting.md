# Load Testing

Eden ERP ana liste endpointleri yuk testi ile korunur. Hedef, liste ekranlarinda P95 gecikmeyi kucuk ve olculebilir tutmak; yuzlerce kullaniciya cikmadan once yavas sorgu, eksik indeks ve yetki/session darbogazlarini yakalamaktir.

## Komutlar

```bash
npm run load:test:smoke
npm run load:test
node scripts/load-test.js --base-url=https://example.vercel.app --duration=30 --connections=50
```

Varsayilan hedef `http://localhost:3000` olur. Staging veya Vercel preview icin:

```bash
LOAD_TEST_BASE_URL=https://example.vercel.app npm run load:test
```

## Ayarlar

- `LOAD_TEST_BASE_URL`: Test edilecek uygulama URL'i.
- `LOAD_TEST_DURATION`: Senaryo suresi, saniye. Varsayilan `20`.
- `LOAD_TEST_CONNECTIONS`: Eszamanli baglanti sayisi. Varsayilan `20`.
- `LOAD_TEST_PIPELINING`: HTTP pipelining. Varsayilan `1`.
- `LOAD_TEST_AUTH_TOKEN`: Gereken endpointlerde Bearer token.
- `LOAD_TEST_COOKIE`: Gecerli oturum cookie'si. Varsayilan bos gelir; lokal smoke test icin ya `LOAD_TEST_AUTH_TOKEN` verin ya da test ortaminda bilerek `EDEN_ALLOW_LEGACY_API_ACCESS=true` kullanin.

## Baslangic Esikleri

Ana liste endpointlerinde baslangic hedefi autocannon'un `p97.5` gecikmesinde `500-650ms` araligidir ve non-2xx cevap kabul edilmez. Bu esikler bilerek siki tutulur; staging verisi buyudukce endpoint bazli olarak guncellenmelidir.

## Kapsam

Ilk paket kritik liste GET endpointlerini olcer:

- `GET /api/ik/personel`
- `GET /api/sirketler`
- `GET /api/sirketler/ortaklar`
- `GET /api/accounting/bank-accounts-cards`
- `GET /api/muhasebe/on-muhasebe-hareketleri`

Bir sonraki adimda ayni pakete kontrollu eszamanli yazma senaryolari eklenmelidir: optimistic concurrency, ayni kayda iki kullanici update, pasife alma ve onay akisi.
