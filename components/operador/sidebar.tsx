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
  ShoppingCart,
  ShoppingBag,
  Users,
  UserCircle2,
  Bike,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { useState, useEffect } from "react"
import { DEFAULT_NAV_VISIBILITY, type NavVisibility } from "@/app/operador/configuracion/settings"

const NAV_ITEMS = [
  { key: "dashboard",  title: "Dashboard",  href: "/operador",               icon: LayoutDashboard },
  { key: "pos",        title: "POS Drop-Off", href: "/operador/pos",         icon: ShoppingBag },
  { key: "tickets",    title: "Tickets",    href: "/operador/tickets",       icon: ClipboardList },
  { key: "machines",   title: "Machines",   href: "/operador/lavadoras",     icon: WashingMachine },
  { key: "inventory",  title: "Inventory",  href: "/operador/inventario",    icon: Package },
  { key: "purchases",  title: "Purchases",  href: "/operador/compras",       icon: ShoppingCart },
  { key: "customers",  title: "Customers",  href: "/operador/clientes",      icon: UserCircle2 },
  { key: "drivers",    title: "Drivers",    href: "/operador/domiciliarios", icon: Bike },
  { key: "team",       title: "Team",       href: "/operador/equipo",        icon: Users },
  { key: "reports",    title: "Reports",    href: "/operador/reportes",      icon: BarChart3 },
  { key: "settings",   title: "Settings",   href: "/operador/configuracion", icon: Settings },
] as const

interface SidebarProps {
  user?: any
  currentPath?: string
}

export function Sidebar({ user, currentPath }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [navVisibility, setNavVisibility] = useState<NavVisibility>(DEFAULT_NAV_VISIBILITY)
  const supabase = createClient()

  const activePath = currentPath || pathname

  useEffect(() => {
    if (!supabase) return
    const load = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return

      const [profileRes, settingsRes] = await Promise.all([
        supabase.from('profiles').select('role').eq('id', authUser.id).single(),
        supabase.from('app_settings').select('nav_visibility').eq('id', '00000000-0000-0000-0000-000000000001').single(),
      ])

      if (profileRes.data?.role) setUserRole(profileRes.data.role)
      if (settingsRes.data?.nav_visibility) {
        setNavVisibility({ ...DEFAULT_NAV_VISIBILITY, ...settingsRes.data.nav_visibility })
      }
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleLogout() {
    if (supabase) await supabase.auth.signOut()
    router.push("/operador/login")
  }

  const visibleItems = NAV_ITEMS.filter(item => {
    if (item.key === 'settings') return userRole === 'admin'
    return navVisibility[item.key as keyof NavVisibility] !== false
  })

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
            <span className="text-primary-foreground font-bold text-sm">A</span>
          </div>
        ) : (
          <Image
            src="/AquaLogoWhite.png"
            alt="Aquarello"
            width={228}
            height={101}
            className="h-12 w-auto"
          />
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {visibleItems.map((item) => {
            const isActive = activePath === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
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
            <p className="text-xs text-sidebar-foreground/60 capitalize">{userRole || user.role || "Operator"}</p>
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
          {!collapsed && <span className="ml-3">Sign Out</span>}
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
              <span className="text-xs">Collapse</span>
            </>
          )}
        </Button>

        {!collapsed && (
          <div className="mt-3 px-3 text-center text-xs text-sidebar-foreground/50 space-y-0.5">
            <p>8201 Northern Blvd, Jackson Heights, NY 11372</p>
            <p>(718) 433-9631 &middot; aquarelonyc@gmail.com</p>
          </div>
        )}
      </div>
    </aside>
  )
}
