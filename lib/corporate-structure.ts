export interface CorporatePartnerRecord {
  id?: string
  sirket_id?: string
  company_id?: string
  owner_kind?: string
  source_type?: string
  source_id?: string
  display_name?: string
  ortak_adi?: string
  share_ratio?: number | string | null
  hisse_orani?: number | string | null
  voting_ratio?: number | string | null
  profit_ratio?: number | string | null
  has_control_right?: boolean
  control_type?: string | null
  beneficial_owner?: boolean
  is_beneficial_owner?: boolean
  beneficial_ratio?: number | string | null
  is_ultimate_controller?: boolean
  status?: string
  is_deleted?: boolean
}

export interface CorporateCompanyRecord {
  id: string
  ticari_unvan?: string
  kisa_unvan?: string
}

export interface OwnershipGraphNode {
  label: string
  ratio?: number
  kind: 'owner' | 'current' | 'downstream'
}

export interface CorporateStructureResult {
  main_owner: string
  main_owner_id?: string
  ultimate_controller: string
  ultimate_ownership_ratio: number
  is_group_company: boolean
  subsidiary_count: number
  affiliate_count: number
  total_active_share: number
  total_voting_right: number
  warnings: string[]
  ownership_graph: OwnershipGraphNode[]
}

const CONTROL_THRESHOLD = 50

export function calculateCorporateStructure(
  companyId: string | undefined,
  partners: CorporatePartnerRecord[],
  companies: CorporateCompanyRecord[]
): CorporateStructureResult {
  const companyMap = new Map(companies.map((company) => [company.id, company]))
  const activePartners = partners.filter((partner) => isActivePartner(partner) && getCompanyId(partner) === companyId)
  const upstreamMainOwner = findMainOwner(activePartners)
  const downstreamRows = partners.filter((partner) =>
    isActivePartner(partner) &&
    partner.owner_kind === 'tuzel_kisi' &&
    partner.source_type === 'grup_sirketi' &&
    partner.source_id === companyId
  )

  const totalActiveShare = round(activePartners.reduce((sum, partner) => sum + ratio(partner.share_ratio ?? partner.hisse_orani), 0))
  const totalVotingRight = round(activePartners.reduce((sum, partner) => sum + votingPower(partner), 0))
  const warnings: string[] = []

  if (activePartners.length > 0 && totalActiveShare !== 100) warnings.push('Aktif hisse toplamı 100% değil')
  if (activePartners.length > 0 && totalVotingRight !== 100) warnings.push('Toplam oy hakkı 100% değil')

  const controlOwners = activePartners.filter((partner) =>
    partner.has_control_right ||
    ratio(partner.voting_ratio) > CONTROL_THRESHOLD ||
    ratio(partner.share_ratio ?? partner.hisse_orani) > CONTROL_THRESHOLD
  )
  if (controlOwners.length > 1) warnings.push('Birden fazla kontrol sahibi var')
  if (!upstreamMainOwner && activePartners.length > 0) warnings.push('Aktif ana ortak bulunamadı')

  const cycleWarnings = detectCycles(companyId, partners)
  warnings.push(...cycleWarnings)

  const ultimate = resolveUltimateController(upstreamMainOwner, partners, companyMap, new Set([companyId || '']), 100)
  const subsidiaryCount = downstreamRows.filter((partner) => votingPower(partner) > CONTROL_THRESHOLD || ratio(partner.share_ratio ?? partner.hisse_orani) > CONTROL_THRESHOLD || partner.has_control_right).length
  const affiliateCount = downstreamRows.filter((partner) => {
    const ownership = ratio(partner.share_ratio ?? partner.hisse_orani)
    const votes = votingPower(partner)
    return (ownership > 0 || votes > 0) && ownership < CONTROL_THRESHOLD && votes < CONTROL_THRESHOLD && !partner.has_control_right
  }).length
  const currentCompany = companyMap.get(companyId || '')
  const mainOwnerName = upstreamMainOwner ? ownerName(upstreamMainOwner, companyMap) : activePartners.length ? 'Dağınık Ortaklık Yapısı' : '-'

  return {
    main_owner: mainOwnerName,
    main_owner_id: upstreamMainOwner?.source_type === 'grup_sirketi' ? upstreamMainOwner.source_id : undefined,
    ultimate_controller: ultimate.name,
    ultimate_ownership_ratio: ultimate.ratio,
    is_group_company: activePartners.some((partner) => partner.owner_kind === 'tuzel_kisi' && partner.source_type === 'grup_sirketi') || downstreamRows.length > 0,
    subsidiary_count: subsidiaryCount,
    affiliate_count: affiliateCount,
    total_active_share: totalActiveShare,
    total_voting_right: totalVotingRight,
    warnings,
    ownership_graph: buildOwnershipGraph(currentCompany, upstreamMainOwner, downstreamRows, companyMap),
  }
}

