'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/operador/sidebar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { 
  Users,
  Plus,
  User,
  Mail,
  Phone,
  Calendar,
  Shield,
  MoreVertical,
  Pencil,
  Trash2,
  ClipboardList
} from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import type { Profile } from '@/lib/types'

type UserRole = 'operador' | 'domiciliario' | 'conductor' | 'admin'

export default function EquipoPage() {
  const [team, setTeam] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<Profile | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    role: 'operador' as UserRole
  })
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const loadTeam = async () => {
      if (!supabase) { router.push('/operador/login'); return }
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/operador/login'); return }

      // Check if user is admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'admin' && profile?.role !== 'operador') {
        router.push('/operador')
        return
      }

      // Load team members
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['operador', 'domiciliario', 'conductor', 'admin'])
        .order('created_at', { ascending: false })

      if (data) {
        setTeam(data)
      }
      setLoading(false)
    }

    loadTeam()
  }, [router, supabase])

  const handleCreateMember = async () => {
    if (!formData.email || !formData.password || !formData.full_name) {
      toast.error('Completa todos los campos requeridos')
      return
    }

    setSaving(true)
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
            role: formData.role
          },
          emailRedirectTo: `${window.location.origin}/operador`
        }
      })

      if (authError) throw authError

      if (authData.user) {
        // Profile will be created by the trigger, but we update it with extra info
        await supabase
          .from('profiles')
          .update({
            full_name: formData.full_name,
            phone: formData.phone,
            role: formData.role
          })
          .eq('id', authData.user.id)

        toast.success('Miembro creado exitosamente. Se envió un email de confirmación.')
        
        // Refresh team list
        const { data: newTeam } = await supabase
          .from('profiles')
          .select('*')
          .in('role', ['operador', 'domiciliario', 'conductor', 'admin'])
          .order('created_at', { ascending: false })

        if (newTeam) setTeam(newTeam)
      }

      setIsDialogOpen(false)
      setFormData({ email: '', password: '', full_name: '', phone: '', role: 'operador' })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      toast.error('Error al crear miembro: ' + errorMessage)
    }
    setSaving(false)
  }

  const handleUpdateMember = async () => {
    if (!editingMember) return

    setSaving(true)
    try {
      await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          role: formData.role,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingMember.id)

      toast.success('Miembro actualizado')
      
      setTeam(prev => prev.map(m => 
        m.id === editingMember.id 
          ? { ...m, full_name: formData.full_name, phone: formData.phone, role: formData.role }
          : m
      ))

      setIsDialogOpen(false)
      setEditingMember(null)
      setFormData({ email: '', password: '', full_name: '', phone: '', role: 'operador' })
    } catch {
      toast.error('Error al actualizar')
    }
    setSaving(false)
  }

  const handleDeleteMember = async (member: Profile) => {
    if (!confirm(`¿Eliminar a ${member.full_name}?`)) return

    try {
      await supabase
        .from('profiles')
        .update({ role: 'cliente' }) // Soft delete - just change role
        .eq('id', member.id)

      toast.success('Miembro eliminado del equipo')
      setTeam(prev => prev.filter(m => m.id !== member.id))
    } catch {
      toast.error('Error al eliminar')
    }
  }

  const openEditDialog = (member: Profile) => {
    setEditingMember(member)
    setFormData({
      email: '',
      password: '',
      full_name: member.full_name || '',
      phone: member.phone || '',
      role: member.role as UserRole
    })
    setIsDialogOpen(true)
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800'
      case 'operador': return 'bg-cyan-100 text-cyan-800'
      case 'domiciliario': return 'bg-green-100 text-green-800'
      case 'conductor': return 'bg-orange-100 text-orange-800'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador'
      case 'operador': return 'Operador'
      case 'domiciliario': return 'Domiciliario'
      case 'conductor': return 'Conductor'
      default: return role
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-muted/30">
      <Sidebar currentPath="/operador/equipo" />
      
      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Gestión de Equipo
              </h1>
              <p className="text-muted-foreground">
                Administra operadores, domiciliarios y conductores
              </p>
            </div>
            <Dialog open={isDialogOpen && !editingMember} onOpenChange={(open) => {
              setIsDialogOpen(open)
              if (!open) {
                setFormData({ email: '', password: '', full_name: '', phone: '', role: 'operador' })
              }
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo Miembro
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crear Nuevo Miembro</DialogTitle>
                  <DialogDescription>
                    Ingresa los datos del nuevo miembro del equipo
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Nombre Completo *</Label>
                    <Input
                      placeholder="Juan Pérez"
                      value={formData.full_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      placeholder="juan@lavva.co"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Contraseña *</Label>
                    <Input
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Teléfono</Label>
                    <Input
                      placeholder="300 123 4567"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Rol *</Label>
                    <Select value={formData.role} onValueChange={(value: UserRole) => setFormData(prev => ({ ...prev, role: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="operador">Operador de Lavado</SelectItem>
                        <SelectItem value="domiciliario">Domiciliario</SelectItem>
                        <SelectItem value="conductor">Conductor de Camión</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateMember} disabled={saving}>
                    {saving ? 'Creando...' : 'Crear Miembro'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold">{team.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-cyan-100">
                    <User className="h-5 w-5 text-cyan-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Operadores</p>
                    <p className="text-2xl font-bold">{team.filter(m => m.role === 'operador').length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-green-100">
                    <User className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Domiciliarios</p>
                    <p className="text-2xl font-bold">{team.filter(m => m.role === 'domiciliario').length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-orange-100">
                    <User className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Conductores</p>
                    <p className="text-2xl font-bold">{team.filter(m => m.role === 'conductor').length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Team Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {team.map(member => (
              <Card key={member.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(member.full_name || 'NN')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold">{member.full_name || 'Sin nombre'}</h3>
                        <Badge className={getRoleColor(member.role)}>
                          {getRoleLabel(member.role)}
                        </Badge>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(member)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/operador/equipo/${member.id}`)}>
                          <ClipboardList className="mr-2 h-4 w-4" />
                          Ver Actividad
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => handleDeleteMember(member)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="mt-4 space-y-2 text-sm">
                    {member.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>{member.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Desde {new Date(member.created_at).toLocaleDateString('es-CO', {
                        month: 'short',
                        year: 'numeric'
                      })}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {team.length === 0 && (
              <Card className="col-span-full">
                <CardContent className="py-12 text-center">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No hay miembros en el equipo</p>
                  <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar Primer Miembro
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Edit Dialog */}
          <Dialog open={isDialogOpen && !!editingMember} onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (!open) {
              setEditingMember(null)
              setFormData({ email: '', password: '', full_name: '', phone: '', role: 'operador' })
            }
          }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar Miembro</DialogTitle>
                <DialogDescription>
                  Actualiza los datos del miembro del equipo
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nombre Completo *</Label>
                  <Input
                    placeholder="Juan Pérez"
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input
                    placeholder="300 123 4567"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rol *</Label>
                  <Select value={formData.role} onValueChange={(value: UserRole) => setFormData(prev => ({ ...prev, role: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="operador">Operador de Lavado</SelectItem>
                      <SelectItem value="domiciliario">Domiciliario</SelectItem>
                      <SelectItem value="conductor">Conductor de Camión</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleUpdateMember} disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  )
}
