'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Loader2, Search } from 'lucide-react'
import { AutomationBadge, type AutomationBadgeStatus } from './AutomationBadge'
import { formControlClass } from './formControlStyles'
import type { IdentityEntityKind, IdentityGateConfig, IdentityGateResolveResult, IdentityGateState } from '@/lib/identity-gate'
import { COUNTRY_NATIONALITY_OPTIONS, COUNTRY_OPTIONS, isTurkishNationality, normalizeCountryId } from '@/lib/reference/country-nationalities'

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

type MasterMatchAutomationStatus = AutomationBadgeStatus

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
  const [message, setMessage] = useState('')
  const [warning, setWarning] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<IdentityGateResolveResult | null>(null)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [automationStarted, setAutomationStarted] = useState(false)
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
    setMessage('')
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
    formData.nationality,
    formData.nationality,
    formData.nationality_country,
    formData.national_id,
    formData.national_id,
    formData.identity_number,
    formData.identity_tax_number,
    formData.passport_no,
    formData.passport_no,
    formData.country,
    formData.country,
    formData.tax_number,
    formData.tax_number,
    formData.registration_number,
    formData.trade_registry_number,
  ])

  const updateIdentity = (key: string, value: string) => {
    setIdentity(prev => {
      const next = { ...prev }
      const cleaned = cleanIdentityValue(key, value, entityKind, prev)
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
      setAutomationStarted(false)
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
    setAutomationStarted(false)
    setTouched({})
    onReset()
  }

  const resolveIdentity = async () => {
    setAutomationStarted(true)
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
      setMessage('')
      setError(err instanceof Error ? err.message : 'Kimlik çözümleme başarısız')
    }
  }

  const automationStatus = getMasterMatchAutomationStatus({
    state,
    error,
    lastResult,
    automationStarted,
    entityKind,
    identity,
  })

  return (
    <div className="col-span-2 lg:col-span-3 rounded-xl border border-blue-100 bg-blue-50/70 p-4 dark:border-blue-900/60 dark:bg-blue-950/20">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Temel Kimlik Sorgulama/Oluşturma</h4>
            {mode === 'create' && (
              <AutomationBadge
                status={automationStatus}
                title="Eşleştir butonu master kayıt ve rol kaydı otomasyonunu çalıştırır."
                idleLabel="Veri Bekleniyor"
                inputLabel="Veri Girişi Yapılıyor"
                workingLabel="Sorgulama Yapılıyor"
                doneLabel="Veriler Çekildi"
                noDataLabel="Veri Bulunamadı"
              />
            )}
          </div>
          {message && <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{message}</p>}
        </div>
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
              <SearchableGateSelect
                value={normalizeCountryInput(identity.country)}
                disabled={readOnly}
                options={COUNTRY_OPTIONS}
                placeholder="Yazarak arayın"
                onBlur={() => setTouched(prev => ({ ...prev, country: true }))}
                onChange={(value) => updateIdentity('country', value)}
                className={fieldClass(hasOrganizationCountry(identity), touched.country, readOnly)}
              />
            </Field>
            <Field label="VKN">
              <input
                value={identity.tax_number || ''}
                disabled={readOnly}
                onBlur={() => setTouched(prev => ({ ...prev, tax_number: true }))}
                onChange={(event) => updateIdentity('tax_number', event.target.value)}
                placeholder={isTurkishOrganization(identity.country) ? '10 haneli VKN' : 'Vergi / kayıt no'}
                maxLength={isTurkishOrganization(identity.country) ? 10 : 32}
                inputMode={isTurkishOrganization(identity.country) ? 'numeric' : 'text'}
                className={fieldClass(hasOrganizationTaxNumber(identity), touched.tax_number, readOnly)}
              />
            </Field>
          </>
        )}
      </div>

      {error && <p className="mt-3 text-xs font-medium text-red-600 dark:text-red-400">{error}</p>}
      {warning && <p className="mt-3 text-xs font-medium text-amber-700 dark:text-amber-300">{warning}</p>}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div />
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
      <span className="text-[13px] font-medium leading-5 text-gray-600 dark:text-gray-400">{label}</span>
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
      const q = normalizeSearchableGateText(query)
      return normalizeSearchableGateText(option.label).includes(q) || normalizeSearchableGateText(option.value).includes(q)
    })
    .slice(0, 80)

  useEffect(() => {
    setQuery(selectedLabel)
  }, [selectedLabel])

  const commitIfExactMatch = (text: string) => {
    const normalized = normalizeSearchableGateText(text)
    const exact = options.find(option =>
      normalizeSearchableGateText(option.label) === normalized ||
      normalizeSearchableGateText(option.value) === normalized
    )
    if (exact) {
      setQuery(exact.label)
      onChange(exact.value)
      return
    }

    const prefixMatches = options.filter(option =>
      normalizeSearchableGateText(option.label).startsWith(normalized) ||
      normalizeSearchableGateText(option.value).startsWith(normalized)
    )
    if (normalized && prefixMatches.length === 1) {
      setQuery(prefixMatches[0].label)
      onChange(prefixMatches[0].value)
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
        <div className="absolute left-0 top-full z-[80] mt-1 max-h-64 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
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
              className="block w-full px-3 py-2 text-left text-[13px] leading-5 text-gray-800 hover:bg-blue-50 dark:text-gray-100 dark:hover:bg-blue-950/40"
            >
              {option.label}
            </button>
          )) : (
            <div className="px-3 py-2 text-[13px] leading-5 text-gray-500 dark:text-gray-400">Sonuç bulunamadı</div>
          )}
        </div>
      )}
    </div>
  )
}

