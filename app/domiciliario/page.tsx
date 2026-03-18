"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { DomiciliarioHeader } from "@/components/domiciliario/header"
import dynamic from "next/dynamic"

const DeliveryMap = dynamic(
  () => import("@/components/domiciliario/delivery-map").then((mod) => mod.DeliveryMap || mod.default),
  { ssr: false }
)
import { TaskCard } from "@/components/domiciliario/task-card"
import { BottomNavDelivery } from "@/components/domiciliario/bottom-nav"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Loader2, MapPin, List, Bike, Package, Calendar as CalendarIcon } from "lucide-react"

export default function DomiciliarioPage() {
  const [user, setUser] = useState<any>(null)
  const [pickupOrders, setPickupOrders] = useState<any[]>([])
  const [deliveryOrders, setDeliveryOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<"map" | "list">("list")
  const [activeTab, setActiveTab] = useState<"pickup" | "delivery">("pickup")
  
  // Estado para el filtro de mes (Por defecto: Mes actual YYYY-MM)
  const [filterMonth, setFilterMonth] = useState(() => {
    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    return `${yyyy}-${mm}`
  })
  
  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        // 1. Traemos TODAS las órdenes del domiciliario de un solo golpe
        const { data: allOrders, error } = await supabase
          .from("orders")
          .select("*")
          .eq("delivery_person_id", user.id)
          .order("created_at", { ascending: true })

        if (error) console.error("Error trayendo órdenes:", error)

        // 2. Extraemos el mes y año que el usuario quiere filtrar
        const [year, month] = filterMonth.split('-')
        
        // Listas de estados "Vivos"
        const activePickupStatuses = ["pendiente", "recogido", "en_transito", "en_deposito"]
        const activeDeliveryStatuses = ["listo", "en_ruta_entrega"]

        // 3. Filtramos la lista inteligentemente
        const filteredOrders = (allOrders || []).filter(order => {
          const orderDate = new Date(order.created_at)
          const orderMonth = String(orderDate.getMonth() + 1).padStart(2, '0')
          const orderYear = String(orderDate.getFullYear())
          const isSameMonth = orderMonth === month && orderYear === year

          // REGLA DE ORO: Si está activa, la mostramos SIEMPRE. 
          // Si ya se entregó o canceló, respetamos el filtro de mes.
          if (activePickupStatuses.includes(order.status) || activeDeliveryStatuses.includes(order.status)) {
            return true
          }
          
          return isSameMonth
        })

        // 4. Separamos en las dos pestañas
        const pickups = filteredOrders.filter(o => activePickupStatuses.includes(o.status))
        const deliveries = filteredOrders.filter(o => activeDeliveryStatuses.includes(o.status) || o.status === 'entregado')

        // 5. Inyectamos los datos del cliente
        const attachProfiles = async (ordersList: any[]) => {
          if (!ordersList || ordersList.length === 0) return []
          const userIds = [...new Set(ordersList.map(o => o.user_id).filter(Boolean))]
          if (userIds.length === 0) return ordersList

          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name, phone")
            .in("id", userIds)

          const profilesMap = (profiles || []).reduce((acc: any, p: any) => {
            acc[p.id] = p
            return acc
          }, {})

          return ordersList.map(o => ({
            ...o,
            cliente: profilesMap[o.user_id] || { full_name: 'Cliente sin nombre', phone: '' }
          }))
        }

        const pickupsWithClient = await attachProfiles(pickups)
        const deliveriesWithClient = await attachProfiles(deliveries)

        setPickupOrders(pickupsWithClient)
        setDeliveryOrders(deliveriesWithClient)
      }
      setLoading(false)
    }

    loadData()

    const channel = supabase
      .channel("delivery-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => { loadData() }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, filterMonth]) 

  const pickupCount = pickupOrders.length
  const deliveryCount = deliveryOrders.length

  if (loading && pickupOrders.length === 0 && deliveryOrders.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DomiciliarioHeader user={user} />
      
      <main className="flex-1 flex flex-col pb-20">
        <div className="px-4 py-3 bg-card border-b flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{pickupCount} recogidas</span>
              </div>
              <div className="flex items-center gap-2">
                <Bike className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium">{deliveryCount} entregas</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant={view === "map" ? "default" : "outline"} size="icon" className="h-8 w-8" onClick={() => setView("map")}>
                <MapPin className="h-4 w-4" />
              </Button>
              <Button variant={view === "list" ? "default" : "outline"} size="icon" className="h-8 w-8" onClick={() => setView("list")}>
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-md border w-max">
            <CalendarIcon className="h-4 w-4 text-muted-foreground ml-2 shrink-0" />
            <Input 
              type="month" 
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="h-8 border-0 bg-transparent focus-visible:ring-0 shadow-none text-sm w-[150px]"
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "pickup" | "delivery")} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2 mx-4 mt-3 max-w-[calc(100%-2rem)]">
            <TabsTrigger value="pickup" className="gap-2">
              Recogidas
              {pickupCount > 0 && <Badge variant="secondary" className="ml-1">{pickupCount}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="delivery" className="gap-2">
              Entregas
              {deliveryCount > 0 && <Badge variant="secondary" className="ml-1">{deliveryCount}</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pickup" className="flex-1 mt-0">
            {view === "map" ? (
              <div className="h-[400px] m-4 rounded-xl overflow-hidden border">
                <DeliveryMap orders={pickupOrders} currentLocation={{ lat: 4.6097, lng: -74.0817 }} />
              </div>
            ) : null}
            
            <div className="p-4 space-y-3">
              {pickupOrders.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                  <h3 className="font-medium text-lg">No hay recogidas activas o en este mes</h3>
                </div>
              ) : (
                pickupOrders.map((order) => (
                  <TaskCard key={order.id} order={order} type="pickup" onUpdate={() => window.location.reload()} />
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="delivery" className="flex-1 mt-0">
            {view === "map" ? (
              <div className="h-[400px] m-4 rounded-xl overflow-hidden border">
                <DeliveryMap orders={deliveryOrders} currentLocation={{ lat: 4.6097, lng: -74.0817 }} />
              </div>
            ) : null}
            
            <div className="p-4 space-y-3">
              {deliveryOrders.length === 0 ? (
                <div className="text-center py-12">
                  <Bike className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                  <h3 className="font-medium text-lg">No hay entregas activas o en este mes</h3>
                </div>
              ) : (
                deliveryOrders.map((order) => (
                  <TaskCard key={order.id} order={order} type="delivery" onUpdate={() => window.location.reload()} />
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <BottomNavDelivery />
    </div>
  )
}