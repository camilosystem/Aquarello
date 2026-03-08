'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/operador/sidebar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { 
  ArrowLeft,
  Shirt,
  QrCode,
  Scale,
  MapPin,
  Clock,
  User,
  Droplets,
  Wind,
  Sparkles,
  CheckCircle2,
  Play,
  Pause,
  RotateCcw,
  Send,
  FileText,
  Bike
} from 'lucide-react'
import type { Order, OrderPreferences, WashingProcess } from '@/lib/types'

const WASHING_MACHINES = [
  { id: 'LV-001', name: 'Lavadora Industrial 1', capacity: '20kg' },
  { id: 'LV-002', name: 'Lavadora Industrial 2', capacity: '20kg' },
  { id: 'LV-003', name: 'Lavadora Mediana 1', capacity: '12kg' },
  { id: 'LV-004', name: 'Lavadora Mediana 2', capacity: '12kg' },
  { id: 'LV-005', name: 'Lavadora Delicados', capacity: '8kg' },
]

const DRYERS = [
  { id: 'SC-001', name: 'Secadora Industrial 1', capacity: '25kg' },
  { id: 'SC-002', name: 'Secadora Industrial 2', capacity: '25kg' },
  { id: 'SC-003', name: 'Secadora Mediana 1', capacity: '15kg' },
]

