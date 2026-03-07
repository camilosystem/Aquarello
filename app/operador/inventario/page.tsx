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
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { 
  Package,
  Plus,
  Minus,
  AlertTriangle,
  TrendingDown,
  Droplets,
  Sparkles,
  Wind,
  Shirt
} from 'lucide-react'
import type { InventoryItem } from '@/lib/types'

const DEFAULT_INVENTORY: InventoryItem[] = [
  { id: '1', name: 'Detergente Industrial', category: 'detergente', quantity: 45, unit: 'kg', min_stock: 20, max_stock: 100, cost_per_unit: 15000, created_at: '', updated_at: '' },
  { id: '2', name: 'Suavizante Premium', category: 'suavizante', quantity: 30, unit: 'litros', min_stock: 15, max_stock: 60, cost_per_unit: 12000, created_at: '', updated_at: '' },
  { id: '3', name: 'Blanqueador', category: 'blanqueador', quantity: 8, unit: 'litros', min_stock: 10, max_stock: 40, cost_per_unit: 8000, created_at: '', updated_at: '' },
  { id: '4', name: 'Desengrasante', category: 'desengrasante', quantity: 25, unit: 'litros', min_stock: 10, max_stock: 50, cost_per_unit: 18000, created_at: '', updated_at: '' },
  { id: '5', name: 'Aroma Lavanda', category: 'aroma', quantity: 12, unit: 'litros', min_stock: 5, max_stock: 25, cost_per_unit: 22000, created_at: '', updated_at: '' },
  { id: '6', name: 'Aroma Fresh', category: 'aroma', quantity: 15, unit: 'litros', min_stock: 5, max_stock: 25, cost_per_unit: 22000, created_at: '', updated_at: '' },
  { id: '7', name: 'Bolsas de Lavado', category: 'insumos', quantity: 150, unit: 'unidades', min_stock: 50, max_stock: 300, cost_per_unit: 500, created_at: '', updated_at: '' },
  { id: '8', name: 'Etiquetas QR', category: 'insumos', quantity: 200, unit: 'unidades', min_stock: 100, max_stock: 500, cost_per_unit: 200, created_at: '', updated_at: '' },
]

