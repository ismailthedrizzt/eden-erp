# Ownership Model

## Kapsam

Ownership modeli şirket ortaklığını tarihsel, ekonomik ve yönetsel haklarıyla birlikte tutar. Model doğrudan ortaklık, dolaylı ortaklık, geçici ortaklık, farklı hisse sınıfları ve grup şirketi yapılarına genişleyebilir.

## Ana Tablo

`sirket_ortaklar` tablosu eski ortak alanlarını korur ve genişletilmiş ownership alanları ekler.

Alan grupları:

- Kimlik: owner_kind, source_type, source_id, display_name, identity_number
- Pay: share_class, share_units, nominal_value, capital_amount, share_ratio
- Haklar: voting_ratio, profit_ratio, has_representation_right, has_board_nomination_right
- Nihai faydalanıcı: beneficial_owner, beneficial_ratio, beneficial_note
- Tarih: start_date, end_date, status
- Belge: document_reference_id, notes
- Denetim: history, is_deleted, deleted_at, deleted_by

## Doğrudan ve Dolaylı Ortaklık

Doğrudan ortaklık, şirketin kaynak kayda doğrudan bağlı ownership satırıyla temsil edilir.

Dolaylı ortaklık ileride grup şirketi ve nihai faydalanıcı zincirlerinden hesaplanabilir. Bu nedenle tüzel kişi ortaklar `source_type = grup_sirketi` veya dış şirket kaynaklarıyla tutulur.

## Tarihsel Ortaklık

Satırlar silinmez. Pay devri veya pasifleştirme yeni tarihsel durum yaratır:

- Eski satırın end_date ve status alanları kapanabilir.
- Yeni ortak için yeni start_date ile yeni satır oluşturulur.
- Değişiklik history alanına yazılır.

## Pay Devri

Pay devri kısmi veya tam olabilir.

Kısmi devir:

- Devreden satırın share_ratio değeri düşürülür.
- Devralan için yeni aktif satır açılır.

Tam devir:

- Devreden satır `Devredildi` olur.
- end_date devir tarihi olur.
- Devralan için yeni aktif satır açılır.

## Toplam Doğrulama

Aktif ortakların share_ratio toplamı 100 olmalıdır. Toplam 100 değilse UI uyarı gösterir. Bu uyarı kayıt girişini engellemez; sermaye artırımı, geçici pay hareketi veya eksik veri senaryoları için görünür denetim sağlar.

## Nihai Faydalanıcı

`beneficial_owner` işaretli satırlarda `beneficial_ratio` ve açıklama tutulabilir. Bu yapı yasal raporlama ve grup şirketi sahiplik zinciri analizleri için kullanılacaktır.

## Non-Destructive Delete

Silme yerine pasifleştirme uygulanır:

- status = Pasif
- is_deleted = true
- deleted_at
- deleted_by

Bu kural ortaklık, temsil ve ileride eklenecek yasal kayıt tablolarında ortak davranıştır.
