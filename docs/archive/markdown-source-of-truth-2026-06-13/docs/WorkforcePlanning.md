# Workforce Planning

## Amaç

Workforce Planning teşkilat yapısı ile norm kadroyu birleştirir. Amaç organizasyon tasarımını, açık pozisyonları, doluluk oranlarını ve bütçe etkisini aynı operasyon ekranından izlemektir.

## Temel Metrikler

İzlenen metrikler:

- Açık / Dolu Kadro
- Cinsiyet Dağılımı
- Yaş Dağılımı
- Engelli Dağılımı
- Bütçe Doluluk
- Performans Ortalaması
- Turnover

İlk sürümde kadro ve doluluk metrikleri pozisyon kayıtlarından, demografik metrikler çalışan bağlantısı üzerinden hesaplanacak şekilde hazırlanır.

## Operasyon Akışı

Önerilen kullanım:

```text
Tree içinde hızlı gez
Birime bak
Kadroyu aç
Kapat
Diğer birime geç
```

Bu yüzden Kadro overlay’i ana UX parçasıdır.

## Açık Pozisyon İşlemleri

Açık pozisyonlarda şu aksiyonlar bulunur:

- İşe Alım Talebi Aç
- İlan Aç
- Transfer Talebi Aç

Bu aksiyonlar ileride işe alım, ilan ve iç transfer workflow’larına bağlanacaktır.

## Bütçe

Pozisyonlarda `budget_code`, çalışma tipi ve opsiyonel bütçe tutarı tutulur. Birim bazlı bütçe doluluğu norm ve aktif dolulukla birlikte izlenebilir.

## Reorganization Etkisi

Birim taşımaları ve birleşmeleri pozisyonları tarihsel bağlamıyla korur. Fiziksel silme olmadığı için geçmiş workforce planı ve organizasyon dizilimi raporlanabilir.

## Genişleme Noktaları

Gelecek entegrasyonlar:

- İşe alım talep workflow’u
- Performans modülü
- Ücret/bütçe modülü
- Turnover analitiği
- Demografik dağılım panelleri
