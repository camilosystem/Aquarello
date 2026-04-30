'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/operador/sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MachineTimer } from '@/components/operador/machine-timer'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
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
import {
  Wind,
  Power,
  PowerOff,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Droplets,
  WashingMachine,
  XCircle,
  Plus,
  Pencil,
  Trash2,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'

interface Machine {
  id: string
  name: string
  type: 'lavadora' | 'secadora'
  capacity: string
  status: 'disponible' | 'en_uso' | 'mantenimiento'
  current_order_id: string | null
  end_time: string | null
  total_minutes: number | null
  order_qr?: string | null
}

// Fallback mock data in case the machines table doesn't exist yet
const MOCK_MACHINES: Machine[] = [
  { id: 'LV-001', name: 'Lavadora Industrial 1', type: 'lavadora', capacity: '20kg', status: 'disponible', current_order_id: null, end_time: null, total_minutes: null },
  { id: 'LV-002', name: 'Lavadora Industrial 2', type: 'lavadora', capacity: '20kg', status: 'disponible', current_order_id: null, end_time: null, total_minutes: null },
  { id: 'LV-003', name: 'Lavadora Mediana 1', type: 'lavadora', capacity: '12kg', status: 'disponible', current_order_id: null, end_time: null, total_minutes: null },
  { id: 'LV-004', name: 'Lavadora Mediana 2', type: 'lavadora', capacity: '12kg', status: 'disponible', current_order_id: null, end_time: null, total_minutes: null },
  { id: 'LV-005', name: 'Lavadora Delicados', type: 'lavadora', capacity: '8kg', status: 'mantenimiento', current_order_id: null, end_time: null, total_minutes: null },
  { id: 'SC-001', name: 'Secadora Industrial 1', type: 'secadora', capacity: '25kg', status: 'disponible', current_order_id: null, end_time: null, total_minutes: null },
  { id: 'SC-002', name: 'Secadora Industrial 2', type: 'secadora', capacity: '25kg', status: 'disponible', current_order_id: null, end_time: null, total_minutes: null },
  { id: 'SC-003', name: 'Secadora Mediana 1', type: 'secadora', capacity: '15kg', status: 'disponible', current_order_id: null, end_time: null, total_minutes: null },
]

interface MachineForm {
  name: string
  type: 'lavadora' | 'secadora'
  capacity: string
}

const EMPTY_FORM: MachineForm = { name: '', type: 'lavadora', capacity: '' }

export default function LavadorasPage() {
  const [machines, setMachines] = useState<Machine[]>([])
  const [loading, setLoading] = useState(true)
  const [usingMock, setUsingMock] = useState(false)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null)
  const [form, setForm] = useState<MachineForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  const loadMachines = useCallback(async () => {
    if (!supabase) return
    const { data, error } = await supabase
      .from('machines')
      .select('*')
      .order('type', { ascending: true })
      .order('name', { ascending: true })

    if (error || !data) {
      // Table may not exist yet — use mock data
      setMachines(MOCK_MACHINES)
      setUsingMock(true)
    } else {
      // Fetch QR codes for in-use machines
      const inUseIds = (data as Machine[]).filter(m => m.current_order_id).map(m => m.current_order_id!)
      let qrMap: Record<string, string> = {}
      if (inUseIds.length > 0) {
        const { data: orders } = await supabase
          .from('orders')
          .select('id, qr_code')
          .in('id', inUseIds)
        if (orders) {
          orders.forEach((o: any) => { qrMap[o.id] = o.qr_code })
        }
      }
      setMachines((data as Machine[]).map(m => ({
        ...m,
        order_qr: m.current_order_id ? qrMap[m.current_order_id] || null : null
      })))
      setUsingMock(false)
    }
  }, [supabase])

  useEffect(() => {
    const init = async () => {
      if (!supabase) { router.push('/operador/login'); return }
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/operador/login'); return }
      await loadMachines()
      setLoading(false)
    }
    init()

    if (!supabase) return
    const channel = supabase
      .channel('machines-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'machines' }, () => {
        loadMachines()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [router, supabase, loadMachines])

  const toggleMachineStatus = async (machine: Machine) => {
    if (usingMock) {
      // Local toggle only when using mock data
      setMachines(prev => prev.map(m => {
        if (m.id !== machine.id) return m
        if (m.status === 'disponible') return { ...m, status: 'mantenimiento' as const }
        if (m.status === 'mantenimiento') return { ...m, status: 'disponible' as const }
        return m
      }))
      return
    }
    if (!supabase) return
    const newStatus = machine.status === 'disponible' ? 'mantenimiento' : 'disponible'
    const { error } = await supabase
      .from('machines')
      .update({ status: newStatus })
      .eq('id', machine.id)
    if (error) toast.error('Error al cambiar estado')
    else await loadMachines()
  }

  const freeMachine = async (machine: Machine) => {
    if (!supabase) return
    const { error } = await supabase
      .from('machines')
      .update({ status: 'disponible', current_order_id: null, end_time: null, total_minutes: null })
      .eq('id', machine.id)
    if (error) toast.error('Error al liberar la máquina')
    else {
      toast.success(`${machine.name} liberada correctamente`)
      await loadMachines()
    }
  }

  const openCreate = () => {
    setForm(EMPTY_FORM)
    setEditingMachine(null)
    setDialogMode('create')
    setDialogOpen(true)
  }

  const openEdit = (machine: Machine) => {
    setForm({ name: machine.name, type: machine.type, capacity: machine.capacity })
    setEditingMachine(machine)
    setDialogMode('edit')
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.capacity.trim()) {
      toast.error('Nombre y capacidad son obligatorios')
      return
    }
    if (!supabase) return
    setSaving(true)
    try {
      if (dialogMode === 'create') {
        const { error } = await supabase
          .from('machines')
          .insert({ name: form.name.trim(), type: form.type, capacity: form.capacity.trim(), status: 'disponible' })
        if (error) throw error
        toast.success('Máquina creada correctamente')
      } else if (editingMachine) {
        const { error } = await supabase
          .from('machines')
          .update({ name: form.name.trim(), type: form.type, capacity: form.capacity.trim() })
          .eq('id', editingMachine.id)
        if (error) throw error
        toast.success('Máquina actualizada correctamente')
      }
      setDialogOpen(false)
      await loadMachines()
    } catch {
      toast.error('Error al guardar. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (machine: Machine) => {
    if (!supabase) return
    const { error } = await supabase
      .from('machines')
      .delete()
      .eq('id', machine.id)
    if (error) toast.error('Error al eliminar la máquina')
    else {
      toast.success(`${machine.name} eliminada`)
      await loadMachines()
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'disponible': return 'bg-green-100 text-green-800'
      case 'en_uso': return 'bg-blue-100 text-blue-800'
      case 'mantenimiento': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'disponible': return 'Disponible'
      case 'en_uso': return 'En Uso'
      case 'mantenimiento': return 'Mantenimiento'
      default: return status
    }
  }

  const lavadoras = machines.filter(m => m.type === 'lavadora')
  const secadoras = machines.filter(m => m.type === 'secadora')

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  const MachineCard = ({ machine }: { machine: Machine }) => (
    <Card
      className={`transition-colors ${
        machine.status === 'mantenimiento' ? 'opacity-60' : ''
      } ${
        machine.status === 'en_uso' && machine.current_order_id
          ? 'cursor-pointer hover:border-primary/60 hover:shadow-md'
          : ''
      }`}
      onClick={() => {
        if (machine.status === 'en_uso' && machine.current_order_id) {
          router.push(`/operador/tickets/${machine.current_order_id}`)
        }
      }}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-semibold">{machine.name}</p>
            <p className="text-sm text-muted-foreground">{machine.id} · {machine.capacity}</p>
          </div>
          <Badge className={getStatusColor(machine.status)}>
            {getStatusLabel(machine.status)}
          </Badge>
        </div>

        {machine.status === 'en_uso' && machine.end_time && machine.total_minutes && (
          <div className="flex items-center justify-between mb-3 p-2 bg-muted/50 rounded-lg">
            <div className="text-sm">
              <p className="font-medium text-foreground">Ciclo activo</p>
              {machine.order_qr && (
                <p className="text-xs font-mono text-primary mt-0.5 font-semibold">{machine.order_qr}</p>
              )}
            </div>
            <MachineTimer
              machineId={machine.id}
              endTime={machine.end_time}
              totalMinutes={machine.total_minutes}
              type={machine.type}
              onComplete={() => {
                toast.success(`${machine.name} ha terminado`)
                loadMachines()
              }}
            />
          </div>
        )}

        {machine.status === 'en_uso' && !machine.end_time && machine.order_qr && (
          <p className="text-sm text-primary font-mono font-semibold mb-3">{machine.order_qr}</p>
        )}

        {/* Botones de acción */}
        <div className="flex flex-col gap-2">
          {/* Liberar Máquina — solo para en_uso */}
          {machine.status === 'en_uso' && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-red-300 text-red-600 hover:bg-red-50"
                  onClick={(e) => e.stopPropagation()}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Liberar Máquina
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Liberar {machine.name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    La máquina quedará como <strong>Disponible</strong>. Esto no cancela la orden asignada — úsalo solo para corregir asignaciones erróneas.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Volver</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-600 hover:bg-red-700"
                    onClick={(e) => { e.stopPropagation(); freeMachine(machine) }}
                  >
                    Sí, liberar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {/* Mantenimiento toggle — solo para disponible/mantenimiento */}
          {machine.status !== 'en_uso' && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={(e) => { e.stopPropagation(); toggleMachineStatus(machine) }}
            >
              {machine.status === 'disponible' ? (
                <><PowerOff className="mr-2 h-4 w-4" />Poner en Mantenimiento</>
              ) : (
                <><Power className="mr-2 h-4 w-4" />Activar</>
              )}
            </Button>
          )}
          {/* Editar / Eliminar */}
          {!usingMock && (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1"
                onClick={(e) => { e.stopPropagation(); openEdit(machine) }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                    disabled={machine.status === 'en_uso'}
                    onClick={(e) => e.stopPropagation()}
                    title={machine.status === 'en_uso' ? 'No se puede eliminar mientras está en uso' : ''}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar {machine.name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción no se puede deshacer. La máquina será removida permanentemente del sistema.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive hover:bg-destructive/90"
                      onClick={(e) => { e.stopPropagation(); handleDelete(machine) }}
                    >
                      Sí, eliminar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="flex min-h-screen bg-muted/30">
      <Sidebar currentPath="/operador/lavadoras" />
      
      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Estado de Máquinas</h1>
              <p className="text-muted-foreground">Monitorea el estado de lavadoras y secadoras en tiempo real</p>
            </div>
            <div className="flex items-center gap-3">
              {usingMock && (
                <Badge variant="outline" className="text-yellow-700 border-yellow-300 bg-yellow-50">
                  Vista demo (tabla machines sin crear)
                </Badge>
              )}
              {!usingMock && (
                <Button onClick={openCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva Máquina
                </Button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Máquinas', value: machines.length, icon: WashingMachine, bg: 'bg-primary/10', color: 'text-primary' },
              { label: 'Disponibles', value: machines.filter(m => m.status === 'disponible').length, icon: CheckCircle2, bg: 'bg-green-100', color: 'text-green-600' },
              { label: 'En Uso', value: machines.filter(m => m.status === 'en_uso').length, icon: Clock, bg: 'bg-blue-100', color: 'text-blue-600' },
              { label: 'Mantenimiento', value: machines.filter(m => m.status === 'mantenimiento').length, icon: AlertTriangle, bg: 'bg-yellow-100', color: 'text-yellow-600' },
            ].map(stat => (
              <Card key={stat.label}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${stat.bg}`}>
                      <stat.icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Lavadoras */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Droplets className="h-5 w-5 text-blue-500" />
                Lavadoras
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {lavadoras.map(machine => <MachineCard key={machine.id} machine={machine} />)}
              </div>
            </CardContent>
          </Card>

          {/* Secadoras */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wind className="h-5 w-5 text-orange-500" />
                Secadoras
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {secadoras.map(machine => <MachineCard key={machine.id} machine={machine} />)}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Dialog crear / editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'create' ? 'Nueva Máquina' : `Editar ${editingMachine?.name}`}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="machine-name">Nombre *</Label>
              <Input
                id="machine-name"
                placeholder="Ej: Lavadora Industrial 3"
                value={form.name}
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="machine-type">Tipo *</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm(prev => ({ ...prev, type: v as 'lavadora' | 'secadora' }))}
              >
                <SelectTrigger id="machine-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lavadora">Lavadora</SelectItem>
                  <SelectItem value="secadora">Secadora</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="machine-capacity">Capacidad *</Label>
              <Input
                id="machine-capacity"
                placeholder="Ej: 20kg"
                value={form.capacity}
                onChange={(e) => setForm(prev => ({ ...prev, capacity: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</>
                : dialogMode === 'create' ? 'Crear Máquina' : 'Guardar Cambios'
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
