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
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  QrCode,
  Scale,
  MapPin,
  Clock,
  User,
  Droplets,
  Wind,
  CheckCircle2,
  Play,
  FileText,
  Bike,
  Lock,
  XCircle,
  Save,
  Loader2
} from 'lucide-react'
import { formatOrderNumber, type Order, type OrderPreferences, type WashingProcess } from '@/lib/types'
import { MachineTimer } from '@/components/operador/machine-timer'
import { PaymentButton } from '@/components/payment-button'
import { TicketPrintButton } from '@/components/operador/ticket-print-button'

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


export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [order, setOrder] = useState<Order | any>(null)
  const [clientName, setClientName] = useState<string | null>(null)
  const [preferences, setPreferences] = useState<OrderPreferences | null>(null)
  const [process, setProcess] = useState<WashingProcess | null>(null)
  const [domiciliarios, setDomiciliarios] = useState<any[]>([])
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [weightInput, setWeightInput] = useState('')
  const [savingWeight, setSavingWeight] = useState(false)
  
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
      setWeightInput(String(orderData.actual_weight ?? orderData.weight_kg ?? ''))

      // Fetch client name for registered clients
      if (orderData.walk_in_name) {
        setClientName(orderData.walk_in_name)
      } else if (orderData.user_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', orderData.user_id)
          .single()
        setClientName(profile?.full_name ?? null)
      }

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

  const handleSaveWeight = async () => {
    const parsed = parseFloat(weightInput)
    if (isNaN(parsed) || parsed <= 0) {
      toast.error('Ingresa un peso válido mayor a 0')
      return
    }
    setSavingWeight(true)
    try {
      const { error } = await supabase
        .from('orders')
        .update({ weight_kg: parsed, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) {
        console.error('Error actualizando peso:', error)
        toast.error(`Error: ${error.message}`)
        return
      }
      setOrder((prev: any) => ({ ...prev, weight_kg: parsed }))
      toast.success('Peso actualizado')
    } catch (e) {
      console.error('Error inesperado peso:', e)
      toast.error('Error inesperado al actualizar el peso')
    }
    setSavingWeight(false)
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
      const { error: e1 } = await supabase
        .from('washing_process')
        .update({ washing_ended: new Date().toISOString(), lavado_completed: true, updated_at: new Date().toISOString() })
        .eq('order_id', id)
      if (e1) { toast.error(`Error al guardar lavado: ${e1.message}`); return }

      if (selectedMachine) {
        await supabase.from('machines')
          .update({ status: 'disponible', current_order_id: null, end_time: null })
          .eq('id', selectedMachine)
      }

      const { error: e2 } = await supabase.from('orders')
        .update({ status: 'en_secado', updated_at: new Date().toISOString() })
        .eq('id', id)
      if (e2) { toast.error(`Error al actualizar estado: ${e2.message}`); return }

      await writeHistory('en_secado', 'Lavado completado por operador. Lavadora liberada.')
      setCompletedSteps(prev => ({ ...prev, lavado: true }))
      toast.success('✓ Lavado confirmado. Orden pasa a secado.')
      const { data: newOrder } = await supabase.from('orders').select('*').eq('id', id).single()
      if (newOrder) setOrder(newOrder)
    } catch (e: any) { toast.error(`Error: ${e?.message ?? 'Error al confirmar lavado'}`) }
    finally { setSaving(false) }
  }

  /** Operator starts drying independently with its own timer. */
  const handleStartDrying = async () => {
    if (!selectedDryer) { toast.error('Selecciona una secadora'); return }
    if (!dryerTime) { toast.error('Selecciona el tiempo de secado'); return }
    setSaving(true)
    try {
      const completionTime = new Date()
      completionTime.setMinutes(completionTime.getMinutes() + parseInt(dryerTime))

      const { error: e1 } = await supabase.from('washing_process')
        .update({ dryer_id: selectedDryer, drying_started: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('order_id', id)
      if (e1) { toast.error(`Error al guardar secado: ${e1.message}`); return }

      await supabase.from('machines')
        .update({ status: 'en_uso', current_order_id: id, end_time: completionTime.toISOString(), total_minutes: parseInt(dryerTime) })
        .eq('id', selectedDryer)

      await writeHistory('en_secado', `Secado iniciado. Secadora: ${selectedDryer}.`)
      toast.success('✓ Secado iniciado.')

      const { data: updProc } = await supabase.from('washing_process').select('*').eq('order_id', id).single()
      if (updProc) setProcess(updProc)
    } catch (e: any) { toast.error(`Error: ${e?.message ?? 'Error al iniciar secado'}`) }
    finally { setSaving(false) }
  }

  /** Operator confirms drying is done. Frees dryer, moves to en_alistamiento. */
  const handleConfirmDryingEnd = async () => {
    setSaving(true)
    try {
      const { error: e1 } = await supabase.from('washing_process')
        .update({ drying_ended: new Date().toISOString(), secado_completed: true, updated_at: new Date().toISOString() })
        .eq('order_id', id)
      if (e1) { toast.error(`Error al guardar secado: ${e1.message}`); return }

      if (selectedDryer) {
        await supabase.from('machines')
          .update({ status: 'disponible', current_order_id: null, end_time: null })
          .eq('id', selectedDryer)
      }

      const { error: e2 } = await supabase.from('orders')
        .update({ status: 'en_alistamiento', updated_at: new Date().toISOString() })
        .eq('id', id)
      if (e2) { toast.error(`Error al actualizar estado: ${e2.message}`); return }

      await writeHistory('en_alistamiento', 'Secado completado por operador. Secadora liberada.')
      setCompletedSteps(prev => ({ ...prev, secado: true }))
      toast.success('✓ Secado confirmado. Orden pasa a alistamiento.')
      const { data: newOrder } = await supabase.from('orders').select('*').eq('id', id).single()
      if (newOrder) setOrder(newOrder)
    } catch (e: any) { toast.error(`Error: ${e?.message ?? 'Error al confirmar secado'}`) }
    finally { setSaving(false) }
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

  const handleSaveAlistamiento = async () => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      let saveErr: any = null

      if (process) {
        const { error } = await supabase.from('washing_process')
          .update({ alistamiento_completed: true, updated_at: new Date().toISOString() })
          .eq('order_id', id)
        saveErr = error
      } else {
        const { data: newProc, error } = await supabase.from('washing_process').insert({
          order_id: id,
          operator_id: user?.id,
          alistamiento_completed: true,
          lavado_completed: false,
          secado_completed: false,
          planchado_completed: false,
          doblado_completed: false,
        }).select().single()
        saveErr = error
        if (newProc) setProcess(newProc)
      }

      if (saveErr) { toast.error(`Error al guardar alistamiento: ${saveErr.message}`); return }

      setCompletedSteps(prev => ({ ...prev, alistamiento: true }))
      await writeHistory(order.status, 'Alistamiento confirmado por operador.')
      toast.success('✓ Alistamiento confirmado')
    } catch (e: any) { toast.error(`Error: ${e?.message ?? 'Error al confirmar alistamiento'}`) }
    finally { setSaving(false) }
  }

  const handleStartLavado = async () => {
    if (!selectedMachine) { toast.error('Selecciona una lavadora'); return }
    if (!machineTime) { toast.error('Selecciona el tiempo de lavado'); return }
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const completionTime = new Date()
      completionTime.setMinutes(completionTime.getMinutes() + parseInt(machineTime))

      let procErr: any = null
      if (process) {
        const { error } = await supabase.from('washing_process').update({
          washing_machine_id: selectedMachine,
          washing_started: new Date().toISOString(),
          notes: processNotes,
          updated_at: new Date().toISOString(),
        }).eq('order_id', id)
        procErr = error
      } else {
        const { data: newProc, error } = await supabase.from('washing_process').insert({
          order_id: id,
          operator_id: user?.id,
          washing_machine_id: selectedMachine,
          washing_started: new Date().toISOString(),
          notes: processNotes,
          alistamiento_completed: true,
          lavado_completed: false,
          secado_completed: false,
          planchado_completed: false,
          doblado_completed: false,
        }).select().single()
        procErr = error
        if (newProc) setProcess(newProc)
      }
      if (procErr) { toast.error(`Error al guardar proceso: ${procErr.message}`); return }

      await supabase.from('machines').update({
        status: 'en_uso', current_order_id: id,
        end_time: completionTime.toISOString(),
        total_minutes: parseInt(machineTime),
      }).eq('id', selectedMachine)

      const { error: orderErr } = await supabase.from('orders')
        .update({ status: 'en_lavado', updated_at: new Date().toISOString() })
        .eq('id', id)
      if (orderErr) { toast.error(`Error al actualizar estado: ${orderErr.message}`); return }

      await writeHistory('en_lavado', `Lavado iniciado. Lavadora: ${selectedMachine}.`)
      toast.success('✓ Lavado iniciado')

      const { data: newOrder } = await supabase.from('orders').select('*').eq('id', id).single()
      if (newOrder) setOrder(newOrder)
      const { data: updProc } = await supabase.from('washing_process').select('*').eq('order_id', id).single()
      if (updProc) setProcess(updProc)
    } catch (e: any) { toast.error(`Error: ${e?.message ?? 'Error al iniciar lavado'}`) }
    finally { setSaving(false) }
  }

  const handleFinishPlanchado = async () => {
    setSaving(true)
    try {
      const { error } = await supabase.from('washing_process')
        .update({ planchado_completed: true, updated_at: new Date().toISOString() })
        .eq('order_id', id)
      if (error) { toast.error(`Error al guardar planchado: ${error.message}`); return }
      await writeHistory(order.status, 'Planchado completado por operador.')
      setCompletedSteps(prev => ({ ...prev, planchado: true }))
      toast.success('✓ Planchado confirmado')
    } catch (e: any) { toast.error(`Error: ${e?.message ?? 'Error al confirmar planchado'}`) }
    finally { setSaving(false) }
  }

  const handleFinishDoblado = async () => {
    setSaving(true)
    try {
      const { error: e1 } = await supabase.from('washing_process')
        .update({ doblado_completed: true, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('order_id', id)
      if (e1) { toast.error(`Error al guardar doblado: ${e1.message}`); return }

      const { error: e2 } = await supabase.from('orders')
        .update({ status: 'listo', updated_at: new Date().toISOString() })
        .eq('id', id)
      if (e2) { toast.error(`Error al actualizar estado: ${e2.message}`); return }

      await writeHistory('listo', 'Doblado completado. Orden lista para entrega.')
      setCompletedSteps(prev => ({ ...prev, doblado: true }))
      const { data: upd } = await supabase.from('orders').select('*').eq('id', id).single()
      if (upd) setOrder(upd)
      toast.success('✓ Doblado completado. ¡Orden lista para entrega!')
    } catch (e: any) { toast.error(`Error: ${e?.message ?? 'Error al confirmar doblado'}`) }
    finally { setSaving(false) }
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
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-foreground">
                  Ticket {formatOrderNumber(order.order_number)}
                </h1>
                <p className="text-xs font-mono text-muted-foreground">{order.qr_code}</p>
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
            <TicketPrintButton
              order={order}
              preferences={preferences}
              clientName={clientName}
            />
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
                    <p className="font-medium">{clientName ?? 'Sin nombre'}</p>
                    {order.walk_in_phone && (
                      <p className="text-sm text-muted-foreground">{order.walk_in_phone}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <QrCode className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Código QR</p>
                    <p className="font-mono text-sm text-muted-foreground">{order.qr_code}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Scale className="h-5 w-5 text-muted-foreground mt-2 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground mb-1">Peso</p>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={weightInput}
                        onChange={(e) => setWeightInput(e.target.value)}
                        className="h-8 w-28"
                        placeholder="0.0"
                      />
                      <span className="text-sm text-muted-foreground">kg</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleSaveWeight}
                        disabled={savingWeight}
                        className="h-8 px-2"
                      >
                        {savingWeight
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Save className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
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

          {/* Pago */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Pago</CardTitle>
                  <CardDescription>Registra el cobro del servicio al cliente</CardDescription>
                </div>
                <PaymentButton
                  orderId={id}
                  orderAmount={order?.final_price ?? order?.estimated_price ?? null}
                  onPaid={() => router.refresh()}
                />
              </div>
            </CardHeader>
          </Card>

          {/* Process Control — Stepper */}
          {!isCompleted && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Control del Proceso</CardTitle>
                    <CardDescription>Completa cada etapa en orden</CardDescription>
                  </div>
                  {(isProcessing || (process && selectedMachine)) && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" disabled={saving}
                          className="border-red-200 text-red-600 hover:bg-red-50 shrink-0">
                          <XCircle className="mr-1.5 h-3.5 w-3.5" /> Cancelar proceso
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Cancelar el proceso?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Se liberarán las máquinas y el estado de la orden volverá a <strong>Recogido</strong>. No se puede deshacer.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Volver</AlertDialogCancel>
                          <AlertDialogAction onClick={handleCancelProcess} className="bg-red-600 hover:bg-red-700">
                            Sí, cancelar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0 divide-y">

                {/* ── PASO 1: Alistamiento ── */}
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border-2 ${completedSteps.alistamiento ? 'bg-green-500 border-green-500 text-white' : 'border-muted-foreground/30 text-muted-foreground'}`}>
                      {completedSteps.alistamiento ? '✓' : '1'}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium text-sm ${completedSteps.alistamiento ? 'text-green-700' : ''}`}>Alistamiento</p>
                      <p className="text-xs text-muted-foreground">Clasificar y preparar la ropa</p>
                    </div>
                    {completedSteps.alistamiento && <Badge className="bg-green-100 text-green-800 text-xs shrink-0">Completado</Badge>}
                  </div>
                  {!completedSteps.alistamiento && canStartProcess && (
                    <div className="ml-10 mt-3">
                      <Button size="sm" onClick={handleSaveAlistamiento} disabled={saving}>
                        {saving ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-2 h-3.5 w-3.5" />}
                        Confirmar Alistamiento
                      </Button>
                    </div>
                  )}
                </div>

                {/* ── PASO 2: Lavado ── */}
                <div className={`p-4 transition-opacity ${!completedSteps.alistamiento ? 'opacity-40 pointer-events-none' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border-2 ${completedSteps.lavado ? 'bg-green-500 border-green-500 text-white' : order.status === 'en_lavado' ? 'bg-blue-500 border-blue-500 text-white' : 'border-muted-foreground/30 text-muted-foreground'}`}>
                      {completedSteps.lavado ? '✓' : order.status === 'en_lavado' ? '▶' : '2'}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium text-sm ${completedSteps.lavado ? 'text-green-700' : order.status === 'en_lavado' ? 'text-blue-700' : ''}`}>Lavado</p>
                      <p className="text-xs text-muted-foreground">Lavado en máquina</p>
                    </div>
                    {completedSteps.lavado && <Badge className="bg-green-100 text-green-800 text-xs shrink-0">Completado</Badge>}
                    {order.status === 'en_lavado' && !completedSteps.lavado && <Badge className="bg-blue-100 text-blue-800 text-xs shrink-0">En progreso</Badge>}
                  </div>
                  {completedSteps.alistamiento && !completedSteps.lavado && (
                    <div className="ml-10 mt-3 space-y-3">
                      {order.status !== 'en_lavado' ? (
                        <>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                <Droplets className="h-3 w-3" /> Lavadora
                                {usingMockMachines && <span className="text-yellow-500">(demo)</span>}
                              </Label>
                              <Select value={selectedMachine} onValueChange={(v) => {
                                const m = washers.find(x => x.id === v)
                                if (m && m.status !== 'disponible' && v !== selectedMachine) return
                                setSelectedMachine(v)
                              }}>
                                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Seleccionar…" /></SelectTrigger>
                                <SelectContent>
                                  {washers.map(m => (
                                    <SelectItem key={m.id} value={m.id} disabled={m.status !== 'disponible' && m.id !== selectedMachine}>
                                      {m.name} ({m.capacity}){m.status === 'en_uso' ? ' — En uso' : ''}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs text-muted-foreground">Tiempo</Label>
                              <Select value={machineTime} onValueChange={setMachineTime}>
                                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Seleccionar…" /></SelectTrigger>
                                <SelectContent>
                                  {TIME_OPTIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <Button size="sm" onClick={handleStartLavado} disabled={saving || !selectedMachine || !machineTime} className="bg-blue-600 hover:bg-blue-700">
                            <Play className="mr-2 h-3.5 w-3.5" />{saving ? 'Iniciando…' : 'Iniciar Lavado'}
                          </Button>
                        </>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
                            <Droplets className="h-4 w-4 text-blue-600 shrink-0" />
                            <span className="text-sm text-blue-700 font-medium flex-1">{washers.find(m => m.id === selectedMachine)?.name || 'Lavadora activa'}</span>
                            {(() => { const m = washers.find(x => x.id === selectedMachine); return m?.end_time && m.total_minutes ? (
                              <MachineTimer machineId={m.id} endTime={m.end_time!} totalMinutes={m.total_minutes!} type="lavadora" onComplete={() => {}} />
                            ) : null })()}
                          </div>
                          <Button size="sm" onClick={handleConfirmWashingEnd} disabled={saving} className="bg-cyan-600 hover:bg-cyan-700">
                            <CheckCircle2 className="mr-2 h-3.5 w-3.5" />{saving ? 'Guardando…' : 'Terminar Lavado'}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ── PASO 3: Secado ── */}
                <div className={`p-4 transition-opacity ${!completedSteps.lavado ? 'opacity-40 pointer-events-none' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border-2 ${completedSteps.secado ? 'bg-green-500 border-green-500 text-white' : (order.status === 'en_secado' && process?.drying_started) ? 'bg-orange-500 border-orange-500 text-white' : 'border-muted-foreground/30 text-muted-foreground'}`}>
                      {completedSteps.secado ? '✓' : (order.status === 'en_secado' && process?.drying_started) ? '▶' : '3'}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium text-sm ${completedSteps.secado ? 'text-green-700' : (order.status === 'en_secado' && process?.drying_started) ? 'text-orange-700' : ''}`}>Secado</p>
                      <p className="text-xs text-muted-foreground">Secado en máquina</p>
                    </div>
                    {completedSteps.secado && <Badge className="bg-green-100 text-green-800 text-xs shrink-0">Completado</Badge>}
                    {order.status === 'en_secado' && process?.drying_started && !completedSteps.secado && <Badge className="bg-orange-100 text-orange-800 text-xs shrink-0">En progreso</Badge>}
                  </div>
                  {completedSteps.lavado && !completedSteps.secado && (
                    <div className="ml-10 mt-3 space-y-3">
                      {!process?.drying_started ? (
                        <>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                <Wind className="h-3 w-3" /> Secadora
                              </Label>
                              <Select value={selectedDryer} onValueChange={(v) => {
                                const m = dryers.find(x => x.id === v)
                                if (m && m.status !== 'disponible' && v !== selectedDryer) return
                                setSelectedDryer(v)
                              }}>
                                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Seleccionar…" /></SelectTrigger>
                                <SelectContent>
                                  {dryers.map(m => (
                                    <SelectItem key={m.id} value={m.id} disabled={m.status !== 'disponible' && m.id !== selectedDryer}>
                                      {m.name} ({m.capacity}){m.status === 'en_uso' ? ' — En uso' : ''}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs text-muted-foreground">Tiempo</Label>
                              <Select value={dryerTime} onValueChange={setDryerTime}>
                                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Seleccionar…" /></SelectTrigger>
                                <SelectContent>
                                  {TIME_OPTIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <Button size="sm" onClick={handleStartDrying} disabled={saving || !selectedDryer || !dryerTime} className="bg-orange-500 hover:bg-orange-600">
                            <Play className="mr-2 h-3.5 w-3.5" />{saving ? 'Iniciando…' : 'Iniciar Secado'}
                          </Button>
                        </>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center gap-3 p-2 bg-orange-50 rounded-lg border border-orange-200">
                            <Wind className="h-4 w-4 text-orange-600 shrink-0" />
                            <span className="text-sm text-orange-700 font-medium flex-1">{dryers.find(m => m.id === selectedDryer)?.name || 'Secadora activa'}</span>
                            {(() => { const m = dryers.find(x => x.id === selectedDryer); return m?.end_time && m.total_minutes ? (
                              <MachineTimer machineId={m.id} endTime={m.end_time!} totalMinutes={m.total_minutes!} type="secadora" onComplete={() => {}} />
                            ) : null })()}
                          </div>
                          <Button size="sm" onClick={handleConfirmDryingEnd} disabled={saving} className="bg-orange-600 hover:bg-orange-700">
                            <CheckCircle2 className="mr-2 h-3.5 w-3.5" />{saving ? 'Guardando…' : 'Terminar Secado'}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ── PASO 4: Planchado ── */}
                <div className={`p-4 transition-opacity ${!completedSteps.secado ? 'opacity-40 pointer-events-none' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border-2 ${completedSteps.planchado ? 'bg-green-500 border-green-500 text-white' : 'border-muted-foreground/30 text-muted-foreground'}`}>
                      {completedSteps.planchado ? '✓' : '4'}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium text-sm ${completedSteps.planchado ? 'text-green-700' : ''}`}>Planchado</p>
                      <p className="text-xs text-muted-foreground">Planchado de prendas</p>
                    </div>
                    {completedSteps.planchado && <Badge className="bg-green-100 text-green-800 text-xs shrink-0">Completado</Badge>}
                  </div>
                  {completedSteps.secado && !completedSteps.planchado && (
                    <div className="ml-10 mt-3">
                      <Button size="sm" onClick={handleFinishPlanchado} disabled={saving} className="bg-pink-600 hover:bg-pink-700">
                        <CheckCircle2 className="mr-2 h-3.5 w-3.5" />{saving ? 'Guardando…' : 'Confirmar Planchado'}
                      </Button>
                    </div>
                  )}
                </div>

                {/* ── PASO 5: Doblado ── */}
                <div className={`p-4 transition-opacity ${!completedSteps.planchado ? 'opacity-40 pointer-events-none' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border-2 ${completedSteps.doblado ? 'bg-green-500 border-green-500 text-white' : 'border-muted-foreground/30 text-muted-foreground'}`}>
                      {completedSteps.doblado ? '✓' : '5'}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium text-sm ${completedSteps.doblado ? 'text-green-700' : ''}`}>Doblado</p>
                      <p className="text-xs text-muted-foreground">Doblado y empaque final</p>
                    </div>
                    {completedSteps.doblado && <Badge className="bg-green-100 text-green-800 text-xs shrink-0">Completado</Badge>}
                  </div>
                  {completedSteps.planchado && !completedSteps.doblado && (
                    <div className="ml-10 mt-3">
                      <Button size="sm" onClick={handleFinishDoblado} disabled={saving} className="bg-green-600 hover:bg-green-700">
                        <CheckCircle2 className="mr-2 h-3.5 w-3.5" />{saving ? 'Guardando…' : 'Confirmar Doblado — Marcar Listo'}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Notas */}
                <div className="p-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Notas del proceso</Label>
                    <Textarea
                      placeholder="Observaciones, problemas encontrados, etc."
                      value={processNotes}
                      onChange={(e) => setProcessNotes(e.target.value)}
                      rows={2}
                    />
                  </div>
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