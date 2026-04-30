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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
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
  Bike,
  Lock,
  XCircle
} from 'lucide-react'
import type { Order, OrderPreferences, WashingProcess } from '@/lib/types'
import { MachineTimer } from '@/components/operador/machine-timer'

// Fallback mock machines (used if 'machines' table doesn't exist)
const MOCK_WASHERS = [
  { id: 'LV-001', name: 'Lavadora Industrial 1', capacity: '20kg', status: 'disponible' },
  { id: 'LV-002', name: 'Lavadora Industrial 2', capacity: '20kg', status: 'disponible' },
  { id: 'LV-003', name: 'Lavadora Mediana 1', capacity: '12kg', status: 'disponible' },
  { id: 'LV-004', name: 'Lavadora Mediana 2', capacity: '12kg', status: 'disponible' },
  { id: 'LV-005', name: 'Lavadora Delicados', capacity: '8kg', status: 'disponible' },
]
const MOCK_DRYERS = [
  { id: 'SC-001', name: 'Secadora Industrial 1', capacity: '25kg', status: 'disponible' },
  { id: 'SC-002', name: 'Secadora Industrial 2', capacity: '25kg', status: 'disponible' },
  { id: 'SC-003', name: 'Secadora Mediana 1', capacity: '15kg', status: 'disponible' },
]

