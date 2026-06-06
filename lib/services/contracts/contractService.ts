export type ContractRecord = {
  id: string
  contract_no?: string
  contract_title: string
  contract_type: string
  contract_type_label?: string
  status: string
  counterparty_name?: string | null
  start_date?: string | null
  end_date?: string | null
  renewal_date?: string | null
  contract_value?: string | number | null
  currency?: string | null
  owner_user_id?: string | null
  responsible_department?: string | null
  risk_level?: string | null
  document_count?: number
  open_obligations?: number
  overdue_obligations?: number
  version?: number
  [key: string]: unknown
}

export type ContractListResult = {
  data: ContractRecord[]
  meta: { page: number; pageSize: number; total: number }
}

type ApiEnvelope<T> = { data: T; message?: string; error?: string; code?: string }

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  })
  const payload = await response.json().catch(() => ({})) as ApiEnvelope<T>
  if (!response.ok) {
    throw new Error(payload.message || payload.error || '??lem ba?ar?s?z.')
  }
  return payload.data
}

export const CONTRACT_TYPE_LABELS: Record<string, string> = {
  sales_contract: 'Sat?? S?zle?mesi',
  purchase_contract: 'Sat?n Alma S?zle?mesi',
  supplier_contract: 'Tedarik?i S?zle?mesi',
  service_contract: 'Hizmet S?zle?mesi',
  maintenance_contract: 'Bak?m S?zle?mesi',
  warranty_extension_contract: 'Garanti Uzatma S?zle?mesi',
  project_contract: 'Proje S?zle?mesi',
  employment_contract: '?? S?zle?mesi',
  lease_contract: 'Kira S?zle?mesi',
  nda: 'Gizlilik S?zle?mesi',
  partnership_contract: '?? Ortakl??? S?zle?mesi',
  dealer_contract: 'Bayilik S?zle?mesi',
  framework_agreement: '?er?eve S?zle?me',
  other: 'Di?er',
}

export const contractService = {
  list(searchParams?: URLSearchParams) {
    const query = searchParams?.toString()
    return requestJson<ContractListResult>(`/api/contracts${query ? `?${query}` : ''}`)
  },
  get(id: string) {
    return requestJson<ContractRecord>(`/api/contracts/${id}`)
  },
  create(payload: Record<string, unknown>) {
    return requestJson<ContractRecord>('/api/contracts', { method: 'POST', body: JSON.stringify(payload) })
  },
  update(id: string, payload: Record<string, unknown>) {
    return requestJson<ContractRecord>(`/api/contracts/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
  },
  lifecycle(id: string, action: string, payload: Record<string, unknown> = {}) {
    return requestJson<ContractRecord>(`/api/contracts/${id}/${action}`, { method: 'POST', body: JSON.stringify(payload) })
  },
  precheck(id: string, action: string) {
    return requestJson<Record<string, unknown>>(`/api/contracts/${id}/${action}/precheck`, { method: 'POST', body: JSON.stringify({}) })
  },
  relations(id: string) {
    return requestJson<Record<string, unknown>[]>(`/api/contracts/${id}/relations`)
  },
  obligations(id: string) {
    return requestJson<Record<string, unknown>[]>(`/api/contracts/${id}/obligations`)
  },
  events(id: string) {
    return requestJson<Record<string, unknown>[]>(`/api/contracts/${id}/events`)
  },
}
