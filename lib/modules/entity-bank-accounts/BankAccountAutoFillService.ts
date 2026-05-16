import { getCountryLabel, normalizeCountryId } from '@/lib/reference/country-nationalities'
import { getIbanBankInfo, resolveTurkishIban } from '@/lib/utils'
import type { BankAccountFormPriorityMode, EntityBankAccountKind } from './entityBankAccounts.types'

type MasterRecord = Record<string, any> | null

export type BankAccountSuggestion = {
  values: Record<string, any>
  sources: Record<string, string>
  priorityMode?: BankAccountFormPriorityMode
  isValidIban?: boolean
  isValidSwift?: boolean
}

export class BankAccountAutoFillService {
  static getPriorityMode(master: MasterRecord): BankAccountFormPriorityMode {
    const country = normalizeCountryId(master?.country || master?.ulke || master?.nationality_country || '')
    if (!country) return 'unknown_country'
    return country === 'TR' ? 'tr_priority' : 'international_priority'
  }

  static getMasterName(kind: EntityBankAccountKind, master: MasterRecord) {
    if (!master) return ''
    if (kind === 'person') {
      return master.full_name || [master.first_name, master.last_name].filter(Boolean).join(' ') || master.display_name || ''
    }
    return master.legal_name || master.trade_name || master.ticari_unvan || master.display_name || master.short_name || ''
  }

  static getMasterCountry(master: MasterRecord) {
    return normalizeCountryId(master?.country || master?.ulke || master?.nationality_country || '') || ''
  }

  static applyIban(input: Record<string, any>, previous: Record<string, any> = {}): BankAccountSuggestion {
    const values: Record<string, any> = {}
    const sources: Record<string, string> = {}
    const iban = String(input.iban || '').replace(/\s/g, '').toUpperCase()
    if (!iban) return { values, sources, isValidIban: false }
    const previousIban = String(previous.iban || '').replace(/\s/g, '').toUpperCase()
    const forceIbanDerivedFields = !!iban && iban !== previousIban

    const ibanCountry = iban.slice(0, 2)
    if (/^[A-Z]{2}$/.test(ibanCountry)) {
      setIfFresh(values, sources, previous, 'account_country', ibanCountry, 'iban.country')
      setIfFresh(values, sources, previous, 'bank_country', ibanCountry, 'iban.country')
    }

    const bankInfo = getIbanBankInfo(iban)
    if (bankInfo) {
      setIfFresh(values, sources, previous, 'bank_code', bankInfo.bankCode, 'iban.bankCode', forceIbanDerivedFields)
      if (bankInfo.bankName !== 'Bilinmeyen Banka') setIfFresh(values, sources, previous, 'bank_name', bankInfo.bankName, 'iban.bankCode', forceIbanDerivedFields)
      if (bankInfo.swiftCode) setIfFresh(values, sources, previous, 'swift_bic', bankInfo.swiftCode, 'bankReference.swift', forceIbanDerivedFields)
      if (bankInfo.branchCode) setIfFresh(values, sources, previous, 'branch_code', bankInfo.branchCode, 'iban.branchCode', forceIbanDerivedFields)
      if (bankInfo.branchName) setIfFresh(values, sources, previous, 'branch_name', bankInfo.branchName, 'iban.branchCode', forceIbanDerivedFields)
    }

    const tr = resolveTurkishIban(iban)
    if (tr) {
      setIfFresh(values, sources, previous, 'iban', formatIban(iban), 'iban.input')
      setIfFresh(values, sources, previous, 'account_number', tr.accountNo, 'iban.accountNo', forceIbanDerivedFields)
      setIfFresh(values, sources, previous, 'bank_code', tr.bankCode, 'iban.bankCode', forceIbanDerivedFields)
      if (tr.bankName !== 'Bilinmeyen Banka') setIfFresh(values, sources, previous, 'bank_name', tr.bankName, 'iban.bankCode', forceIbanDerivedFields)
      if (tr.branchCode) setIfFresh(values, sources, previous, 'branch_code', tr.branchCode, 'iban.branchCode', forceIbanDerivedFields)
      if (tr.branchName) setIfFresh(values, sources, previous, 'branch_name', tr.branchName, 'iban.branchCode', forceIbanDerivedFields)
      if (tr.swiftCode) setIfFresh(values, sources, previous, 'swift_bic', tr.swiftCode, 'bankReference.swift', forceIbanDerivedFields)
      setIfFresh(values, sources, previous, 'account_country', 'TR', 'iban.country', forceIbanDerivedFields)
      setIfFresh(values, sources, previous, 'bank_country', 'TR', 'iban.country', forceIbanDerivedFields)
      return { values, sources, isValidIban: true }
    }

    const isStructurallyValid = isValidIbanFormat(iban)
    if (isStructurallyValid) setIfFresh(values, sources, previous, 'iban', formatIban(iban), 'iban.input')
    return { values, sources, isValidIban: isStructurallyValid }
  }

  static validateSwift(swift: string): BankAccountSuggestion {
    const clean = swift.replace(/\s/g, '').toUpperCase()
    const isValidSwift = /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(clean)
    const values: Record<string, any> = {}
    const sources: Record<string, string> = {}
    if (isValidSwift) {
      values.swift_bic = clean
      sources.swift_bic = 'swift.format'
      values.bank_country = clean.slice(4, 6)
      sources.bank_country = 'swift.country'
    }
    return { values, sources, isValidSwift }
  }

  static buildDefaults(kind: EntityBankAccountKind, master: MasterRecord) {
    const country = this.getMasterCountry(master)
    return {
      beneficiary_name: this.getMasterName(kind, master),
      is_same_as_master_name: true,
      account_country: country,
      bank_country: country,
      preferred_currency: country === 'TR' ? 'TRY' : '',
      verification_status: 'unverified',
      status: 'active',
      has_intermediary_bank: false,
      priorityMode: this.getPriorityMode(master),
      countryLabel: country ? getCountryLabel(country) : '',
    }
  }
}

function setIfFresh(
  values: Record<string, any>,
  sources: Record<string, string>,
  previous: Record<string, any>,
  field: string,
  value: any,
  source: string,
  force = false
) {
  const current = String(previous[field] || '').trim()
  if (force || !current || current === String(value || '').trim()) {
    values[field] = value
    sources[field] = source
  }
}

function formatIban(iban: string) {
  return iban.replace(/(.{4})/g, '$1 ').trim()
}

function isValidIbanFormat(value: string) {
  return /^[A-Z]{2}\d{2}[A-Z0-9]{8,30}$/.test(value)
}
