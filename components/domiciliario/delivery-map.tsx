'use client'

import { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Navigation } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Order } from '@/lib/types'

// Fix for default marker icons in Leaflet with Next.js
const createCustomIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 30px;
        height: 30px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
      "></div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
  })
}

const pickupIcon = createCustomIcon('#0891b2') // Primary cyan
const deliveryIcon = createCustomIcon('#10b981') // Green
const currentLocationIcon = L.divIcon({
  className: 'current-location-marker',
  html: `
    <div style="
      background-color: #3b82f6;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
    "></div>
  `,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

interface DeliveryMapProps {
  orders: Order[]
  currentLocation?: { lat: number; lng: number } | null
  onOrderClick?: (order: Order) => void
  className?: string
}

function MapController({ center }: { center: [number, number] }) {
  const map = useMap()
  
  useEffect(() => {
    map.setView(center, 13)
  }, [map, center])
  
  return null
}

export function DeliveryMap({ orders, currentLocation, onOrderClick, className }: DeliveryMapProps) {
  const [mapReady, setMapReady] = useState(false)
  const mapRef = useRef<L.Map | null>(null)

  // Default center: Bogotá, Colombia
  const defaultCenter: [number, number] = [4.7110, -74.0721]
  const center = currentLocation 
    ? [currentLocation.lat, currentLocation.lng] as [number, number]
    : defaultCenter

  useEffect(() => {
    setMapReady(true)
  }, [])

  const centerOnLocation = () => {
    if (mapRef.current && currentLocation) {
      mapRef.current.setView([currentLocation.lat, currentLocation.lng], 15)
    }
  }

  if (!mapReady) {
    return (
      <div className={cn("flex items-center justify-center bg-muted", className)}>
        <div className="animate-pulse text-muted-foreground">Cargando mapa...</div>
      </div>
    )
  }

  // Filter orders with coordinates
  const pickupOrders = orders.filter(o => 
    o.status === 'pendiente' && o.pickup_lat && o.pickup_lng
  )
  const deliveryOrders = orders.filter(o => 
    (o.status === 'listo' || o.status === 'en_ruta_entrega') && 
    o.delivery_lat && o.delivery_lng
  )

  return (
    <div className={cn("relative", className)}>
      <MapContainer
        center={center}
        zoom={13}
        className="h-full w-full rounded-lg"
        ref={mapRef}
      >
        <MapController center={center} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Current location marker */}
        {currentLocation && (
          <Marker 
            position={[currentLocation.lat, currentLocation.lng]}
            icon={currentLocationIcon}
          >
            <Popup>
              <div className="text-center">
                <strong>Tu ubicación actual</strong>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Pickup markers */}
        {pickupOrders.map((order) => (
          <Marker
            key={`pickup-${order.id}`}
            position={[order.pickup_lat!, order.pickup_lng!]}
            icon={pickupIcon}
            eventHandlers={{
              click: () => onOrderClick?.(order)
            }}
          >
            <Popup>
              <div className="space-y-1">
                <div className="font-semibold text-primary">Recogida</div>
                <div className="text-sm font-mono">{order.qr_code}</div>
                <div className="text-xs text-muted-foreground">{order.pickup_address}</div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Delivery markers */}
        {deliveryOrders.map((order) => (
          <Marker
            key={`delivery-${order.id}`}
            position={[order.delivery_lat!, order.delivery_lng!]}
            icon={deliveryIcon}
            eventHandlers={{
              click: () => onOrderClick?.(order)
            }}
          >
            <Popup>
              <div className="space-y-1">
                <div className="font-semibold text-green-600">Entrega</div>
                <div className="text-sm font-mono">{order.qr_code}</div>
                <div className="text-xs text-muted-foreground">{order.delivery_address}</div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Center on location button */}
      {currentLocation && (
        <Button
          size="icon"
          className="absolute bottom-4 right-4 z-[1000] shadow-lg"
          onClick={centerOnLocation}
        >
          <Navigation className="h-5 w-5" />
        </Button>
      )}

      {/* Legend */}
      <div className="absolute top-4 left-4 z-[1000] bg-card/90 backdrop-blur rounded-lg p-3 shadow-lg">
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-primary" />
            <span>Recogidas ({pickupOrders.length})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-green-500" />
            <span>Entregas ({deliveryOrders.length})</span>
          </div>
        </div>
      </div>
    </div>
  )
}
