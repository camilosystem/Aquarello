import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Lavva Driver',
  description: 'Panel de domiciliario para recogida y entrega de ropa',
  manifest: '/manifest-domiciliario.json', // ¡Aquí está la magia de la marca blanca separada!
}

export const viewport: Viewport = {
  themeColor: '#0891b2',
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