function normalizeSearchableGateText(value: unknown) {
  return String(value || '')
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
}

function getMasterMatchAutomationStatus(input: {
  state: IdentityGateState
  error: string | null
  lastResult: IdentityGateResolveResult | null
  automationStarted: boolean
  entityKind: IdentityEntityKind
  identity: Record<string, string>
}): MasterMatchAutomationStatus {
  if (input.state === 'searching_master') return 'working'
  if (input.lastResult) return hasUsefulPrefillData(input.lastResult) ? 'done' : 'no_data'
  if (input.error || hasIdentityInputStarted(input.entityKind, input.identity) || input.automationStarted) return 'input'
  return 'idle'
}

function hasIdentityInputStarted(kind: IdentityEntityKind, identity: Record<string, string>) {
  if (kind === 'person') {
    return !!String(identity.national_id || identity.passport_no || '').trim()
  }

  return !!String(identity.tax_number || identity.registration_number || '').trim()
}

function hasUsefulPrefillData(result: IdentityGateResolveResult) {
  const ignoredKeys = new Set([
    'person_id',
    'organization_id',
    'master_record_id',
    'master_entity_kind',
    'identity_gate_state',
    'nationality',
    'nationality',
    'nationality_country',
    'national_id',
    'national_id',
    'tax_id',
    'identity_number',
    'passport_no',
    'passport_no',
    'stakeholder_type',
    'partner_type',
    'person_or_entity_type',
    'country',
    'country',
    'tax_number',
    'tax_number',
    'trade_registry_number',
    'registration_number',
  ])

  return Object.entries(result.prefill || {}).some(([key, value]) => {
    if (ignoredKeys.has(key)) return false
    if (Array.isArray(value)) return value.length > 0
    if (value && typeof value === 'object') return Object.keys(value).length > 0
    return !!String(value || '').trim()
  })
}

function initialIdentity(kind: IdentityEntityKind): Record<string, string> {
  return kind === 'person'
    ? { nationality: 'TR', national_id: '', passport_no: '' }
    : { country: 'TR', tax_number: '', registration_number: '' }
}

