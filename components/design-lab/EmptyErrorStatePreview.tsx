import { AlertTriangle, Ban, Building2, FileWarning, LockKeyhole, WifiOff, type LucideIcon } from 'lucide-react'

const states: { title: string; body: string; icon: LucideIcon; tone: string; action: string }[] = [
  { title: 'Henuz sirket yok', body: 'Ilk sirket taslagini olusturdugunuzda burada durum ve belge ozeti gorunur.', icon: Building2, tone: 'var(--dl-info)', action: 'Sirket taslagi ac' },
  { title: 'Bu modul henuz kullanima acilmadi', body: 'Modul lisansi veya kurulum adimi tamamlandiginda navigasyonda aktif hale gelir.', icon: Ban, tone: 'var(--dl-text-muted)', action: 'Kurulum durumunu gor' },
  { title: 'Yetkiniz bulunmuyor', body: 'Bu kaydi gormek icin rolunuzde ek izin gerekir. Talep olusturabilirsiniz.', icon: LockKeyhole, tone: 'var(--dl-warning)', action: 'Yetki talep et' },
  { title: 'Backend servisine ulasilamadi', body: 'Kayitlar korunuyor. Baglanti geri geldiginde sayfa otomatik yenilenebilir.', icon: WifiOff, tone: 'var(--dl-danger)', action: 'Tekrar dene' },
  { title: 'Belge eksik', body: 'Surecin devam edebilmesi icin zorunlu slotlardan en az biri tamamlanmali.', icon: FileWarning, tone: 'var(--dl-warning)', action: 'Belge slotlarini ac' },
]

export function EmptyErrorStatePreview() {
  return (
    <section className="rounded-[var(--dl-card-radius)] border border-[var(--dl-border-subtle)] bg-[var(--dl-surface-raised)] p-4" style={{ boxShadow: 'var(--dl-shadow-card)' }}>
      <div>
        <h3 className="text-base font-semibold text-[var(--dl-text-primary)]">Empty / Error State Preview</h3>
        <p className="mt-1 text-sm text-[var(--dl-text-secondary)]">AI-generated bos kutu hissini azaltan, is diliyle yazilmis state ornekleri.</p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {states.map(state => {
          const Icon = state.icon
          return (
            <article key={state.title} className="rounded-[var(--dl-card-radius)] border border-[var(--dl-border-subtle)] bg-[var(--dl-surface-base)] p-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-[var(--dl-radius-large)] bg-[var(--dl-surface-muted)]" style={{ color: state.tone }}>
                <Icon size={20} />
              </span>
              <h4 className="mt-3 text-sm font-semibold text-[var(--dl-text-primary)]">{state.title}</h4>
              <p className="mt-2 min-h-12 text-sm leading-6 text-[var(--dl-text-secondary)]">{state.body}</p>
              <button type="button" className="mt-4 inline-flex items-center gap-1.5 rounded-[var(--dl-input-radius)] border border-[var(--dl-border-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--dl-text-secondary)]">
                <AlertTriangle size={13} /> {state.action}
              </button>
            </article>
          )
        })}
      </div>
    </section>
  )
}
