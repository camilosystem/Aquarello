'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/operador/sidebar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  BarChart3,
  TrendingUp,
  Package,
  CheckCircle,
  Clock,
  Users,
  Shirt,
  DollarSign,
} from 'lucide-react'
import { formatUSD } from '@/lib/types'

const STATUS_LABELS: Record<string, string> = {
  pendiente: 'Pending',
  recogido: 'Picked up',
  en_bodega: 'In warehouse',
  en_transito_lavado: 'In transit to wash',
  en_lavado: 'Washing',
  en_secado: 'Drying',
  en_planchado: 'Ironing',
  en_doblado: 'Folding',
  listo: 'Ready',
  en_transito_entrega: 'Out for delivery',
  en_entrega: 'Delivering',
  entregado: 'Delivered',
  cancelado: 'Cancelled',
}

const STATUS_COLORS: Record<string, string> = {
  pendiente: 'bg-gray-100 text-gray-700',
  recogido: 'bg-blue-100 text-blue-700',
  en_lavado: 'bg-cyan-100 text-cyan-700',
  en_secado: 'bg-yellow-100 text-yellow-700',
  en_planchado: 'bg-orange-100 text-orange-700',
  listo: 'bg-green-100 text-green-700',
  entregado: 'bg-emerald-100 text-emerald-700',
  cancelado: 'bg-red-100 text-red-700',
}

export default function ReportesPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('mes')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const loadData = async () => {
      if (!supabase) { router.push('/operador/login'); return }
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/operador/login'); return }

      const { data } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })

      setOrders(data || [])
      setLoading(false)
    }
    loadData()
  }, [])

  const formatCurrency = formatUSD

  // Statistics
  const totalOrders = orders.length
  const entregados = orders.filter(o => o.status === 'entregado').length
  const enProceso = orders.filter(o => !['entregado', 'cancelado', 'pendiente'].includes(o.status)).length
  const pendientes = orders.filter(o => o.status === 'pendiente').length
  const cancelados = orders.filter(o => o.status === 'cancelado').length
  const ingresos = orders.filter(o => o.status === 'entregado').reduce((acc, o) => acc + (o.total_price || 0), 0)
  const ticketPromedio = entregados > 0 ? ingresos / entregados : 0

  // Status distribution
  const statusCounts = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Recent orders
  const recentOrders = orders.slice(0, 10)

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-muted/30">
      <Sidebar currentPath="/operador/reportes" />

      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Reports</h1>
              <p className="text-muted-foreground">Service statistics and metrics</p>
            </div>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hoy">Today</SelectItem>
                <SelectItem value="semana">This week</SelectItem>
                <SelectItem value="mes">This month</SelectItem>
                <SelectItem value="todo">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Orders</p>
                    <p className="text-3xl font-bold mt-1">{totalOrders}</p>
                  </div>
                  <div className="p-2 rounded-full bg-primary/10">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Delivered</p>
                    <p className="text-3xl font-bold mt-1 text-green-600">{entregados}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {totalOrders > 0 ? Math.round((entregados / totalOrders) * 100) : 0}% of total
                    </p>
                  </div>
                  <div className="p-2 rounded-full bg-green-100">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">In Progress</p>
                    <p className="text-3xl font-bold mt-1 text-blue-600">{enProceso}</p>
                    <p className="text-xs text-muted-foreground mt-1">{pendientes} pending</p>
                  </div>
                  <div className="p-2 rounded-full bg-blue-100">
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Revenue</p>
                    <p className="text-2xl font-bold mt-1 text-primary">{formatCurrency(ingresos)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Avg. ticket: {formatCurrency(ticketPromedio)}</p>
                  </div>
                  <div className="p-2 rounded-full bg-primary/10">
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Status Distribution
                </CardTitle>
                <CardDescription>Number of orders in each status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(statusCounts).length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">No data available</p>
                ) : (
                  Object.entries(statusCounts)
                    .sort(([, a], [, b]) => b - a)
                    .map(([status, count]) => {
                      const pct = totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0
                      return (
                        <div key={status} className="flex items-center gap-3">
                          <Badge className={STATUS_COLORS[status] || 'bg-gray-100 text-gray-700'}>
                            {STATUS_LABELS[status] || status}
                          </Badge>
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-8 text-right">{count}</span>
                        </div>
                      )
                    })
                )}
              </CardContent>
            </Card>

            {/* Financial Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Financial Summary
                </CardTitle>
                <CardDescription>Revenue and order metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between py-3 border-b">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Shirt className="h-4 w-4" />
                    Total completed orders
                  </div>
                  <span className="font-semibold">{entregados}</span>
                </div>
                <div className="flex justify-between py-3 border-b">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    Total revenue
                  </div>
                  <span className="font-semibold text-primary">{formatCurrency(ingresos)}</span>
                </div>
                <div className="flex justify-between py-3 border-b">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <TrendingUp className="h-4 w-4" />
                    Average ticket
                  </div>
                  <span className="font-semibold">{formatCurrency(ticketPromedio)}</span>
                </div>
                <div className="flex justify-between py-3 border-b">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    Cancellation rate
                  </div>
                  <span className="font-semibold text-red-600">
                    {totalOrders > 0 ? Math.round((cancelados / totalOrders) * 100) : 0}%
                  </span>
                </div>
                <div className="flex justify-between py-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4" />
                    Completion rate
                  </div>
                  <span className="font-semibold text-green-600">
                    {totalOrders > 0 ? Math.round((entregados / totalOrders) * 100) : 0}%
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Orders */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>The 10 most recent orders in the system</CardDescription>
            </CardHeader>
            <CardContent>
              {recentOrders.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No orders registered yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-3 pr-4 font-medium text-muted-foreground">Order ID</th>
                        <th className="pb-3 pr-4 font-medium text-muted-foreground">Address</th>
                        <th className="pb-3 pr-4 font-medium text-muted-foreground">Status</th>
                        <th className="pb-3 pr-4 font-medium text-muted-foreground">Total</th>
                        <th className="pb-3 font-medium text-muted-foreground">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {recentOrders.map(order => (
                        <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">
                            #{order.id.slice(0, 8).toUpperCase()}
                          </td>
                          <td className="py-3 pr-4 max-w-[180px] truncate">
                            {order.pickup_address}
                          </td>
                          <td className="py-3 pr-4">
                            <Badge className={STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700'}>
                              {STATUS_LABELS[order.status] || order.status}
                            </Badge>
                          </td>
                          <td className="py-3 pr-4 font-medium">
                            {formatCurrency(order.total_price || 0)}
                          </td>
                          <td className="py-3 text-muted-foreground text-xs">
                            {new Date(order.created_at).toLocaleDateString('en-US')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  )
}