function findMainOwner(activePartners: CorporatePartnerRecord[]) {
  const sorted = [...activePartners].sort((a, b) => votingPower(b) - votingPower(a))
  const first = sorted[0]
  if (!first) return undefined
  return votingPower(first) > CONTROL_THRESHOLD || ratio(first.share_ratio ?? first.hisse_orani) > CONTROL_THRESHOLD ? first : undefined
}

function resolveUltimateController(
  owner: CorporatePartnerRecord | undefined,
  partners: CorporatePartnerRecord[],
  companyMap: Map<string, CorporateCompanyRecord>,
  visited: Set<string>,
  accumulatedRatio: number
): { name: string; ratio: number } {
  if (!owner) return { name: '-', ratio: 0 }

  const ownerRatio = votingPower(owner) || ratio(owner.share_ratio ?? owner.hisse_orani)
  const nextRatio = round((accumulatedRatio * ownerRatio) / 100)

  if (owner.is_ultimate_controller || owner.owner_kind !== 'tuzel_kisi' || owner.source_type !== 'grup_sirketi' || !owner.source_id) {
    return { name: ownerName(owner, companyMap), ratio: nextRatio }
  }

  if (visited.has(owner.source_id)) {
    return { name: `${ownerName(owner, companyMap)} (döngü tespit edildi)`, ratio: nextRatio }
  }

  visited.add(owner.source_id)
  const parentPartners = partners.filter((partner) => isActivePartner(partner) && getCompanyId(partner) === owner.source_id)
  const parentMainOwner = findMainOwner(parentPartners)
  return resolveUltimateController(parentMainOwner, partners, companyMap, visited, nextRatio)
}

function detectCycles(companyId: string | undefined, partners: CorporatePartnerRecord[]) {
  if (!companyId) return []
  const edges = partners
    .filter((partner) => isActivePartner(partner) && partner.owner_kind === 'tuzel_kisi' && partner.source_type === 'grup_sirketi' && partner.source_id)
    .map((partner) => ({ from: partner.source_id as string, to: getCompanyId(partner) }))
    .filter((edge) => edge.to)

  const stack = new Set<string>()
  const visited = new Set<string>()

  const visit = (node: string): boolean => {
    if (stack.has(node)) return true
    if (visited.has(node)) return false
    visited.add(node)
    stack.add(node)
    for (const edge of edges.filter((item) => item.from === node)) {
      if (edge.to && visit(edge.to)) return true
    }
    stack.delete(node)
    return false
  }

  return visit(companyId) ? ['Döngüsel ortaklık tespit edildi'] : []
}

function buildOwnershipGraph(
  currentCompany: CorporateCompanyRecord | undefined,
  mainOwner: CorporatePartnerRecord | undefined,
  downstreamRows: CorporatePartnerRecord[],
  companyMap: Map<string, CorporateCompanyRecord>
) {
  const nodes: OwnershipGraphNode[] = []
  if (mainOwner) nodes.push({ label: ownerName(mainOwner, companyMap), ratio: votingPower(mainOwner) || ratio(mainOwner.share_ratio ?? mainOwner.hisse_orani), kind: 'owner' })
  nodes.push({ label: companyName(currentCompany) || 'Seçili Şirket', kind: 'current' })
  downstreamRows.forEach((partner) => {
    const company = companyMap.get(getCompanyId(partner) || '')
    nodes.push({ label: companyName(company) || partner.display_name || 'Bağlı şirket', ratio: votingPower(partner) || ratio(partner.share_ratio ?? partner.hisse_orani), kind: 'downstream' })
  })
  return nodes
}

function isActivePartner(partner: CorporatePartnerRecord) {
  return !partner.is_deleted && partner.status === 'Aktif'
}

function getCompanyId(partner: CorporatePartnerRecord) {
  return partner.sirket_id || partner.company_id
}

function votingPower(partner: CorporatePartnerRecord) {
  return ratio(partner.voting_ratio || partner.share_ratio || partner.hisse_orani)
}

function ratio(value: unknown) {
  const numeric = Number(value || 0)
  return Number.isFinite(numeric) ? numeric : 0
}

function round(value: number) {
  return Math.round(value * 100) / 100
}

function ownerName(partner: CorporatePartnerRecord, companyMap: Map<string, CorporateCompanyRecord>) {
  if (partner.source_type === 'grup_sirketi' && partner.source_id) return companyName(companyMap.get(partner.source_id)) || partner.display_name || partner.ortak_adi || '-'
  return partner.display_name || partner.ortak_adi || '-'
}

function companyName(company?: CorporateCompanyRecord) {
  return company?.ticari_unvan || company?.kisa_unvan || ''
}
