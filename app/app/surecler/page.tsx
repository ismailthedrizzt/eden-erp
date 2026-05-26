export default function ProcessesPage() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-4 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Surecler</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Surec motoru MVP altyapisi hazir. Bu ekran ileride process_instances ve process_tasks read modelinden beslenecek.
        </p>
      </div>
      <section className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
        Sube Acilisi ve Sube Kapanisi pilot surecleri tanimli. Mevcut wizard/operation akislari ayni sekilde calismaya devam eder.
      </section>
    </main>
  )
}
