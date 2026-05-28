import type { ModuleContract } from '../moduleContract.types'

export const accountingModule: ModuleContract = {
  key: 'accounting',
  name: 'Muhasebe',
  description: 'Cari kart, cari hareket, odeme/tahsilat ve mutabakat temeli.',
  domain: 'finance',
  category: 'operations',
  version: '2026-05-28.1',
  status: 'active',
  defaultEnabled: true,
  licenseRequired: true,
  setupRequired: true,
  dependencies: [{ moduleKey: 'companies', required: true, reason: 'Cari hareketler sirket kapsaminda tutulur.' }],
  entities: [
    { key: 'accounting_cari_account', tableName: 'accounting_cari_accounts', displayName: 'Cari kart', draftSupported: true },
    { key: 'accounting_cari_transaction', tableName: 'accounting_cari_transactions', displayName: 'Cari hareket', draftSupported: true },
    { key: 'bank_account', tableName: 'bank_accounts', displayName: 'Banka hesabi', draftSupported: true },
  ],
  routes: [
    { path: '/app/muhasebe', type: 'page', permission: 'accounting.view' },
    { path: '/app/muhasebe/cari-kartlar', type: 'page', permission: 'accounting.view' },
    { path: '/app/muhasebe/cari-hareketler', type: 'page', permission: 'accounting.view' },
  ],
  menus: [
    { label: 'Muhasebe', path: '/app/muhasebe', icon: 'CreditCard', order: 100, permission: 'accounting.view' },
    { label: 'Cari Kartlar', path: '/app/muhasebe/cari-kartlar', icon: 'WalletCards', parent: 'Muhasebe', order: 101, permission: 'accounting.view', featureFlag: 'accounting.cariAccounts' },
    { label: 'Cari Hareketler', path: '/app/muhasebe/cari-hareketler', icon: 'FileText', parent: 'Muhasebe', order: 102, permission: 'accounting.view', featureFlag: 'accounting.cariTransactions' },
  ],
  permissions: [
    { key: 'accounting.view', label: 'Muhasebe goruntuleme' },
    { key: 'accounting.edit', label: 'Muhasebe duzenleme' },
    { key: 'accounting.transactionCreate', label: 'Cari hareket olusturma', fallback: ['accounting.edit'] },
    { key: 'accounting.transactionApprove', label: 'Cari hareket onaylama', fallback: ['accounting.edit'] },
    { key: 'accounting.reconcile', label: 'Mutabakat yapma', fallback: ['accounting.edit'] },
    { key: 'accounting.export', label: 'Muhasebe disari aktarma', fallback: ['accounting.view'] },
  ],
  actions: [
    { key: 'create_cari_account', label: 'Cari kart olustur', actionType: 'create_draft', targetPage: '/app/muhasebe/cari-kartlar', permission: 'accounting.edit' },
    { key: 'create_cari_transaction', label: 'Cari hareket olustur', actionType: 'create_draft', targetPage: '/app/muhasebe/cari-hareketler', permission: 'accounting.transactionCreate' },
    { key: 'reconcile_transaction', label: 'Cari hareket mutabakati', actionType: 'operation', targetPage: '/app/muhasebe/cari-hareketler', permission: 'accounting.reconcile' },
    { key: 'cancel_transaction', label: 'Cari hareket iptali', actionType: 'operation', targetPage: '/app/muhasebe/cari-hareketler', permission: 'accounting.edit' },
  ],
  projections: [
    { key: 'cari_accounts', projectionKey: 'accounting_cari_accounts', required: false },
    { key: 'cari_transactions', projectionKey: 'accounting_cari_transactions', required: false },
  ],
  featureFlags: [
    { key: 'accounting.enabled', label: 'Muhasebe aktif', defaultEnabled: true },
    { key: 'accounting.cariAccounts', label: 'Cari Kartlar', defaultEnabled: true },
    { key: 'accounting.cariTransactions', label: 'Cari Hareketler', defaultEnabled: true },
    { key: 'accounting.bankReconciliation', label: 'Banka mutabakati', defaultEnabled: false },
    { key: 'accounting.invoiceMatching', label: 'Fatura eslestirme', defaultEnabled: false },
    { key: 'accounting.capitalReconciliation', label: 'Sermaye mutabakati', defaultEnabled: false },
  ],
  events: [],
}