export default function InventarioPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>(DEFAULT_INVENTORY)
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [adjustQuantity, setAdjustQuantity] = useState(0)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const loadInventory = async () => {
      if (!supabase) { router.push('/operador/login'); return }
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/operador/login'); return }

      // Try to load from database
      const { data } = await supabase
        .from('inventory')
        .select('*')
        .order('name')

      if (data && data.length > 0) {
        setInventory(data)
      }
      // Otherwise use default inventory
      setLoading(false)
    }

    loadInventory()
  }, [router, supabase])

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'detergente': return Droplets
      case 'suavizante': return Sparkles
      case 'blanqueador': return Wind
      case 'desengrasante': return Shirt
      default: return Package
    }
  }

  const getStockStatus = (item: InventoryItem) => {
    const percentage = (item.quantity / item.max_stock) * 100
    if (item.quantity <= item.min_stock) {
      return { status: 'critical', color: 'text-red-600', bgColor: 'bg-red-100', label: 'Crítico' }
    } else if (percentage < 30) {
      return { status: 'low', color: 'text-yellow-600', bgColor: 'bg-yellow-100', label: 'Bajo' }
    } else {
      return { status: 'ok', color: 'text-green-600', bgColor: 'bg-green-100', label: 'Normal' }
    }
  }

  const handleAdjustStock = async () => {
    if (!selectedItem || adjustQuantity === 0) return

    const newQuantity = Math.max(0, selectedItem.quantity + adjustQuantity)
    
    setInventory(prev => prev.map(item => 
      item.id === selectedItem.id ? { ...item, quantity: newQuantity } : item
    ))

    // Update in database
    await supabase
      .from('inventory')
      .upsert({
        id: selectedItem.id,
        ...selectedItem,
        quantity: newQuantity,
        updated_at: new Date().toISOString()
      })

    toast.success(`Stock actualizado: ${selectedItem.name} ahora tiene ${newQuantity} ${selectedItem.unit}`)
    setIsDialogOpen(false)
    setAdjustQuantity(0)
    setSelectedItem(null)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value)
  }

  const lowStockItems = inventory.filter(item => item.quantity <= item.min_stock)
  const totalValue = inventory.reduce((acc, item) => acc + (item.quantity * item.cost_per_unit), 0)

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-muted/30">
      <Sidebar currentPath="/operador/inventario" />
      
      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Inventario de Insumos
              </h1>
              <p className="text-muted-foreground">
                Gestiona los insumos del centro de lavado
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Valor Total Inventario</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(totalValue)}</p>
            </div>
          </div>

          {/* Alerts */}
          {lowStockItems.length > 0 && (
            <Card className="border-yellow-300 bg-yellow-50">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="font-medium text-yellow-800">Alerta de Stock Bajo</p>
                    <p className="text-sm text-yellow-700">
                      {lowStockItems.length} producto(s) con stock bajo o crítico: {lowStockItems.map(i => i.name).join(', ')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Productos</p>
                    <p className="text-2xl font-bold">{inventory.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-green-100">
                    <Package className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Stock Normal</p>
                    <p className="text-2xl font-bold">{inventory.filter(i => getStockStatus(i).status === 'ok').length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-yellow-100">
                    <TrendingDown className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Stock Bajo</p>
                    <p className="text-2xl font-bold">{inventory.filter(i => getStockStatus(i).status === 'low').length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-red-100">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Crítico</p>
                    <p className="text-2xl font-bold">{lowStockItems.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Inventory Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inventory.map(item => {
              const status = getStockStatus(item)
              const percentage = Math.min(100, (item.quantity / item.max_stock) * 100)
              const Icon = getCategoryIcon(item.category)

              return (
                <Card key={item.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${status.bgColor}`}>
                          <Icon className={`h-5 w-5 ${status.color}`} />
                        </div>
                        <div>
                          <CardTitle className="text-base">{item.name}</CardTitle>
                          <CardDescription className="capitalize">{item.category}</CardDescription>
                        </div>
                      </div>
                      <Badge className={status.bgColor + ' ' + status.color}>
                        {status.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Stock Actual</span>
                        <span className="font-medium">{item.quantity} {item.unit}</span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>Min: {item.min_stock}</span>
                        <span>Max: {item.max_stock}</span>
                      </div>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Costo unitario</span>
                      <span className="font-medium">{formatCurrency(item.cost_per_unit)}</span>
                    </div>

                    <Dialog open={isDialogOpen && selectedItem?.id === item.id} onOpenChange={(open) => {
                      setIsDialogOpen(open)
                      if (!open) {
                        setSelectedItem(null)
                        setAdjustQuantity(0)
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={() => {
                            setSelectedItem(item)
                            setIsDialogOpen(true)
                          }}
                        >
                          Ajustar Stock
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Ajustar Stock - {item.name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">Stock Actual</p>
                            <p className="text-3xl font-bold">{item.quantity} {item.unit}</p>
                          </div>
                          <div className="flex items-center justify-center gap-4">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setAdjustQuantity(prev => prev - 1)}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <Input
                              type="number"
                              value={adjustQuantity}
                              onChange={(e) => setAdjustQuantity(parseInt(e.target.value) || 0)}
                              className="w-24 text-center"
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setAdjustQuantity(prev => prev + 1)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">Nuevo Stock</p>
                            <p className="text-2xl font-bold text-primary">
                              {Math.max(0, item.quantity + adjustQuantity)} {item.unit}
                            </p>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                            Cancelar
                          </Button>
                          <Button onClick={handleAdjustStock} disabled={adjustQuantity === 0}>
                            Guardar Cambios
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}
