'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/operador/sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Search,
  Filter,
  Shirt,
  Clock,
  ChevronRight,
  QrCode,
  Scale,
  MapPin,
  User
} from 'lucide-react'
import type { Order } from '@/lib/types'

const STATUS_TABS = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'washing', label: 'Lavando' },
  { value: 'drying', label: 'Secando' },
  { value: 'ready', label: 'Listos' },
  { value: 'completed', label: 'Completados' }
]

export default function TicketsPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const loadOrders = async () => {
      if (!supabase) { router.push('/operador/login'); return }
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/operador/login'); return }

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        setOrders(data)
        setFilteredOrders(data)
      }
      setLoading(false)
    }

    loadOrders()

    if (!supabase) return

    // Real-time subscription
    const channel = supabase
      .channel('orders-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setOrders(prev => [payload.new as Order, ...prev])
        } else if (payload.eventType === 'UPDATE') {
          setOrders(prev => prev.map(o => o.id === payload.new.id ? payload.new as Order : o))
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [router, supabase])

  useEffect(() => {
    let filtered = orders

    // Filter by tab
    if (activeTab !== 'all') {
      const statusMap: Record<string, string[]> = {
        'pending': ['pendiente', 'recogido', 'en_bodega', 'en_transito_lavado'],
        'washing': ['en_lavado'],
        'drying': ['en_secado'],
        'ready': ['en_alistamiento'],
        'completed': ['en_ruta_entrega', 'entregado', 'completado']
      }
      filtered = filtered.filter(o => statusMap[activeTab]?.includes(o.status))
    }

    // Filter by search
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(o =>
        o.qr_code.toLowerCase().includes(term) ||
        o.pickup_address.toLowerCase().includes(term) ||
        (o.walk_in_name ?? '').toLowerCase().includes(term) ||
        (o.walk_in_phone ?? '').toLowerCase().includes(term)
      )
    }

    setFilteredOrders(filtered)
  }, [orders, activeTab, searchTerm])

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
      <Sidebar currentPath="/operador/tickets" />
      
      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Gestión de Tickets
              </h1>
              <p className="text-muted-foreground">
                {filteredOrders.length} pedidos encontrados
              </p>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código QR o dirección..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" className="shrink-0">
              <Filter className="mr-2 h-4 w-4" />
              Filtrar
            </Button>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 md:grid-cols-6">
              {STATUS_TABS.map(tab => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              {filteredOrders.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Shirt className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="text-muted-foreground">No hay pedidos en esta categoría</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredOrders.map((order) => (
                    <Card
                      key={order.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => router.push(`/operador/tickets/${order.id}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Shirt className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <QrCode className="h-4 w-4 text-muted-foreground" />
                                <span className="font-mono font-medium">{order.qr_code}</span>
                              </div>
                              <div className="flex items-center gap-1 mt-0.5 text-sm font-medium text-foreground">
                                <User className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>{order.walk_in_name ?? order.client?.full_name ?? 'Cliente registrado'}</span>
                              </div>
                              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                {order.weight_kg && (
                                  <span className="flex items-center gap-1">
                                    <Scale className="h-3 w-3" />
                                    {order.weight_kg} kg
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {new Date(order.created_at).toLocaleDateString('es-CO', {
                                    day: '2-digit',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                <span className="truncate max-w-xs">{order.pickup_address}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge className={getStatusColor(order.status)}>
                              {getStatusLabel(order.status)}
                            </Badge>
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
