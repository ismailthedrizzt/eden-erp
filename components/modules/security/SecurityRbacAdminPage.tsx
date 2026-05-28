'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, KeyRound, Loader2, Search, ShieldAlert, ShieldCheck, SlidersHorizontal, Users } from 'lucide-react'
import {
  securityService,
  type AccessSummary,
  type BranchScopeRecord,
  type CompanyScopeRecord,
  type PermissionGroup,
  type PermissionMatrix,
  type PolicyTestResult,
  type RiskLevel,
  type SecurityRole,
  type SecurityUser,
  type UserRoleAssignment,
  type UserScopeResponse,
} from '@/lib/services/security'

type SecurityTab = 'users' | 'roles' | 'matrix' | 'policy'

interface SecurityRbacAdminPageProps {
  initialTab?: SecurityTab
}

export function SecurityRbacAdminPage({ initialTab = 'users' }: SecurityRbacAdminPageProps) {
  const [activeTab, setActiveTab] = useState<SecurityTab>(initialTab)
  const [users, setUsers] = useState<SecurityUser[]>([])
  const [roles, setRoles] = useState<SecurityRole[]>([])
  const [matrix, setMatrix] = useState<PermissionMatrix | null>(null)
  const [summary, setSummary] = useState<AccessSummary | null>(null)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedRoleId, setSelectedRoleId] = useState('')
  const [selectedRolePermissionKeys, setSelectedRolePermissionKeys] = useState<Set<string>>(new Set())
  const [selectedUserRoles, setSelectedUserRoles] = useState<UserRoleAssignment[]>([])
  const [scopes, setScopes] = useState<UserScopeResponse | null>(null)
  const [companyScopeDraft, setCompanyScopeDraft] = useState('')
  const [branchScopeDraft, setBranchScopeDraft] = useState('')
  const [permissionSearch, setPermissionSearch] = useState('')
  const [newRoleKey, setNewRoleKey] = useState('')
  const [newRoleName, setNewRoleName] = useState('')
  const [newRoleRisk, setNewRoleRisk] = useState<RiskLevel>('medium')
  const [policyAction, setPolicyAction] = useState('capital_increase')
  const [policyPermission, setPolicyPermission] = useState('')
  const [policyCompanyId, setPolicyCompanyId] = useState('')
  const [policyResult, setPolicyResult] = useState<PolicyTestResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void loadAll()
  }, [])

  useEffect(() => {
    const role = roles.find(item => item.id === selectedRoleId)
    setSelectedRolePermissionKeys(new Set(role?.permissions || []))
  }, [roles, selectedRoleId])

  async function loadAll() {
    setLoading(true)
    setError(null)
    try {
      const [nextUsers, nextRoles, nextMatrix, nextSummary] = await Promise.all([
        securityService.users(),
        securityService.roles(),
        securityService.matrix(),
        securityService.accessSummary(),
      ])
      setUsers(nextUsers)
      setRoles(nextRoles)
      setMatrix(nextMatrix)
      setSummary(nextSummary)
      setSelectedUserId(prev => prev || nextUsers[0]?.id || '')
      setSelectedRoleId(prev => prev || nextRoles[0]?.id || '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Guvenlik verisi yuklenemedi.')
    } finally {
      setLoading(false)
    }
  }

  async function loadScopes(userId = selectedUserId) {
    if (!userId) return
    setBusy(true)
    setError(null)
    try {
      const [nextScopes, nextRoles] = await Promise.all([
        securityService.userScopes(userId),
        securityService.userRoles(userId),
      ])
      setScopes(nextScopes)
      setSelectedUserRoles(nextRoles)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erisim kapsami getirilemedi.')
    } finally {
      setBusy(false)
    }
  }

  async function assignSelectedRole() {
    if (!selectedUserId || !selectedRoleId) return
    setBusy(true)
    setError(null)
    try {
      await securityService.assignRole(selectedUserId, selectedRoleId)
      await loadAll()
      await loadScopes(selectedUserId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rol atanamadi.')
    } finally {
      setBusy(false)
    }
  }

  async function removeSelectedRole() {
    if (!selectedUserId || !selectedRoleId) return
    setBusy(true)
    setError(null)
    try {
      await securityService.removeRole(selectedUserId, selectedRoleId)
      await loadAll()
      await loadScopes(selectedUserId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rol kaldirilamadi.')
    } finally {
      setBusy(false)
    }
  }

  async function createCustomRole() {
    if (!newRoleKey.trim() || !newRoleName.trim()) return
    setBusy(true)
    setError(null)
    try {
      const role = await securityService.createRole({
        role_key: newRoleKey.trim(),
        role_name: newRoleName.trim(),
        risk_level: newRoleRisk,
        permissions: [],
      })
      setNewRoleKey('')
      setNewRoleName('')
      setNewRoleRisk('medium')
      await loadAll()
      setSelectedRoleId(role.id)
      setActiveTab('roles')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rol olusturulamadi.')
    } finally {
      setBusy(false)
    }
  }

  async function saveSelectedRolePermissions() {
    if (!selectedRoleId) return
    setBusy(true)
    setError(null)
    try {
      await securityService.saveRolePermissions(selectedRoleId, Array.from(selectedRolePermissionKeys), 'Permission matrix UI change')
      await loadAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rol yetkileri kaydedilemedi.')
    } finally {
      setBusy(false)
    }
  }

  async function addCompanyScope() {
    if (!selectedUserId || !companyScopeDraft.trim()) return
    const nextScope: CompanyScopeRecord = {
      company_id: companyScopeDraft.trim(),
      can_view: true,
      can_edit: false,
      can_operate: false,
    }
    const existing = scopes?.company_scopes || []
    setBusy(true)
    setError(null)
    try {
      const updated = await securityService.saveScopes(selectedUserId, [...existing, nextScope], scopes?.branch_scopes || [], 'Company scope UI change')
      setScopes(updated)
      setCompanyScopeDraft('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sirket kapsami kaydedilemedi.')
    } finally {
      setBusy(false)
    }
  }

  async function addBranchScope() {
    if (!selectedUserId || !branchScopeDraft.trim()) return
    const nextScope: BranchScopeRecord = {
      branch_id: branchScopeDraft.trim(),
      can_view: true,
      can_edit: false,
      can_operate: false,
    }
    const existing = scopes?.branch_scopes || []
    setBusy(true)
    setError(null)
    try {
      const updated = await securityService.saveScopes(selectedUserId, scopes?.company_scopes || [], [...existing, nextScope], 'Branch scope UI change')
      setScopes(updated)
      setBranchScopeDraft('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sube kapsami kaydedilemedi.')
    } finally {
      setBusy(false)
    }
  }

  async function toggleCompanyScope(index: number, key: keyof Pick<CompanyScopeRecord, 'can_view' | 'can_edit' | 'can_operate'>) {
    if (!selectedUserId || !scopes) return
    const companyScopes = scopes.company_scopes.map((scope, scopeIndex) => scopeIndex === index ? { ...scope, [key]: !scope[key] } : scope)
    setBusy(true)
    setError(null)
    try {
      setScopes(await securityService.saveScopes(selectedUserId, companyScopes, scopes.branch_scopes, 'Company scope flag UI change'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sirket kapsami guncellenemedi.')
    } finally {
      setBusy(false)
    }
  }

  async function toggleBranchScope(index: number, key: keyof Pick<BranchScopeRecord, 'can_view' | 'can_edit' | 'can_operate'>) {
    if (!selectedUserId || !scopes) return
    const branchScopes = scopes.branch_scopes.map((scope, scopeIndex) => scopeIndex === index ? { ...scope, [key]: !scope[key] } : scope)
    setBusy(true)
    setError(null)
    try {
      setScopes(await securityService.saveScopes(selectedUserId, scopes.company_scopes, branchScopes, 'Branch scope flag UI change'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sube kapsami guncellenemedi.')
    } finally {
      setBusy(false)
    }
  }

  async function runPolicyTest() {
    if (!selectedUserId) return
    setBusy(true)
    setError(null)
    try {
      setPolicyResult(await securityService.policyTest({
        tested_user_id: selectedUserId,
        action_key: policyAction || null,
        permission_key: policyPermission || null,
        company_id: policyCompanyId || null,
        module_key: inferModule(policyPermission, policyAction),
        record_status: 'active',
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Policy test calistirilamadi.')
    } finally {
      setBusy(false)
    }
  }

  const selectedUser = users.find(user => user.id === selectedUserId)
  const selectedRole = roles.find(role => role.id === selectedRoleId)
  const filteredGroups = useMemo(() => filterGroups(matrix?.groups || [], permissionSearch), [matrix, permissionSearch])
  const riskyPermissions = useMemo(() => filteredGroups.flatMap(group => group.permissions).filter(permission => permission.risk_level === 'high' || permission.risk_level === 'critical'), [filteredGroups])

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex w-full max-w-[1700px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-white/10 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-300/20 dark:bg-emerald-400/10 dark:text-emerald-100">
              <ShieldCheck size={14} />
              RBAC / Scope / Policy
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-normal text-slate-950 dark:text-white">Kullanicilar, Roller ve Yetkiler</h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Yetki sadece menu gizleme degildir. Backend permission, scope, modul durumu ve policy kararlarini her kritik islemde uygular; bu ekran yoneticinin bu kararlari anlamasini ve yonetmesini saglar.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-4 xl:min-w-[640px]">
            <HeaderMetric label="Kullanici" value={summary?.users ?? users.length} />
            <HeaderMetric label="Rol" value={summary?.roles ?? roles.length} />
            <HeaderMetric label="Riskli yetki" value={summary?.risky_permissions ?? riskyPermissions.length} tone="amber" />
            <HeaderMetric label="30g red" value={(summary?.permission_denials_30d ?? 0) + (summary?.scope_denials_30d ?? 0)} tone="red" />
          </div>
        </header>

        <nav className="flex gap-2 overflow-x-auto rounded-lg border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-white/[0.03]" aria-label="Guvenlik sekmeleri">
          <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={<Users size={16} />} label="Kullanicilar" />
          <TabButton active={activeTab === 'roles'} onClick={() => setActiveTab('roles')} icon={<ShieldCheck size={16} />} label="Roller" />
          <TabButton active={activeTab === 'matrix'} onClick={() => setActiveTab('matrix')} icon={<KeyRound size={16} />} label="Yetki Matrisi" />
          <TabButton active={activeTab === 'policy'} onClick={() => setActiveTab('policy')} icon={<SlidersHorizontal size={16} />} label="Policy Test" />
        </nav>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-300/20 dark:bg-red-500/10 dark:text-red-200">
            {error}
          </div>
        )}

        {summary?.warnings?.length ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-300/20 dark:bg-amber-400/10 dark:text-amber-100">
            {summary.warnings.map(warning => <p key={warning}>{warning}</p>)}
          </div>
        ) : null}

        {loading ? (
          <div className="grid gap-3 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-36 animate-pulse rounded-lg bg-slate-200 dark:bg-white/10" />)}
          </div>
        ) : (
          <>
            {activeTab === 'users' && (
              <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
                <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                  <SectionHeader title="Kullanicilar" description="Rol, etkin izin ve erisim kapsami ozetleri." />
                  <div className="divide-y divide-slate-100 dark:divide-white/10">
                    {users.map(user => (
                      <button key={user.id} type="button" onClick={() => { setSelectedUserId(user.id); void loadScopes(user.id) }} className={`flex min-h-16 w-full flex-col gap-2 px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-white/[0.05] ${selectedUserId === user.id ? 'bg-emerald-50 dark:bg-emerald-400/10' : ''}`}>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">{user.display_name}</span>
                          <Badge tone={user.status === 'active' ? 'green' : 'slate'}>{user.status}</Badge>
                          {user.role_keys.map(role => <Badge key={role}>{role}</Badge>)}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{user.email || user.auth_user_id || user.id}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{user.company_scope_summary} / {user.branch_scope_summary} / {user.effective_permission_count} etkin izin</p>
                      </button>
                    ))}
                  </div>
                </div>

                <aside className="space-y-4">
                  <Panel title="Kullanici erisimi" description={selectedUser?.display_name || 'Kullanici secin'}>
                    <label className={labelClass}>Rol ata</label>
                    <select value={selectedRoleId} onChange={event => setSelectedRoleId(event.target.value)} className={inputClass}>
                      {roles.map(role => <option key={role.id} value={role.id}>{role.role_name}</option>)}
                    </select>
                    <button type="button" onClick={assignSelectedRole} disabled={busy || !selectedUserId || !selectedRoleId} className={primaryButtonClass}>
                      {busy ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                      Rol Ata
                    </button>
                    <button type="button" onClick={removeSelectedRole} disabled={busy || !selectedUserId || !selectedRoleId} className={secondaryButtonClass}>
                      Secili Rolu Kaldir
                    </button>
                    <div className="space-y-2">
                      {selectedUserRoles.map(role => (
                        <div key={role.id} className="flex items-center justify-between gap-2 rounded-md bg-slate-100 px-3 py-2 text-xs dark:bg-white/10">
                          <span>{role.role_name}</span>
                          <Badge>{role.scope_mode || 'assigned_companies'}</Badge>
                        </div>
                      ))}
                    </div>
                  </Panel>

                  <Panel title="Erisim kapsami" description="Rol tek basina yetmez; sirket/sube kapsami da verilmelidir.">
                    <button type="button" onClick={() => void loadScopes()} disabled={busy || !selectedUserId} className={secondaryButtonClass}>Kapsami Yukle</button>
                    <div className="space-y-2">
                      {scopes?.effective_summary.map(item => <p key={item} className="rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-600 dark:bg-white/10 dark:text-slate-300">{item}</p>)}
                    </div>
                    <ScopeRows
                      title="Sirket kapsamlari"
                      rows={scopes?.company_scopes || []}
                      idKey="company_id"
                      nameKey="company_name"
                      onToggle={toggleCompanyScope}
                    />
                    <label className={labelClass}>Sirket ID ekle</label>
                    <input value={companyScopeDraft} onChange={event => setCompanyScopeDraft(event.target.value)} className={inputClass} placeholder="company uuid" />
                    <button type="button" onClick={addCompanyScope} disabled={busy || !companyScopeDraft.trim()} className={primaryButtonClass}>Sirket Kapsami Ekle</button>
                    <ScopeRows
                      title="Sube kapsamlari"
                      rows={scopes?.branch_scopes || []}
                      idKey="branch_id"
                      nameKey="branch_name"
                      onToggle={toggleBranchScope}
                    />
                    <label className={labelClass}>Sube ID ekle</label>
                    <input value={branchScopeDraft} onChange={event => setBranchScopeDraft(event.target.value)} className={inputClass} placeholder="branch uuid" />
                    <button type="button" onClick={addBranchScope} disabled={busy || !branchScopeDraft.trim()} className={primaryButtonClass}>Sube Kapsami Ekle</button>
                  </Panel>
                </aside>
              </section>
            )}

            {activeTab === 'roles' && (
              <section className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
                <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                  <SectionHeader title="Roller" description="Varsayilan ve ozel rol setleri." />
                  <div className="divide-y divide-slate-100 dark:divide-white/10">
                    {roles.map(role => (
                      <button key={role.id} type="button" onClick={() => setSelectedRoleId(role.id)} className={`flex min-h-16 w-full flex-col gap-2 px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-white/[0.05] ${selectedRoleId === role.id ? 'bg-emerald-50 dark:bg-emerald-400/10' : ''}`}>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">{role.role_name}</span>
                          <RiskBadge risk={role.risk_level} />
                          {role.system_role && <Badge>Sistem</Badge>}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{role.permissions.length} izin / {role.user_count} kullanici / {role.default_scope}</p>
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-slate-100 p-4 dark:border-white/10">
                    <div className="grid gap-3">
                      <label className={labelClass}>Yeni rol anahtari</label>
                      <input value={newRoleKey} onChange={event => setNewRoleKey(event.target.value)} className={inputClass} placeholder="operations_lead" />
                      <label className={labelClass}>Yeni rol adi</label>
                      <input value={newRoleName} onChange={event => setNewRoleName(event.target.value)} className={inputClass} placeholder="Operasyon Lideri" />
                      <label className={labelClass}>Risk</label>
                      <select value={newRoleRisk} onChange={event => setNewRoleRisk(event.target.value as RiskLevel)} className={inputClass}>
                        <option value="low">low</option>
                        <option value="medium">medium</option>
                        <option value="high">high</option>
                        <option value="critical">critical</option>
                      </select>
                      <button type="button" onClick={createCustomRole} disabled={busy || !newRoleKey.trim() || !newRoleName.trim()} className={primaryButtonClass}>
                        {busy ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                        Rol Olustur
                      </button>
                    </div>
                  </div>
                </div>

                <PermissionEditor
                  role={selectedRole}
                  groups={filteredGroups}
                  selectedKeys={selectedRolePermissionKeys}
                  search={permissionSearch}
                  onSearch={setPermissionSearch}
                  onToggle={key => setSelectedRolePermissionKeys(prev => toggleSet(prev, key))}
                  onSave={saveSelectedRolePermissions}
                  busy={busy}
                />
              </section>
            )}

            {activeTab === 'matrix' && (
              <section className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                <SectionHeader title="Permission matrix" description="Modul bazli permission x role gorunumu. Kritik izinler uyariyla isaretlenir." />
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-100 text-xs uppercase text-slate-500 dark:bg-white/5 dark:text-slate-400">
                      <tr>
                        <th className="sticky left-0 z-10 bg-slate-100 px-3 py-3 text-left dark:bg-slate-900">Permission</th>
                        {roles.map(role => <th key={role.id} className="min-w-32 px-3 py-3 text-center">{role.role_name}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                      {filteredGroups.map(group => (
                        group.permissions.map((permission, index) => (
                          <tr key={permission.key}>
                            <td className="sticky left-0 z-10 bg-white px-3 py-3 dark:bg-slate-950">
                              {index === 0 && <p className="mb-1 text-xs font-semibold uppercase text-emerald-600">{group.module_label}</p>}
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-xs">{permission.key}</span>
                                <RiskBadge risk={permission.risk_level} />
                              </div>
                              <p className="mt-1 text-xs text-slate-500">{permission.label}</p>
                            </td>
                            {roles.map(role => <td key={`${role.id}-${permission.key}`} className="px-3 py-3 text-center">{isGranted(role, permission.key) ? <CheckCircle2 className="mx-auto text-emerald-500" size={18} /> : <span className="text-slate-300">-</span>}</td>)}
                          </tr>
                        ))
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {activeTab === 'policy' && (
              <section className="grid gap-4 lg:grid-cols-[420px_minmax(0,1fr)]">
                <Panel title="Bu kullanici ne yapabilir?" description="Admin test araci permission, scope, modul ve kayit durumu nedenlerini ayri ayri gosterir.">
                  <label className={labelClass}>Kullanici</label>
                  <select value={selectedUserId} onChange={event => setSelectedUserId(event.target.value)} className={inputClass}>
                    {users.map(user => <option key={user.id} value={user.id}>{user.display_name}</option>)}
                  </select>
                  <label className={labelClass}>Action</label>
                  <input value={policyAction} onChange={event => setPolicyAction(event.target.value)} className={inputClass} placeholder="capital_increase" />
                  <label className={labelClass}>Permission override</label>
                  <input value={policyPermission} onChange={event => setPolicyPermission(event.target.value)} className={inputClass} placeholder="companies.capitalIncreaseStart" />
                  <label className={labelClass}>Company ID</label>
                  <input value={policyCompanyId} onChange={event => setPolicyCompanyId(event.target.value)} className={inputClass} placeholder="optional company uuid" />
                  <button type="button" onClick={runPolicyTest} disabled={busy || !selectedUserId} className={primaryButtonClass}>
                    {busy ? <Loader2 size={16} className="animate-spin" /> : <SlidersHorizontal size={16} />}
                    Test Et
                  </button>
                </Panel>

                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                  <h2 className="text-base font-semibold">Sonuc</h2>
                  {!policyResult ? (
                    <p className="mt-3 text-sm text-slate-500">Bir kullanici, action ve opsiyonel kayit kapsami secerek test calistirin.</p>
                  ) : (
                    <div className="mt-4 space-y-4">
                      <div className={`rounded-lg border p-4 ${policyResult.allowed ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-300/20 dark:bg-emerald-400/10 dark:text-emerald-100' : 'border-red-200 bg-red-50 text-red-800 dark:border-red-300/20 dark:bg-red-500/10 dark:text-red-100'}`}>
                        <div className="flex items-center gap-2 font-semibold">
                          {policyResult.allowed ? <CheckCircle2 size={18} /> : <ShieldAlert size={18} />}
                          {policyResult.allowed ? 'Allowed' : 'Denied'}
                        </div>
                        <ul className="mt-3 space-y-1 text-sm">
                          {policyResult.reasons.map(reason => <li key={reason}>{reason}</li>)}
                        </ul>
                      </div>
                      <DebugBlock title="Permission" value={policyResult.permission_result} />
                      <DebugBlock title="Scope" value={policyResult.scope_result} />
                      <DebugBlock title="Module / Policy" value={{ module: policyResult.module_result, policy: policyResult.policy_result }} />
                    </div>
                  )}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  )
}

function PermissionEditor({ role, groups, selectedKeys, search, onSearch, onToggle, onSave, busy }: {
  role?: SecurityRole
  groups: PermissionGroup[]
  selectedKeys: Set<string>
  search: string
  onSearch: (value: string) => void
  onToggle: (key: string) => void
  onSave: () => void
  busy: boolean
}) {
  if (!role) return <Panel title="Rol secin" description="Yetki duzenlemek icin rol secin." />
  const locked = role.system_role && role.id.startsWith('default-')
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
      <SectionHeader title={role.role_name} description={`${role.permissions.length} izin / ${role.default_scope}`} />
      <div className="border-b border-slate-100 p-4 dark:border-white/10">
        {locked && (
          <div className="mb-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-300/20 dark:bg-amber-400/10 dark:text-amber-100">
            <AlertTriangle size={16} className="mt-0.5" />
            Varsayilan sistem rolunu DB role kaydi olmadan degistiremezsiniz. Ozel rol olusturup kullaniciya atayin.
          </div>
        )}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-3 text-slate-400" />
          <input value={search} onChange={event => onSearch(event.target.value)} className={`${inputClass} pl-9`} placeholder="Permission ara" />
        </div>
      </div>
      <div className="max-h-[680px] overflow-y-auto p-4">
        {groups.map(group => (
          <details key={group.module_key} open className="mb-3 rounded-lg border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.03]">
            <summary className="cursor-pointer px-3 py-2 text-sm font-semibold">{group.module_label}</summary>
            <div className="divide-y divide-slate-200 dark:divide-white/10">
              {group.permissions.map(permission => (
                <label key={permission.key} className="flex min-h-12 items-start gap-3 px-3 py-2 text-sm">
                  <input type="checkbox" disabled={locked} checked={selectedKeys.has(permission.key)} onChange={() => onToggle(permission.key)} className="mt-1 h-4 w-4 rounded border-slate-300" />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs">{permission.key}</span>
                      <RiskBadge risk={permission.risk_level} />
                    </span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">{permission.label}</span>
                  </span>
                </label>
              ))}
            </div>
          </details>
        ))}
      </div>
      <div className="sticky bottom-0 flex justify-end border-t border-slate-100 bg-white p-4 dark:border-white/10 dark:bg-slate-950">
        <button type="button" onClick={onSave} disabled={locked || busy} className={primaryButtonClass}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
          Yetkileri Kaydet
        </button>
      </div>
    </div>
  )
}

function filterGroups(groups: PermissionGroup[], search: string) {
  const query = search.trim().toLowerCase()
  if (!query) return groups
  return groups
    .map(group => ({ ...group, permissions: group.permissions.filter(permission => `${permission.key} ${permission.label}`.toLowerCase().includes(query)) }))
    .filter(group => group.permissions.length > 0)
}

function toggleSet(source: Set<string>, key: string) {
  const next = new Set(source)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  return next
}

function isGranted(role: SecurityRole, permissionKey: string) {
  return role.permissions.includes('system.admin') || role.permissions.includes(permissionKey)
}

function inferModule(permission: string, action: string) {
  const value = permission || action
  if (value.includes('accounting')) return 'accounting'
  if (value.includes('hr')) return 'hr'
  if (value.includes('branch')) return 'branches'
  if (value.includes('capital') || value.includes('company')) return 'companies'
  if (value.includes('security')) return 'security'
  return undefined
}

function ScopeRows({
  title,
  rows,
  idKey,
  nameKey,
  onToggle,
}: {
  title: string
  rows: Array<CompanyScopeRecord | BranchScopeRecord>
  idKey: 'company_id' | 'branch_id'
  nameKey: 'company_name' | 'branch_name'
  onToggle: (index: number, key: 'can_view' | 'can_edit' | 'can_operate') => void | Promise<void>
}) {
  if (!rows.length) return null
  return (
    <div className="space-y-2">
      <p className={labelClass}>{title}</p>
      {rows.map((row, index) => {
        const id = idKey === 'company_id' ? (row as CompanyScopeRecord).company_id : (row as BranchScopeRecord).branch_id
        const name = nameKey === 'company_name' ? (row as CompanyScopeRecord).company_name : (row as BranchScopeRecord).branch_name
        return (
          <div key={`${id}-${index}`} className="rounded-md border border-slate-200 p-3 dark:border-white/10">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold">{name || id}</span>
              <span className="font-mono text-[10px] text-slate-400">{id}</span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
              {(['can_view', 'can_edit', 'can_operate'] as const).map(key => (
                <label key={key} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-slate-100 px-2 py-1 dark:bg-white/10">
                  <input type="checkbox" checked={Boolean(row[key])} onChange={() => void onToggle(index, key)} />
                  {key === 'can_view' ? 'Gor' : key === 'can_edit' ? 'Duzenle' : 'Islet'}
                </label>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function HeaderMetric({ label, value, tone = 'slate' }: { label: string; value: number; tone?: 'slate' | 'amber' | 'red' }) {
  const toneClass = tone === 'red'
    ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-300/20 dark:bg-red-500/10 dark:text-red-100'
    : tone === 'amber'
      ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-300/20 dark:bg-amber-400/10 dark:text-amber-100'
      : 'border-slate-200 bg-white text-slate-950 dark:border-white/10 dark:bg-white/[0.04] dark:text-white'
  return (
    <div className={`rounded-lg border px-4 py-3 ${toneClass}`}>
      <p className="text-xs opacity-70">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  )
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="border-b border-slate-100 p-4 dark:border-white/10">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{description}</p>
    </div>
  )
}

function Panel({ title, description, children }: { title: string; description: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{description}</p>
      {children && <div className="mt-4 space-y-3">{children}</div>}
    </div>
  )
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button type="button" onClick={onClick} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${active ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10'}`}>
      {icon}
      {label}
    </button>
  )
}

function Badge({ children, tone = 'slate' }: { children: React.ReactNode; tone?: 'slate' | 'green' }) {
  const cls = tone === 'green'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-300/20 dark:bg-emerald-400/10 dark:text-emerald-100'
    : 'border-slate-200 bg-slate-100 text-slate-600 dark:border-white/10 dark:bg-white/10 dark:text-slate-300'
  return <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cls}`}>{children}</span>
}

function RiskBadge({ risk }: { risk: string }) {
  const tone = risk === 'critical' ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-100 dark:border-red-300/20'
    : risk === 'high' ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-400/10 dark:text-amber-100 dark:border-amber-300/20'
      : risk === 'medium' ? 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-400/10 dark:text-sky-100 dark:border-sky-300/20'
      : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-white/10 dark:text-slate-300 dark:border-white/10'
  return <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${tone}`}>{risk}</span>
}

function DebugBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <details className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.03]">
      <summary className="cursor-pointer text-sm font-semibold">{title}</summary>
      <pre className="mt-3 overflow-x-auto text-xs text-slate-600 dark:text-slate-300">{JSON.stringify(value, null, 2)}</pre>
    </details>
  )
}

const labelClass = 'block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400'
const inputClass = 'min-h-11 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:focus:border-emerald-300 dark:focus:ring-emerald-300/20'
const primaryButtonClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50'
const secondaryButtonClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100 dark:hover:bg-white/10'
