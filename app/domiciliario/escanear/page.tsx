'use client'

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { DomiciliarioHeader } from "@/components/domiciliario/header"
import { BottomNavDelivery } from "@/components/domiciliario/bottom-nav"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Scanner } from '@yudiel/react-qr-scanner'
import { formatOrderNumber } from '@/lib/types'
import {
  ScanLine,
  Package,
  Scale,
  User,
  CheckCircle2,
  Loader2,
  QrCode,
  ArrowRight,
  Camera,
  X
} from "lucide-react"

// Steps:
// 'select' = Main menu
// 'camera-client' = Scanning the client's QR to auto-assign
// 'bag-dashboard' = Viewing the active order and its bags
// 'camera-bag' = Scanning a new bag
// 'weigh' = Weighing and finalizing
type Step = "select" | "camera-client" | "bag-dashboard" | "camera-bag" | "weigh" | "done"

function EscanearContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialOrderId = searchParams.get('orderId')

  const [user, setUser] = useState<any>(null)
  const [step, setStep] = useState<Step>("select")
  const [loading, setLoading] = useState(false)
  
  const [assignedOrders, setAssignedOrders] = useState<any[]>([])
  const [activeOrder, setActiveOrder] = useState<any>(null)
  const [scannedBags, setScannedBags] = useState<any[]>([])
  const [finalWeight, setFinalWeight] = useState("")

  const supabase = createClient()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        // Load assigned orders pending pickup
        const { data: orders } = await supabase
          .from("orders")
          .select("*, cliente:profiles!user_id(full_name, phone)")
          .eq("delivery_person_id", user.id)
          .eq("status", "pendiente")
          .order("created_at", { ascending: true })

        setAssignedOrders(orders || [])

        // If we arrived from the card button with a specific ID
        if (initialOrderId && orders) {
          const order = orders.find(o => o.id === initialOrderId)
          if (order) {
            await loadOrderBags(order)
          }
        }
      }
    }
    init()
  }, [supabase, initialOrderId])

  // Load bags already scanned for an order
  const loadOrderBags = async (order: any) => {
    setActiveOrder(order)
    const { data: bags } = await supabase
      .from('order_bags')
      .select('*')
      .eq('order_id', order.id)

    setScannedBags(bags || [])
    setStep("bag-dashboard")
  }

  // Scan the client's QR (auto-assign)
  const handleScanClientQR = async (qrResult: string) => {
    setLoading(true)
    try {
      const cleanQR = qrResult.trim()
      toast.info(`Looking up code: ${cleanQR}`)

      // 1. Look up ONLY the order (without the join that confuses Supabase)
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("qr_code", cleanQR)
        .single()

      if (orderError || !order) {
        console.error("Error looking up order:", orderError)
        throw new Error("This order does not exist in the database.")
      }

      if (order.status !== 'pendiente') {
        throw new Error(`This order cannot be assigned (Status: ${order.status})`)
      }

      // 2. Look up the client's data manually (the foolproof trick)
      if (order.user_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, phone")
          .eq("id", order.user_id)
          .single()

        // Attach it to the order so the screen displays it correctly
        order.cliente = profile || { full_name: order.walk_in_name || 'No name', phone: order.walk_in_phone || '' }
      } else {
        order.cliente = { full_name: order.walk_in_name || 'No name', phone: order.walk_in_phone || '' }
      }

      // 3. Auto-assign the order to this driver
      const { error: updateError } = await supabase
        .from('orders')
        .update({ delivery_person_id: user.id })
        .eq('id', order.id)

      if (updateError) {
        console.error("Error updating:", updateError)
        throw new Error("Could not assign the order to your account.")
      }

      toast.success("Order auto-assigned successfully!")

      // 4. Move to the bags dashboard
      await loadOrderBags(order)
    } catch (err: any) {
      toast.error(err.message || "Unknown error processing the QR")
      setStep("select")
    } finally {
      setLoading(false)
    }
  }

  // Scan the Bag's QR
  const handleScanBagQR = async (qrResult: string) => {
    setLoading(true)
    try {
      // Verify this same bag hasn't already been scanned
      if (scannedBags.some(b => b.bag_code === qrResult)) {
        throw new Error("This bag has already been scanned for this order")
      }

      // Save the bag in the database
      const { data: newBag, error } = await supabase
        .from('order_bags')
        .insert({
          order_id: activeOrder.id,
          bag_code: qrResult
        })
        .select()
        .single()

      if (error) {
        if (error.code === '23505') throw new Error("This bag code is already in use on another order")
        throw error
      }

      toast.success("Bag linked successfully")
      setScannedBags(prev => [...prev, newBag])
      setStep("bag-dashboard")

    } catch (err: any) {
      toast.error(err.message || "Error registering the bag")
      setStep("bag-dashboard")
    } finally {
      setLoading(false)
    }
  }

  // Confirm Final Pickup
  const handleConfirmPickup = async () => {
    if (!finalWeight || parseFloat(finalWeight) <= 0) {
      toast.error("You must enter the total weight")
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          status: "recogido",
          actual_weight: parseFloat(finalWeight),
          updated_at: new Date().toISOString(),
        })
        .eq("id", activeOrder.id)

      if (error) throw error

      await supabase.from("order_history").insert({
        order_id: activeOrder.id,
        status: "recogido",
        notes: `Picked up by driver. ${scannedBags.length} bags. Total weight: ${finalWeight}kg`,
        changed_by: user?.id,
      })

      toast.success("Pickup completed!")
      setStep("done")
    } catch (err: any) {
      toast.error(err.message || "Error confirming pickup")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DomiciliarioHeader userName={user?.email} pendingCount={assignedOrders.length} />
      
      <main className="flex-1 p-4 pb-24">
        
        {/* SCREEN 1: MAIN MENU */}
        {step === "select" && (
          <div className="space-y-6">
            <Card className="border-primary bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ScanLine className="h-5 w-5 text-primary" />
                  New Pickup (Auto-assign)
                </CardTitle>
                <CardDescription>
                  Scan the client&apos;s phone to take their order instantly.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full h-14 text-lg"
                  onClick={() => setStep("camera-client")}
                >
                  <Camera className="mr-2 h-5 w-5" /> Scan Client QR
                </Button>
              </CardContent>
            </Card>

            <Separator />

            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Package className="h-5 w-5" />
                Assigned Pending Orders
              </h3>
              <div className="space-y-3">
                {assignedOrders.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    You have no pending orders assigned.
                  </p>
                ) : (
                  assignedOrders.map(order => (
                    <Card
                      key={order.id}
                      className="cursor-pointer hover:border-primary transition-colors"
                      onClick={() => loadOrderBags(order)}
                    >
                      <CardContent className="p-4 flex justify-between items-center">
                        <div>
                          <p className="font-bold">{order.cliente?.full_name || 'No name'}</p>
                          <p className="text-sm text-muted-foreground">{order.pickup_address}</p>
                          <p className="text-sm font-semibold mt-0.5 text-primary">{formatOrderNumber((order as any).order_number)}</p>
                          <p className="text-xs font-mono text-muted-foreground">{order.qr_code}</p>
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground" />
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* SCREEN 2: CLIENT CAMERA */}
        {step === "camera-client" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl font-bold">Scanning Client</h2>
              <Button variant="ghost" size="icon" onClick={() => setStep("select")}><X /></Button>
            </div>
            <div className="rounded-xl overflow-hidden border-2 border-primary bg-black">
              {loading ? (
                <div className="h-64 flex items-center justify-center bg-muted">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <Scanner
                  onScan={(result) => {
                    if (result && result.length > 0 && !loading) {
                      handleScanClientQR(result[0].rawValue)
                    }
                  }}
                  formats={['qr_code']}
                />
              )}
            </div>
            <p className="text-center text-muted-foreground text-sm">
              Point the camera at the QR code on the client&apos;s screen.
            </p>
          </div>
        )}

        {/* SCREEN 3: BAGS DASHBOARD */}
        {step === "bag-dashboard" && activeOrder && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Bag Inventory</h2>
              <Button variant="ghost" size="icon" onClick={() => setStep("select")}><X /></Button>
            </div>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <User className="h-4 w-4 text-primary" />
                  <span className="font-bold">{activeOrder.cliente?.full_name}</span>
                </div>
                <p className="text-sm font-semibold">{formatOrderNumber((activeOrder as any).order_number)}</p>
                <p className="text-xs text-muted-foreground font-mono">{activeOrder.qr_code}</p>
              </CardContent>
            </Card>

            <Button
              className="w-full h-14 text-lg bg-indigo-600 hover:bg-indigo-700"
              onClick={() => setStep("camera-bag")}
            >
              <QrCode className="mr-2 h-5 w-5" /> Scan New Bag
            </Button>

            <div>
              <h3 className="font-semibold mb-3 flex items-center justify-between">
                <span>Linked Bags</span>
                <span className="bg-primary/10 text-primary px-2 py-1 rounded-md text-sm">
                  {scannedBags.length} bags
                </span>
              </h3>

              <div className="space-y-2">
                {scannedBags.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6 bg-muted/30 rounded-lg">
                    You haven&apos;t scanned any bags for this client yet.
                  </p>
                ) : (
                  scannedBags.map((bag, i) => (
                    <div key={bag.id} className="p-3 border rounded-lg flex items-center gap-3 bg-card">
                      <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                        {i + 1}
                      </div>
                      <div className="flex-1 font-mono text-sm">{bag.bag_code}</div>
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    </div>
                  ))
                )}
              </div>
            </div>

            <Button
              className="w-full mt-4"
              disabled={scannedBags.length === 0}
              onClick={() => setStep("weigh")}
            >
              Continue and Weigh <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {/* SCREEN 4: BAG CAMERA */}
        {step === "camera-bag" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl font-bold">Scanning Bag</h2>
              <Button variant="ghost" size="icon" onClick={() => setStep("bag-dashboard")}><X /></Button>
            </div>
            <div className="rounded-xl overflow-hidden border-2 border-indigo-500 bg-black">
              {loading ? (
                <div className="h-64 flex items-center justify-center bg-muted">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                </div>
              ) : (
                <Scanner
                  onScan={(result) => {
                    if (result && result.length > 0 && !loading) {
                      handleScanBagQR(result[0].rawValue)
                    }
                  }}
                />
              )}
            </div>
            <p className="text-center text-muted-foreground text-sm">
              Point at the barcode or QR code printed on the laundry bag.
            </p>
          </div>
        )}

        {/* SCREEN 5: FINAL WEIGHT AND CONFIRMATION */}
        {step === "weigh" && (
           <div className="space-y-6">
             <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl font-bold">Finish Pickup</h2>
              <Button variant="ghost" size="icon" onClick={() => setStep("bag-dashboard")}><X /></Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Scale className="h-4 w-4" />
                  Total Weight
                </CardTitle>
                <CardDescription>
                  Enter the total weight of the {scannedBags.length} scanned bags.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight in Kilograms *</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="weight"
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="E.g.: 4.5"
                      value={finalWeight}
                      onChange={(e) => setFinalWeight(e.target.value)}
                      className="text-2xl font-bold h-14 text-center"
                    />
                    <span className="text-xl font-medium text-muted-foreground">kg</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button
              className="w-full h-14 text-lg bg-green-600 hover:bg-green-700"
              onClick={handleConfirmPickup}
              disabled={loading}
            >
              {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
              Confirm Pickup
            </Button>
           </div>
        )}

        {/* SCREEN 6: SUCCESS */}
        {step === "done" && (
          <div className="text-center py-12 space-y-4">
            <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold">Pickup Successful!</h2>
            <p className="text-muted-foreground">
              {scannedBags.length} bags have been linked to the client.
            </p>
            <Button
              className="mt-8"
              onClick={() => {
                setStep("select")
                setActiveOrder(null)
                setScannedBags([])
                setFinalWeight("")
              }}
            >
              Back to Home
            </Button>
          </div>
        )}

      </main>
      <BottomNavDelivery />
    </div>
  )
}

export default function EscanearPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <EscanearContent />
    </Suspense>
  )
}