const PROCESS_STEPS = [
  { key: 'alistamiento', label: 'Alistamiento', icon: Sparkles, status: 'en_alistamiento' },
  { key: 'lavado', label: 'Lavado', icon: Droplets, status: 'en_lavado' },
  { key: 'secado', label: 'Secado', icon: Wind, status: 'en_secado' },
  { key: 'planchado', label: 'Planchado', icon: Shirt, status: 'en_alistamiento' },
  { key: 'doblado', label: 'Doblado', icon: CheckCircle2, status: 'en_alistamiento' },
]

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [order, setOrder] = useState<Order | any>(null)
  const [preferences, setPreferences] = useState<OrderPreferences | null>(null)
  const [process, setProcess] = useState<WashingProcess | null>(null)
  const [domiciliarios, setDomiciliarios] = useState<any[]>([])
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [assigning, setAssigning] = useState(false)
  
  const [selectedMachine, setSelectedMachine] = useState('')
  const [selectedDryer, setSelectedDryer] = useState('')
  const [processNotes, setProcessNotes] = useState('')
  const [selectedDomiciliario, setSelectedDomiciliario] = useState<string>('unassigned')
  
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({
    alistamiento: false,
    lavado: false,
    secado: false,
    planchado: false,
    doblado: false
  })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const loadOrder = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/operador/login')
        return
      }

      // Load order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .single()

      if (orderError || !orderData) {
        toast.error('Pedido no encontrado')
        router.push('/operador/tickets')
        return
      }

      setOrder(orderData)
      
      // Set initial selected domiciliario
      if (orderData.delivery_person_id) {
        setSelectedDomiciliario(orderData.delivery_person_id)
      } else {
        setSelectedDomiciliario('unassigned')
      }

      // Load preferences
      const { data: prefsData } = await supabase
        .from('order_preferences')
        .select('*')
        .eq('order_id', id)
        .single()

      if (prefsData) {
        setPreferences(prefsData)
      }

      // Load domiciliarios list
      const { data: domData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'domiciliario')
        
      if (domData) {
        setDomiciliarios(domData)
      }

      // Load or create process
      const { data: processData } = await supabase
        .from('washing_process')
        .select('*')
        .eq('order_id', id)
        .single()

      if (processData) {
        setProcess(processData)
        setSelectedMachine(processData.washing_machine_id || '')
        setSelectedDryer(processData.dryer_id || '')
        setProcessNotes(processData.notes || '')
        setCompletedSteps({
          alistamiento: processData.alistamiento_completed || false,
          lavado: processData.lavado_completed || false,
          secado: processData.secado_completed || false,
          planchado: processData.planchado_completed || false,
          doblado: processData.doblado_completed || false
        })
      }

      setLoading(false)
    }

    loadOrder()
  }, [id, router, supabase])

  const handleStepToggle = (step: string) => {
    setCompletedSteps(prev => ({
      ...prev,
      [step]: !prev[step]
    }))
  }

  const handleAssignDomiciliario = async () => {
    setAssigning(true)
    try {
      const valToSave = selectedDomiciliario === 'unassigned' ? null : selectedDomiciliario
      
      const { error } = await supabase
        .from('orders')
        .update({ delivery_person_id: valToSave })
        .eq('id', id)

      if (error) throw error

      toast.success(valToSave ? 'Domiciliario asignado correctamente' : 'Asignación removida')
      
      // Update local order state
      setOrder((prev: any) => prev ? { ...prev, delivery_person_id: valToSave } : null)
    } catch (error: any) {
      // AQUÍ ESTÁ EL CAMBIO MÁGICO
      console.error("Error completo de Supabase:", error);
      toast.error(`Error real: ${error.message || 'Revisa la consola'}`);
    }
    setAssigning(false)
  }

  const handleStartProcess = async () => {
    if (!selectedMachine) {
      toast.error('Selecciona una lavadora')
      return
    }

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      // Create or update process
      const processPayload = {
        order_id: id,
        operator_id: user?.id,
        washing_machine_id: selectedMachine,
        dryer_id: selectedDryer || null,
        started_at: new Date().toISOString(),
        notes: processNotes,
        alistamiento_completed: completedSteps.alistamiento,
        lavado_completed: completedSteps.lavado,
        secado_completed: completedSteps.secado,
        planchado_completed: completedSteps.planchado,
        doblado_completed: completedSteps.doblado,
      }

      if (process) {
        await supabase
          .from('washing_process')
          .update(processPayload)
          .eq('id', process.id)
      } else {
        await supabase
          .from('washing_process')
          .insert(processPayload)
      }

      // Update order status
      await supabase
        .from('orders')
        .update({ status: 'en_lavado', updated_at: new Date().toISOString() })
        .eq('id', id)

      toast.success('Proceso de lavado iniciado')
      
      // Reload data
      const { data: newOrder } = await supabase.from('orders').select('*').eq('id', id).single()
      if (newOrder) setOrder(newOrder)
      
      const { data: newProcess } = await supabase.from('washing_process').select('*').eq('order_id', id).single()
      if (newProcess) setProcess(newProcess)
      
    } catch {
      toast.error('Error al iniciar el proceso')
    }
    setSaving(false)
  }

  const handleUpdateProcess = async () => {
    setSaving(true)
    try {
      await supabase
        .from('washing_process')
        .update({
          washing_machine_id: selectedMachine,
          dryer_id: selectedDryer || null,
          notes: processNotes,
          alistamiento_completed: completedSteps.alistamiento,
          lavado_completed: completedSteps.lavado,
          secado_completed: completedSteps.secado,
          planchado_completed: completedSteps.planchado,
          doblado_completed: completedSteps.doblado,
          updated_at: new Date().toISOString()
        })
        .eq('order_id', id)

      // Update order status based on steps
      let newStatus = order?.status || 'en_lavado'
      if (completedSteps.lavado && !completedSteps.secado) {
        newStatus = 'en_secado'
      } else if (completedSteps.secado && !completedSteps.doblado) {
        newStatus = 'en_alistamiento'
      }

      await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id)

      toast.success('Proceso actualizado')
      
      const { data: newOrder } = await supabase.from('orders').select('*').eq('id', id).single()
      if (newOrder) setOrder(newOrder)
      
    } catch {
      toast.error('Error al actualizar')
    }
    setSaving(false)
  }

  const handleCompleteProcess = async () => {
    if (!Object.values(completedSteps).every(v => v)) {
      toast.error('Completa todos los pasos antes de finalizar')
      return
    }

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      // Complete process
      await supabase
        .from('washing_process')
        .update({
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('order_id', id)

      // Update order status
      await supabase
        .from('orders')
        .update({ status: 'en_ruta_entrega', updated_at: new Date().toISOString() })
        .eq('id', id)

      // Create receipt
      const totalAmount = (order?.weight_kg || 1) * 8000 // $8,000 COP per kg base
      await supabase
        .from('receipts')
        .insert({
          order_id: id,
          generated_by: user?.id,
          total_amount: totalAmount,
          breakdown: {
            base: (order?.weight_kg || 1) * 8000,
            extras: preferences ? calculateExtras(preferences) : 0
          }
        })

      toast.success('Proceso completado. Recibo generado y enviado al cliente.')
      router.push('/operador/tickets')
      
    } catch {
      toast.error('Error al completar el proceso')
    }
    setSaving(false)
  }

  const calculateExtras = (prefs: OrderPreferences): number => {
    let extras = 0
    if (prefs.separate_whites) extras += 3000
    if (prefs.apply_softener) extras += 2000
    if (prefs.apply_bleach) extras += 2500
    if (prefs.apply_degreaser) extras += 3000
    if (prefs.ironing) extras += 5000
    return extras
  }

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

  if (!order) return null

  const canStartProcess = ['en_bodega', 'en_transito_lavado'].includes(order.status)
  const isProcessing = ['en_lavado', 'en_secado', 'en_alistamiento'].includes(order.status)
  const isCompleted = ['en_ruta_entrega', 'entregado', 'completado'].includes(order.status)

  return (
    <div className="flex min-h-screen bg-muted/30">
      <Sidebar currentPath="/operador/tickets" />
      
      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-foreground">
                  Ticket {order.qr_code}
                </h1>
                <Badge className={getStatusColor(order.status)}>
                  {getStatusLabel(order.status)}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                Creado el {new Date(order.created_at).toLocaleDateString('es-CO', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>

          {/* Order Info */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Información del Pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <QrCode className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Código QR</p>
                    <p className="font-mono font-medium">{order.qr_code}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Scale className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Peso</p>
                    <p className="font-medium">{order.weight_kg ? `${order.weight_kg} kg` : 'Sin pesar'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Dirección de Recogida</p>
                    <p className="font-medium">{order.pickup_address}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Horario Preferido</p>
                    <p className="font-medium">{order.scheduled_pickup || 'Cualquier hora'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Preferences */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Preferencias del Cliente</CardTitle>
              </CardHeader>
              <CardContent>
                {preferences ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Ropa blanca separada</span>
                      <Badge variant={preferences.separate_whites ? 'default' : 'secondary'}>
                        {preferences.separate_whites ? 'Sí' : 'No'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Suavizante</span>
                      <Badge variant={preferences.apply_softener ? 'default' : 'secondary'}>
                        {preferences.apply_softener ? 'Sí' : 'No'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Blanqueador</span>
                      <Badge variant={preferences.apply_bleach ? 'default' : 'secondary'}>
                        {preferences.apply_bleach ? 'Sí' : 'No'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Desengrasante</span>
                      <Badge variant={preferences.apply_degreaser ? 'default' : 'secondary'}>
                        {preferences.apply_degreaser ? 'Sí' : 'No'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Planchado</span>
                      <Badge variant={preferences.ironing ? 'default' : 'secondary'}>
                        {preferences.ironing ? 'Sí' : 'No'}
                      </Badge>
                    </div>
                    {preferences.scent && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Aroma</span>
                        <Badge>{preferences.scent}</Badge>
                      </div>
                    )}
                    {preferences.special_instructions && (
                      <div className="pt-2 border-t">
                        <p className="text-sm text-muted-foreground">Instrucciones especiales:</p>
                        <p className="text-sm mt-1">{preferences.special_instructions}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Sin preferencias especiales</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Asignación de Domiciliario */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bike className="h-5 w-5" />
                Asignación de Domiciliario
              </CardTitle>
              <CardDescription>
                Asigna esta orden a un domiciliario para su recogida o entrega
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-3 items-end">
                <div className="space-y-2 flex-1">
                  <Label>Seleccionar Domiciliario</Label>
                  <Select value={selectedDomiciliario} onValueChange={setSelectedDomiciliario}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sin asignar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Sin asignar</SelectItem>
                      {domiciliarios.map(dom => (
                        <SelectItem key={dom.id} value={dom.id}>
                          {dom.full_name || 'Domiciliario sin nombre'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleAssignDomiciliario} 
                  disabled={assigning || selectedDomiciliario === (order?.delivery_person_id || 'unassigned')}
                  className="w-full sm:w-auto"
                >
                  {assigning ? 'Asignando...' : 'Guardar Asignación'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Process Control */}
          {!isCompleted && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Control de Proceso</CardTitle>
                <CardDescription>
                  {canStartProcess ? 'Configura y comienza el proceso de lavado' : 'Gestiona el progreso del lavado'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Machine Selection */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Lavadora</Label>
                    <Select value={selectedMachine} onValueChange={setSelectedMachine}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar lavadora" />
                      </SelectTrigger>
                      <SelectContent>
                        {WASHING_MACHINES.map(machine => (
                          <SelectItem key={machine.id} value={machine.id}>
                            {machine.name} ({machine.capacity})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Secadora</Label>
                    <Select value={selectedDryer} onValueChange={setSelectedDryer}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar secadora" />
                      </SelectTrigger>
                      <SelectContent>
                        {DRYERS.map(dryer => (
                          <SelectItem key={dryer.id} value={dryer.id}>
                            {dryer.name} ({dryer.capacity})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                {/* Process Steps */}
                <div className="space-y-4">
                  <Label>Pasos del Proceso</Label>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {PROCESS_STEPS.map(step => (
                      <div
                        key={step.key}
                        className={`p-4 rounded-lg border-2 text-center cursor-pointer transition-colors ${
                          completedSteps[step.key]
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => handleStepToggle(step.key)}
                      >
                        <step.icon className={`h-6 w-6 mx-auto mb-2 ${
                          completedSteps[step.key] ? 'text-primary' : 'text-muted-foreground'
                        }`} />
                        <p className="text-sm font-medium">{step.label}</p>
                        <Checkbox
                          checked={completedSteps[step.key]}
                          className="mt-2"
                          onCheckedChange={() => handleStepToggle(step.key)}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Notes */}
                <div className="space-y-2">
                  <Label>Notas del Proceso</Label>
                  <Textarea
                    placeholder="Observaciones, problemas encontrados, etc."
                    value={processNotes}
                    onChange={(e) => setProcessNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                  {canStartProcess && (
                    <Button onClick={handleStartProcess} disabled={saving} className="flex-1">
                      <Play className="mr-2 h-4 w-4" />
                      Iniciar Proceso
                    </Button>
                  )}
                  {isProcessing && (
                    <>
                      <Button onClick={handleUpdateProcess} disabled={saving} variant="outline" className="flex-1">
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Guardar Progreso
                      </Button>
                      <Button 
                        onClick={handleCompleteProcess} 
                        disabled={saving || !Object.values(completedSteps).every(v => v)} 
                        className="flex-1"
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Completar y Generar Recibo
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Completed Status */}
          {isCompleted && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="py-6 text-center">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-600" />
                <h3 className="text-lg font-semibold text-green-800">Proceso Completado</h3>
                <p className="text-green-700 mt-1">
                  Este pedido ha sido procesado y está listo para entrega.
                </p>
                <Button variant="outline" className="mt-4" onClick={() => router.push('/operador/tickets')}>
                  <FileText className="mr-2 h-4 w-4" />
                  Ver Todos los Tickets
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}