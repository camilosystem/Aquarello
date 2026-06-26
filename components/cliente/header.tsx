'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X, User, Package, LogOut } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { PWAInstallButton } from '@/components/pwa-install-button'

interface HeaderProps {
  userName?: string | null
}

export function ClienteHeader({ userName }: HeaderProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    if (supabase) {
      await supabase.auth.signOut()
    }
    router.push('/cliente/login')
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <Link href="/cliente" className="flex items-center gap-2">
          <Image
            src="/AquaLogo.jpg"
            alt="Aquarello"
            width={80}
            height={80}
            className="h-12 w-auto rounded-lg"
          />
        </Link>

        <div className="flex items-center gap-2">
          {userName && (
            <span className="hidden text-sm text-muted-foreground sm:block">
              Hi, {userName.split(' ')[0]}
            </span>
          )}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                <span className="sr-only">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[320px]">
              <SheetTitle className="sr-only">Navigation menu</SheetTitle>
              <nav className="mt-8 flex flex-col gap-2">
                <Link
                  href="/cliente"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <Package className="h-5 w-5" />
                  <span>New Service</span>
                </Link>
                <Link
                  href="/cliente/pedidos"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <Package className="h-5 w-5" />
                  <span>My Orders</span>
                </Link>
                <Link
                  href="/cliente/perfil"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <User className="h-5 w-5" />
                  <span>My Profile</span>
                </Link>
                <div className="my-4 border-t" />
                <PWAInstallButton
                  variant="outline"
                  size="sm"
                  label="Install Aquarello App"
                  className="w-full justify-start px-3"
                />
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-destructive transition-colors hover:bg-destructive/10"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Sign Out</span>
                </button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
