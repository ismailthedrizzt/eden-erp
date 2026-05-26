import { ClipboardList, ShieldCheck } from 'lucide-react'

export default function AuditPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-3 border-b border-border pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-muted">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Denetim Izi</h1>
              <p className="text-sm text-muted-foreground">
                Kritik islemler, yetki kararlari ve sistem olaylari burada okunabilir is gecmisi olarak izlenir.
              </p>
            </div>
          </div>
        </header>

        <section className="rounded-md border border-border bg-card p-5">
          <div className="flex items-start gap-3">
            <ClipboardList className="mt-0.5 h-5 w-5 text-muted-foreground" aria-hidden="true" />
            <div className="space-y-2">
              <h2 className="text-base font-medium">Audit API hazir</h2>
              <p className="max-w-3xl text-sm text-muted-foreground">
                Liste, kayit bazli, islem bazli ve surec bazli denetim izleri backend endpointleri uzerinden
                hazirdir. Tam filtrelenebilir ekran sonraki UI iyilestirme fazinda bu sayfaya baglanabilir.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
