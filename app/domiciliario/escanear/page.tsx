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

// Pasos: 
// 'select' = Menú principal
// 'camera-client' = Escaneando QR del cliente para auto-asignar
// 'bag-dashboard' = Viendo la orden activa y sus bolsas
// 'camera-bag' = Escaneando una bolsa nueva
// 'weigh' = Pesando y finalizando
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
        // Cargar órdenes asignadas pendientes de recogida
        const { data: orders } = await supabase
          .from("orders")
          .select("*, cliente:profiles!user_id(full_name, phone)")
          .eq("delivery_person_id", user.id)
          .eq("status", "pendiente")
          .order("created_at", { ascending: true })
        
        setAssignedOrders(orders || [])

        // Si venimos desde el botón de la tarjeta con un ID específico
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

  // Cargar bolsas ya escaneadas de una orden
  const loadOrderBags = async (order: any) => {
    setActiveOrder(order)
    const { data: bags } = await supabase
      .from('order_bags')
      .select('*')
      .eq('order_id', order.id)
    
    setScannedBags(bags || [])
    setStep("bag-dashboard")
  }

  // Escanear QR del Cliente (Auto-asignación)
// Escanear QR del Cliente (Auto-asignación)
  const handleScanClientQR = async (qrResult: string) => {
    setLoading(true)
    try {
      const cleanQR = qrResult.trim()
      toast.info(`Buscando código: ${cleanQR}`)

      // 1. Buscar SOLO la orden (sin el join que confunde a Supabase)
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("qr_code", cleanQR)
        .single()

      if (orderError || !order) {
        console.error("Error al buscar orden:", orderError)
        throw new Error("La orden no existe en la base de datos.")
      }
      
      if (order.status !== 'pendiente') {
        throw new Error(`Esta orden no se puede asignar (Estado: ${order.status})`)
      }

      // 2. Buscar los datos del cliente manualmente (El truco infalible)
      if (order.user_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, phone")
          .eq("id", order.user_id)
          .single()
        
        // Se lo inyectamos a la orden para que la pantalla lo muestre bien
        order.cliente = profile || { full_name: 'Cliente sin nombre', phone: '' }
      } else {
        order.cliente = { full_name: 'Cliente sin nombre', phone: '' }
      }

      // 3. Auto-asignar la orden a este domiciliario
      const { error: updateError } = await supabase
        .from('orders')
        .update({ delivery_person_id: user.id })
        .eq('id', order.id)

      if (updateError) {
        console.error("Error al actualizar:", updateError)
        throw new Error("No se pudo asignar la orden a tu cuenta.")
      }

      toast.success("¡Orden auto-asignada exitosamente!")
      
      // 4. Pasar al dashboard de bolsas
      await loadOrderBags(order)
    } catch (err: any) {
      toast.error(err.message || "Error desconocido al procesar el QR")
      setStep("select")
    } finally {
      setLoading(false)
    }
  }

  // Escanear QR de la Bolsa
  const handleScanBagQR = async (qrResult: string) => {
    setLoading(true)
    try {
      // Verificar que no se haya escaneado ya esta misma bolsa
      if (scannedBags.some(b => b.bag_code === qrResult)) {
        throw new Error("Esta bolsa ya fue escaneada en esta orden")
      }

      // Guardar la bolsa en la base de datos
      const { data: newBag, error } = await supabase
        .from('order_bags')
        .insert({
          order_id: activeOrder.id,
          bag_code: qrResult
        })
        .select()
        .single()

      if (error) {
        if (error.code === '23505') throw new Error("Este código de bolsa ya está en uso en otra orden")
        throw error
      }

      toast.success("Bolsa enlazada correctamente")
      setScannedBags(prev => [...prev, newBag])
      setStep("bag-dashboard")
      
    } catch (err: any) {
      toast.error(err.message || "Error al registrar la bolsa")
      setStep("bag-dashboard")
    } finally {
      setLoading(false)
    }
  }

  // Confirmar Recogida Final
  const handleConfirmPickup = async () => {
    if (!finalWeight || parseFloat(finalWeight) <= 0) {
      toast.error("Debes ingresar el peso total")
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
        notes: `Recogido por domiciliario. ${scannedBags.length} bolsas. Peso total: ${finalWeight}kg`,
        changed_by: user?.id,
      })

      toast.success("¡Recogida completada!")
      setStep("done")
    } catch (err: any) {
      toast.error(err.message || "Error al confirmar la recogida")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DomiciliarioHeader userName={user?.email} pendingCount={assignedOrders.length} />
      
      <main className="flex-1 p-4 pb-24">
        
        {/* PANTALLA 1: MENÚ PRINCIPAL */}
        {step === "select" && (
          <div className="space-y-6">
            <Card className="border-primary bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ScanLine className="h-5 w-5 text-primary" />
                  Nueva Recogida (Auto-asignación)
                </CardTitle>
                <CardDescription>
                  Escanea el celular del cliente para tomar su orden instantáneamente.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full h-14 text-lg" 
                  onClick={() => setStep("camera-client")}
                >
                  <Camera className="mr-2 h-5 w-5" /> Escanear QR de Cliente
                </Button>
              </CardContent>
            </Card>

            <Separator />

            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Package className="h-5 w-5" /> 
                Órdenes Asignadas Pendientes
              </h3>
              <div className="space-y-3">
                {assignedOrders.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No tienes órdenes pendientes asignadas.
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
                          <p className="font-bold">{order.cliente?.full_name || 'Cliente sin nombre'}</p>
                          <p className="text-sm text-muted-foreground">{order.pickup_address}</p>
                          <p className="text-xs font-mono mt-1 text-primary">{order.qr_code}</p>
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

        {/* PANTALLA 2: CÁMARA PARA CLIENTE */}
        {step === "camera-client" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl font-bold">Escaneando Cliente</h2>
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
              Apunta la cámara al código QR en la pantalla del cliente.
            </p>
          </div>
        )}

        {/* PANTALLA 3: DASHBOARD DE BOLSAS */}
        {step === "bag-dashboard" && activeOrder && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Inventario de Bolsas</h2>
              <Button variant="ghost" size="icon" onClick={() => setStep("select")}><X /></Button>
            </div>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <User className="h-4 w-4 text-primary" />
                  <span className="font-bold">{activeOrder.cliente?.full_name}</span>
                </div>
                <p className="text-sm text-muted-foreground font-mono">{activeOrder.qr_code}</p>
              </CardContent>
            </Card>

            <Button 
              className="w-full h-14 text-lg bg-indigo-600 hover:bg-indigo-700" 
              onClick={() => setStep("camera-bag")}
            >
              <QrCode className="mr-2 h-5 w-5" /> Escanear Nueva Bolsa
            </Button>

            <div>
              <h3 className="font-semibold mb-3 flex items-center justify-between">
                <span>Bolsas Enlazadas</span>
                <span className="bg-primary/10 text-primary px-2 py-1 rounded-md text-sm">
                  {scannedBags.length} bolsas
                </span>
              </h3>
              
              <div className="space-y-2">
                {scannedBags.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6 bg-muted/30 rounded-lg">
                    Aún no has escaneado bolsas para este cliente.
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
              Continuar y Pesar <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {/* PANTALLA 4: CÁMARA PARA BOLSAS */}
        {step === "camera-bag" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl font-bold">Escaneando Bolsa</h2>
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
              Apunta al código de barras o QR impreso en la bolsa de lavandería.
            </p>
          </div>
        )}

        {/* PANTALLA 5: PESO FINAL Y CONFIRMACIÓN */}
        {step === "weigh" && (
           <div className="space-y-6">
             <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl font-bold">Finalizar Recogida</h2>
              <Button variant="ghost" size="icon" onClick={() => setStep("bag-dashboard")}><X /></Button>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Scale className="h-4 w-4" />
                  Peso Total
                </CardTitle>
                <CardDescription>
                  Ingresa el peso total de las {scannedBags.length} bolsas escaneadas.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="weight">Peso en Kilogramos *</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="weight"
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="Ej: 4.5"
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
              Confirmar Recogida
            </Button>
           </div>
        )}

        {/* PANTALLA 6: ÉXITO */}
        {step === "done" && (
          <div className="text-center py-12 space-y-4">
            <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold">¡Recogida Exitosa!</h2>
            <p className="text-muted-foreground">
              Se han enlazado {scannedBags.length} bolsas al cliente.
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
              Volver al inicio
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