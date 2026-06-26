# Aquarello — Instrucciones para Claude Code

## Qué es esto
**Aquarello** es el nombre oficial de la marca de este proyecto (clon renombrado de la app original "Lavva"). Es una aplicación web (PWA) para servicio de lavandería a domicilio en Colombia, construida en Next.js 16 + Supabase + Tailwind + TypeScript. Conecta tres portales/tipos de usuario: **cliente**, **operador** y **admin** (además de domiciliario/conductor a nivel de roles).

Este proyecto conecta a su **propia base de datos Supabase independiente** (proyecto Aquarello), separada del proyecto original Lavva.

Algunas referencias internas (nombres de variables, valores de enum como `fragrance: 'lavva'`, archivos de configuración de Supabase) aún contienen "lavva" por compatibilidad con datos/esquema existentes — esto es intencional y no debe cambiarse sin evaluar el impacto en datos ya almacenados. El texto visible al usuario (títulos, manifest, UI) ya usa "Aquarello".

---

## Stack
- **Next.js 16** con App Router y TypeScript
- **Supabase** (BD, Auth, Realtime) vía `@supabase/ssr`
- **shadcn/ui** + Radix UI
- **Tailwind CSS v4**
- **Sonner** para toasts
- **React Hook Form + Zod** para formularios
- **Google Maps** para selección de coordenadas
- PWA con `public/manifest.json`

---

## Cómo trabajar conmigo

**Modo de aprobación: el usuario aprueba cada cambio.**

- Antes de editar archivos, explica qué vas a hacer y espera confirmación.
- Para cambios pequeños (un import, un type, un fix obvio) propón el diff y espera "ok" o "dale".
- Para cambios grandes (nueva página, migración SQL, nuevo endpoint), explica el plan completo primero, luego espera aprobación, y recién ahí escribe código.
- Nunca corras: `supabase db push`, `supabase db reset`, comandos que tumben datos, ni `npm run build` automáticamente.
- Sí puedes correr libremente: `npm run lint`, `npm run dev` para verificar que compila, `tsc --noEmit`.

---

## Estructura de rutas
```
app/
  cliente/       # portal del cliente (pedidos, perfil)
  domiciliario/  # app del repartidor (escanear QR, historial)
  operador/      # panel de planta (tickets, lavadoras, inventario, equipo)
  api/
    init-db/     # POST: verifica/seed de la BD
    webhooks/    # webhooks de pasarela de pago (futuro)
```

Cada sección tiene su propio layout con navegación independiente.

---

## Roles de usuario
Definidos en `lib/types.ts`: `cliente | domiciliario | operador | conductor | admin`

La verificación de rol se hace en cada página consultando `profiles.role` en Supabase después de `getUser()`. Si el rol no coincide, redirige al login correspondiente.

---

## Flujo de un pedido
```
pendiente → recogido → en_transito → en_deposito → en_transito_lavado
→ en_lavado → en_secado → en_alistamiento → listo
→ en_ruta_entrega → entregado | cancelado
```

Los labels y colores de estado están centralizados en `lib/types.ts` como `STATUS_LABELS` y `STATUS_COLORS` — **siempre usarlos, nunca redefinirlos localmente**.

### Transiciones críticas (no saltarse pasos)
- `recogido → en_transito`: domiciliario recoge en casa del cliente
- `en_transito → en_deposito`: requiere **handshake de 6 dígitos** validado contra el operador
- `en_lavado → en_secado`: el operador debe **marcar fin de lavado** explícitamente antes de iniciar secado
- `listo → en_ruta_entrega`: el operador asigna domiciliario de retorno
- `en_ruta_entrega → entregado`: el domiciliario confirma entrega en casa del cliente

---

## Convención de endpoints (IMPORTANTE)

Esta es la regla del proyecto, aplicarla siempre:

