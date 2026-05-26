export default async function ProcessDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-4 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Surec Detayi</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Surec kaydi: {id}</p>
      </div>
      <section className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
        Detay ekrani MVP placeholder olarak eklendi. Process detail read model baglantisi sonraki UI fazinda genisletilecek.
      </section>
    </main>
  )
}
