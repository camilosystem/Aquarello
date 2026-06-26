import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Aquarello - Client',
  description: 'Request your laundry pickup and delivery service',
}

export const viewport: Viewport = {
  themeColor: '#63c91e',
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
