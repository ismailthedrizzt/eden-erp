import type { Metadata } from 'next'
import { PortalLayoutShell } from '@/components/portal/CustomerPortalWorkspace'

export const metadata: Metadata = {
  title: 'Musteri Portali | Eden ERP',
  description: 'Eden ERP musteri self-service portali',
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <PortalLayoutShell>{children}</PortalLayoutShell>
}

