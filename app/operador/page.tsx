'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/operador/sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ClipboardList, Shirt, Package, Clock,
  CheckCircle2, AlertCircle, TrendingUp, Users, Plus,
  Droplets, Wind, Sparkles, Bike
} from 'lucide-react'
import { PWAInstallButton } from '@/components/pwa-install-button'
import { STATUS_LABELS, STATUS_COLORS, type Order, type Profile } from '@/lib/types'

interface DashboardStats {
  pendientes: number    // pendiente + recogido + en_deposito
  enPlanta: number      // en_transito_lavado (llegaron a la planta, aún no lavando)
  lavando: number       // en_lavado
  secando: number       // en_secado
  alistando: number     // en_alistamiento
  listos: number        // listo
  enRuta: number        // en_ruta_entrega
  entregados: number    // entregado (hoy)
  todayOrders: number
  weeklyOrders: number
}

export default function OperadorDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState<DashboardStats>({
    pendientes: 0, enPlanta: 0, lavando: 0, secando: 0,
    alistando: 0, listos: 0, enRuta: 0, entregados: 0,
    todayOrders: 0, weeklyOrders: 0,
  })
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const loadData = async () => {
      if (!supabase) { router.push('/operador/login'); return }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/operador/login'); return }
      setCurrentUser(user)

      const { data: profileData } = await supabase
        .from('profiles').select('*').eq('id', user.id).single()

      if (profileData && profileData.role !== 'operador' && profileData.role !== 'admin') {
        router.push('/operador/login'); return
      }
      setProfile(profileData)

      // ── Conteos por estado (sin traer filas, solo cuenta) ────────────────
      const countByStatus = async (statuses: string[]) => {
        const { count } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .in('status', statuses)
        return count ?? 0
      }

      const today = new Date(); today.setHours(0, 0, 0, 0)
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)

      const [
        pendientes, enPlanta, lavando, secando,
        alistando, listos, enRuta,
        { count: entregadosHoy },
        { count: todayCount },
        { count: weekCount },
      ] = await Promise.all([
        countByStatus(['pendiente', 'recogido', 'en_deposito']),
        countByStatus(['en_transito_lavado', 'en_transito']),
        countByStatus(['en_lavado']),
        countByStatus(['en_secado']),
        countByStatus(['en_alistamiento']),
        countByStatus(['listo']),
        countByStatus(['en_ruta_entrega']),
        supabase.from('orders').select('*', { count: 'exact', head: true })
          .eq('status', 'entregado')
          .gte('updated_at', today.toISOString()),
        supabase.from('orders').select('*', { count: 'exact', head: true })
          .gte('created_at', today.toISOString()),
        supabase.from('orders').select('*', { count: 'exact', head: true })
          .gte('created_at', weekAgo.toISOString()),
      ])

      setStats({
        pendientes, enPlanta, lavando, secando,
        alistando, listos, enRuta,
        entregados: entregadosHoy ?? 0,
        todayOrders: todayCount ?? 0,
        weeklyOrders: weekCount ?? 0,
      })

      // ── Órdenes recientes ─────────────────────────────────────────────────
      const { data: recent } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(8)

      if (recent) setRecentOrders(recent as Order[])
      setLoading(false)
    }

    loadData()
  }, [router, supabase])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    )
  }

  const STAT_CARDS = [
    { label: 'Pendientes',   value: stats.pendientes, icon: Clock,        bg: 'bg-yellow-100', color: 'text-yellow-600' },
    { label: 'En Planta',    value: stats.enPlanta,   icon: Package,      bg: 'bg-indigo-100', color: 'text-indigo-600' },
    { label: 'Lavando',      value: stats.lavando,    icon: Droplets,     bg: 'bg-cyan-100',   color: 'text-cyan-600'   },
    { label: 'Secando',      value: stats.secando,    icon: Wind,         bg: 'bg-orange-100', color: 'text-orange-600' },
    { label: 'Alistando',    value: stats.alistando,  icon: Sparkles,     bg: 'bg-pink-100',   color: 'text-pink-600'   },
    { label: 'Listos',       value: stats.listos,     icon: CheckCircle2, bg: 'bg-green-100',  color: 'text-green-600'  },
    { label: 'En Ruta',      value: stats.enRuta,     icon: Bike,         bg: 'bg-emerald-100',color: 'text-emerald-600'},
    { label: 'Entregados Hoy', value: stats.entregados, icon: Shirt,      bg: 'bg-primary/10', color: 'text-primary'    },
  ]

  return (
    <div className="flex min-h-screen bg-muted/30">
      <Sidebar user={currentUser} />

      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Panel de Operadores</h1>
              <p className="text-muted-foreground">Bienvenido, {profile?.full_name || 'Operador'}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <PWAInstallButton variant="outline" size="sm" />
              <Button variant="outline" onClick={() => router.push('/operador/tickets')}>
                <ClipboardList className="mr-2 h-4 w-4" /> Ver Tickets
              </Button>
              <Button onClick={() => router.push('/operador/nueva-orden')}>
                <Plus className="mr-2 h-4 w-4" /> Nueva Orden
              </Button>
            </div>
          </div>

          {/* Stats de estado — 4 columnas en desktop */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {STAT_CARDS.map(s => (
              <Card key={s.label}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full shrink-0 ${s.bg}`}>
                      <s.icon className={`h-5 w-5 ${s.color}`} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                      <p className="text-2xl font-bold">{s.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Volumen */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10 shrink-0">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pedidos Hoy</p>
                  <p className="text-2xl font-bold">{stats.todayOrders}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-full bg-accent/20 shrink-0">
                  <TrendingUp className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Esta Semana</p>
                  <p className="text-2xl font-bold">{stats.weeklyOrders}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-full bg-purple-100 shrink-0">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Operador</p>
                  <p className="font-semibold truncate">{profile?.full_name || 'N/A'}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Órdenes recientes */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Órdenes Recientes</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => router.push('/operador/tickets')}>
                Ver todas
              </Button>
            </CardHeader>
            <CardContent>
              {recentOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p>No hay órdenes aún</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentOrders.map(order => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/operador/tickets/${order.id}`)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Shirt className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-mono text-sm font-medium truncate">{order.qr_code}</p>
                          <p className="text-xs text-muted-foreground">
                            {order.walk_in_name ?? 'Cliente'} ·{' '}
                            {new Date(order.created_at).toLocaleDateString('es-CO')}
                          </p>
                        </div>
                      </div>
                      <Badge className={`shrink-0 ml-2 ${STATUS_COLORS[order.status as keyof typeof STATUS_COLORS] ?? 'bg-muted text-muted-foreground'}`}>
                        {STATUS_LABELS[order.status as keyof typeof STATUS_LABELS] ?? order.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Acciones rápidas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Gestionar Tickets', icon: ClipboardList, href: '/operador/tickets' },
              { label: 'Inventario',         icon: Package,      href: '/operador/inventario' },
              { label: 'Lavadoras',          icon: Shirt,        href: '/operador/lavadoras' },
              { label: 'Equipo',             icon: Users,        href: '/operador/equipo' },
            ].map(a => (
              <Button
                key={a.label}
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2"
                onClick={() => router.push(a.href)}
              >
                <a.icon className="h-6 w-6" />
                <span className="text-xs text-center">{a.label}</span>
              </Button>
            ))}
          </div>

        </div>
      </main>
    </div>
  )
}
