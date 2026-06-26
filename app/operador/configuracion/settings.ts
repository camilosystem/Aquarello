export const SETTINGS_ID = '00000000-0000-0000-0000-000000000001'

export type NavVisibility = {
  dashboard: boolean
  pos: boolean
  tickets: boolean
  machines: boolean
  inventory: boolean
  purchases: boolean
  customers: boolean
  drivers: boolean
  team: boolean
  reports: boolean
}

export const DEFAULT_NAV_VISIBILITY: NavVisibility = {
  dashboard: true,
  pos: true,
  tickets: true,
  machines: true,
  inventory: true,
  purchases: true,
  customers: true,
  drivers: true,
  team: true,
  reports: true,
}

export type AppSettings = {
  price_per_kg: number
  min_price: number
  price_ironing: number
  price_softener: number
  price_bleach: number
  price_degreaser: number
  price_stain_treatment: number
  price_delicate_care: number
  price_special_folding: number
  price_express: number
  price_separate_whites: number
  price_separate_colors: number
  opening_time: string
  closing_time: string
  avg_wash_minutes: number
  notif_new_order: boolean
  notif_low_stock: boolean
  notif_order_ready: boolean
  nav_visibility: NavVisibility
}

export const DEFAULT_SETTINGS: AppSettings = {
  price_per_kg: 1.75,
  min_price: 15,
  price_ironing: 3,
  price_softener: 1.50,
  price_bleach: 1.25,
  price_degreaser: 2,
  price_stain_treatment: 3,
  price_delicate_care: 2,
  price_special_folding: 1,
  price_express: 8,
  price_separate_whites: 2,
  price_separate_colors: 2,
  opening_time: '07:00',
  closing_time: '20:00',
  avg_wash_minutes: 90,
  notif_new_order: true,
  notif_low_stock: true,
  notif_order_ready: true,
  nav_visibility: DEFAULT_NAV_VISIBILITY,
}
