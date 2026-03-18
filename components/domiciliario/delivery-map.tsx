'use client'

import { useState, useCallback } from 'react'
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api'
import { Navigation } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Order } from '@/lib/types'

const containerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '0.5rem'
}

// Default center: Bogotá, Colombia
const defaultCenter = { lat: 4.7110, lng: -74.0721 }

interface DeliveryMapProps {
  orders: any[] // Usamos any para evitar conflictos con la versión inyectada de profiles
  currentLocation?: { lat: number; lng: number } | null
  onOrderClick?: (order: any) => void
  className?: string
}

export function DeliveryMap({ orders, currentLocation, onOrderClick, className }: DeliveryMapProps) {
  // Carga de la API de Google Maps
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '', 
  })

  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)

  const center = currentLocation ? { lat: currentLocation.lat, lng: currentLocation.lng } : defaultCenter

  // Ajustar cámara automáticamente para ver todos los puntos
  const onLoad = useCallback(function callback(map: google.maps.Map) {
    const bounds = new window.google.maps.LatLngBounds()
    let hasMarkers = false

    if (currentLocation) {
      bounds.extend(currentLocation)
      hasMarkers = true
    }

    orders.forEach(order => {
      const isPickup = ['pendiente', 'recogido', 'en_transito', 'en_deposito'].includes(order.status)
      const lat = isPickup ? order.pickup_lat : order.delivery_lat
      const lng = isPickup ? order.pickup_lng : order.delivery_lng

      if (lat && lng) {
        bounds.extend({ lat: Number(lat), lng: Number(lng) })
        hasMarkers = true
      }
    })

    if (hasMarkers) {
      map.fitBounds(bounds)
      // Evitar que el zoom se acerque demasiado si solo hay 1 punto
      const listener = google.maps.event.addListener(map, "idle", function() { 
        if (map.getZoom()! > 15) map.setZoom(15); 
        google.maps.event.removeListener(listener); 
      });
    } else {
      map.setCenter(center)
      map.setZoom(13)
    }

    setMap(map)
  }, [orders, currentLocation, center])

  const onUnmount = useCallback(function callback(map: google.maps.Map) {
    setMap(null)
  }, [])

  // Botón para centrar en el domiciliario
  const centerOnLocation = () => {
    if (map && currentLocation) {
      map.panTo(currentLocation)
      map.setZoom(15)
    }
  }

  // Manejo de Errores de API Key
  if (loadError) {
    return (
      <div className={cn("flex flex-col items-center justify-center bg-destructive/10 text-destructive text-sm text-center p-4 h-full w-full rounded-lg", className)}>
        <p className="font-bold">Error al cargar Google Maps</p>
        <p className="text-xs mt-1">Verifica tu NEXT_PUBLIC_GOOGLE_MAPS_API_KEY en Vercel.</p>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className={cn("flex items-center justify-center bg-muted h-full w-full rounded-lg", className)}>
        <div className="animate-pulse text-muted-foreground font-medium">Cargando mapa de Google...</div>
      </div>
    )
  }

  // Separar órdenes que sí tienen coordenadas reales
  const pickupOrders = orders.filter(o => {
    const isPickup = ['pendiente', 'recogido', 'en_transito', 'en_deposito'].includes(o.status)
    return isPickup && o.pickup_lat && o.pickup_lng
  })
  
  const deliveryOrders = orders.filter(o => {
    const isDelivery = ['listo', 'en_ruta_entrega'].includes(o.status)
    return isDelivery && o.delivery_lat && o.delivery_lng
  })

  return (
    <div className={cn("relative h-full w-full", className)}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={13}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          disableDefaultUI: true, // Apaga los controles feos por defecto
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        }}
      >
        {/* Marcador del Domiciliario (Punto Azul Nativo) */}
        {currentLocation && (
          <Marker
            position={currentLocation}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: "#3b82f6", // Azul
              fillOpacity: 1,
              strokeWeight: 2,
              strokeColor: "#ffffff",
            }}
            title="Tu ubicación"
          />
        )}

        {/* Marcadores de Recogida (Pines Azules) */}
        {pickupOrders.map((order) => {
          const position = { lat: Number(order.pickup_lat), lng: Number(order.pickup_lng) }
          return (
            <Marker
              key={`pickup-${order.id}`}
              position={position}
              icon={{ url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png' }}
              onClick={() => {
                setSelectedOrder({ ...order, position, type: 'pickup' })
                onOrderClick?.(order)
              }}
            />
          )
        })}

        {/* Marcadores de Entrega (Pines Verdes) */}
        {deliveryOrders.map((order) => {
          const position = { lat: Number(order.delivery_lat), lng: Number(order.delivery_lng) }
          return (
            <Marker
              key={`delivery-${order.id}`}
              position={position}
              icon={{ url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png' }}
              onClick={() => {
                setSelectedOrder({ ...order, position, type: 'delivery' })
                onOrderClick?.(order)
              }}
            />
          )
        })}

        {/* Ventana de información interactiva */}
        {selectedOrder && (
          <InfoWindow
            position={selectedOrder.position}
            onCloseClick={() => setSelectedOrder(null)}
          >
            <div className="p-1 max-w-[200px]">
              <div className={cn(
                "font-bold text-sm mb-1", 
                selectedOrder.type === 'pickup' ? "text-blue-600" : "text-green-600"
              )}>
                {selectedOrder.type === 'pickup' ? 'Recogida' : 'Entrega'}
              </div>
              <div className="font-medium text-foreground mb-1">
                {selectedOrder.cliente?.full_name || 'Cliente'}
              </div>
              <div className="text-xs text-muted-foreground mb-2">
                {selectedOrder.type === 'pickup' ? selectedOrder.pickup_address : selectedOrder.delivery_address}
              </div>
              
              {/* Botón nativo para abrir la app de Waze/Google Maps */}
              <a 
                href={`https://www.google.com/maps/dir/?api=1&destination=${selectedOrder.position.lat},${selectedOrder.position.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-white bg-blue-600 px-3 py-1.5 rounded block text-center mt-2 hover:bg-blue-700 font-medium"
              >
                Navegar aquí
              </a>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* Botón flotante para centrar la cámara */}
      {currentLocation && (
        <Button
          size="icon"
          className="absolute bottom-4 right-4 z-[10] shadow-lg"
          onClick={centerOnLocation}
        >
          <Navigation className="h-5 w-5" />
        </Button>
      )}

      {/* Leyenda superior */}
      <div className="absolute top-4 left-4 z-[10] bg-card/90 backdrop-blur rounded-lg p-3 shadow-lg border">
        <div className="space-y-2 text-xs font-medium">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-blue-500" />
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