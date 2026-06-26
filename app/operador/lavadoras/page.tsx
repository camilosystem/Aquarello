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
  { id: 'LV-001', name: 'Industrial Washer 1', type: 'lavadora', capacity: '20kg', status: 'disponible', current_order_id: null, end_time: null, total_minutes: null },
  { id: 'LV-002', name: 'Industrial Washer 2', type: 'lavadora', capacity: '20kg', status: 'disponible', current_order_id: null, end_time: null, total_minutes: null },
  { id: 'LV-003', name: 'Medium Washer 1', type: 'lavadora', capacity: '12kg', status: 'disponible', current_order_id: null, end_time: null, total_minutes: null },
  { id: 'LV-004', name: 'Medium Washer 2', type: 'lavadora', capacity: '12kg', status: 'disponible', current_order_id: null, end_time: null, total_minutes: null },
  { id: 'LV-005', name: 'Delicates Washer', type: 'lavadora', capacity: '8kg', status: 'mantenimiento', current_order_id: null, end_time: null, total_minutes: null },
  { id: 'SC-001', name: 'Industrial Dryer 1', type: 'secadora', capacity: '25kg', status: 'disponible', current_order_id: null, end_time: null, total_minutes: null },
  { id: 'SC-002', name: 'Industrial Dryer 2', type: 'secadora', capacity: '25kg', status: 'disponible', current_order_id: null, end_time: null, total_minutes: null },
  { id: 'SC-003', name: 'Medium Dryer 1', type: 'secadora', capacity: '15kg', status: 'disponible', current_order_id: null, end_time: null, total_minutes: null },
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
    if (error) toast.error('Error changing status')
    else await loadMachines()
  }

  const freeMachine = async (machine: Machine) => {
    if (!supabase) return
    const { error } = await supabase
      .from('machines')
      .update({ status: 'disponible', current_order_id: null, end_time: null, total_minutes: null })
      .eq('id', machine.id)
    if (error) toast.error('Error releasing the machine')
    else {
      toast.success(`${machine.name} released successfully`)
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
      toast.error('Name and capacity are required')
      return
    }
    if (!supabase) return
    setSaving(true)
    try {
      if (dialogMode === 'create') {
        const prefix = form.type === 'lavadora' ? 'LV' : 'SC'
        const newId = `${prefix}-${Date.now()}`
        const { error } = await supabase
          .from('machines')
          .insert({ id: newId, name: form.name.trim(), type: form.type, capacity: form.capacity.trim(), status: 'disponible' })
        if (error) throw error
        toast.success('Machine created successfully')
      } else if (editingMachine) {
        const { error } = await supabase
          .from('machines')
          .update({ name: form.name.trim(), type: form.type, capacity: form.capacity.trim() })
          .eq('id', editingMachine.id)
        if (error) throw error
        toast.success('Machine updated successfully')
      }
      setDialogOpen(false)
      await loadMachines()
    } catch (err) {
      console.error('Machine save error:', err)
      toast.error('Error saving. Please try again.')
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
    if (error) toast.error('Error deleting the machine')
    else {
      toast.success(`${machine.name} deleted`)
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
      case 'disponible': return 'Available'
      case 'en_uso': return 'In Use'
      case 'mantenimiento': return 'Maintenance'
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
              <p className="font-medium text-foreground">Active cycle</p>
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
                toast.success(`${machine.name} has finished`)
                loadMachines()
              }}
            />
          </div>
        )}

        {machine.status === 'en_uso' && !machine.end_time && machine.order_qr && (
          <p className="text-sm text-primary font-mono font-semibold mb-3">{machine.order_qr}</p>
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-2">
          {/* Release machine — only for en_uso */}
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
                  Release Machine
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Release {machine.name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    The machine will be marked as <strong>Available</strong>. This does not cancel the assigned order — use this only to fix incorrect assignments.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Back</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-600 hover:bg-red-700"
                    onClick={(e) => { e.stopPropagation(); freeMachine(machine) }}
                  >
                    Yes, release
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {/* Maintenance toggle — only for disponible/mantenimiento */}
          {machine.status !== 'en_uso' && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={(e) => { e.stopPropagation(); toggleMachineStatus(machine) }}
            >
              {machine.status === 'disponible' ? (
                <><PowerOff className="mr-2 h-4 w-4" />Set to Maintenance</>
              ) : (
                <><Power className="mr-2 h-4 w-4" />Activate</>
              )}
            </Button>
          )}
          {/* Edit / Delete */}
          {!usingMock && (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1"
                onClick={(e) => { e.stopPropagation(); openEdit(machine) }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                    disabled={machine.status === 'en_uso'}
                    onClick={(e) => e.stopPropagation()}
                    title={machine.status === 'en_uso' ? 'Cannot delete while in use' : ''}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {machine.name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. The machine will be permanently removed from the system.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive hover:bg-destructive/90"
                      onClick={(e) => { e.stopPropagation(); handleDelete(machine) }}
                    >
                      Yes, delete
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
              <h1 className="text-2xl font-bold text-foreground">Machine Status</h1>
              <p className="text-muted-foreground">Monitor washer and dryer status in real time</p>
            </div>
            <div className="flex items-center gap-3">
              {usingMock && (
                <Badge variant="outline" className="text-yellow-700 border-yellow-300 bg-yellow-50">
                  Demo view (machines table not created)
                </Badge>
              )}
              {!usingMock && (
                <Button onClick={openCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Machine
                </Button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Machines', value: machines.length, icon: WashingMachine, bg: 'bg-primary/10', color: 'text-primary' },
              { label: 'Available', value: machines.filter(m => m.status === 'disponible').length, icon: CheckCircle2, bg: 'bg-green-100', color: 'text-green-600' },
              { label: 'In Use', value: machines.filter(m => m.status === 'en_uso').length, icon: Clock, bg: 'bg-blue-100', color: 'text-blue-600' },
              { label: 'Maintenance', value: machines.filter(m => m.status === 'mantenimiento').length, icon: AlertTriangle, bg: 'bg-yellow-100', color: 'text-yellow-600' },
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

          {/* Washers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Droplets className="h-5 w-5 text-blue-500" />
                Washers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {lavadoras.map(machine => <MachineCard key={machine.id} machine={machine} />)}
              </div>
            </CardContent>
          </Card>

          {/* Dryers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wind className="h-5 w-5 text-orange-500" />
                Dryers
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

      {/* Create / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'create' ? 'New Machine' : `Edit ${editingMachine?.name}`}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="machine-name">Name *</Label>
              <Input
                id="machine-name"
                placeholder="E.g.: Industrial Washer 3"
                value={form.name}
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="machine-type">Type *</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm(prev => ({ ...prev, type: v as 'lavadora' | 'secadora' }))}
              >
                <SelectTrigger id="machine-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lavadora">Washer</SelectItem>
                  <SelectItem value="secadora">Dryer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="machine-capacity">Capacity *</Label>
              <Input
                id="machine-capacity"
                placeholder="E.g.: 20kg"
                value={form.capacity}
                onChange={(e) => setForm(prev => ({ ...prev, capacity: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                : dialogMode === 'create' ? 'Create Machine' : 'Save Changes'
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
