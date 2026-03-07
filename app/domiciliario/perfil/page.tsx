"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { DomiciliarioHeader } from "@/components/domiciliario/header"
import { BottomNavDelivery } from "@/components/domiciliario/bottom-nav"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { 
  Loader2, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  LogOut, 
  Bell, 
  Moon,
  Bike,
  Save
} from "lucide-react"

export default function PerfilDomiciliarioPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    vehicle_type: "triciclo",
    vehicle_plate: "",
  })
  const [notifications, setNotifications] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single()

        if (data) {
          setProfile(data)
          setFormData({
            full_name: data.full_name || "",
            phone: data.phone || "",
            vehicle_type: data.vehicle_type || "triciclo",
            vehicle_plate: data.vehicle_plate || "",
          })
        }
      }

      setLoading(false)
    }

    loadProfile()
  }, [supabase])

  async function handleSave() {
    setSaving(true)

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: formData.full_name,
        phone: formData.phone,
        vehicle_type: formData.vehicle_type,
        vehicle_plate: formData.vehicle_plate,
      })
      .eq("id", user.id)

    if (error) {
      toast.error("Error al guardar el perfil")
    } else {
      toast.success("Perfil actualizado")
    }

    setSaving(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/domiciliario/login")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const initials = formData.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "D"

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DomiciliarioHeader userName={user?.email} pendingCount={0} />
      
      <main className="flex-1 p-4 pb-24 space-y-4">
        {/* Profile Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-20 w-20 mb-3">
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-bold">{formData.full_name || "Domiciliario"}</h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Bike className="h-4 w-4 text-primary" />
                <span className="text-sm capitalize">{formData.vehicle_type}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informacion Personal</CardTitle>
            <CardDescription>Actualiza tus datos de perfil</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Nombre Completo
              </Label>
              <Input
                id="name"
                value={formData.full_name}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Correo Electronico
              </Label>
              <Input
                id="email"
                value={user?.email || ""}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Telefono
              </Label>
              <Input
                id="phone"
                placeholder="300 123 4567"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="vehicle" className="flex items-center gap-2">
                <Bike className="h-4 w-4" />
                Tipo de Vehiculo
              </Label>
              <Input
                id="vehicle"
                value={formData.vehicle_type}
                onChange={(e) => setFormData(prev => ({ ...prev, vehicle_type: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="plate" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Placa / Identificador
              </Label>
              <Input
                id="plate"
                placeholder="ABC-123"
                value={formData.vehicle_plate}
                onChange={(e) => setFormData(prev => ({ ...prev, vehicle_plate: e.target.value }))}
              />
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Guardar Cambios
            </Button>
          </CardContent>
        </Card>

        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Configuracion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Notificaciones</p>
                  <p className="text-sm text-muted-foreground">Nuevas tareas asignadas</p>
                </div>
              </div>
              <Switch
                checked={notifications}
                onCheckedChange={setNotifications}
              />
            </div>

            <Separator />

            <Button
              variant="destructive"
              className="w-full"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar Sesion
            </Button>
          </CardContent>
        </Card>
      </main>

      <BottomNavDelivery />
    </div>
  )
}