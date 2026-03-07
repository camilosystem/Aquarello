'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/operador/sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ClipboardList, 
  Shirt, 
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Users
} from 'lucide-react'
import type { Order, Profile } from '@/lib/types'

interface DashboardStats {
  totalPending: number
  inWashing: number
  inDrying: number
  completed: number
  todayOrders: number
  weeklyOrders: number
}

export default function OperadorDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState<DashboardStats>({
    totalPending: 0,
    inWashing: 0,
    inDrying: 0,
    completed: 0,
    todayOrders: 0,
    weeklyOrders: 0
  })
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const loadData = async () => {
      if (!supabase) {
        router.push('/operador/login')
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/operador/login')
        return
      }
      setCurrentUser(user)

      // Load profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileData && profileData.role !== 'operador' && profileData.role !== 'admin') {
        router.push('/operador/login')
        return
      }

      setProfile(profileData)

      // Load stats - simulated for demo
      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (orders) {
        const pending = orders.filter(o => ['en_bodega', 'en_transito_lavado'].includes(o.status)).length
        const washing = orders.filter(o => o.status === 'en_lavado').length
        const drying = orders.filter(o => o.status === 'en_secado').length
        const completed = orders.filter(o => o.status === 'completado').length

        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const todayOrders = orders.filter(o => new Date(o.created_at) >= today).length

        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        const weeklyOrders = orders.filter(o => new Date(o.created_at) >= weekAgo).length

        setStats({
          totalPending: pending,
          inWashing: washing,
          inDrying: drying,
          completed,
          todayOrders,
          weeklyOrders
        })

        setRecentOrders(orders.slice(0, 5))
      }

      setLoading(false)
    }

    loadData()
  }, [router, supabase])

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'pendiente': 'bg-yellow-100 text-yellow-800',
      'recogido': 'bg-blue-100 text-blue-800',
      'en_bodega': 'bg-purple-100 text-purple-800',
      'en_transito_lavado': 'bg-indigo-100 text-indigo-800',
      'en_lavado': 'bg-cyan-100 text-cyan-800',
      'en_secado': 'bg-orange-100 text-orange-800',
      'en_alistamiento': 'bg-pink-100 text-pink-800',
      'en_ruta_entrega': 'bg-emerald-100 text-emerald-800',
      'entregado': 'bg-green-100 text-green-800',
      'completado': 'bg-green-100 text-green-800'
    }
    return colors[status] || 'bg-muted text-muted-foreground'
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'pendiente': 'Pendiente',
      'recogido': 'Recogido',
      'en_bodega': 'En Bodega',
      'en_transito_lavado': 'En Transito',
      'en_lavado': 'Lavando',
      'en_secado': 'Secando',
      'en_alistamiento': 'Alistando',
      'en_ruta_entrega': 'En Ruta',
      'entregado': 'Entregado',
      'completado': 'Completado'
    }
    return labels[status] || status
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-muted/30">
      <Sidebar user={currentUser} />
      
      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Panel de Operadores
              </h1>
              <p className="text-muted-foreground">
                Bienvenido, {profile?.full_name || 'Operador'}
              </p>
            </div>
            <Button onClick={() => router.push('/operador/tickets')}>
              <ClipboardList className="mr-2 h-4 w-4" />
              Ver Todos los Tickets
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-yellow-100">
                    <Clock className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pendientes</p>
                    <p className="text-2xl font-bold">{stats.totalPending}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-cyan-100">
                    <Shirt className="h-5 w-5 text-cyan-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Lavando</p>
                    <p className="text-2xl font-bold">{stats.inWashing}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-orange-100">
                    <Package className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Secando</p>
                    <p className="text-2xl font-bold">{stats.inDrying}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-green-100">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Completados</p>
                    <p className="text-2xl font-bold">{stats.completed}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stats Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pedidos Hoy</p>
                    <p className="text-2xl font-bold">{stats.todayOrders}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-accent/20">
                    <TrendingUp className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Esta Semana</p>
                    <p className="text-2xl font-bold">{stats.weeklyOrders}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-purple-100">
                    <Users className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Operador</p>
                    <p className="text-lg font-semibold truncate">{profile?.full_name || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Orders */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Pedidos Recientes</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => router.push('/operador/tickets')}>
                Ver todos
              </Button>
            </CardHeader>
            <CardContent>
              {recentOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No hay pedidos recientes</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/operador/tickets/${order.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Shirt className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{order.qr_code}</p>
                          <p className="text-sm text-muted-foreground">
                            {order.weight_kg ? `${order.weight_kg} kg` : 'Sin pesar'} - {new Date(order.created_at).toLocaleDateString('es-CO')}
                          </p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(order.status)}>
                        {getStatusLabel(order.status)}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => router.push('/operador/tickets')}
            >
              <ClipboardList className="h-6 w-6" />
              <span>Gestionar Tickets</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => router.push('/operador/inventario')}
            >
              <Package className="h-6 w-6" />
              <span>Inventario</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => router.push('/operador/lavadoras')}
            >
              <Shirt className="h-6 w-6" />
              <span>Lavadoras</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => router.push('/operador/equipo')}
            >
              <Users className="h-6 w-6" />
              <span>Equipo</span>
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
