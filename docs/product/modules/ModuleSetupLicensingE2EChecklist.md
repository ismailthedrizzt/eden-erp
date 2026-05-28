# Module Setup / Licensing E2E Checklist

- Kurulum Merkezi açılır.
- Modül kartları available, disabled, unlicensed, setup_required ve dependency_missing durumlarını gösterir.
- Kurulum özet sayaçları doğru hesaplanır.
- Setup step listesinde tamamlandı/eksik/uyarı/opsiyonel ayrımı görünür.
- Module Licenses sayfası açılır.
- Modül aktivasyon toggle'ı admin kullanıcıda çalışır.
- Normal kullanıcı modül ayarı değiştiremez.
- Feature flag listesi modül detayında görünür.
- Feature flag kapatılınca ilgili UI seçeneği disabled reason gösterir.
- Sermaye Artırımı, Ortaklarımız setup_required iken disabled olur.
- Şube Açılışı, Branches disabled iken disabled olur.
- Action Guide kurulum ve modül ayarı önerir.
- Action Center readiness warning admin kullanıcıya görünür.
- `ModuleUnavailableState` her status için doğru başlık/mesaj/aksiyon gösterir.
- Teknik tablo, migration veya RPC detayı normal kullanıcıya sızmaz.