| Tipo de operación | Dónde va | Ejemplo |
|---|---|---|
| Mutaciones desde formularios/botones del usuario | **Server Action** (`app/.../actions.ts`) | Crear pedido, validar handshake, asignar máquina, marcar fase |
| Webhooks externos | **Route Handler** (`app/api/webhooks/...`) | Confirmación de pago de Wompi/MercadoPago |
| Endpoints llamados desde fuera | **Route Handler** | `init-db`, cron jobs |
| Lecturas con RLS | **Cliente directo a Supabase** | Listar mis pedidos, dashboard de máquinas |
| Subscripciones Realtime | **Cliente directo a Supabase** | Timeline en vivo del cliente |

**Validación**: toda Server Action valida input con Zod antes de tocar Supabase. Schemas en `lib/schemas/` agrupados por dominio (`order.ts`, `machine.ts`, etc.).

**Errores**: las Server Actions devuelven `{ ok: true, data } | { ok: false, error: string }`. Nunca lanzar excepciones que crucen la frontera cliente/servidor.

---

## Supabase

### Clientes
- **Browser**: `lib/supabase/client.ts` → singleton, devuelve `null` si faltan env vars
- **Server**: `lib/supabase/server.ts` → para Server Actions y Route Handlers
- **Admin** (service role): sólo para operaciones que requieran bypass de RLS, ej: webhooks de pago

**Siempre verificar que el cliente no sea `null` antes de usarlo.**

### Variables de entorno
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (solo server, nunca exponer)

### Tablas principales
| Tabla | Propósito |
|---|---|
| `profiles` | Extiende `auth.users`, guarda rol y datos del usuario |
| `orders` | Pedidos con QR único, estados, direcciones, coordenadas (lat, lng), código handshake |
| `order_preferences` | Preferencias de lavado por pedido |
| `order_history` | Auditoría de cambios de estado (quién, cuándo, qué) |
| `washing_process` | Proceso interno (máquina asignada, tiempos, fases) |
| `machines` | Lavadoras y secadoras físicas |
| `inventory` | Insumos (detergente, suavizante, etc.) |
| `payments` | Pagos en COP, referencia a pasarela externa |

Todas las tablas tienen **RLS habilitado**. Antes de proponer una nueva consulta, considerar las políticas de RLS aplicables.

### Migraciones
- Van en `supabase/migrations/` con timestamp.
- Cada migración debe incluir su política RLS si crea una tabla nueva.
- **Nunca aplicarlas automáticamente**: proponer el archivo `.sql` y esperar que el usuario las aplique con `supabase db push` cuando esté listo.

---

## Realtime

Ya hay subscripciones funcionando en el proyecto. Patrón estándar:

```tsx
useEffect(() => {
  const supabase = getSupabaseClient()
  if (!supabase) return

  const channel = supabase
    .channel(`order-${orderId}`)
    .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
      (payload) => { /* actualizar estado local */ }
    )
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}, [orderId])
```

**Reglas**:
- Siempre limpiar el canal en el cleanup del `useEffect`
- Nombrar canales de forma única para evitar colisiones (`order-{id}`, no solo `orders`)
- Para listas, refiltrar/refetch en lugar de mutar el array localmente
- Habilitar replicación en Supabase: `alter publication supabase_realtime add table <tabla>`

---

## Cadena de custodia (handshake)

El código de seguridad de 6 dígitos es **el mecanismo central de seguridad física** del producto:

1. Se genera al crear el pedido (`orders.handshake_code`)
2. Se le muestra **solo al operador** en su panel de detalles
3. El operador se lo dicta verbalmente al domiciliario cuando este llega a la planta con la bolsa
4. El domiciliario lo ingresa en su app para soltar la bolsa (`en_transito → en_deposito`)
5. La validación se hace **server-side en una Server Action** que compara el código y registra en `order_history`

**Nunca** exponer el código en el cliente del domiciliario antes de la validación. **Nunca** validarlo client-side.

