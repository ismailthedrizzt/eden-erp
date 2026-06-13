import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Temalarımız | Eden ERP',
}

export default function DesignLabPage() {
  redirect('/app/development/temalarimiz')
}
