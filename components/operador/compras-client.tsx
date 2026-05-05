'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  Plus, Pencil, Trash2, Loader2, ShoppingCart, Users,
  Phone, Mail, MapPin, X, Package,
} from 'lucide-react'
import {
  createSupplierAction, updateSupplierAction, deleteSupplierAction,
  createPurchaseAction, deletePurchaseAction,
} from '@/app/operador/compras/actions'
import { formatCOP, type Supplier, type Purchase, type InventoryItem } from '@/lib/types'

// ─── Types ────────────────────────────────────────────────────────────────────

type PurchaseLine = {
  inventory_item_id: string
  quantity: number
  cost_per_box: number
  units_per_box: number
}

const EMPTY_SUPPLIER = { name: '', contact_name: '', phone: '', email: '', address: '', notes: '' }
const EMPTY_LINE: PurchaseLine = { inventory_item_id: '', quantity: 1, cost_per_box: 0, units_per_box: 1 }

interface Props {
  suppliers: Supplier[]
  purchases: (Purchase & { supplier: Supplier | null; items_count: number })[]
  inventoryItems: InventoryItem[]
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ComprasClient({ suppliers, purchases, inventoryItems }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Supplier dialog
  const [supplierDialog, setSupplierDialog] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [supplierForm, setSupplierForm] = useState(EMPTY_SUPPLIER)

  // Purchase dialog
  const [purchaseDialog, setPurchaseDialog] = useState(false)
  const [purchaseForm, setPurchaseForm] = useState({
    supplier_id: '',
    invoice_number: '',
    purchase_date: new Date().toISOString().split('T')[0],
    notes: '',
  })
  const [lines, setLines] = useState<PurchaseLine[]>([{ ...EMPTY_LINE }])

  // ─── Suppliers ─────────────────────────────────────────────────────────────

  const openCreateSupplier = () => {
    setEditingSupplier(null)
    setSupplierForm(EMPTY_SUPPLIER)
    setSupplierDialog(true)
  }

  const openEditSupplier = (s: Supplier) => {
    setEditingSupplier(s)
    setSupplierForm({
      name: s.name,
      contact_name: s.contact_name ?? '',
      phone: s.phone ?? '',
      email: s.email ?? '',
      address: s.address ?? '',
      notes: s.notes ?? '',
    })
    setSupplierDialog(true)
  }

  const handleSaveSupplier = () => {
    if (!supplierForm.name.trim()) { toast.error('El nombre es obligatorio'); return }
    startTransition(async () => {
      const result = editingSupplier
        ? await updateSupplierAction(editingSupplier.id, supplierForm)
        : await createSupplierAction(supplierForm)
      if (result.ok) {
        toast.success(editingSupplier ? 'Proveedor actualizado' : 'Proveedor creado')
        setSupplierDialog(false)
        router.refresh()
      } else {
        toast.error(`Error: ${result.error}`)
      }
    })
  }

  const handleDeleteSupplier = (id: string) => {
    startTransition(async () => {
      const result = await deleteSupplierAction(id)
      if (result.ok) { toast.success('Proveedor eliminado'); router.refresh() }
      else toast.error(`Error: ${result.error}`)
    })
  }

  // ─── Purchases ─────────────────────────────────────────────────────────────

  const addLine = () => setLines(prev => [...prev, { ...EMPTY_LINE }])
  const removeLine = (idx: number) => setLines(prev => prev.filter((_, i) => i !== idx))
  const updateLine = (idx: number, patch: Partial<PurchaseLine>) =>
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, ...patch } : l))

  const computedLines = lines.map(l => {
    const unit_price = l.units_per_box > 0 ? l.cost_per_box / l.units_per_box : l.cost_per_box
    const total_price = unit_price * l.quantity
    return { ...l, unit_price, total_price }
  })

  const purchaseTotal = computedLines.reduce((s, l) => s + l.total_price, 0)

  const openCreatePurchase = () => {
    setPurchaseForm({
      supplier_id: '',
      invoice_number: '',
      purchase_date: new Date().toISOString().split('T')[0],
      notes: '',
    })
    setLines([{ ...EMPTY_LINE }])
    setPurchaseDialog(true)
  }

  const handleSavePurchase = () => {
    const validLines = computedLines.filter(l => l.inventory_item_id && l.quantity > 0)
    if (validLines.length === 0) { toast.error('Agrega al menos un ítem válido'); return }
    startTransition(async () => {
      const result = await createPurchaseAction({
        supplier_id: purchaseForm.supplier_id || null,
        invoice_number: purchaseForm.invoice_number,
        purchase_date: purchaseForm.purchase_date,
        notes: purchaseForm.notes,
        lines: validLines,
      })
      if (result.ok) {
        toast.success('Compra registrada. Inventario actualizado.')
        setPurchaseDialog(false)
        router.refresh()
      } else {
        toast.error(`Error: ${result.error}`)
      }
    })
  }

  const handleDeletePurchase = (id: string) => {
    startTransition(async () => {
      const result = await deletePurchaseAction(id)
      if (result.ok) { toast.success('Compra eliminada. Inventario revertido.'); router.refresh() }
      else toast.error(`Error: ${result.error}`)
    })
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Compras y Proveedores</h1>
      </div>

      <Tabs defaultValue="proveedores">
        <TabsList>
          <TabsTrigger value="proveedores" className="flex items-center gap-2">
            <Users className="h-4 w-4" /> Proveedores
          </TabsTrigger>
          <TabsTrigger value="compras" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" /> Compras
          </TabsTrigger>
        </TabsList>

        {/* ── Proveedores tab ──────────────────────────────────────────────── */}
        <TabsContent value="proveedores" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button onClick={openCreateSupplier}>
              <Plus className="mr-2 h-4 w-4" /> Nuevo Proveedor
            </Button>
          </div>

          {suppliers.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p>No hay proveedores registrados aún.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {suppliers.map(s => (
                <Card key={s.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base">{s.name}</CardTitle>
                        {s.contact_name && (
                          <p className="text-sm text-muted-foreground mt-0.5">{s.contact_name}</p>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditSupplier(s)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar {s.name}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Las compras registradas con este proveedor mantendrán el registro histórico.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-600 hover:bg-red-700"
                                onClick={() => handleDeleteSupplier(s.id)}
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-1.5">
                    {s.phone && (
                      <p className="text-sm flex items-center gap-1.5 text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" /> {s.phone}
                      </p>
                    )}
                    {s.email && (
                      <p className="text-sm flex items-center gap-1.5 text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" /> {s.email}
                      </p>
                    )}
                    {s.address && (
                      <p className="text-sm flex items-center gap-1.5 text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" /> {s.address}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Compras tab ──────────────────────────────────────────────────── */}
        <TabsContent value="compras" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button onClick={openCreatePurchase}>
              <Plus className="mr-2 h-4 w-4" /> Registrar Compra
            </Button>
          </div>

          {purchases.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p>No hay compras registradas aún.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {purchases.map(p => (
                <Card key={p.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-start gap-4 min-w-0">
                        <div className="bg-primary/10 p-2.5 rounded-full shrink-0">
                          <ShoppingCart className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold">
                            {p.supplier?.name ?? 'Sin proveedor'}
                            {p.invoice_number && (
                              <span className="text-muted-foreground font-normal text-sm ml-2">
                                #{p.invoice_number}
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(p.purchase_date), "d 'de' MMMM, yyyy", { locale: es })}
                            {' · '}
                            {p.items_count} ítem{p.items_count !== 1 ? 's' : ''}
                          </p>
                          {p.notes && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">{p.notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <p className="font-bold text-lg">{formatCOP(p.total_amount)}</p>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar esta compra?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Las cantidades añadidas al inventario por esta compra serán revertidas.
                                Esta acción no se puede deshacer.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-600 hover:bg-red-700"
                                onClick={() => handleDeletePurchase(p.id)}
                              >
                                Sí, eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Supplier dialog ──────────────────────────────────────────────────── */}
      <Dialog open={supplierDialog} onOpenChange={setSupplierDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                placeholder="Empresa o persona"
                value={supplierForm.name}
                onChange={e => setSupplierForm(p => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Contacto</Label>
              <Input
                placeholder="Nombre del representante"
                value={supplierForm.contact_name}
                onChange={e => setSupplierForm(p => ({ ...p, contact_name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input
                  placeholder="3001234567"
                  value={supplierForm.phone}
                  onChange={e => setSupplierForm(p => ({ ...p, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="proveedor@ejemplo.com"
                  value={supplierForm.email}
                  onChange={e => setSupplierForm(p => ({ ...p, email: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Dirección</Label>
              <Input
                placeholder="Calle, ciudad"
                value={supplierForm.address}
                onChange={e => setSupplierForm(p => ({ ...p, address: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                placeholder="Observaciones del proveedor…"
                value={supplierForm.notes}
                onChange={e => setSupplierForm(p => ({ ...p, notes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSupplierDialog(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button onClick={handleSaveSupplier} disabled={isPending}>
              {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando…</> : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Purchase dialog ──────────────────────────────────────────────────── */}
      <Dialog open={purchaseDialog} onOpenChange={setPurchaseDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Compra</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">

            {/* Header fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Proveedor</Label>
                <Select
                  value={purchaseForm.supplier_id}
                  onValueChange={v => setPurchaseForm(p => ({ ...p, supplier_id: v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Sin proveedor" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin proveedor</SelectItem>
                    {suppliers.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={purchaseForm.purchase_date}
                  onChange={e => setPurchaseForm(p => ({ ...p, purchase_date: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Nro. Factura / Remisión</Label>
                <Input
                  placeholder="FAC-001"
                  value={purchaseForm.invoice_number}
                  onChange={e => setPurchaseForm(p => ({ ...p, invoice_number: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Notas</Label>
                <Input
                  placeholder="Observaciones…"
                  value={purchaseForm.notes}
                  onChange={e => setPurchaseForm(p => ({ ...p, notes: e.target.value }))}
                />
              </div>
            </div>

            <Separator />

            {/* Lines */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Ítems comprados</Label>
                <Button type="button" variant="outline" size="sm" onClick={addLine}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" /> Agregar ítem
                </Button>
              </div>

              {/* Column headers */}
              <div className="grid grid-cols-[1fr_80px_110px_80px_90px_32px] gap-2 text-xs text-muted-foreground px-1">
                <span>Ítem</span>
                <span>Cantidad</span>
                <span>Costo x caja</span>
                <span>Unid/caja</span>
                <span className="text-right">Subtotal</span>
                <span />
              </div>

              {lines.map((line, idx) => {
                const cl = computedLines[idx]
                return (
                  <div key={idx} className="grid grid-cols-[1fr_80px_110px_80px_90px_32px] gap-2 items-center">
                    <Select
                      value={line.inventory_item_id}
                      onValueChange={v => {
                        const item = inventoryItems.find(i => i.id === v)
                        updateLine(idx, {
                          inventory_item_id: v,
                          cost_per_box: item?.cost_per_box ?? 0,
                          units_per_box: item?.units_per_box ?? 1,
                        })
                      }}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Seleccionar…" />
                      </SelectTrigger>
                      <SelectContent>
                        {inventoryItems.map(i => (
                          <SelectItem key={i.id} value={i.id}>
                            {i.name} ({i.unit})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number" min="0.01" step="0.01"
                      className="h-8 text-sm"
                      value={line.quantity}
                      onChange={e => updateLine(idx, { quantity: parseFloat(e.target.value) || 0 })}
                    />
                    <Input
                      type="number" min="0"
                      className="h-8 text-sm"
                      value={line.cost_per_box}
                      onChange={e => updateLine(idx, { cost_per_box: parseFloat(e.target.value) || 0 })}
                    />
                    <Input
                      type="number" min="1"
                      className="h-8 text-sm"
                      value={line.units_per_box}
                      onChange={e => updateLine(idx, { units_per_box: Math.max(1, parseInt(e.target.value) || 1) })}
                    />
                    <p className="text-sm font-medium text-right">{formatCOP(cl.total_price)}</p>
                    <Button
                      type="button" variant="ghost" size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-red-500"
                      onClick={() => removeLine(idx)}
                      disabled={lines.length === 1}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )
              })}

              <div className="flex justify-end pt-1 border-t">
                <p className="text-sm font-semibold">
                  Total compra:{' '}
                  <span className="text-lg text-primary">{formatCOP(purchaseTotal)}</span>
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4 shrink-0" />
              Al guardar, las cantidades serán sumadas al inventario automáticamente.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPurchaseDialog(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button onClick={handleSavePurchase} disabled={isPending}>
              {isPending
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando…</>
                : 'Registrar Compra'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
