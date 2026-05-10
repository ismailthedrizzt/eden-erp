'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { IdentityEntityKind, IdentityGateConfig, IdentityGateResolveResult, IdentityGateState } from '@/lib/identity-gate'
import { COUNTRY_NATIONALITY_OPTIONS, isTurkishNationality, normalizeCountryId } from '@/lib/reference/country-nationalities'

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
  const [message, setMessage] = useState('Devam etmek için önce temel kimlik bilgilerini girerek master kayıt eşleştirmesi yapın.')
  const [warning, setWarning] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<IdentityGateResolveResult | null>(null)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const allowedEntityKindsKey = config.allowedEntityKinds.join('|')

  const readOnly = mode !== 'create'
  const isFixedKind = config.allowedEntityKinds.length === 1
  const isTurkeyPerson = entityKind === 'person' && isTurkishNationality(identity.nationality)
  const kindOptions = useMemo(() => config.allowedEntityKinds.map(kind => ({
    value: kind,
    label: kind === 'person' ? 'Gerçek Kişi' : 'Tüzel Kişi',
  })), [config.allowedEntityKinds])

  useEffect(() => {
    if (mode === 'create') return
    const nextKind = deriveEntityKind(config, formData)
    const nextIdentity = deriveIdentity(nextKind, formData, identity)
    setEntityKind(nextKind)
    setIdentity(prev => ({
      ...prev,
      ...nextIdentity,
    }))
    setState('ready_for_edit')
    setMessage('Kayıt düzenleme modunda. Temel kimlik ilişkisi mevcut kayıt üzerinden yönetilir.')
  }, [
    mode,
    allowedEntityKindsKey,
    formData.master_entity_kind,
    formData.partner_type,
    formData.stakeholder_type,
    formData.person_or_entity_type,
    formData.owner_kind,
    formData.person_id,
    formData.organization_id,
    formData.uyruk,
    formData.nationality,
    formData.nationality_country,
    formData.tc_kimlik,
    formData.national_id,
    formData.identity_number,
    formData.tckn_vkn,
    formData.pasaport_no,
    formData.passport_no,
    formData.country,
    formData.ulke,
    formData.tax_number,
    formData.vkn_tckn,
    formData.registration_number,
    formData.ticaret_sicil_no,
  ])

  const updateIdentity = (key: string, value: string) => {
    setIdentity(prev => {
      const next = { ...prev }
      const cleaned = key.includes('number') || key.includes('id') ? value.replace(/\D/g, '') : value
      next[key] = cleaned

      if (key === 'nationality') {
        const nextIsTurkey = isTurkishNationality(cleaned)
        next.national_id = nextIsTurkey ? next.national_id || '' : ''
        next.passport_no = nextIsTurkey ? '' : next.passport_no || ''
      }

      return next
    })
    setTouched(prev => ({ ...prev, [key]: true }))
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
    setTouched({})
    onReset()
  }

  const resolveIdentity = async () => {
    setError(null)
    setWarning(null)
    setTouched({ nationality: true, identity_no: true, country: true, tax_number: true })

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
          identity: normalizeIdentityForSubmit(entityKind, identity),
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
      setMessage('Devam etmek için önce temel kimlik bilgilerini girerek master kayıt eşleştirmesi yapın.')
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
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Temel Kimlik Bilgileri</h4>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{message}</p>
        </div>
        <GateStatus state={state} tone={statusTone} />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Field label="Kişi / Kurum Tipi">
          <select
            value={entityKind}
            disabled={readOnly || isFixedKind}
            onChange={(event) => handleKindChange(event.target.value as IdentityEntityKind)}
            className={fieldClass(true, false, readOnly || isFixedKind)}
          >
            {kindOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </Field>

        {entityKind === 'person' ? (
          <>
            <Field label="Uyruğu">
              <SearchableGateSelect
                value={normalizeNationalityInput(identity.nationality)}
                disabled={readOnly}
                options={COUNTRY_NATIONALITY_OPTIONS}
                placeholder="Yazarak arayın"
                onBlur={() => setTouched(prev => ({ ...prev, nationality: true }))}
                onChange={(value) => updateIdentity('nationality', value)}
                className={fieldClass(hasPersonNationality(identity), touched.nationality, readOnly)}
              />
            </Field>
            <Field label={isTurkeyPerson ? 'TC Kimlik No' : 'Pasaport No'}>
              <input
                value={isTurkeyPerson ? identity.national_id || '' : identity.passport_no || ''}
                disabled={readOnly}
                onBlur={() => setTouched(prev => ({ ...prev, identity_no: true }))}
                onChange={(event) => updateIdentity(isTurkeyPerson ? 'national_id' : 'passport_no', event.target.value)}
                placeholder={isTurkeyPerson ? '11 haneli TCKN' : 'Pasaport No'}
                maxLength={isTurkeyPerson ? 11 : undefined}
                inputMode={isTurkeyPerson ? 'numeric' : 'text'}
                className={fieldClass(hasPersonIdentity(identity), touched.identity_no, readOnly)}
              />
            </Field>
          </>
        ) : (
          <>
            <Field label="Ülke">
              <input
                value={identity.country || ''}
                disabled={readOnly}
                onBlur={() => setTouched(prev => ({ ...prev, country: true }))}
                onChange={(event) => updateIdentity('country', event.target.value)}
                placeholder="TR"
                className={fieldClass(hasOrganizationCountry(identity), touched.country, readOnly)}
              />
            </Field>
            <Field label="VKN">
              <input
                value={identity.tax_number || ''}
                disabled={readOnly}
                onBlur={() => setTouched(prev => ({ ...prev, tax_number: true }))}
                onChange={(event) => updateIdentity('tax_number', event.target.value)}
                placeholder="10 haneli VKN"
                maxLength={10}
                inputMode="numeric"
                className={fieldClass(hasOrganizationTaxNumber(identity), touched.tax_number, readOnly)}
              />
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

function SearchableGateSelect({
  value,
  options,
  disabled,
  className,
  placeholder,
  onBlur,
  onChange,
}: {
  value: string
  options: Array<{ value: string; label: string }>
  disabled: boolean
  className: string
  placeholder?: string
  onBlur?: () => void
  onChange: (value: string) => void
}) {
  const selectedLabel = options.find(option => option.value === value)?.label || value || ''
  const [query, setQuery] = useState(selectedLabel)
  const [open, setOpen] = useState(false)
  const filteredOptions = options
    .filter(option => {
      const q = query.toLocaleLowerCase('tr-TR')
      return option.label.toLocaleLowerCase('tr-TR').includes(q) || option.value.toLocaleLowerCase('tr-TR').includes(q)
    })
    .slice(0, 80)

  useEffect(() => {
    setQuery(selectedLabel)
  }, [selectedLabel])

  const commitIfExactMatch = (text: string) => {
    const normalized = text.trim().toLocaleLowerCase('tr-TR')
    const exact = options.find(option =>
      option.label.toLocaleLowerCase('tr-TR') === normalized ||
      option.value.toLocaleLowerCase('tr-TR') === normalized
    )
    if (exact) {
      setQuery(exact.label)
      onChange(exact.value)
      return
    }
    setQuery(selectedLabel)
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => {
          setQuery(event.target.value)
          setOpen(true)
        }}
        onFocus={(event) => {
          event.currentTarget.select()
          setOpen(true)
        }}
        onBlur={() => {
          commitIfExactMatch(query)
          onBlur?.()
          window.setTimeout(() => setOpen(false), 120)
        }}
        className={className}
      />
      {open && !disabled && (
        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
          {filteredOptions.length > 0 ? filteredOptions.map((option, index) => (
            <button
              key={`${option.value}-${index}`}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setQuery(option.label)
                onChange(option.value)
                setOpen(false)
              }}
              className="block w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-blue-50 dark:text-gray-100 dark:hover:bg-blue-950/40"
            >
              {option.label}
            </button>
          )) : (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">Sonuç bulunamadı</div>
          )}
        </div>
      )}
    </div>
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

const inputClass = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-900 dark:disabled:bg-gray-800 dark:disabled:text-gray-100'

function initialIdentity(kind: IdentityEntityKind): Record<string, string> {
  return kind === 'person'
    ? { nationality: 'TR', national_id: '', passport_no: '' }
    : { country: 'TR', tax_number: '', registration_number: '' }
}

function deriveEntityKind(config: IdentityGateConfig, formData: Record<string, any>): IdentityEntityKind {
  const rawKind = String(
    formData.master_entity_kind ||
    formData.person_or_entity_type ||
    formData.partner_type ||
    formData.stakeholder_type ||
    formData.owner_kind ||
    ''
  )

  if (formData.organization_id || rawKind === 'organization' || rawKind === 'tuzel_kisi' || rawKind === 'sirket') {
    return config.allowedEntityKinds.includes('organization') ? 'organization' : config.allowedEntityKinds[0] || 'person'
  }

  if (formData.person_id || rawKind === 'person' || rawKind === 'gercek_kisi' || rawKind === 'kisi') {
    return config.allowedEntityKinds.includes('person') ? 'person' : config.allowedEntityKinds[0] || 'person'
  }

  return config.allowedEntityKinds[0] || 'person'
}

function deriveIdentity(kind: IdentityEntityKind, formData: Record<string, any>, previous: Record<string, string>): Record<string, string> {
  if (kind === 'person') {
    const rawIdentity = String(formData.identity_number || formData.tckn_vkn || '')
    const nationalId = String(formData.tc_kimlik || formData.national_id || (/^\d{11}$/.test(rawIdentity) ? rawIdentity : '') || '')
    const passportNo = String(formData.pasaport_no || formData.passport_no || (rawIdentity && !/^\d{11}$/.test(rawIdentity) ? rawIdentity : '') || '')

    return {
      nationality: normalizeCountryId(formData.uyruk || formData.nationality || formData.nationality_country || previous.nationality || 'TR'),
      national_id: nationalId,
      passport_no: passportNo,
      country: previous.country || 'TR',
      tax_number: previous.tax_number || '',
      registration_number: previous.registration_number || '',
    }
  }

  return {
    nationality: previous.nationality || 'TR',
    national_id: previous.national_id || '',
    passport_no: previous.passport_no || '',
    country: normalizeCountryId(formData.country || formData.ulke || formData.nationality_country || previous.country || 'TR'),
    tax_number: String(formData.tax_number || formData.vkn_tckn || formData.identity_number || formData.tckn_vkn || previous.tax_number || ''),
    registration_number: String(formData.registration_number || formData.ticaret_sicil_no || previous.registration_number || ''),
  }
}

function validateIdentity(kind: IdentityEntityKind, identity: Record<string, string>) {
  if (kind === 'person') {
    if (!identity.nationality) return 'Uyruğu zorunludur.'
    const isTurkish = isTurkishNationality(identity.nationality)
    if (isTurkish && !identity.national_id) return 'TC Kimlik No zorunludur.'
    if (!isTurkish && !identity.passport_no) return 'Pasaport No zorunludur.'
    if (isTurkish && identity.national_id.length !== 11) return 'TC Kimlik No 11 haneli olmalıdır.'
    return null
  }

  if (!identity.country) return 'Ülke zorunludur.'
  if (!identity.tax_number) return 'VKN zorunludur.'
  if (identity.tax_number.length !== 10) return 'VKN 10 haneli olmalıdır.'
  return null
}

function normalizeIdentityForSubmit(kind: IdentityEntityKind, identity: Record<string, string>) {
  if (kind === 'person') {
    const nationality = normalizeNationalityInput(identity.nationality)
    const isTurkish = nationality === 'TR'
    return {
      nationality,
      national_id: isTurkish ? identity.national_id || '' : '',
      passport_no: isTurkish ? '' : identity.passport_no || '',
    }
  }

  return {
    country: identity.country || 'TR',
    tax_number: identity.tax_number || '',
    registration_number: '',
  }
}

function normalizeNationalityInput(value?: string) {
  return normalizeCountryId(value)
}

function hasPersonNationality(identity: Record<string, string>) {
  return !!identity.nationality
}

function hasPersonIdentity(identity: Record<string, string>) {
  return isTurkishNationality(identity.nationality)
    ? /^\d{11}$/.test(identity.national_id || '')
    : !!String(identity.passport_no || '').trim()
}

function hasOrganizationCountry(identity: Record<string, string>) {
  return !!String(identity.country || '').trim()
}

function hasOrganizationTaxNumber(identity: Record<string, string>) {
  return /^\d{10}$/.test(identity.tax_number || '')
}

function fieldClass(valid: boolean, touched?: boolean, disabled?: boolean) {
  return cn(
    inputClass,
    !disabled && valid && 'border-emerald-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20',
    !disabled && !valid && 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
  )
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
