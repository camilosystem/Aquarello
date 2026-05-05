import type { Metadata, Viewport } from "next"
import { NotificationMonitor } from '@/components/operador/notification-monitor'

export const metadata: Metadata = {
  title: "Lavva - Panel de Operadores",
  description: "Sistema de gestión de lavandería para operadores",
}

export const viewport: Viewport = {
  themeColor: "#0891b2",
}

export default function OperadorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <NotificationMonitor />
      {children}
    </>
  )
}
