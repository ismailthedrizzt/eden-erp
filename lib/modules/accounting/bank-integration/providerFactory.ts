import type { BankProvider } from './BankProvider'
import { GenericBankProvider } from './GenericBankProvider'
import { AkbankProvider, GarantiProvider, IsBankasiProvider, QNBProvider, YapiKrediProvider, ZiraatProvider } from './providers/FutureBankProviders'

export function createBankProvider(providerCode: string): BankProvider {
  const normalized = providerCode.toLowerCase()

  switch (normalized) {
    case 'generic':
      return new GenericBankProvider()
    case 'garanti':
      return new GarantiProvider()
    case 'isbankasi':
      return new IsBankasiProvider()
    case 'akbank':
      return new AkbankProvider()
    case 'yapikredi':
      return new YapiKrediProvider()
    case 'qnb':
      return new QNBProvider()
    case 'ziraat':
      return new ZiraatProvider()
    default:
      throw new Error(`Unsupported bank provider: ${providerCode}`)
  }
}
