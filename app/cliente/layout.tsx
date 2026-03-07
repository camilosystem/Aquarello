import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Lavva - Cliente',
  description: 'Solicita tu servicio de lavandería a domicilio',
}

export const viewport: Viewport = {
  themeColor: '#0891b2',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function ClienteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  )
}
