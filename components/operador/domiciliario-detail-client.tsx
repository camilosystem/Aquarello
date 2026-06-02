'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
  ArrowLeft, Bike, Mail, Phone, MapPin, Calendar,
  Save, Loader2, CheckCircle2, XCircle, Package, KeyRound, Eye, EyeOff
} from 'lucide-react'
import { updateDomiciliarioAction, toggleDomiciliarioActivoAction, changePasswordDomiciliarioAction } from '@/app/operador/domiciliarios/actions'
import { STATUS_LABELS, STATUS_COLORS, formatOrderNumber, type Order, type Profile } from '@/lib/types'

interface DomiciliarioDetailClientProps {
  domiciliario: Profile
  orders: Order[]
}

export function DomiciliarioDetailClient({ domiciliario, orders }: DomiciliarioDetailClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isToggling, startToggle] = useTransition()
  const [isChangingPwd, startChangePwd] = useTransition()
  const [form, setForm] = useState({
    full_name: domiciliario.full_name ?? '',
    phone: domiciliario.phone ?? '',
    city: domiciliario.city ?? '',
  })
  const [pwdForm, setPwdForm] = useState({ newPassword: '', confirmPassword: '' })
  const [showPwd, setShowPwd] = useState(false)

  const handleSave = () => {
    if (!form.full_name.trim()) { toast.error('El nombre es obligatorio'); return }
    startTransition(async () => {
      const result = await updateDomiciliarioAction(domiciliario.id, form)
      if (result.ok) toast.success('Domiciliario actualizado')
      else toast.error(`Error: ${result.error}`)
    })
  }

  const handleChangePassword = () => {
    if (!pwdForm.newPassword) { toast.error('Ingresa la nueva contraseña'); return }
    if (pwdForm.newPassword.length < 8) { toast.error('La contraseña debe tener al menos 8 caracteres'); return }
    if (pwdForm.newPassword !== pwdForm.confirmPassword) { toast.error('Las contraseñas no coinciden'); return }
    startChangePwd(async () => {
      const result = await changePasswordDomiciliarioAction(domiciliario.id, pwdForm.newPassword)
      if (result.ok) {
        toast.success('Contraseña actualizada correctamente')
        setPwdForm({ newPassword: '', confirmPassword: '' })
      } else {
        toast.error(`Error: ${result.error}`)
      }
    })
  }

  const handleToggleActivo = () => {
    startToggle(async () => {
      const result = await toggleDomiciliarioActivoAction(domiciliario.id, !domiciliario.is_active)
      if (result.ok) {
        toast.success(domiciliario.is_active ? 'Domiciliario inactivado' : 'Domiciliario activado')
        router.refresh()
      } else {
        toast.error(`Error: ${result.error}`)
      }
    })
  }

  const deliveredOrders = orders.filter(o => o.status === 'entregado')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/operador/domiciliarios')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{domiciliario.full_name ?? 'Sin nombre'}</h1>
            <Badge
              variant={domiciliario.is_active ? 'default' : 'secondary'}
              className={domiciliario.is_active ? 'bg-green-100 text-green-800' : ''}
            >
              {domiciliario.is_active ? 'Activo' : 'Inactivo'}
            </Badge>
          </div>
          <p className="text-muted-foreground">{domiciliario.email}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Datos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bike className="h-4 w-4" />
              Datos del Domiciliario
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-dashed p-3 space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Mail className="h-3 w-3" /> Credenciales de ingreso a la app
              </p>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold break-all">{domiciliario.email}</p>
                <button
                  type="button"
                  className="shrink-0 text-xs text-primary hover:underline"
                  onClick={() => {
                    navigator.clipboard.writeText(domiciliario.email ?? '')
                    toast.success('Email copiado')
                  }}
                >
                  Copiar
                </button>
              </div>
              <p className="text-xs text-muted-foreground">El domiciliario usa este email + su contraseña para ingresar.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dm-name">Nombre completo</Label>
              <Input
                id="dm-name"
                value={form.full_name}
                onChange={(e) => setForm(p => ({ ...p, full_name: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="dm-phone">Teléfono</Label>
                <Input
                  id="dm-phone"
                  value={form.phone}
                  onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dm-city">Ciudad</Label>
                <Input
                  id="dm-city"
                  value={form.city}
                  onChange={(e) => setForm(p => ({ ...p, city: e.target.value }))}
                />
              </div>
            </div>

            <Button className="w-full" onClick={handleSave} disabled={isPending}>
              {isPending
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</>
                : <><Save className="mr-2 h-4 w-4" />Guardar Cambios</>}
            </Button>

            <Separator />

            {/* Cambio de contraseña */}
            <div className="space-y-3">
              <p className="text-sm font-medium flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-muted-foreground" />
                Cambiar Contraseña
              </p>
              <div className="space-y-2">
                <Label htmlFor="dm-newpwd">Nueva contraseña</Label>
                <div className="relative">
                  <Input
                    id="dm-newpwd"
                    type={showPwd ? 'text' : 'password'}
                    placeholder="Mínimo 8 caracteres"
                    value={pwdForm.newPassword}
                    onChange={(e) => setPwdForm(p => ({ ...p, newPassword: e.target.value }))}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPwd(v => !v)}
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dm-confirmpwd">Confirmar contraseña</Label>
                <Input
                  id="dm-confirmpwd"
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Repite la contraseña"
                  value={pwdForm.confirmPassword}
                  onChange={(e) => setPwdForm(p => ({ ...p, confirmPassword: e.target.value }))}
                />
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleChangePassword}
                disabled={isChangingPwd}
              >
                {isChangingPwd
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Actualizando...</>
                  : <><KeyRound className="mr-2 h-4 w-4" />Actualizar Contraseña</>}
              </Button>
            </div>

            <Separator />

            {/* Toggle activo/inactivo */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className={`w-full ${domiciliario.is_active ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-700 hover:bg-green-50'}`}
                  disabled={isToggling}
                >
                  {isToggling ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : domiciliario.is_active ? (
                    <><XCircle className="mr-2 h-4 w-4" />Inactivar Domiciliario</>
                  ) : (
                    <><CheckCircle2 className="mr-2 h-4 w-4" />Activar Domiciliario</>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {domiciliario.is_active ? '¿Inactivar domiciliario?' : '¿Activar domiciliario?'}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {domiciliario.is_active
                      ? 'El domiciliario no podrá acceder a la app hasta que sea activado nuevamente.'
                      : 'El domiciliario podrá volver a acceder a la app con su cuenta.'}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleToggleActivo}
                    className={domiciliario.is_active ? 'bg-red-600 hover:bg-red-700' : ''}
                  >
                    {domiciliario.is_active ? 'Sí, inactivar' : 'Sí, activar'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Registrado {format(new Date(domiciliario.created_at), "d 'de' MMMM, yyyy", { locale: es })}
            </p>
          </CardContent>
        </Card>

        {/* Resumen */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              Resumen de Actividad
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-2xl font-bold">{orders.length}</p>
                <p className="text-xs text-muted-foreground">Órdenes asignadas</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-green-700">{deliveredOrders.length}</p>
                <p className="text-xs text-muted-foreground">Entregas completadas</p>
              </div>
            </div>
            {orders.length > 0 && (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Última asignación: </span>
                {format(new Date(orders[0].created_at), "d MMM yyyy", { locale: es })}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Historial de entregas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bike className="h-4 w-4" />
            Historial de Entregas ({orders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bike className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p>Sin entregas asignadas aún</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => router.push(`/operador/tickets/${order.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bike className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{formatOrderNumber(order.order_number)}</p>
                      <p className="font-mono text-xs text-muted-foreground">{order.qr_code}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span>{format(new Date(order.created_at), 'd MMM yyyy', { locale: es })}</span>
                        {order.pickup_address && (
                          <span className="flex items-center gap-1 truncate max-w-[200px]">
                            <MapPin className="h-3 w-3 shrink-0" />{order.pickup_address}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Badge className={STATUS_COLORS[order.status as keyof typeof STATUS_COLORS] ?? 'bg-muted text-muted-foreground'}>
                    {STATUS_LABELS[order.status as keyof typeof STATUS_LABELS] ?? order.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
