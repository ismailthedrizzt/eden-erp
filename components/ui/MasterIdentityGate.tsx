'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { IdentityEntityKind, IdentityGateConfig, IdentityGateResolveResult, IdentityGateState } from '@/lib/identity-gate'

interface MasterIdentityGateProps {
  config: IdentityGateConfig
  mode: 'create' | 'view' | 'edit'
  formData: Record<string, any>
  onResolved: (result: IdentityGateResolveResult) => void
  onReset: () => void
  onOpenExistingRole?: (roleRecord: Record<string, any>, result: IdentityGateResolveResult) => void
  onCancelDuplicate?: () => void
  roleScope?: Record<string, unknown>
}

export function MasterIdentityGate({
  config,
  mode,
  formData,
  onResolved,
  onReset,
  onOpenExistingRole,
  onCancelDuplicate,
  roleScope,
}: MasterIdentityGateProps) {
  const [entityKind, setEntityKind] = useState<IdentityEntityKind>(config.allowedEntityKinds[0] || 'person')
  const [identity, setIdentity] = useState<Record<string, string>>(() => initialIdentity(config.allowedEntityKinds[0] || 'person'))
  const [state, setState] = useState<IdentityGateState>('identity_input')
  const [message, setMessage] = useState('Devam etmek için önce kimlik / kurum bilgilerini girerek master kayıt eşleştirmesi yapın.')
  const [warning, setWarning] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<IdentityGateResolveResult | null>(null)

  const readOnly = mode !== 'create'
  const kindOptions = useMemo(() => config.allowedEntityKinds.map(kind => ({
    value: kind,
    label: kind === 'person' ? 'Gerçek Kişi' : 'Tüzel Kişi',
  })), [config.allowedEntityKinds])

  useEffect(() => {
    if (mode === 'create') return
    setState('ready_for_edit')
    setMessage('Kayıt düzenleme modunda. Master kimlik ilişkisi mevcut kayıt üzerinden yönetilir.')
  }, [mode])

  const updateIdentity = (key: string, value: string) => {
    setIdentity(prev => ({ ...prev, [key]: key.includes('number') || key.includes('id') ? value.replace(/\D/g, '') : value }))
    if (state !== 'identity_input') {
      setState('identity_input')
      setLastResult(null)
      setWarning(null)
      onReset()
    }
    if (error) setError(null)
  }

  const handleKindChange = (nextKind: IdentityEntityKind) => {
    setEntityKind(nextKind)
    setIdentity(initialIdentity(nextKind))
    setState('identity_input')
    setLastResult(null)
    setWarning(null)
    setError(null)
    onReset()
  }

  const resolveIdentity = async () => {
    setError(null)
    setWarning(null)

    const validationError = validateIdentity(entityKind, identity)
    if (validationError) {
      setError(validationError)
      return
    }

    setState('searching_master')
    setMessage('Master kayıt aranıyor...')

    try {
      const response = await fetch('/api/identity/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityKind,
          identity,
          roleTable: config.roleTable,
          roleDuplicateCheck: config.roleDuplicateCheck,
          allowMultipleActiveRoles: config.allowMultipleActiveRoles,
          roleScope: buildRoleScope(config, formData, roleScope),
        }),
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Kimlik çözümleme başarısız')

      setState(result.state)
      setMessage(result.message)
      setWarning(result.warning || null)
      setLastResult(result)
      onResolved(result)
    } catch (err) {
      setState('identity_input')
      setMessage('Devam etmek için önce kimlik / kurum bilgilerini girerek master kayıt eşleştirmesi yapın.')
      setError(err instanceof Error ? err.message : 'Kimlik çözümleme başarısız')
    }
  }

  const statusTone = state === 'role_found' || state === 'blocked_duplicate'
    ? 'warning'
    : state === 'ready_for_insert' || state === 'ready_for_edit'
      ? 'success'
      : 'neutral'

  return (
    <div className="col-span-2 lg:col-span-3 rounded-xl border border-blue-100 bg-blue-50/70 p-4 dark:border-blue-900/60 dark:bg-blue-950/20">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Master Kimlik Eşleştirme</h4>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{message}</p>
        </div>
        <GateStatus state={state} tone={statusTone} />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Field label="Kişi / Kurum Tipi">
          <select
            value={entityKind}
            disabled={readOnly || kindOptions.length === 1}
            onChange={(event) => handleKindChange(event.target.value as IdentityEntityKind)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          >
            {kindOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </Field>

        {entityKind === 'person' ? (
          <>
            <Field label="Uyruğu">
              <input value={identity.nationality || ''} disabled={readOnly} onChange={(event) => updateIdentity('nationality', event.target.value)} placeholder="TR" className={inputClass} />
            </Field>
            <Field label="TC Kimlik No / Pasaport No">
              <div className="grid grid-cols-2 gap-2">
                <input value={identity.national_id || ''} disabled={readOnly} onChange={(event) => updateIdentity('national_id', event.target.value)} placeholder="TCKN" maxLength={11} inputMode="numeric" className={inputClass} />
                <input value={identity.passport_no || ''} disabled={readOnly} onChange={(event) => updateIdentity('passport_no', event.target.value)} placeholder="Pasaport" className={inputClass} />
              </div>
            </Field>
          </>
        ) : (
          <>
            <Field label="Ülke">
              <input value={identity.country || ''} disabled={readOnly} onChange={(event) => updateIdentity('country', event.target.value)} placeholder="TR" className={inputClass} />
            </Field>
            <Field label="VKN / Ticaret Sicil No">
              <div className="grid grid-cols-2 gap-2">
                <input value={identity.tax_number || ''} disabled={readOnly} onChange={(event) => updateIdentity('tax_number', event.target.value)} placeholder="VKN" inputMode="numeric" className={inputClass} />
                <input value={identity.registration_number || ''} disabled={readOnly} onChange={(event) => updateIdentity('registration_number', event.target.value)} placeholder="Sicil No" className={inputClass} />
              </div>
            </Field>
          </>
        )}
      </div>

      {error && <p className="mt-3 text-xs font-medium text-red-600 dark:text-red-400">{error}</p>}
      {warning && <p className="mt-3 text-xs font-medium text-amber-700 dark:text-amber-300">{warning}</p>}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {lastResult?.masterRecord ? 'Master kayıttan gelen alanlar formda işaretlenecek.' : 'Master kayıt bulunmazsa yeni master kayıt bağlamı hazırlanır.'}
        </div>
        {state === 'role_found' && lastResult?.roleRecord ? (
          <div className="flex gap-2">
            <button type="button" onClick={() => onOpenExistingRole?.(lastResult.roleRecord!, lastResult)} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Evet, Düzenle
            </button>
            <button type="button" onClick={onCancelDuplicate} className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">
              Hayır, Kapat
            </button>
          </div>
        ) : (
          <button type="button" disabled={readOnly || state === 'searching_master'} onClick={resolveIdentity} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
            {state === 'searching_master' ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            Eşleştir
          </button>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</span>
      {children}
    </label>
  )
}

function GateStatus({ state, tone }: { state: IdentityGateState; tone: 'neutral' | 'success' | 'warning' }) {
  const Icon = tone === 'success' ? CheckCircle2 : tone === 'warning' ? AlertTriangle : X
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
      tone === 'success' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
      tone === 'warning' && 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
      tone === 'neutral' && 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
    )}>
      <Icon size={13} />
      {stateLabel(state)}
    </span>
  )
}

const inputClass = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-gray-800'

function initialIdentity(kind: IdentityEntityKind): Record<string, string> {
  return kind === 'person'
    ? { nationality: 'TR', national_id: '', passport_no: '' }
    : { country: 'TR', tax_number: '', registration_number: '' }
}

function validateIdentity(kind: IdentityEntityKind, identity: Record<string, string>) {
  if (kind === 'person') {
    if (!identity.nationality) return 'Uyruğu zorunludur.'
    if (!identity.national_id && !identity.passport_no) return 'TC Kimlik No veya Pasaport No zorunludur.'
    if (identity.national_id && identity.national_id.length !== 11) return 'TC Kimlik No 11 haneli olmalıdır.'
    return null
  }

  if (!identity.country) return 'Ülke zorunludur.'
  if (!identity.tax_number && !identity.registration_number) return 'VKN veya Ticaret Sicil No zorunludur.'
  return null
}

function buildRoleScope(config: IdentityGateConfig, formData: Record<string, any>, explicitScope?: Record<string, unknown>) {
  const scope: Record<string, unknown> = { ...(explicitScope || {}) }
  config.roleScopeFields?.forEach(field => {
    if (formData[field] !== undefined) scope[field] = formData[field]
  })
  if (formData.company_id && scope.company_id === undefined) scope.company_id = formData.company_id
  if (formData.sirket_id && scope.sirket_id === undefined) scope.sirket_id = formData.sirket_id
  return scope
}

function stateLabel(state: IdentityGateState) {
  const labels: Record<IdentityGateState, string> = {
    initial: 'Başlangıç',
    identity_input: 'Kimlik bekleniyor',
    searching_master: 'Aranıyor',
    master_not_found: 'Master yok',
    master_found: 'Master bulundu',
    role_checking: 'Rol kontrolü',
    role_not_found: 'Rol yok',
    role_found: 'Mevcut kayıt',
    ready_for_insert: 'Form aktif',
    ready_for_edit: 'Düzenleme',
    blocked_duplicate: 'Duplicate engelli',
  }
  return labels[state]
}
