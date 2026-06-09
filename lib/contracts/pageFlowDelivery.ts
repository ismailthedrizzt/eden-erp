export type PageFlowOperationType =
  | 'CRUD'
  | 'lifecycle'
  | 'wizard'
  | 'operation_request'
  | 'report'

export type PageFlowStatus = 'development' | 'preview' | 'live' | 'hidden'

export type PageFlowRisk = 'none' | 'P0' | 'P1' | 'P2'

export interface PageFlowFieldContracts {
  string?: string[]
  number?: string[]
  boolean?: string[]
  date?: string[]
  datetime?: string[]
  uuid?: string[]
  enum?: string[]
  money?: string[]
  percentage?: string[]
  jsonb?: string[]
  nullable?: string[]
  optional?: string[]
  array?: string[]
}

export interface PageFlowContract {
  id: string
  pageName: string
  route: string
  module: string
  entity: string
  operationType: PageFlowOperationType
  backendEndpoints: string[]
  bffRoutes: string[]
  tables: string[]
  frontendSchemas: string[]
  backendSchemas: string[]
  responseSchemas: string[]
  generatedClient: string
  serviceCommands: string[]
  repositoryMethods: string[]
  fieldContracts: PageFlowFieldContracts
  risks: {
    dateTime: string
    uuid: string
    enum: string
    rawDict: string
  }
  tests: {
    backend: string[]
    frontend: string[]
    e2e: string[]
  }
  status: PageFlowStatus
  requiredFixes: string[]
}

export const PAGE_FLOW_DELIVERY_CONTRACT_VERSION = '1.0.0'

export const PAGE_FLOW_REQUIRED_CHECKLIST = [
  'Page contract olusturuldu',
  'Route tanimlandi',
  'Smart List / Form / Wizard standardina uyuldu',
  'Frontend Zod schema yazildi',
  'Backend Pydantic request model yazildi',
  'OpenAPI contract guncellendi',
  'Generated TS client guncellendi',
  "Next BFF payload contract'i koruyor",
  'Date/datetime alanlari normalize ediliyor',
  'UUID alanlari validate ediliyor',
  'Enum alanlari canonical value kullaniyor',
  'Service layer raw dict kullanmiyor',
  "Repository DB'ye typed/normalized data gonderiyor",
  'Operation request payload typed schema ile dogrulaniyor',
  'Kullanici hata mesaji var',
  'Log correlation id var',
  'Backend valid payload testi var',
  'Backend invalid payload testleri var',
  'Frontend validation testi var',
  'E2E happy path testi var',
  'Build/typecheck/lint geciyor',
] as const
