"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import Image from "next/image"
import {
  LayoutDashboard,
  ClipboardList,
  WashingMachine,
  Package,
  Users,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { useState } from "react"

const navItems = [
  { title: "Dashboard",    href: "/operador",             icon: LayoutDashboard },
  { title: "Tickets",      href: "/operador/tickets",     icon: ClipboardList },
  { title: "Lavadoras",    href: "/operador/lavadoras",   icon: WashingMachine },
  { title: "Inventario",   href: "/operador/inventario",  icon: Package },
  { title: "Equipo",       href: "/operador/equipo",      icon: Users },
  { title: "Reportes",     href: "/operador/reportes",    icon: BarChart3 },
  { title: "Configuracion",href: "/operador/configuracion",icon: Settings },
]

interface SidebarProps {
  user?: any
  currentPath?: string
}

export function Sidebar({ user, currentPath }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const supabase = createClient()

  const activePath = currentPath || pathname

  async function handleLogout() {
    if (supabase) await supabase.auth.signOut()
    router.push("/operador/login")
  }

  return (
    <aside
      className={cn(
        "flex flex-col bg-sidebar border-r border-sidebar-border h-screen sticky top-0 transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 p-4 h-16 border-b border-sidebar-border">
        {collapsed ? (
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">L</span>
          </div>
        ) : (
          <Image
            src="/logo-lavva.png"
            alt="Lavva"
            width={100}
            height={40}
            className="h-12 w-auto"
          />
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = activePath === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-white"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                  collapsed && "justify-center px-2"
                )}
                title={collapsed ? item.title : undefined}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>{item.title}</span>}
              </Link>
            )
          })}
        </nav>
      </ScrollArea>

      <Separator />

      {/* User & Logout */}
      <div className="p-3">
        {!collapsed && user && (
          <div className="mb-3 px-3 py-2 bg-sidebar-accent rounded-lg">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{user.email}</p>
            <p className="text-xs text-sidebar-foreground/60 capitalize">{user.role || "Operador"}</p>
          </div>
        )}

        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start text-sidebar-foreground/70 hover:text-red-400 hover:bg-sidebar-accent",
            collapsed && "justify-center px-2"
          )}
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && <span className="ml-3">Cerrar Sesion</span>}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-2"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span className="text-xs">Colapsar</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  )
}
