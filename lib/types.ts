// User roles
export type UserRole = 'cliente' | 'domiciliario' | 'operador' | 'conductor' | 'admin';

// Order status
export type OrderStatus = 
  | 'pendiente'
  | 'recogido'
  | 'en_deposito'
  | 'en_transito_lavado'
  | 'en_lavado'
  | 'en_secado'
  | 'en_alistamiento'
  | 'listo'
  | 'en_transito_entrega'
  | 'en_ruta_entrega'
  | 'entregado'
  | 'cancelado';

// Washing process status
export type WashingStatus = 
  | 'recibido'
  | 'en_alistamiento'
  | 'en_lavado'
  | 'en_suavizado'
  | 'en_secado'
  | 'en_planchado'
  | 'en_doblado'
  | 'completado';

// Profile interface
export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  address: string | null;
  city: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Order preferences
export interface OrderPreferences {
  id: string;
  order_id: string;
  separate_whites: boolean;
  use_softener: boolean;
  use_degreaser: boolean;
  use_bleach: boolean;
  fragrance: string | null;
  ironing_required: boolean;
  special_folding: boolean;
  delicate_care: boolean;
  stain_treatment: boolean;
  notes: string | null;
  created_at: string;
}

// Order interface
export interface Order {
  id: string;
  qr_code: string;
  client_id: string;
  delivery_person_id: string | null;
  operator_id: string | null;
  driver_id: string | null;
  status: OrderStatus;
  weight_kg: number | null;
  pickup_address: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  delivery_address: string | null;
  delivery_lat: number | null;
  delivery_lng: number | null;
  estimated_price: number | null;
  final_price: number | null;
  pickup_date: string | null;
  estimated_delivery: string | null;
  actual_delivery: string | null;
  created_at: string;
  updated_at: string;
  preferences?: OrderPreferences;
  client?: Profile;
}

// Order history
export interface OrderHistory {
  id: string;
  order_id: string;
  status: OrderStatus;
  notes: string | null;
  changed_by: string | null;
  created_at: string;
}

// Washing process
export interface WashingProcess {
  id: string;
  order_id: string;
  operator_id: string | null;
  washing_machine: string | null;
  dryer: string | null;
  status: WashingStatus;
  started_at: string | null;
  washing_started: string | null;
  washing_ended: string | null;
  drying_started: string | null;
  drying_ended: string | null;
  ironing_started: string | null;
  ironing_ended: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
}

// Inventory item
export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  min_stock: number;
  cost_per_unit: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Inventory usage
export interface InventoryUsage {
  id: string;
  inventory_id: string;
  order_id: string | null;
  quantity_used: number;
  used_by: string | null;
  notes: string | null;
  created_at: string;
}

// Payment
export interface Payment {
  id: string;
  order_id: string;
  amount: number;
  payment_method: 'tarjeta' | 'nequi' | 'efectivo' | 'transferencia' | 'daviplata';
  status: 'pendiente' | 'completado' | 'fallido' | 'reembolsado';
  transaction_id: string | null;
  paid_at: string | null;
  created_at: string;
}

// Receipt
export interface Receipt {
  id: string;
  order_id: string;
  receipt_number: string;
  subtotal: number;
  tax: number;
  total: number;
  pdf_url: string | null;
  sent_to_client: boolean;
  created_at: string;
}

// Pricing
export interface Pricing {
  id: string;
  name: string;
  description: string | null;
  price_per_kg: number;
  additional_services: Record<string, number>;
  is_active: boolean;
  created_at: string;
}

// Status label mapping
export const STATUS_LABELS: Record<OrderStatus, string> = {
  pendiente: 'Pendiente',
  recogido: 'Recogido',
  en_deposito: 'En depósito',
  en_transito_lavado: 'En tránsito a lavado',
  en_lavado: 'En lavado',
  en_secado: 'En secado',
  en_alistamiento: 'En alistamiento',
  listo: 'Listo',
  en_transito_entrega: 'En tránsito a entrega',
  en_ruta_entrega: 'En ruta de entrega',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

// Status colors
export const STATUS_COLORS: Record<OrderStatus, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  recogido: 'bg-blue-100 text-blue-800',
  en_deposito: 'bg-indigo-100 text-indigo-800',
  en_transito_lavado: 'bg-cyan-100 text-cyan-800',
  en_lavado: 'bg-sky-100 text-sky-800',
  en_secado: 'bg-orange-100 text-orange-800',
  en_alistamiento: 'bg-purple-100 text-purple-800',
  listo: 'bg-emerald-100 text-emerald-800',
  en_transito_entrega: 'bg-teal-100 text-teal-800',
  en_ruta_entrega: 'bg-lime-100 text-lime-800',
  entregado: 'bg-green-100 text-green-800',
  cancelado: 'bg-red-100 text-red-800',
};

// Fragrance options
export const FRAGRANCE_OPTIONS = [
  { value: 'ninguno', label: 'Sin fragancia' },
  { value: 'lavanda', label: 'Lavanda' },
  { value: 'floral', label: 'Floral' },
  { value: 'fresco', label: 'Fresco' },
  { value: 'suave', label: 'Suave' },
  { value: 'intenso', label: 'Intenso' },
];

// Format price in COP
export function formatCOP(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Generate QR code string
export function generateQRCode(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `LGO-${timestamp}-${random}`.toUpperCase();
}
