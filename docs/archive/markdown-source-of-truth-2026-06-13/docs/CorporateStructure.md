# Corporate Structure

## Mimari Kural

ERP içinde her `Şirket` kaydı bir tüzel kişiliği temsil eder.

```text
companies = legal entities
```

Kurumsal yapı ayrı parent/holding alanlarından değil, ownership kayıtlarından türetilir.

Kullanılmaması gereken manuel ilişki alanları:

- `parent_company_id`
- `legal_entity_parent_id`
- `holding_id`

## Hesaplama Kaynağı

Kurumsal yapı `sirket_ortaklar` tablosundan hesaplanır. Tüzel kişi ortak `source_type = grup_sirketi` ve `source_id = başka bir şirket id` değerleriyle ERP içindeki başka bir şirket kaydına bağlanır.

## calculateCorporateStructure(company_id)

Yardımcı fonksiyon şunları döndürür:

- `main_owner`
- `ultimate_controller`
- `ultimate_ownership_ratio`
- `is_group_company`
- `subsidiary_count`
- `affiliate_count`
- `total_active_share`
- `total_voting_right`
- `warnings`
- `ownership_graph`

## Ana Ortak

Ana ortak aktif ortaklar içinden hesaplanır.

Öncelik:

1. En yüksek `voting_ratio`
2. `voting_ratio` boşsa `share_ratio`

Bir ortak %50 üzerinde oy veya hisseye sahipse ana ortak odur. Hiç kimse %50 üzerinde değilse sonuç `Dağınık Ortaklık Yapısı` olur.

## Nihai Hakim Ortak

Ana ortak ERP içindeki başka bir şirketse hesaplama yukarı doğru devam eder. Zincir gerçek kişiye, dış tüzel kişiye veya nihai hakim olarak işaretlenmiş kayda ulaşana kadar ilerler.

Örnek:

```text
Mehmet %60 → ABC Holding
ABC Holding %80 → B Ltd
```

Mehmet'in B Ltd üzerindeki dolaylı sahipliği:

```text
60% * 80% = 48%
```

## Grup Şirketi

Bir şirket grup şirketi sayılır:

- ERP içindeki başka bir şirket ona ortaksa
- veya kendisi ERP içindeki başka bir şirkete ortaksa

## Bağlı Şirket ve İştirak

Bağlı şirket sayısı, seçili şirketin aktif tüzel kişi ortak olarak yer aldığı ve kontrol eşiğini aştığı şirket sayısıdır.

Varsayılan kontrol eşiği:

```text
share_ratio > 50% veya voting_ratio > 50%
```

İştirak sayısı, seçili şirketin aktif tüzel kişi ortak olarak yer aldığı ancak kontrol eşiğinin altında kaldığı şirket sayısıdır.

## Döngü Tespiti

Hesaplama döngüsel ortaklıkları tespit eder ve ekran uyarısı üretir. Örnek:

```text
A → B
B → C
C → A
```

Bu durumda hesaplama çökmez; `Döngüsel ortaklık tespit edildi` uyarısı döner.

## Ortaklık Grafiği

Grafik üç katmanı gösterir:

- Upstream owners
- Current company
- Downstream subsidiaries / affiliates

Bu görsel temsil manuel şema değil, aktif ownership kayıtlarının okunabilir özetidir.
