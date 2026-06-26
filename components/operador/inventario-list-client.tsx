'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import {
  Package, Plus, AlertTriangle, TrendingDown,
  Droplets, Sparkles, Wind, Shirt, Pencil, Trash2, Loader2,
} from 'lucide-react'
import { createItemAction, updateItemAction, deleteItemAction } from '@/app/operador/inventario/actions'
import { formatUSD, type InventoryItem } from '@/lib/types'

const CATEGORIES = ['detergente', 'suavizante', 'blanqueador', 'desengrasante', 'aroma', 'insumos', 'otro']

const CATEGORY_LABELS: Record<string, string> = {
  detergente: 'Detergent',
  suavizante: 'Fabric softener',
  blanqueador: 'Bleach',
  desengrasante: 'Degreaser',
  aroma: 'Fragrance',
  insumos: 'Supplies',
  otro: 'Other',
}

const EMPTY_FORM = {
  name: '',
  category: 'insumos',
  unit: '',
  min_stock: 0,
  max_stock: 0,
  cost_per_box: 0,
  units_per_box: 1,
}

interface Props {
  items: InventoryItem[]
}

export function InventarioListClient({ items }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<InventoryItem | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const costPerUnit = form.units_per_box > 0 ? form.cost_per_box / form.units_per_box : form.cost_per_box
  const totalValue = items.reduce((acc, i) => acc + (i.quantity * i.cost_per_unit), 0)
  const lowStock = items.filter(i => i.quantity <= i.min_stock)

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  const openEdit = (item: InventoryItem) => {
    setEditing(item)
    setForm({
      name: item.name,
      category: item.category,
      unit: item.unit,
      min_stock: item.min_stock,
      max_stock: item.max_stock ?? 0,
      cost_per_box: item.cost_per_box ?? 0,
      units_per_box: item.units_per_box ?? 1,
    })
    setDialogOpen(true)
  }

  const handleSave = () => {
    if (!form.name.trim() || !form.unit.trim()) {
      toast.error('Name and unit are required')
      return
    }
    startTransition(async () => {
      const result = editing
        ? await updateItemAction(editing.id, form)
        : await createItemAction(form)
      if (result.ok) {
        toast.success(editing ? 'Item updated' : 'Item created')
        setDialogOpen(false)
        router.refresh()
      } else {
        toast.error(`Error: ${result.error}`)
      }
    })
  }

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteItemAction(id)
      if (result.ok) {
        toast.success('Item deleted')
        router.refresh()
      } else {
        toast.error(`Error: ${result.error}`)
      }
    })
  }

  const getStatus = (item: InventoryItem) => {
    if (item.quantity <= item.min_stock)
      return { label: 'Critical', color: 'text-red-600', bg: 'bg-red-100', progressColor: 'bg-red-500' }
    const pct = item.max_stock ? (item.quantity / item.max_stock) * 100 : 100
    if (pct < 30)
      return { label: 'Low', color: 'text-yellow-600', bg: 'bg-yellow-100', progressColor: 'bg-yellow-500' }
    return { label: 'Normal', color: 'text-green-600', bg: 'bg-green-100', progressColor: 'bg-green-500' }
  }

  const getCategoryIcon = (cat: string) => {
    if (cat === 'detergente') return Droplets
    if (cat === 'suavizante') return Sparkles
    if (cat === 'blanqueador') return Wind
    if (cat === 'desengrasante') return Shirt
    return Package
  }

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Total value:{' '}
            <span className="font-semibold text-foreground">{formatUSD(totalValue)}</span>
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Item
        </Button>
      </div>

      {/* Alert */}
      {lowStock.length > 0 && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardContent className="py-3 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0" />
            <p className="text-sm text-yellow-800">
              <span className="font-medium">Low stock:</span>{' '}
              {lowStock.map(i => i.name).join(', ')}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total items', value: items.length, icon: Package, bg: 'bg-primary/10', color: 'text-primary' },
          { label: 'Normal stock', value: items.filter(i => getStatus(i).label === 'Normal').length, icon: Package, bg: 'bg-green-100', color: 'text-green-600' },
          { label: 'Low stock', value: items.filter(i => getStatus(i).label === 'Low').length, icon: TrendingDown, bg: 'bg-yellow-100', color: 'text-yellow-600' },
          { label: 'Critical', value: lowStock.length, icon: AlertTriangle, bg: 'bg-red-100', color: 'text-red-600' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-full ${s.bg}`}>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Grid */}
      {items.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>No inventory items. Create the first one.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(item => {
            const st = getStatus(item)
            const pct = item.max_stock ? Math.min(100, (item.quantity / item.max_stock) * 100) : 0
            const Icon = getCategoryIcon(item.category)
            return (
              <Card key={item.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2 rounded-full shrink-0 ${st.bg}`}>
                        <Icon className={`h-5 w-5 ${st.color}`} />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-base truncate">{item.name}</CardTitle>
                        <CardDescription>{CATEGORY_LABELS[item.category] ?? item.category}</CardDescription>
                      </div>
                    </div>
                    <Badge className={`${st.bg} ${st.color} shrink-0`}>{st.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Stock bar */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Stock</span>
                      <span className="font-medium">{item.quantity} {item.unit}</span>
                    </div>
                    <Progress value={pct} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Min: {item.min_stock}</span>
                      {item.max_stock && <span>Max: {item.max_stock}</span>}
                    </div>
                  </div>

                  {/* Costs */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-muted/40 rounded-md p-2">
                    <div>
                      <p className="text-muted-foreground">Cost per box</p>
                      <p className="font-medium">{formatUSD(item.cost_per_box ?? 0)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Units per box</p>
                      <p className="font-medium">{item.units_per_box} {item.unit}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Unit cost</p>
                      <p className="font-semibold text-foreground">{formatUSD(item.cost_per_unit)}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(item)}>
                      <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="border-red-200 text-red-600 hover:bg-red-50">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete {item.name}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. The item will be removed from inventory.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => handleDelete(item.id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Item' : 'New Inventory Item'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                placeholder="Industrial Detergent"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => (
                      <SelectItem key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Unit of measure *</Label>
                <Input
                  placeholder="kg, liters, units…"
                  value={form.unit}
                  onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Minimum stock</Label>
                <Input
                  type="number" min="0"
                  value={form.min_stock}
                  onChange={e => setForm(p => ({ ...p, min_stock: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Maximum stock</Label>
                <Input
                  type="number" min="0"
                  value={form.max_stock}
                  onChange={e => setForm(p => ({ ...p, max_stock: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Cost per box (USD)</Label>
                <Input
                  type="number" min="0"
                  value={form.cost_per_box}
                  onChange={e => setForm(p => ({ ...p, cost_per_box: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Units per box</Label>
                <Input
                  type="number" min="1"
                  value={form.units_per_box}
                  onChange={e => setForm(p => ({ ...p, units_per_box: Math.max(1, Number(e.target.value)) }))}
                />
              </div>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <span className="text-muted-foreground">Calculated unit cost: </span>
              <span className="font-semibold">{formatUSD(costPerUnit)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