---

## Máquinas (lavadoras/secadoras)

- La tabla `machines` puede no existir en entornos nuevos
- Componentes que la usan tienen fallback a `MOCK_MACHINES` / `MOCK_DRYERS` para no romper la UI
- Estados: `disponible | en_uso | mantenimiento`
- Al liberar: `status: 'disponible'`, limpiar `current_order_id`, `end_time`, `total_minutes`
- Una vez iniciado el lavado, el selector de máquina se bloquea (`disabled`)

### Control de fases (regla crítica)
- Lavadora y secadora son timers **independientes**
- Para iniciar el timer de secadora, el ticket debe estar en estado `en_secado`
- Para pasar a `en_secado`, el operador debe marcar **fin de lavado** explícitamente
- No se puede saltar de `en_lavado` directo a `en_alistamiento`

### MachineTimer
- Componente: `components/operador/machine-timer.tsx`
- Maneja countdown
- Cuando llega a 0: notifica con sonner, marca máquina como `disponible`, **no avanza el estado del pedido automáticamente** (lo hace el operador)

---

## Pagos (Wompi / MercadoPago / PayU)

El módulo está **pendiente**. Reglas para cuando lo construyamos:

- Todos los montos en **pesos colombianos (COP)**, enteros (no decimales)
- Usar `formatCOP()` de `lib/types.ts` para mostrar
- **Idempotencia**: cada intento de pago debe tener un `idempotency_key` único basado en `order_id + intento`
- El webhook de la pasarela vive en `app/api/webhooks/[pasarela]/route.ts`
- El webhook usa el cliente **service role** (bypass RLS) y valida la firma de la pasarela antes de tocar datos
- Estados de pago: `pendiente | aprobado | rechazado | reembolsado`
- Nunca confirmar entrega del pedido si el pago no está `aprobado` (salvo modo "pago contra entrega" si se decide soportarlo)

---

## Convenciones de código

- Páginas son `'use client'` con `useEffect` para cargar datos de Supabase, salvo cuando un Server Component sea claramente mejor (página de detalle estática, por ejemplo)
- QR codes con `generateQRCode()` de `lib/types.ts` → formato `LGO-{timestamp}-{random}`
- Precios en COP usando `formatCOP()`
- Componentes UI desde `components/ui/` (shadcn) — **no crear wrappers innecesarios**
- Iconos: solo `lucide-react`
- Toasts: solo `sonner` (`import { toast } from 'sonner'`)
- Acciones destructivas (cancelar, liberar) usan `AlertDialog` de shadcn para confirmación
- Checkboxes de pasos del proceso se derivan **del estado del ticket**, no de estado local
- Tipos compartidos en `lib/types.ts`, schemas Zod en `lib/schemas/`

---

## Roadmap pendiente (en orden de prioridad)

1. **Timeline Realtime del cliente** — suscripción a `orders` filtrada por `id`, actualizar `OrderStatusTimeline` en vivo
2. **Dashboard de máquinas con timers visuales** — countdown, liberación automática al llegar a 0
3. **Control de fases lavado/secado** — bloquear inicio de secadora hasta que el operador marque fin de lavado
4. **Logística de retorno** — operador asigna domiciliario de entrega, este confirma en casa del cliente
5. **Pagos y recibos** — integración con pasarela LATAM, webhook, recibo final con peso/extras

---

## Antes de cerrar cualquier feature

- [ ] `npm run lint` pasa sin errores
- [ ] Compila (`npm run dev` levanta sin errores en consola)
- [ ] Si toca BD: la migración está en `supabase/migrations/` con su RLS
- [ ] Si toca estado de pedido: hay registro en `order_history`
- [ ] Si es UI: usa `STATUS_LABELS`, `STATUS_COLORS`, `formatCOP` cuando aplique
- [ ] Si es Server Action: valida con Zod y devuelve `{ ok, data | error }`