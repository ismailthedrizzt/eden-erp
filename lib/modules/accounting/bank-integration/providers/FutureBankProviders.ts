import { GenericBankProvider } from '../GenericBankProvider'

export class GarantiProvider extends GenericBankProvider {
  readonly code = 'garanti'
  readonly displayName = 'Garanti BBVA'
}

export class IsBankasiProvider extends GenericBankProvider {
  readonly code = 'isbankasi'
  readonly displayName = 'İş Bankası'
}

export class AkbankProvider extends GenericBankProvider {
  readonly code = 'akbank'
  readonly displayName = 'Akbank'
}

export class YapiKrediProvider extends GenericBankProvider {
  readonly code = 'yapikredi'
  readonly displayName = 'Yapı Kredi'
}

export class QNBProvider extends GenericBankProvider {
  readonly code = 'qnb'
  readonly displayName = 'QNB'
}

export class ZiraatProvider extends GenericBankProvider {
  readonly code = 'ziraat'
  readonly displayName = 'Ziraat Bankası'
}
