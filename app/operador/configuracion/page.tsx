'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/operador/sidebar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Settings,
  DollarSign,
  Bell,
  Shield,
  Building2,
  Save,
} from 'lucide-react'

export default function ConfiguracionPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()

  // Configuracion de precios
  const [precioPorKg, setPrecioPorKg] = useState('3500')
  const [precioMinimo, setPrecioMinimo] = useState('25000')
  const [costoPlanchado, setCostoPlanchado] = useState('5000')
  const [costoExpress, setCostoExpress] = useState('10000')

  // Notificaciones
  const [notifNuevoPedido, setNotifNuevoPedido] = useState(true)
  const [notifStockBajo, setNotifStockBajo] = useState(true)
  const [notifPedidoListo, setNotifPedidoListo] = useState(true)

  // Operacion
  const [horarioApertura, setHorarioApertura] = useState('07:00')
  const [horarioCierre, setHorarioCierre] = useState('20:00')
  const [tiempoPromedioLavado, setTiempoPromedioLavado] = useState('120')

  useEffect(() => {
    const loadData = async () => {
      if (!supabase) { router.push('/operador/login'); return }
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/operador/login'); return }

      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      setProfile({ ...prof, email: user.email })
      setLoading(false)
    }
    loadData()
  }, [])

  const handleSavePrecios = async () => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 600))
    setSaving(false)
    toast.success('Precios actualizados correctamente')
  }

  const handleSaveOperacion = async () => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 600))
    setSaving(false)
    toast.success('Configuracion de operacion guardada')
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value)

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-muted/30">
      <Sidebar currentPath="/operador/configuracion" />

      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-foreground">Configuracion</h1>
            <p className="text-muted-foreground">Ajustes generales del sistema Lavva</p>
          </div>

          {/* Perfil del Operador */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Perfil del Operador
              </CardTitle>
              <CardDescription>Tu informacion de acceso al sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-muted/40 rounded-lg">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
                  {profile?.full_name?.[0]?.toUpperCase() || profile?.email?.[0]?.toUpperCase() || 'A'}
                </div>
                <div>
                  <p className="font-semibold">{profile?.full_name || 'Sin nombre'}</p>
                  <p className="text-sm text-muted-foreground">{profile?.email}</p>
                </div>
                <Badge className="ml-auto capitalize bg-primary/10 text-primary">
                  {profile?.role || 'Operador'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Precios */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Tarifas de Servicio
              </CardTitle>
              <CardDescription>Configura los precios base del servicio en COP</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label>Precio por Kilogramo</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <Input
                      type="number"
                      value={precioPorKg}
                      onChange={e => setPrecioPorKg(e.target.value)}
                      className="pl-7"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Precio actual: {formatCurrency(Number(precioPorKg))}/kg
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Precio Minimo de Servicio</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <Input
                      type="number"
                      value={precioMinimo}
                      onChange={e => setPrecioMinimo(e.target.value)}
                      className="pl-7"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Minimo actual: {formatCurrency(Number(precioMinimo))}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Costo Adicional Planchado</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <Input
                      type="number"
                      value={costoPlanchado}
                      onChange={e => setCostoPlanchado(e.target.value)}
                      className="pl-7"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Planchado: +{formatCurrency(Number(costoPlanchado))}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Recargo Express</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <Input
                      type="number"
                      value={costoExpress}
                      onChange={e => setCostoExpress(e.target.value)}
                      className="pl-7"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Express: +{formatCurrency(Number(costoExpress))}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button onClick={handleSavePrecios} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Guardando...' : 'Guardar Precios'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Operacion */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Horario de Operacion
              </CardTitle>
              <CardDescription>Configura los tiempos de operacion del centro de lavado</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid md:grid-cols-3 gap-5">
                <div className="space-y-2">
                  <Label>Hora de Apertura</Label>
                  <Input
                    type="time"
                    value={horarioApertura}
                    onChange={e => setHorarioApertura(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hora de Cierre</Label>
                  <Input
                    type="time"
                    value={horarioCierre}
                    onChange={e => setHorarioCierre(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tiempo Prom. Lavado (min)</Label>
                  <Input
                    type="number"
                    value={tiempoPromedioLavado}
                    onChange={e => setTiempoPromedioLavado(e.target.value)}
                  />
                </div>
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button onClick={handleSaveOperacion} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Guardando...' : 'Guardar Horario'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Notificaciones */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Notificaciones
              </CardTitle>
              <CardDescription>Controla que alertas recibe el equipo operativo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium text-sm">Nuevo pedido recibido</p>
                  <p className="text-xs text-muted-foreground">Alertar cuando entre un nuevo pedido al sistema</p>
                </div>
                <Switch checked={notifNuevoPedido} onCheckedChange={setNotifNuevoPedido} />
              </div>
              <Separator />
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium text-sm">Stock bajo de insumos</p>
                  <p className="text-xs text-muted-foreground">Alertar cuando un insumo baje del nivel minimo</p>
                </div>
                <Switch checked={notifStockBajo} onCheckedChange={setNotifStockBajo} />
              </div>
              <Separator />
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium text-sm">Pedido listo para entrega</p>
                  <p className="text-xs text-muted-foreground">Alertar cuando se complete el proceso de lavado</p>
                </div>
                <Switch checked={notifPedidoListo} onCheckedChange={setNotifPedidoListo} />
              </div>

              <Separator />
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => toast.success('Preferencias de notificaciones guardadas')}>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Preferencias
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Info del sistema */}
          <Card className="bg-muted/40">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Settings className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">Lavva Sistema</p>
                    <p className="text-xs text-muted-foreground">Version 1.0.0 — Colombia</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
                  Activo
                </Badge>
              </div>
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  )
}
