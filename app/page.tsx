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
              src="/AquaLogo.jpg"
              alt="Aquarello"
              width={220}
              height={220}
              className="w-52 h-auto"
              priority
            />
          </div>
          <div className="space-y-2">
            <p className="text-lg text-muted-foreground max-w-md">
              Laundry pickup and delivery management system for New York
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
              <CardTitle>Client</CardTitle>
              <CardDescription>
                Request laundry service, track your order, and pay from your phone
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/cliente/login">
                <Button className="w-full">
                  Sign in as Client
                </Button>
              </Link>
              <p className="mt-3 text-xs text-muted-foreground text-center">
                Installable PWA for Android/iOS
              </p>
            </CardContent>
          </Card>

          {/* Domiciliario */}
          <Card className="group hover:shadow-lg transition-all hover:border-accent/50">
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/20 text-foreground mb-2 group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                <Bike className="h-6 w-6" />
              </div>
              <CardTitle>Driver</CardTitle>
              <CardDescription>
                Route map, pickup and delivery of laundry bags with tickets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/domiciliario/login">
                <Button variant="outline" className="w-full">
                  Sign in as Driver
                </Button>
              </Link>
              <p className="mt-3 text-xs text-muted-foreground text-center">
                Installable PWA for Android/iOS
              </p>
            </CardContent>
          </Card>

          {/* Operador */}
          <Card className="group hover:shadow-lg transition-all hover:border-secondary/50">
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary text-secondary-foreground mb-2 group-hover:bg-foreground group-hover:text-background transition-colors">
                <Wrench className="h-6 w-6" />
              </div>
              <CardTitle>Laundry Operator</CardTitle>
              <CardDescription>
                Wash management, inventory, timing, and quality control
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/operador/login">
                <Button variant="outline" className="w-full">
                  Sign in as Operator
                </Button>
              </Link>
              <p className="mt-3 text-xs text-muted-foreground text-center">
                Web interface for desktop
              </p>
            </CardContent>
          </Card>

          {/* Conductor */}
          <Card className="group hover:shadow-lg transition-all hover:border-muted-foreground/30">
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-muted-foreground mb-2 group-hover:bg-muted-foreground group-hover:text-background transition-colors">
                <Truck className="h-6 w-6" />
              </div>
              <CardTitle>Truck Driver</CardTitle>
              <CardDescription>
                Transport of bags between warehouses and the laundry facility
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" disabled>
                Coming Soon
              </Button>
              <p className="mt-3 text-xs text-muted-foreground text-center">
                In development
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Features */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-8">
            System Features
          </h2>
          <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
            <div className="space-y-2">
              <div className="text-3xl font-bold text-primary">QR</div>
              <p className="text-sm text-muted-foreground">
                Unique QR code per bag for full tracking
              </p>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-primary">11</div>
              <p className="text-sm text-muted-foreground">
                Tracking statuses throughout the laundry process
              </p>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-primary">USD</div>
              <p className="text-sm text-muted-foreground">
                Card payments in US dollars
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-16 text-center text-sm text-muted-foreground border-t pt-8 space-y-1">
          <p>Aquarello - Laundry Management System</p>
          <p className="mt-1">Service for New York</p>
          <p className="mt-3">8201 Northern Blvd, Jackson Heights, NY 11372</p>
          <p>
            <a href="tel:+17184339631" className="hover:text-primary">(718) 433-9631</a>
            {' '}&middot;{' '}
            <a href="mailto:aquarelonyc@gmail.com" className="hover:text-primary">aquarelonyc@gmail.com</a>
          </p>
        </footer>
      </div>
    </div>
  )
}