// NUEVO: Opciones de tiempo para los timers
const TIME_OPTIONS = [
  { value: '15', label: '15 minutos (Rápido)' },
  { value: '30', label: '30 minutos (Normal)' },
  { value: '45', label: '45 minutos (Profundo)' },
  { value: '60', label: '1 hora (Pesado)' },
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
  
  // NUEVO: Estados para los tiempos seleccionados
  const [machineTime, setMachineTime] = useState('')
  const [dryerTime, setDryerTime] = useState('')

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
  // supabase is always non-null when env vars are set; guards are in loadOrder useEffect
  const supabase = createClient()!

  // Live machine lists loaded from DB
  const [washers, setWashers] = useState<{ id: string; name: string; capacity: string; status: string; end_time?: string | null; total_minutes?: number | null }[]>(MOCK_WASHERS)
  const [dryers, setDryers] = useState<{ id: string; name: string; capacity: string; status: string; end_time?: string | null; total_minutes?: number | null }[]>(MOCK_DRYERS)
  const [usingMockMachines, setUsingMockMachines] = useState(true)

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
      }

      // --- CROSS-REFERENCE WITH MACHINES TABLE ---
      // If a machine has current_order_id = this order, we KNOW alistamiento is done
      // and the wash is active, regardless of what orders.status says.
      const { data: activeMachines } = await supabase
        .from('machines')
        .select('id, type, status, end_time, total_minutes')
        .eq('current_order_id', id)

      let detectedWasher = processData?.washing_machine_id || ''
      let detectedDryer  = processData?.dryer_id || ''
      let machineForced  = false

      if (activeMachines && activeMachines.length > 0) {
        for (const m of activeMachines) {
          if (m.type === 'lavadora') { detectedWasher = m.id; machineForced = true }
          if (m.type === 'secadora') { detectedDryer = m.id }
        }
      }

      if (detectedWasher) setSelectedMachine(detectedWasher)
      if (detectedDryer)  setSelectedDryer(detectedDryer)

      // Derive completed steps from order STATUS as the ground truth
      const statusOrder = ['pendiente','recogido','en_deposito','en_transito','en_lavado','en_secado','en_alistamiento','listo','en_ruta_entrega','entregado','completado']
      let effectiveStatus = orderData.status

      // Auto-repair: if machine is en_uso for this order but orders.status is stale, fix it
      if (machineForced && !['en_lavado','en_secado','en_alistamiento','listo','en_ruta_entrega','entregado','completado'].includes(orderData.status)) {
        await supabase
          .from('orders')
          .update({ status: 'en_lavado', updated_at: new Date().toISOString() })
          .eq('id', id)
        effectiveStatus = 'en_lavado'
        setOrder({ ...orderData, status: 'en_lavado' })
      }

      const statusIdx = statusOrder.indexOf(effectiveStatus)
      const fromProcess = processData || {}
      setCompletedSteps({
        alistamiento: (fromProcess as any).alistamiento_completed || machineForced || statusIdx >= statusOrder.indexOf('en_lavado'),
        lavado:       (fromProcess as any).lavado_completed       || statusIdx >= statusOrder.indexOf('en_secado'),
        secado:       (fromProcess as any).secado_completed       || statusIdx >= statusOrder.indexOf('en_alistamiento'),
        planchado:    (fromProcess as any).planchado_completed    || statusIdx >= statusOrder.indexOf('listo'),
        doblado:      (fromProcess as any).doblado_completed      || statusIdx >= statusOrder.indexOf('listo'),
      })

      setLoading(false)
    }

    loadOrder()

    // Load machines from Supabase
    const loadMachines = async () => {
      const { data, error } = await supabase
        .from('machines')
        .select('id, name, capacity, type, status, end_time, total_minutes, current_order_id')
        .order('name')
      if (!error && data && data.length > 0) {
        setWashers(data.filter((m: any) => m.type === 'lavadora'))
        setDryers(data.filter((m: any) => m.type === 'secadora'))
        setUsingMockMachines(false)
      }
    }
    loadMachines()

    // Realtime subscription to machines (updates status when washer/dryer changes)
    const machinesChannel = supabase
      .channel(`ticket-machines-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'machines' }, () => loadMachines())
      .subscribe()

    return () => { supabase.removeChannel(machinesChannel) }

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
      const { data: { user } } = await supabase.auth.getUser()

      // Update delivery person
      const { error } = await supabase
        .from('orders')
        .update({ delivery_person_id: valToSave })
        .eq('id', id)

      if (error) throw error

      // If assigning (not removing) and order is ready for delivery, move to en_ruta_entrega
      if (valToSave && (order?.status === 'listo' || order?.status === 'en_alistamiento')) {
        await supabase
          .from('orders')
          .update({ status: 'en_ruta_entrega', updated_at: new Date().toISOString() })
          .eq('id', id)

        await supabase.from('order_history').insert({
          order_id: id,
          status: 'en_ruta_entrega',
          notes: `Domiciliario asignado para entrega`,
          changed_by: user?.id ?? null,
        })
      }

      toast.success(valToSave ? 'Domiciliario asignado correctamente' : 'Asignación removida')
      
      const { data: newOrder } = await supabase.from('orders').select('*').eq('id', id).single()
      if (newOrder) {
        setOrder(newOrder)
        if (newOrder.delivery_person_id) setSelectedDomiciliario(newOrder.delivery_person_id)
        else setSelectedDomiciliario('unassigned')
      }
    } catch (error: any) {
      console.error("Error completo de Supabase:", error);
      toast.error(`Error real: ${error.message || 'Revisa la consola'}`);
    }
    setAssigning(false)
  }

  // --- PHASE CONTROL (M3) ---

  const writeHistory = async (newStatus: string, notes: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('order_history').insert({
      order_id: id,
      status: newStatus,
      notes,
      changed_by: user?.id ?? null,
    })
  }

  /** Operator confirms washing is done. Frees washer, moves order to en_secado. */
  const handleConfirmWashingEnd = async () => {
    setSaving(true)
    try {
      // Mark washing_ended timestamp
      await supabase
        .from('washing_process')
        .update({ washing_ended: new Date().toISOString(), lavado_completed: true })
        .eq('order_id', id)

      // Release the washer
      if (selectedMachine) {
        await supabase
          .from('machines')
          .update({ status: 'disponible', current_order_id: null, end_time: null })
          .eq('id', selectedMachine)
      }

      // Update order status
      await supabase
        .from('orders')
        .update({ status: 'en_secado', updated_at: new Date().toISOString() })
        .eq('id', id)

      await writeHistory('en_secado', 'Lavado completado por operador. Lavadora liberada.')

      toast.success('Lavado confirmado. Orden pasa a secado.')
      const { data: newOrder } = await supabase.from('orders').select('*').eq('id', id).single()
      if (newOrder) setOrder(newOrder)
    } catch { toast.error('Error al confirmar fin de lavado') }
    setSaving(false)
  }

  /** Operator starts drying independently with its own timer. */
  const handleStartDrying = async () => {
    if (!selectedDryer) { toast.error('Selecciona una secadora'); return }
    setSaving(true)
    try {
      const completionTime = new Date()
      if (dryerTime) completionTime.setMinutes(completionTime.getMinutes() + parseInt(dryerTime))

      // Update process with drying info
      await supabase
        .from('washing_process')
        .update({
          dryer_id: selectedDryer,
          drying_started: new Date().toISOString(),
        })
        .eq('order_id', id)

      // Set dryer in-use
      if (dryerTime) {
        await supabase
          .from('machines')
          .update({ status: 'en_uso', current_order_id: id, end_time: completionTime.toISOString(), total_minutes: parseInt(dryerTime) })
          .eq('id', selectedDryer)
      }

      await writeHistory('en_secado', `Secado iniciado. Secadora: ${selectedDryer}.`)
      toast.success('Timer de secadora activado.')
    } catch { toast.error('Error al iniciar secado') }
    setSaving(false)
  }

  /** Operator confirms drying is done. Frees dryer, moves to en_alistamiento. */
  const handleConfirmDryingEnd = async () => {
    setSaving(true)
    try {
      await supabase
        .from('washing_process')
        .update({ drying_ended: new Date().toISOString(), secado_completed: true })
        .eq('order_id', id)

      if (selectedDryer) {
        await supabase
          .from('machines')
          .update({ status: 'disponible', current_order_id: null, end_time: null })
          .eq('id', selectedDryer)
      }

      await supabase
        .from('orders')
        .update({ status: 'en_alistamiento', updated_at: new Date().toISOString() })
        .eq('id', id)

      await writeHistory('en_alistamiento', 'Secado completado por operador. Secadora liberada.')

      toast.success('Secado confirmado. Orden pasa a alistamiento.')
      const { data: newOrder } = await supabase.from('orders').select('*').eq('id', id).single()
      if (newOrder) setOrder(newOrder)
    } catch { toast.error('Error al confirmar fin de secado') }
    setSaving(false)
  }

  /** Cancels the active process: releases machine, deletes washing_process, resets order to recogido */
  const handleCancelProcess = async () => {
    setSaving(true)
    try {
      // Release associated washer
      if (selectedMachine) {
        await supabase
          .from('machines')
          .update({ status: 'disponible', current_order_id: null, end_time: null, total_minutes: null })
          .eq('id', selectedMachine)
      }
      // Release associated dryer (if any)
      if (selectedDryer) {
        await supabase
          .from('machines')
          .update({ status: 'disponible', current_order_id: null, end_time: null, total_minutes: null })
          .eq('id', selectedDryer)
      }
      // Delete washing_process record
      if (process) {
        await supabase.from('washing_process').delete().eq('id', process.id)
      }
      // Reset order status to recogido
      await supabase
        .from('orders')
        .update({ status: 'recogido', updated_at: new Date().toISOString() })
        .eq('id', id)
      await writeHistory('recogido', 'Proceso cancelado por operador. Máquinas liberadas.')

      // Reset all local state
      setProcess(null)
      setSelectedMachine('')
      setSelectedDryer('')
      setMachineTime('')
      setDryerTime('')
      setCompletedSteps({ alistamiento: false, lavado: false, secado: false, planchado: false, doblado: false })
      const { data: upd } = await supabase.from('orders').select('*').eq('id', id).single()
      if (upd) setOrder(upd)

      toast.success('Proceso cancelado. Máquinas liberadas. Orden reiniciada.')
    } catch {
      toast.error('Error al cancelar el proceso')
    }
    setSaving(false)
  }

  const handleStartProcess = async () => {
    if (!selectedMachine && completedSteps.lavado === false) {
      toast.error('Selecciona una lavadora para iniciar')
      return
    }
    if (!machineTime) {
      toast.error('Selecciona el tiempo de lavado')
      return
    }

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const completionTime = new Date()
      completionTime.setMinutes(completionTime.getMinutes() + parseInt(machineTime))
      
      // Alistamiento is confirmed when operator clicks this button
      const newSteps = { ...completedSteps, alistamiento: true }

      const processPayload = {
        order_id: id,
        operator_id: user?.id,
        washing_machine_id: selectedMachine,
        dryer_id: selectedDryer || null,
        started_at: new Date().toISOString(),
        washing_started: new Date().toISOString(),
        notes: processNotes,
        alistamiento_completed: true,
        lavado_completed: false,
        secado_completed: false,
        planchado_completed: false,
        doblado_completed: false,
      }

      if (process) {
        await supabase.from('washing_process').update(processPayload).eq('id', process.id)
      } else {
        await supabase.from('washing_process').insert(processPayload)
      }

      // Activate machine timer
      if (selectedMachine && machineTime) {
        await supabase
          .from('machines')
          .update({ 
            status: 'en_uso', 
            current_order_id: id,
            end_time: completionTime.toISOString(),
            total_minutes: parseInt(machineTime)
          })
          .eq('id', selectedMachine)
      }

      await supabase
        .from('orders')
        .update({ status: 'en_lavado', updated_at: new Date().toISOString() })
        .eq('id', id)

      await writeHistory('en_lavado', `Lavado iniciado. Lavadora: ${selectedMachine}. Alistamiento confirmado.`)

      toast.success('Proceso de lavado iniciado ✓ Alistamiento marcado')
      
      // Refresh from DB
      const { data: newOrder } = await supabase.from('orders').select('*').eq('id', id).single()
      if (newOrder) setOrder(newOrder)
      
      const { data: newProcess } = await supabase.from('washing_process').select('*').eq('order_id', id).single()
      if (newProcess) setProcess(newProcess)

      // Update local step state immediately
      setCompletedSteps(newSteps)
      
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

      // Activate dryer timer if selected and time provided
      if (selectedDryer && dryerTime && !completedSteps.secado) {
        const completionTime = new Date()
        completionTime.setMinutes(completionTime.getMinutes() + parseInt(dryerTime))
        await supabase
          .from('machines')
          .update({ status: 'en_uso', current_order_id: id, end_time: completionTime.toISOString(), total_minutes: parseInt(dryerTime) })
          .eq('id', selectedDryer)
        toast.success('Timer de secadora activado')
      }

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

      // Liberar las máquinas (Limpiar los timers)
      if (selectedMachine) {
        await supabase.from('machines').update({ status: 'available', current_order_id: null, end_time: null }).eq('id', selectedMachine)
      }
      if (selectedDryer) {
        await supabase.from('machines').update({ status: 'available', current_order_id: null, end_time: null }).eq('id', selectedDryer)
      }

      await supabase
        .from('washing_process')
        .update({
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('order_id', id)

      await supabase
        .from('orders')
        .update({ status: 'en_ruta_entrega', updated_at: new Date().toISOString() })
        .eq('id', id)

      const totalAmount = (order?.weight_kg || 1) * 8000
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

      toast.success('Proceso completado. Máquinas liberadas. Recibo generado.')
      router.push('/operador/tickets')
      
    } catch {
      toast.error('Error al completar el proceso')
    }
    setSaving(false)
  }

  const calculateExtras = (prefs: OrderPreferences): number => {
    let extras = 0
    if (prefs.separate_whites) extras += 3000
    if (prefs.use_softener) extras += 2000
    if (prefs.use_bleach) extras += 2500
    if (prefs.use_degreaser) extras += 3000
    if (prefs.ironing_required) extras += 5000
    return extras
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'pendiente': 'bg-yellow-100 text-yellow-800',
      'recogido': 'bg-blue-100 text-blue-800',
      'en_deposito': 'bg-purple-100 text-purple-800', // Modificado para el nuevo estado
      'en_transito': 'bg-indigo-100 text-indigo-800',
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
      'en_deposito': 'En Depósito', // Modificado
      'en_transito': 'En Tránsito', // Modificado
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

  // Actualizamos las condiciones para incluir los nuevos estados
  const canStartProcess = ['en_deposito', 'en_transito'].includes(order.status) || order.status === 'pendiente' || order.status === 'recogido'
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

          {/* NUEVO: CÓDIGO DE SEGURIDAD ULTRA VISIBLE */}
          {order.reception_code && !isCompleted && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-100 p-2 rounded-full">
                  <Lock className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-indigo-900">Código de Seguridad (Handshake)</p>
                  <p className="text-xs text-indigo-700">Pide este código al domiciliario para recibir la bolsa.</p>
                </div>
              </div>
              <div className="text-3xl font-mono font-bold text-indigo-600 tracking-widest bg-white px-4 py-2 rounded-md border border-indigo-100">
                {order.reception_code}
              </div>
            </div>
          )}

          {/* Order Info */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Información del Pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Cliente</p>
                    <p className="font-medium">
                      {order.walk_in_name ?? order.client?.full_name ?? 'Cliente registrado'}
                    </p>
                    {order.walk_in_phone && (
                      <p className="text-sm text-muted-foreground">{order.walk_in_phone}</p>
                    )}
                  </div>
                </div>
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
                    <p className="font-medium">{order.actual_weight ? `${order.actual_weight} kg` : 'Sin pesar'}</p>
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
                      <Badge variant={preferences.use_softener ? 'default' : 'secondary'}>
                        {preferences.use_softener ? 'Sí' : 'No'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Blanqueador</span>
                      <Badge variant={preferences.use_bleach ? 'default' : 'secondary'}>
                        {preferences.use_bleach ? 'Sí' : 'No'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Desengrasante</span>
                      <Badge variant={preferences.use_degreaser ? 'default' : 'secondary'}>
                        {preferences.use_degreaser ? 'Sí' : 'No'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Planchado</span>
                      <Badge variant={preferences.ironing_required ? 'default' : 'secondary'}>
                        {preferences.ironing_required ? 'Sí' : 'No'}
                      </Badge>
                    </div>
                    {preferences.fragrance && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Fragancia</span>
                        <Badge>{preferences.fragrance}</Badge>
                      </div>
                    )}
                    {preferences.notes && (
                      <div className="pt-2 border-t">
                        <p className="text-sm text-muted-foreground">Notas especiales:</p>
                        <p className="text-sm mt-1">{preferences.notes}</p>
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
                <CardTitle className="text-base">Control de Proceso (Con Timers)</CardTitle>
                <CardDescription>
                  {canStartProcess ? 'Configura y comienza el proceso de lavado' : 'Gestiona el progreso del lavado'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Machine & Time Selection — only shown BEFORE washing starts */}
                {!isProcessing && order.status !== 'listo' && (
                <div className="grid md:grid-cols-2 gap-6 bg-muted/50 p-4 rounded-lg border">
                  
                  {/* Lavadora */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Droplets className="w-4 h-4 text-blue-500" /> Lavadora
                        {usingMockMachines && <span className="text-xs text-yellow-600 ml-1">(demo)</span>}
                      </Label>
                      <Select
                        value={selectedMachine}
                        onValueChange={(v) => {
                          // Only allow selecting disponible machines (or current assignment)
                          const m = washers.find(x => x.id === v)
                          if (m && m.status !== 'disponible' && v !== selectedMachine) {
                            return // silently block — item is visually disabled
                          }
                          setSelectedMachine(v)
                        }}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Seleccionar lavadora" />
                        </SelectTrigger>
                        <SelectContent>
                          {washers.map(m => (
                            <SelectItem
                              key={m.id}
                              value={m.id}
                              disabled={m.status !== 'disponible' && m.id !== selectedMachine}
                            >
                              {m.name} ({m.capacity})
                              {m.status === 'en_uso' && ' — En Uso'}
                              {m.status === 'mantenimiento' && ' — Mantenimiento'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Live timer when washing is active */}
                    {order.status === 'en_lavado' && selectedMachine && (() => {
                      const m = washers.find(x => x.id === selectedMachine)
                      return m?.end_time && m.total_minutes ? (
                        <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg border border-blue-200">
                          <span className="text-xs text-blue-700 font-medium">Timer lavado activo</span>
                          <MachineTimer
                            machineId={m.id}
                            endTime={m.end_time!}
                            totalMinutes={m.total_minutes!}
                            type="lavadora"
                            onComplete={() => { /* Realtime will refresh */ }}
                          />
                        </div>
                      ) : null
                    })()}
                    {selectedMachine && !completedSteps.lavado && (
                      <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                        <Label className="text-xs text-muted-foreground">Tiempo de Lavado (Timer)</Label>
                        <Select value={machineTime} onValueChange={setMachineTime}>
                          <SelectTrigger className="bg-background border-blue-200">
                            <SelectValue placeholder="Seleccionar tiempo..." />
                          </SelectTrigger>
                          <SelectContent>
                            {TIME_OPTIONS.map(time => (
                              <SelectItem key={time.value} value={time.value}>{time.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {/* Secadora */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Wind className="w-4 h-4 text-orange-500" /> Secadora
                      </Label>
                      <Select
                        value={selectedDryer}
                        onValueChange={(v) => {
                          const m = dryers.find(x => x.id === v)
                          if (m && m.status !== 'disponible' && v !== selectedDryer) return
                          setSelectedDryer(v)
                        }}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Seleccionar secadora" />
                        </SelectTrigger>
                        <SelectContent>
                          {dryers.map(m => (
                            <SelectItem
                              key={m.id}
                              value={m.id}
                              disabled={m.status !== 'disponible' && m.id !== selectedDryer}
                            >
                              {m.name} ({m.capacity})
                              {m.status === 'en_uso' && ' — En Uso'}
                              {m.status === 'mantenimiento' && ' — Mantenimiento'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedDryer && !completedSteps.secado && (
                      <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                        <Label className="text-xs text-muted-foreground">Tiempo de Secado (Timer)</Label>
                        <Select value={dryerTime} onValueChange={setDryerTime}>
                          <SelectTrigger className="bg-background border-orange-200">
                            <SelectValue placeholder="Seleccionar tiempo..." />
                          </SelectTrigger>
                          <SelectContent>
                            {TIME_OPTIONS.map(time => (
                              <SelectItem key={time.value} value={time.value}>{time.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>
                )} {/* end machine selection panel */}

                {/* Active process info banner — shown when washing/drying is running */}
                {isProcessing && (
                  <div className="flex flex-col sm:flex-row gap-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                    {selectedMachine && (
                      <div className="flex items-center gap-2 text-sm">
                        <Droplets className="h-4 w-4 text-blue-500 shrink-0" />
                        <span className="text-muted-foreground">Lavadora:</span>
                        <span className="font-semibold text-blue-700">{washers.find(m => m.id === selectedMachine)?.name || selectedMachine}</span>
                      </div>
                    )}
                    {selectedDryer && order.status === 'en_secado' && (
                      <div className="flex items-center gap-2 text-sm">
                        <Wind className="h-4 w-4 text-orange-500 shrink-0" />
                        <span className="text-muted-foreground">Secadora:</span>
                        <span className="font-semibold text-orange-700">{dryers.find(m => m.id === selectedDryer)?.name || selectedDryer}</span>
                      </div>
                    )}
                  </div>
                )}

                <Separator />

                {/* Process Steps */}
                <div className="space-y-4">
                  <Label>Pasos del Proceso</Label>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {PROCESS_STEPS.map(step => {
                      const done = completedSteps[step.key]
                      return (
                        <div
                          key={step.key}
                          className={`p-4 rounded-lg border-2 text-center transition-colors ${
                            done
                              ? 'border-green-500 bg-green-50 cursor-default'
                              : 'border-border hover:border-primary/50 cursor-pointer'
                          }`}
                          onClick={() => !done && handleStepToggle(step.key)}
                        >
                          {done ? (
                            <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-green-600" />
                          ) : (
                            <step.icon className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                          )}
                          <p className={`text-sm font-medium ${done ? 'text-green-700' : ''}`}>{step.label}</p>
                          {done ? (
                            <p className="text-xs text-green-600 mt-1 font-semibold">✓ Completado</p>
                          ) : (
                            <Checkbox
                              checked={false}
                              className="mt-2"
                              onCheckedChange={() => handleStepToggle(step.key)}
                            />
                          )}
                        </div>
                      )
                    })}
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

                {/* Smart Action Button — changes based on current order.status */}
                <div className="flex flex-col sm:flex-row gap-3">

                  {/* CANCEL PROCESS — visible whenever a wash is active or machine is assigned */}
                  {(isProcessing || (process && selectedMachine)) && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" disabled={saving} className="flex-1 border-red-300 text-red-600 hover:bg-red-50">
                          <XCircle className="mr-2 h-4 w-4" />
                          Cancelar Proceso
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Cancelar el proceso de lavado?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción liberará la(s) máquina(s) asignada(s), eliminará el registro del proceso y volverá el estado de la orden a <strong>Recogido</strong>. No se puede deshacer.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Volver</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleCancelProcess}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Sí, cancelar proceso
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  
                  {/* STEP 1: Not yet started — show Iniciar Lavado */}
                  {(canStartProcess || order.status === 'en_deposito') && !isProcessing && (
                    <Button
                      onClick={handleStartProcess}
                      disabled={saving || !selectedMachine || !machineTime}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      <Play className="mr-2 h-4 w-4" />
                      {saving ? 'Iniciando...' : 'Iniciar Lavado y Timer ▶'}
                    </Button>
                  )}

                  {/* STEP 2: en_lavado — show Confirmar Lavado Completado */}
                  {order.status === 'en_lavado' && (
                    <Button
                      onClick={handleConfirmWashingEnd}
                      disabled={saving}
                      className="flex-1 bg-cyan-600 hover:bg-cyan-700"
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      {saving ? 'Guardando...' : '✓ Confirmar Lavado Completado'}
                    </Button>
                  )}

                  {/* STEP 3a: en_secado without dryer assigned — show Iniciar Secado */}
                  {order.status === 'en_secado' && !completedSteps.secado && !process?.drying_started && (
                    <Button
                      onClick={handleStartDrying}
                      disabled={saving || !selectedDryer || !dryerTime}
                      className="flex-1 bg-orange-500 hover:bg-orange-600"
                    >
                      <Play className="mr-2 h-4 w-4" />
                      {saving ? 'Iniciando...' : 'Iniciar Secado y Timer ▶'}
                    </Button>
                  )}

                  {/* STEP 3b: en_secado with dryer active — show Confirmar Secado */}
                  {order.status === 'en_secado' && (process?.drying_started || completedSteps.secado) && (
                    <Button
                      onClick={handleConfirmDryingEnd}
                      disabled={saving || completedSteps.secado}
                      className="flex-1 bg-orange-600 hover:bg-orange-700"
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      {saving ? 'Guardando...' : '✓ Confirmar Secado Completado'}
                    </Button>
                  )}

                  {/* STEP 4: en_alistamiento — Planchado */}
                  {order.status === 'en_alistamiento' && !completedSteps.planchado && (
                    <Button
                      onClick={async () => {
                        setSaving(true)
                        try {
                          await supabase.from('washing_process').update({ planchado_completed: true }).eq('order_id', id)
                          await supabase.from('orders').update({ status: 'en_alistamiento', updated_at: new Date().toISOString() }).eq('id', id)
                          await writeHistory('en_alistamiento', 'Planchado completado por operador.')
                          setCompletedSteps(prev => ({ ...prev, planchado: true }))
                          toast.success('✓ Planchado marcado como completado')
                        } catch { toast.error('Error al confirmar planchado') }
                        setSaving(false)
                      }}
                      disabled={saving}
                      className="flex-1 bg-pink-600 hover:bg-pink-700"
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      {saving ? 'Guardando...' : '✓ Confirmar Planchado'}
                    </Button>
                  )}

                  {/* STEP 5: en_alistamiento + planchado done — Confirmar Doblado = listo */}
                  {order.status === 'en_alistamiento' && completedSteps.planchado && !completedSteps.doblado && (
                    <Button
                      onClick={async () => {
                        setSaving(true)
                        try {
                          await supabase.from('washing_process').update({ doblado_completed: true }).eq('order_id', id)
                          await supabase.from('orders').update({ status: 'listo', updated_at: new Date().toISOString() }).eq('id', id)
                          await writeHistory('listo', 'Doblado completado. Orden lista para entrega.')
                          setCompletedSteps(prev => ({ ...prev, doblado: true }))
                          const { data: upd } = await supabase.from('orders').select('*').eq('id', id).single()
                          if (upd) setOrder(upd)
                          toast.success('✓ Doblado completado. ¡Orden lista para entrega!')
                        } catch { toast.error('Error al confirmar doblado') }
                        setSaving(false)
                      }}
                      disabled={saving}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      {saving ? 'Guardando...' : '✓ Confirmar Doblado — Marcar Listo'}
                    </Button>
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