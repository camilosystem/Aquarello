"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import DeliveryHeader from "@/components/domiciliario/header"
import BottomNavDelivery from "@/components/domiciliario/bottom-nav"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Loader2, Package, Search, Calendar, MapPin, Scale } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { ORDER_STATUS_CONFIG } from "@/lib/types"

export default function HistorialPage() {
  const [user, setUser] = useState<any>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        const { data } = await supabase
          .from("orders")
          .select("*")
          .eq("delivery_person_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50)

        setOrders(data || [])
      }

      setLoading(false)
    }

    loadData()
  }, [supabase])

  const filteredOrders = orders.filter(order =>
    order.qr_code?.toLowerCase().includes(search.toLowerCase()) ||
    order.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    order.pickup_address?.toLowerCase().includes(search.toLowerCase())
  )

  // Stats
  const totalPickups = orders.filter(o => o.pickup_time).length
  const totalDeliveries = orders.filter(o => o.status === "entregado").length
  const totalWeight = orders.reduce((sum, o) => sum + (o.weight || 0), 0)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DeliveryHeader user={user} />
      
      <main className="flex-1 pb-24">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 p-4">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-primary">{totalPickups}</p>
              <p className="text-xs text-muted-foreground">Recogidas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-accent">{totalDeliveries}</p>
              <p className="text-xs text-muted-foreground">Entregas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{totalWeight.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">Kg Total</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por codigo, cliente o direccion..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Orders List */}
        <div className="px-4 space-y-3">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium text-lg">No hay ordenes</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Tu historial de ordenes aparecera aqui
              </p>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const statusConfig = ORDER_STATUS_CONFIG[order.status as keyof typeof ORDER_STATUS_CONFIG]
              return (
                <Card key={order.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-mono text-sm font-medium">{order.qr_code}</p>
                        <p className="text-sm text-muted-foreground">{order.customer_name}</p>
                      </div>
                      <Badge
                        style={{
                          backgroundColor: `${statusConfig?.color}20`,
                          color: statusConfig?.color,
                        }}
                      >
                        {statusConfig?.label || order.status}
                      </Badge>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span className="truncate">{order.pickup_address}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {format(new Date(order.created_at), "dd MMM yyyy, HH:mm", { locale: es })}
                          </span>
                        </div>
                        {order.weight && (
                          <div className="flex items-center gap-1 font-medium">
                            <Scale className="h-4 w-4" />
                            {order.weight} kg
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </main>

      <BottomNavDelivery />
    </div>
  )
}