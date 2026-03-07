import Link from 'next/link'
import Image from 'next/image'
import { User, Bike, Wrench, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="container px-4 py-12 mx-auto">
        <div className="flex flex-col items-center text-center gap-6">
          <div className="rounded-2xl overflow-hidden shadow-2xl">
            <Image
              src="/logo-lavva.png"
              alt="Lavva"
              width={220}
              height={220}
              className="w-52 h-auto"
              priority
            />
          </div>
          <div className="space-y-2">
            <p className="text-lg text-muted-foreground max-w-md">
              Sistema de gestion de lavanderia a domicilio para Colombia
            </p>
          </div>
        </div>

        {/* Interface Cards */}
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
          {/* Cliente */}
          <Card className="group hover:shadow-lg transition-all hover:border-primary/50">
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <User className="h-6 w-6" />
              </div>
              <CardTitle>Cliente</CardTitle>
              <CardDescription>
                Solicita servicio de lavanderia, haz seguimiento y paga desde tu celular
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/cliente/login">
                <Button className="w-full">
                  Entrar como Cliente
                </Button>
              </Link>
              <p className="mt-3 text-xs text-muted-foreground text-center">
                PWA instalable en Android/iOS
              </p>
            </CardContent>
          </Card>

          {/* Domiciliario */}
          <Card className="group hover:shadow-lg transition-all hover:border-accent/50">
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/20 text-foreground mb-2 group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                <Bike className="h-6 w-6" />
              </div>
              <CardTitle>Domiciliario</CardTitle>
              <CardDescription>
                Mapa de rutas, recogida y entrega de bolsas de ropa con tickets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/domiciliario/login">
                <Button variant="outline" className="w-full">
                  Entrar como Domiciliario
                </Button>
              </Link>
              <p className="mt-3 text-xs text-muted-foreground text-center">
                PWA instalable en Android/iOS
              </p>
            </CardContent>
          </Card>

          {/* Operador */}
          <Card className="group hover:shadow-lg transition-all hover:border-secondary/50">
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary text-secondary-foreground mb-2 group-hover:bg-foreground group-hover:text-background transition-colors">
                <Wrench className="h-6 w-6" />
              </div>
              <CardTitle>Operador de Lavado</CardTitle>
              <CardDescription>
                Gestion de lavado, inventario, tiempos y control de calidad
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/operador/login">
                <Button variant="outline" className="w-full">
                  Entrar como Operador
                </Button>
              </Link>
              <p className="mt-3 text-xs text-muted-foreground text-center">
                Interfaz web para escritorio
              </p>
            </CardContent>
          </Card>

          {/* Conductor */}
          <Card className="group hover:shadow-lg transition-all hover:border-muted-foreground/30">
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-muted-foreground mb-2 group-hover:bg-muted-foreground group-hover:text-background transition-colors">
                <Truck className="h-6 w-6" />
              </div>
              <CardTitle>Conductor de Camion</CardTitle>
              <CardDescription>
                Transporte de bolsas entre depositos y centro de lavado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" disabled>
                Proximamente
              </Button>
              <p className="mt-3 text-xs text-muted-foreground text-center">
                En desarrollo
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Features */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-8">
            Caracteristicas del Sistema
          </h2>
          <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
            <div className="space-y-2">
              <div className="text-3xl font-bold text-primary">QR</div>
              <p className="text-sm text-muted-foreground">
                Codigo QR unico por bolsa para tracking completo
              </p>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-primary">11</div>
              <p className="text-sm text-muted-foreground">
                Estados de seguimiento del proceso de lavado
              </p>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-primary">COP</div>
              <p className="text-sm text-muted-foreground">
                Pagos con tarjeta o Nequi en pesos colombianos
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-16 text-center text-sm text-muted-foreground border-t pt-8">
          <p>Lavva - Sistema de Gestion de Lavanderia</p>
          <p className="mt-1">Servicio para Colombia</p>
        </footer>
      </div>
    </div>
  )
}