function cleanIdentityValue(
  key: string,
  value: string,
  entityKind: IdentityEntityKind,
  currentIdentity: Record<string, string>
) {
  if (key === 'national_id') return value.replace(/\D/g, '').slice(0, 11)
  if (key === 'tax_number' && entityKind === 'organization') {
    return isTurkishOrganization(currentIdentity.country)
      ? value.replace(/\D/g, '').slice(0, 10)
      : value.replace(/[^A-Za-z0-9 ._/-]/g, '').slice(0, 32).toUpperCase()
  }

  return value
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

  if (formData.organization_id || rawKind === 'organization' || rawKind === 'organization' || rawKind === 'sirket') {
    return config.allowedEntityKinds.includes('organization') ? 'organization' : config.allowedEntityKinds[0] || 'person'
  }

  if (formData.person_id || rawKind === 'person' || rawKind === 'person' || rawKind === 'kisi') {
    return config.allowedEntityKinds.includes('person') ? 'person' : config.allowedEntityKinds[0] || 'person'
  }

  return config.allowedEntityKinds[0] || 'person'
}

function deriveIdentity(kind: IdentityEntityKind, formData: Record<string, any>, previous: Record<string, string>): Record<string, string> {
  if (kind === 'person') {
    const rawIdentity = String(formData.identity_number || formData.identity_tax_number || '')
    const nationalId = String(formData.national_id || formData.national_id || (/^\d{11}$/.test(rawIdentity) ? rawIdentity : '') || '')
    const passportNo = String(formData.passport_no || formData.passport_no || (rawIdentity && !/^\d{11}$/.test(rawIdentity) ? rawIdentity : '') || '')

    return {
      nationality: normalizeCountryId(formData.nationality || formData.nationality || formData.nationality_country || previous.nationality || 'TR'),
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
    country: normalizeCountryId(formData.country || formData.country || formData.nationality_country || previous.country || 'TR'),
    tax_number: String(formData.tax_number || formData.tax_number || formData.identity_number || formData.identity_tax_number || previous.tax_number || ''),
    registration_number: String(formData.registration_number || formData.trade_registry_number || previous.registration_number || ''),
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
  if (isTurkishOrganization(identity.country) && !/^\d{10}$/.test(identity.tax_number)) return 'VKN 10 haneli sayı olmalıdır.'
  if (!isTurkishOrganization(identity.country) && !/^[A-Za-z0-9][A-Za-z0-9 ._/-]{0,31}$/.test(identity.tax_number.trim())) return 'Vergi / kayıt no alfanumerik olmalıdır.'
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

function normalizeCountryInput(value?: string) {
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
  const taxNumber = String(identity.tax_number || '').trim()
  return isTurkishOrganization(identity.country)
    ? /^\d{10}$/.test(taxNumber)
    : /^[A-Za-z0-9][A-Za-z0-9 ._/-]{0,31}$/.test(taxNumber)
}

function isTurkishOrganization(country?: string) {
  return normalizeCountryInput(country || 'TR') === 'TR'
}

function fieldClass(valid: boolean, touched?: boolean, disabled?: boolean) {
  return formControlClass({ state: disabled ? 'neutral' : valid ? 'valid' : 'invalid', size: 'field' })
}

function buildRoleScope(config: IdentityGateConfig, formData: Record<string, any>, explicitScope?: Record<string, unknown>) {
  const scope: Record<string, unknown> = { ...(explicitScope || {}) }
  config.roleScopeFields?.forEach(field => {
    if (formData[field] !== undefined) scope[field] = formData[field]
  })
  if (formData.company_id && scope.company_id === undefined) scope.company_id = formData.company_id
  if (formData.company_id && scope.company_id === undefined) scope.company_id = formData.company_id
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
    ready_for_insert: 'Form active',
    ready_for_edit: 'Hazır',
    blocked_duplicate: 'Duplicate engelli',
  }
  return labels[state]
}
