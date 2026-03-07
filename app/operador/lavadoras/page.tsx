'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/operador/sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Shirt,
  Wind,
  Power,
  PowerOff,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Droplets
} from 'lucide-react'

interface Machine {
  id: string
  name: string
  type: 'lavadora' | 'secadora'
  capacity: string
  status: 'disponible' | 'en_uso' | 'mantenimiento'
  currentOrder?: string
  progress?: number
  timeRemaining?: number
}

const MACHINES: Machine[] = [
  { id: 'LV-001', name: 'Lavadora Industrial 1', type: 'lavadora', capacity: '20kg', status: 'en_uso', currentOrder: 'LG-001234', progress: 65, timeRemaining: 25 },
  { id: 'LV-002', name: 'Lavadora Industrial 2', type: 'lavadora', capacity: '20kg', status: 'disponible' },
  { id: 'LV-003', name: 'Lavadora Mediana 1', type: 'lavadora', capacity: '12kg', status: 'en_uso', currentOrder: 'LG-001238', progress: 30, timeRemaining: 45 },
  { id: 'LV-004', name: 'Lavadora Mediana 2', type: 'lavadora', capacity: '12kg', status: 'disponible' },
  { id: 'LV-005', name: 'Lavadora Delicados', type: 'lavadora', capacity: '8kg', status: 'mantenimiento' },
  { id: 'SC-001', name: 'Secadora Industrial 1', type: 'secadora', capacity: '25kg', status: 'en_uso', currentOrder: 'LG-001232', progress: 80, timeRemaining: 12 },
  { id: 'SC-002', name: 'Secadora Industrial 2', type: 'secadora', capacity: '25kg', status: 'disponible' },
  { id: 'SC-003', name: 'Secadora Mediana 1', type: 'secadora', capacity: '15kg', status: 'disponible' },
]

export default function LavadorasPage() {
  const [machines, setMachines] = useState<Machine[]>(MACHINES)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      if (!supabase) { router.push('/operador/login'); return }
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/operador/login'); return }
      setLoading(false)
    }

    checkAuth()

    // Simulate progress updates
    const interval = setInterval(() => {
      setMachines(prev => prev.map(m => {
        if (m.status === 'en_uso' && m.progress !== undefined) {
          const newProgress = Math.min(100, m.progress + Math.random() * 2)
          const newTime = Math.max(0, (m.timeRemaining || 0) - 0.5)
          
          if (newProgress >= 100) {
            return { ...m, status: 'disponible' as const, progress: undefined, timeRemaining: undefined, currentOrder: undefined }
          }
          
          return { ...m, progress: newProgress, timeRemaining: newTime }
        }
        return m
      }))
    }, 3000)

    return () => clearInterval(interval)
  }, [router, supabase])

  const toggleMachineStatus = (id: string) => {
    setMachines(prev => prev.map(m => {
      if (m.id === id) {
        if (m.status === 'disponible') {
          return { ...m, status: 'mantenimiento' as const }
        } else if (m.status === 'mantenimiento') {
          return { ...m, status: 'disponible' as const }
        }
      }
      return m
    }))
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
      case 'disponible': return 'Disponible'
      case 'en_uso': return 'En Uso'
      case 'mantenimiento': return 'Mantenimiento'
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

  return (
    <div className="flex min-h-screen bg-muted/30">
      <Sidebar currentPath="/operador/lavadoras" />
      
      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Estado de Máquinas
            </h1>
            <p className="text-muted-foreground">
              Monitorea el estado de lavadoras y secadoras
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Shirt className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Máquinas</p>
                    <p className="text-2xl font-bold">{machines.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-green-100">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Disponibles</p>
                    <p className="text-2xl font-bold">{machines.filter(m => m.status === 'disponible').length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-blue-100">
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">En Uso</p>
                    <p className="text-2xl font-bold">{machines.filter(m => m.status === 'en_uso').length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-yellow-100">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Mantenimiento</p>
                    <p className="text-2xl font-bold">{machines.filter(m => m.status === 'mantenimiento').length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Lavadoras */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Droplets className="h-5 w-5 text-primary" />
                Lavadoras
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {lavadoras.map(machine => (
                  <Card key={machine.id} className={`${machine.status === 'mantenimiento' ? 'opacity-60' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold">{machine.name}</p>
                          <p className="text-sm text-muted-foreground">{machine.id} - {machine.capacity}</p>
                        </div>
                        <Badge className={getStatusColor(machine.status)}>
                          {getStatusLabel(machine.status)}
                        </Badge>
                      </div>

                      {machine.status === 'en_uso' && (
                        <div className="space-y-2 mb-3">
                          <div className="flex justify-between text-sm">
                            <span>Progreso</span>
                            <span>{Math.round(machine.progress || 0)}%</span>
                          </div>
                          <Progress value={machine.progress || 0} className="h-2" />
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{Math.round(machine.timeRemaining || 0)} min restantes</span>
                          </div>
                          {machine.currentOrder && (
                            <p className="text-sm text-primary font-mono">{machine.currentOrder}</p>
                          )}
                        </div>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => toggleMachineStatus(machine.id)}
                        disabled={machine.status === 'en_uso'}
                      >
                        {machine.status === 'disponible' ? (
                          <>
                            <PowerOff className="mr-2 h-4 w-4" />
                            Poner en Mantenimiento
                          </>
                        ) : machine.status === 'mantenimiento' ? (
                          <>
                            <Power className="mr-2 h-4 w-4" />
                            Activar
                          </>
                        ) : (
                          <>
                            <Clock className="mr-2 h-4 w-4" />
                            En Proceso
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Secadoras */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wind className="h-5 w-5 text-orange-500" />
                Secadoras
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {secadoras.map(machine => (
                  <Card key={machine.id} className={`${machine.status === 'mantenimiento' ? 'opacity-60' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold">{machine.name}</p>
                          <p className="text-sm text-muted-foreground">{machine.id} - {machine.capacity}</p>
                        </div>
                        <Badge className={getStatusColor(machine.status)}>
                          {getStatusLabel(machine.status)}
                        </Badge>
                      </div>

                      {machine.status === 'en_uso' && (
                        <div className="space-y-2 mb-3">
                          <div className="flex justify-between text-sm">
                            <span>Progreso</span>
                            <span>{Math.round(machine.progress || 0)}%</span>
                          </div>
                          <Progress value={machine.progress || 0} className="h-2" />
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{Math.round(machine.timeRemaining || 0)} min restantes</span>
                          </div>
                          {machine.currentOrder && (
                            <p className="text-sm text-primary font-mono">{machine.currentOrder}</p>
                          )}
                        </div>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => toggleMachineStatus(machine.id)}
                        disabled={machine.status === 'en_uso'}
                      >
                        {machine.status === 'disponible' ? (
                          <>
                            <PowerOff className="mr-2 h-4 w-4" />
                            Poner en Mantenimiento
                          </>
                        ) : machine.status === 'mantenimiento' ? (
                          <>
                            <Power className="mr-2 h-4 w-4" />
                            Activar
                          </>
                        ) : (
                          <>
                            <Clock className="mr-2 h-4 w-4" />
                            En Proceso
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
