"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { DeliveryHeader } from "@/components/domiciliario/header"
import { BottomNavDelivery } from "@/components/domiciliario/bottom-nav"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { 
  ScanLine, 
  Package, 
  Scale, 
  MapPin, 
  User, 
  Phone, 
  CheckCircle2,
  Camera,
  Loader2,
  QrCode,
  Printer,
  ArrowRight
} from "lucide-react"
import QRCode from "qrcode"

type Step = "scan" | "weigh" | "confirm" | "done"

interface PickupData {
  orderId: string
  qrCode: string
  customerName: string
  customerPhone: string
  address: string
  weight: number
  notes: string
  photoUrl?: string
}

export default function EscanearPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [step, setStep] = useState<Step>("scan")
  const [loading, setLoading] = useState(false)
  const [pickupData, setPickupData] = useState<PickupData>({
    orderId: "",
    qrCode: "",
    customerName: "",
    customerPhone: "",
    address: "",
    weight: 0,
    notes: "",
  })
  const [qrImage, setQrImage] = useState<string>("")
  const [manualQR, setManualQR] = useState("")
  const supabase = createClient()

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    loadUser()
  }, [supabase])

  // Generate QR code image
  async function generateQRImage(code: string) {
    try {
      const qrDataUrl = await QRCode.toDataURL(code, {
        width: 200,
        margin: 2,
        color: {
          dark: "#0891b2",
          light: "#ffffff",
        },
      })
      setQrImage(qrDataUrl)
    } catch (err) {
      console.error("Error generating QR:", err)
    }
  }

  // Scan or enter QR code
  async function handleScanQR() {
    if (!manualQR.trim()) {
      toast.error("Ingresa el codigo QR o escanea la bolsa")
      return
    }

    setLoading(true)

    // Look up order by QR code
    const { data: order, error } = await supabase
      .from("orders")
      .select("*")
      .eq("qr_code", manualQR.trim())
      .single()

    if (error || !order) {
      // If not found, this might be a new pickup - create a new order
      const newQRCode = `LG-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
      
      setPickupData({
        orderId: "",
        qrCode: newQRCode,
        customerName: "",
        customerPhone: "",
        address: "",
        weight: 0,
        notes: "",
      })
      
      await generateQRImage(newQRCode)
      setStep("weigh")
    } else {
      // Found existing order
      setPickupData({
        orderId: order.id,
        qrCode: order.qr_code,
        customerName: order.customer_name || "",
        customerPhone: order.customer_phone || "",
        address: order.pickup_address || "",
        weight: order.weight || 0,
        notes: order.notes || "",
      })
      
      await generateQRImage(order.qr_code)
      setStep("weigh")
    }

    setLoading(false)
  }

  // Create new pickup without scanning
  async function handleNewPickup() {
    const newQRCode = `LG-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
    
    setPickupData({
      orderId: "",
      qrCode: newQRCode,
      customerName: "",
      customerPhone: "",
      address: "",
      weight: 0,
      notes: "",
    })
    
    await generateQRImage(newQRCode)
    setStep("weigh")
  }

  // Update weight and customer info
  function handleUpdateData(field: keyof PickupData, value: string | number) {
    setPickupData(prev => ({ ...prev, [field]: value }))
  }

  // Confirm pickup and create/update order
  async function handleConfirmPickup() {
    if (!pickupData.customerName || !pickupData.address || pickupData.weight <= 0) {
      toast.error("Completa todos los campos requeridos")
      return
    }

    setLoading(true)

    try {
      if (pickupData.orderId) {
        // Update existing order
        const { error } = await supabase
          .from("orders")
          .update({
            status: "recogido",
            weight: pickupData.weight,
            notes: pickupData.notes,
            delivery_person_id: user?.id,
            pickup_time: new Date().toISOString(),
          })
          .eq("id", pickupData.orderId)

        if (error) throw error

        // Add history entry
        await supabase.from("order_history").insert({
          order_id: pickupData.orderId,
          status: "recogido",
          notes: `Recogido por domiciliario. Peso: ${pickupData.weight}kg`,
          created_by: user?.id,
        })
      } else {
        // Create new order
        const { data: newOrder, error } = await supabase
          .from("orders")
          .insert({
            qr_code: pickupData.qrCode,
            customer_name: pickupData.customerName,
            customer_phone: pickupData.customerPhone,
            pickup_address: pickupData.address,
            delivery_address: pickupData.address,
            status: "recogido",
            weight: pickupData.weight,
            notes: pickupData.notes,
            delivery_person_id: user?.id,
            pickup_time: new Date().toISOString(),
          })
          .select()
          .single()

        if (error) throw error

        setPickupData(prev => ({ ...prev, orderId: newOrder.id }))

        // Add history entry
        await supabase.from("order_history").insert({
          order_id: newOrder.id,
          status: "recogido",
          notes: `Recogido por domiciliario. Peso: ${pickupData.weight}kg`,
          created_by: user?.id,
        })
      }

      toast.success("Recogida registrada exitosamente")
      setStep("done")
    } catch (err: any) {
      toast.error(err.message || "Error al registrar la recogida")
    } finally {
      setLoading(false)
    }
  }

  // Calculate estimated price
  const pricePerKg = 8000 // COP per kg
  const estimatedPrice = pickupData.weight * pricePerKg

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DeliveryHeader user={user} />
      
      <main className="flex-1 p-4 pb-24">
        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {["scan", "weigh", "confirm", "done"].map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  step === s
                    ? "bg-primary text-primary-foreground"
                    : ["scan", "weigh", "confirm", "done"].indexOf(step) > i
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i + 1}
              </div>
              {i < 3 && (
                <div
                  className={`w-12 h-1 mx-1 rounded ${
                    ["scan", "weigh", "confirm", "done"].indexOf(step) > i
                      ? "bg-primary/50"
                      : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Scan QR */}
        {step === "scan" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ScanLine className="h-5 w-5" />
                Escanear Bolsa
              </CardTitle>
              <CardDescription>
                Escanea el codigo QR de la bolsa o crea una nueva recogida
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="aspect-square max-w-[280px] mx-auto bg-muted rounded-xl flex items-center justify-center border-2 border-dashed">
                <div className="text-center p-6">
                  <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Camara no disponible en esta version
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Usa el campo manual abajo
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="manualQR">Codigo QR Manual</Label>
                <Input
                  id="manualQR"
                  placeholder="Ej: LG-123456-ABCD"
                  value={manualQR}
                  onChange={(e) => setManualQR(e.target.value)}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleNewPickup}
                >
                  <Package className="h-4 w-4 mr-2" />
                  Nueva Recogida
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleScanQR}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <QrCode className="h-4 w-4 mr-2" />
                  )}
                  Buscar QR
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Weigh and Enter Info */}
        {step === "weigh" && (
          <div className="space-y-4">
            {/* QR Code Display */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  {qrImage && (
                    <img src={qrImage} alt="QR Code" className="w-20 h-20 rounded-lg" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Codigo de Bolsa</p>
                    <p className="font-mono font-bold text-lg">{pickupData.qrCode}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customer Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Datos del Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Nombre *</Label>
                  <Input
                    id="customerName"
                    placeholder="Nombre del cliente"
                    value={pickupData.customerName}
                    onChange={(e) => handleUpdateData("customerName", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerPhone">Telefono</Label>
                  <Input
                    id="customerPhone"
                    placeholder="300 123 4567"
                    value={pickupData.customerPhone}
                    onChange={(e) => handleUpdateData("customerPhone", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Direccion *</Label>
                  <Input
                    id="address"
                    placeholder="Calle, numero, barrio"
                    value={pickupData.address}
                    onChange={(e) => handleUpdateData("address", e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Weight */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Scale className="h-4 w-4" />
                  Peso de la Bolsa
                </CardTitle>
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
                      placeholder="0.0"
                      value={pickupData.weight || ""}
                      onChange={(e) => handleUpdateData("weight", parseFloat(e.target.value) || 0)}
                      className="text-2xl font-bold h-14 text-center"
                    />
                    <span className="text-xl font-medium text-muted-foreground">kg</span>
                  </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Precio estimado:</span>
                    <span className="text-lg font-bold text-primary">
                      ${estimatedPrice.toLocaleString("es-CO")} COP
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Precio base: ${pricePerKg.toLocaleString("es-CO")} COP/kg
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notas adicionales</Label>
                  <Textarea
                    id="notes"
                    placeholder="Instrucciones especiales, observaciones..."
                    value={pickupData.notes}
                    onChange={(e) => handleUpdateData("notes", e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("scan")} className="flex-1">
                Atras
              </Button>
              <Button onClick={() => setStep("confirm")} className="flex-1">
                Continuar
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === "confirm" && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Confirmar Recogida
                </CardTitle>
                <CardDescription>
                  Verifica que la informacion sea correcta antes de confirmar
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {qrImage && (
                  <div className="flex justify-center">
                    <img src={qrImage} alt="QR Code" className="w-32 h-32 rounded-xl" />
                  </div>
                )}

                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <QrCode className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Codigo</p>
                      <p className="font-mono font-medium">{pickupData.qrCode}</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Cliente</p>
                      <p className="font-medium">{pickupData.customerName}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Telefono</p>
                      <p className="font-medium">{pickupData.customerPhone || "-"}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Direccion</p>
                      <p className="font-medium">{pickupData.address}</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-start gap-3">
                    <Scale className="h-5 w-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Peso</p>
                      <p className="font-medium text-lg">{pickupData.weight} kg</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Estimado</p>
                      <p className="font-bold text-lg text-primary">
                        ${estimatedPrice.toLocaleString("es-CO")}
                      </p>
                    </div>
                  </div>

                  {pickupData.notes && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Notas</p>
                        <p className="text-sm">{pickupData.notes}</p>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("weigh")} className="flex-1">
                Editar
              </Button>
              <Button onClick={handleConfirmPickup} disabled={loading} className="flex-1">
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Confirmar
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Done */}
        {step === "done" && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-xl font-bold mb-2">Recogida Registrada!</h2>
                <p className="text-muted-foreground mb-6">
                  El ticket ha sido generado exitosamente
                </p>

                {qrImage && (
                  <div className="bg-muted/50 rounded-xl p-4 mb-6">
                    <img src={qrImage} alt="QR Code" className="w-40 h-40 mx-auto mb-3" />
                    <p className="font-mono font-bold">{pickupData.qrCode}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Entrega este codigo al cliente
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1">
                    <Printer className="h-4 w-4 mr-2" />
                    Imprimir
                  </Button>
                  <Button
                    onClick={() => {
                      setStep("scan")
                      setPickupData({
                        orderId: "",
                        qrCode: "",
                        customerName: "",
                        customerPhone: "",
                        address: "",
                        weight: 0,
                        notes: "",
                      })
                      setManualQR("")
                      setQrImage("")
                    }}
                    className="flex-1"
                  >
                    Nueva Recogida
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <BottomNavDelivery />
    </div>
  )
}
