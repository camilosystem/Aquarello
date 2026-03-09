'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X, Bike, User, Package, LogOut, Map } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface HeaderProps {
  userName?: string | null
  pendingCount?: number
}

export function DomiciliarioHeader({ userName, pendingCount = 0 }: HeaderProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/domiciliario/login')
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <Link href="/domiciliario" className="flex items-center gap-2">
          <Image
            src="/logo-lavva.png"
            alt="Lavva"
            width={80}
            height={32}
            className="h-16 w-auto"
          />
        </Link>

        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              {pendingCount} pendientes
            </Badge>
          )}
          
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                <span className="sr-only">Menú</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[320px]">
              <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
              <div className="mt-4 mb-6">
                <p className="text-sm text-muted-foreground">Bienvenido,</p>
                <p className="font-semibold">{userName || 'Domiciliario'}</p>
              </div>
              <nav className="flex flex-col gap-2">
                <Link
                  href="/domiciliario"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <Map className="h-5 w-5" />
                  <span>Mapa de Rutas</span>
                </Link>
                <Link
                  href="/domiciliario/tareas"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <Package className="h-5 w-5" />
                  <span>Mis Tareas</span>
                </Link>
                <Link
                  href="/domiciliario/perfil"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <User className="h-5 w-5" />
                  <span>Mi Perfil</span>
                </Link>
                <div className="my-4 border-t" />
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-destructive transition-colors hover:bg-destructive/10"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Cerrar Sesión</span>
                </button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
