"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { DomiciliarioHeader } from "@/components/domiciliario/header"
import dynamic from "next/dynamic"

// Cargamos el mapa dinámicamente apagando el renderizado del servidor (ssr: false)
const DeliveryMap = dynamic(
  () => import("@/components/domiciliario/delivery-map").then((mod) => mod.DeliveryMap || mod.default),
  { ssr: false }
)
import { TaskCard } from "@/components/domiciliario/task-card"
import { BottomNavDelivery } from "@/components/domiciliario/bottom-nav"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Loader2, MapPin, List, Bike, Package } from "lucide-react"
import type { Order } from "@/lib/types"

export default function DomiciliarioPage() {
  const [user, setUser] = useState<any>(null)
  const [pickupOrders, setPickupOrders] = useState<Order[]>([])
  const [deliveryOrders, setDeliveryOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<"map" | "list">("map")
  const [activeTab, setActiveTab] = useState<"pickup" | "delivery">("pickup")
  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        // Load assigned pickup tasks for this delivery person
       // Load assigned pickup tasks for this delivery person
        const { data: pickups } = await supabase
          .from("orders")
          .select("*, cliente:profiles!user_id(full_name, phone)")
          .eq("delivery_person_id", user.id)
          .in("status", ["pendiente", "recogido", "en_deposito"])
          .order("created_at", { ascending: true })

        const { data: deliveries } = await supabase
          .from("orders")
          .select("*, cliente:profiles!user_id(full_name, phone)")
          .eq("delivery_person_id", user.id)
          .in("status", ["listo", "en_ruta_entrega", "entregado"])
          .order("created_at", { ascending: true })

        setPickupOrders(pickups || [])
        setDeliveryOrders(deliveries || [])
      }

      setLoading(false)
    }

    loadData()

    // Subscribe to real-time updates
    const channel = supabase
      .channel("delivery-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          loadData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  const filteredTasks = activeTab === "pickup" ? pickupOrders : deliveryOrders
  const pickupCount = pickupOrders.length
  const deliveryCount = deliveryOrders.length

  if (loading) {
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
        {/* Stats Bar */}
        <div className="px-4 py-3 bg-card border-b flex items-center justify-between">
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
            <Button
              variant={view === "map" ? "default" : "outline"}
              size="sm"
              onClick={() => setView("map")}
            >
              <MapPin className="h-4 w-4" />
            </Button>
            <Button
              variant={view === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setView("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "pickup" | "delivery")} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2 mx-4 mt-3 max-w-[calc(100%-2rem)]">
            <TabsTrigger value="pickup" className="gap-2">
              Recogidas
              {pickupCount > 0 && (
                <Badge variant="secondary" className="ml-1">{pickupCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="delivery" className="gap-2">
              Entregas
              {deliveryCount > 0 && (
                <Badge variant="secondary" className="ml-1">{deliveryCount}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pickup" className="flex-1 mt-0">
            {view === "map" ? (
              <div className="h-[400px] m-4 rounded-xl overflow-hidden border">
                <DeliveryMap 
                  orders={pickupOrders} 
                  currentLocation={{ lat: 4.6097, lng: -74.0817 }}
                />
              </div>
            ) : null}
            
            <div className="p-4 space-y-3">
              {pickupOrders.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium text-lg">No hay recogidas pendientes</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Las nuevas recogidas apareceran aqui
                  </p>
                </div>
              ) : (
                pickupOrders.map((order) => (
                  <TaskCard 
                    key={order.id} 
                    order={order as any} 
                    type="pickup"
                    onUpdate={() => window.location.reload()}
                  />
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="delivery" className="flex-1 mt-0">
            {view === "map" ? (
              <div className="h-[400px] m-4 rounded-xl overflow-hidden border">
                <DeliveryMap 
                  orders={deliveryOrders} 
                  currentLocation={{ lat: 4.6097, lng: -74.0817 }}
                />
              </div>
            ) : null}
            
            <div className="p-4 space-y-3">
              {deliveryOrders.length === 0 ? (
                <div className="text-center py-12">
                  <Bike className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium text-lg">No hay entregas pendientes</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Las entregas listas apareceran aqui
                  </p>
                </div>
              ) : (
                deliveryOrders.map((order) => (
                  <TaskCard 
                    key={order.id} 
                    order={order as any} 
                    type="delivery"
                    onUpdate={() => window.location.reload()}
                  />
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
