import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Aquarello Driver',
  description: 'Driver panel for laundry pickup and delivery',
  manifest: '/manifest-domiciliario.json', // separate white-label manifest
}

export const viewport: Viewport = {
  themeColor: '#63c91e',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function DomiciliarioLayout({
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