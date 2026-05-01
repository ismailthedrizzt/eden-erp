import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Tailwind class birleştirici
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Para birimi formatlama (TR Lirası)
export function formatTRY(amount: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(amount)
}

// Tarih formatlama (GG.AA.YYYY)
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-')
  return `${d}.${m}.${y}`
}

// ISO tarih → input[type=date] formatı
export function toInputDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  return dateStr.split('T')[0]
}

// İsim baş harfleri avatar
export function initials(ad: string, soyad?: string): string {
  const a = ad?.[0]?.toUpperCase() ?? ''
  const s = soyad?.[0]?.toUpperCase() ?? ''
  return a + s
}

// Türkçe slug (URL safe)
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
    .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// IBAN'dan banka adı çıkarma (Türkiye)
const IBAN_BANKS: Record<string, string> = {
  '00062': 'Garanti BBVA',
  '00067': 'Yapı Kredi',
  '00064': 'İş Bankası',
  '00046': 'Akbank',
  '00015': 'Ziraat Bankası',
  '00012': 'Halkbank',
  '00032': 'TEB',
  '00111': 'QNB Finansbank',
  '00099': 'ING Bank',
  '10003': 'Enpara (QNB)',
}

export function ibanToBanka(iban: string): string {
  const clean = iban.replace(/\s/g, '')
  if (!clean.startsWith('TR') || clean.length < 10) return ''
  const code = clean.substring(4, 9)
  return IBAN_BANKS[code] ?? 'Bilinmeyen Banka'
}

// Renk paleti - proje etiketleri
export const PROJE_RENKLERI: Record<string, { bg: string; text: string }> = {
  PG:       { bg: '#d1fae5', text: '#065f46' },
  EPIRB:    { bg: '#fef3c7', text: '#78350f' },
  'İdari':  { bg: '#dbeafe', text: '#1e3a8a' },
  Sermaye:  { bg: '#ede9fe', text: '#4c1d95' },
  Aktarım:  { bg: '#f3f4f6', text: '#374151' },
  Finansal: { bg: '#ffedd5', text: '#7c2d12' },
  Destek:   { bg: '#dcfce7', text: '#14532d' },
  'Yatırım':{ bg: '#fff7ed', text: '#7c2d12' },
  Otel:     { bg: '#fce7f3', text: '#831843' },
}

export const PROJE_GRAFIK_RENKLERI: Record<string, string> = {
  PG: '#0e8c61', EPIRB: '#d97706', 'İdari': '#2563eb',
  Sermaye: '#7c3aed', Aktarım: '#6b7280', Finansal: '#ea580c',
  Destek: '#16a34a', 'Yatırım': '#c2410c', Otel: '#db2777',
}

export const TARAF_RENKLERI: Record<string, string> = {
  Eden: '#216688', 'İsmail ILGAR': '#c49a10', Canberk: '#7c3aed', Ergün: '#6b7280',
}

// Dosya boyutunu formatlama (KB, MB, GB)
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}
