"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { DomiciliarioHeader } from "@/components/domiciliario/header"
import dynamic from "next/dynamic"

// Dynamic map import to avoid SSR errors
const DeliveryMap = dynamic(
  () => import("@/components/domiciliario/delivery-map").then((mod) => mod.DeliveryMap),
  { 
    ssr: false,
    loading: () => (
      <div className="h-[400px] m-4 rounded-xl flex items-center justify-center bg-muted animate-pulse border">
        <p className="text-muted-foreground text-sm">Preparing map container...</p>
      </div>
    )
  }
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
  
  // Simulated coordinates for testing (New York)
  const [currentLocation, setCurrentLocation] = useState({ lat: 40.7559, lng: -73.8856 })

  // Month filter state (Default: current month YYYY-MM)
  const [filterMonth, setFilterMonth] = useState(() => {
    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    return `${yyyy}-${mm}`
  })
  
  const supabase = createClient()

  useEffect(() => {
    // Try to get the real GPS location if the browser allows it
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        },
        (error) => console.warn("Error getting GPS:", error),
        { enableHighAccuracy: true }
      )
    }

    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        // 1. Fetch ALL of the driver's orders in one go
        const { data: allOrders, error } = await supabase
          .from("orders")
          .select("*")
          .eq("delivery_person_id", user.id)
          .order("created_at", { ascending: false })

        if (error) console.error("Error fetching orders:", error)

        // 2. Extract the month and year the user wants to filter by
        const [year, month] = filterMonth.split('-')

        // Statuses the driver needs to act on NOW (always visible)
        const activeStatuses = ["pendiente", "recogido", "en_transito", "en_deposito", "listo", "en_ruta_entrega"]

        // Statuses that belong to the final delivery phase
        const deliveryPhaseStatuses = ["listo", "en_ruta_entrega", "entregado", "completado"]

        // 3. Filter the main list intelligently
        const filteredOrders = (allOrders || []).filter(order => {
          const orderDate = new Date(order.created_at)
          const orderMonth = String(orderDate.getMonth() + 1).padStart(2, '0')
          const orderYear = String(orderDate.getFullYear())
          const isSameMonth = orderMonth === month && orderYear === year

          // Show if it's from the selected month OR if it needs immediate action
          return isSameMonth || activeStatuses.includes(order.status)
        })

        // 4. Split into the two tabs without leaving any out
        const pickups = filteredOrders.filter(o => !deliveryPhaseStatuses.includes(o.status))
        const deliveries = filteredOrders.filter(o => deliveryPhaseStatuses.includes(o.status))

        // 5. Attach client data
        const attachProfiles = async (ordersList: any[]) => {
          if (!ordersList || ordersList.length === 0) return []
          const userIds = [...new Set(ordersList.map(o => o.user_id).filter(Boolean))]

          let profilesMap: Record<string, any> = {}
          if (userIds.length > 0) {
            const { data: profiles } = await supabase
              .from("profiles")
              .select("id, full_name, phone")
              .in("id", userIds)
            profilesMap = (profiles || []).reduce((acc: any, p: any) => {
              acc[p.id] = p
              return acc
            }, {})
          }

          return ordersList.map(o => ({
            ...o,
            cliente: o.user_id
              ? (profilesMap[o.user_id] || { full_name: o.walk_in_name || 'No name', phone: o.walk_in_phone || '' })
              : { full_name: o.walk_in_name || 'No name', phone: o.walk_in_phone || '' }
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
        <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
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
                <span className="text-sm font-medium">{pickupCount} pickups</span>
              </div>
              <div className="flex items-center gap-2">
                <Bike className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium">{deliveryCount} deliveries</span>
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
              Pickups
              {pickupCount > 0 && <Badge variant="secondary" className="ml-1">{pickupCount}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="delivery" className="gap-2">
              Deliveries
              {deliveryCount > 0 && <Badge variant="secondary" className="ml-1">{deliveryCount}</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pickup" className="flex-1 mt-0">
            {view === "map" ? (
              // Map container forcing explicit height
              <div className="h-[400px] m-4 rounded-xl overflow-hidden border shadow-inner bg-muted">
                <DeliveryMap
                    orders={pickupOrders}
                    currentLocation={currentLocation}
                />
              </div>
            ) : null}

            <div className="p-4 space-y-3">
              {pickupOrders.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                  <h3 className="font-medium text-lg">No pickups for this month</h3>
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
              // Map container forcing explicit height
              <div className="h-[400px] m-4 rounded-xl overflow-hidden border shadow-inner bg-muted">
                <DeliveryMap
                    orders={deliveryOrders}
                    currentLocation={currentLocation}
                />
              </div>
            ) : null}

            <div className="p-4 space-y-3">
              {deliveryOrders.length === 0 ? (
                <div className="text-center py-12">
                  <Bike className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                  <h3 className="font-medium text-lg">No deliveries for this month</h3>
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