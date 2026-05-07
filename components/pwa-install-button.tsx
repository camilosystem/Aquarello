'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface Props {
  className?: string
  variant?: 'default' | 'outline' | 'ghost' | 'secondary'
  size?: 'sm' | 'default' | 'lg' | 'icon'
  label?: string
}

export function PWAInstallButton({
  className,
  variant = 'outline',
  size = 'sm',
  label = 'Instalar App',
}: Props) {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    // Already running as standalone PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true)
      return
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setPrompt(e as BeforeInstallPromptEvent)
    }

    const onInstalled = () => {
      setInstalled(true)
      setPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (installed || !prompt) return null

  const handleInstall = async () => {
    if (!prompt) return
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setPrompt(null)
  }

  return (
    <Button variant={variant} size={size} className={className} onClick={handleInstall}>
      <Download className="mr-2 h-4 w-4" />
      {label}
    </Button>
  )
}
