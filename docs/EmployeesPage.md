# Employees Page

## Identity Refactor

Çalışan kaydı artık gerçek kişi kimliğini tekrar üretmez. Çalışan rolü `employees.person_id` ile `persons` master kaydına bağlanır.

## Create Flow

Yeni çalışan ekleme akışı:

1. Kişi/Kurum Tipi: Çalışan için `Gerçek Kişi`
2. Kimlik Bilgileri: ad, soyad, uyruk, TC kimlik veya pasaport, doğum tarihi
3. Mevcut Kayıt Eşleştirme
4. Rol Detayları: şirket, çalışan no, departman, görev, çalışma durumu, başlangıç/bitiş tarihleri

Eğer kesin eşleşme varsa kullanıcıya mevcut kişiyle ilişkilendirme önerilir. Zayıf eşleşme varsa duplicate uyarısı gösterilir.

## Role Table

Hedef çalışan rol alanları:

- `id`
- `company_id`
- `person_id`
- `employee_no`
- `department_id`
- `employment_status`
- `start_date`
- `end_date`

Geçiş süresince eski `ad`, `soyad`, `tc_kimlik`, `pasaport_no` alanları okunabilir kalır; yeni kayıt akışı master `persons` kaydını esas alır.

## Security

- Fiziksel silme yoktur.
- Güncellemede `version` zorunludur.
- Kimlik değişikliği audit ve history üretir.
