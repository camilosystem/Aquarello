import type { Metadata, Viewport } from "next"
import { NotificationMonitor } from '@/components/operador/notification-monitor'

export const metadata: Metadata = {
  title: "Aquarello - Operator Panel",
  description: "Laundry management system for operators",
}

export const viewport: Viewport = {
  themeColor: "#63c91e",
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
