'use client'

import { useState, useCallback, useMemo } from 'react'
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api'
import { Navigation } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Default center: Bogotá, Colombia
const defaultCenter = { lat: 4.7110, lng: -74.0721 }

interface DeliveryMapProps {
  orders: any[]
  currentLocation?: { lat: number; lng: number } | null
  onOrderClick?: (order: any) => void
  className?: string
}

export function DeliveryMap({ orders, currentLocation, onOrderClick, className }: DeliveryMapProps) {
  // Carga de la API de Google Maps con la clave de entorno
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '', 
  })

  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)

  // Usamos useMemo para que el centro no se recalcule innecesariamente
  const center = useMemo(() => {
    return currentLocation ? { lat: currentLocation.lat, lng: currentLocation.lng } : defaultCenter
  }, [currentLocation])

  // Estilo del contenedor forzando altura
  const mapContainerStyle = useMemo(() => ({
    width: '100%',
    height: '100%', // Esto es crucial
    borderRadius: '0.5rem'
  }), [])

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
      // Evitar zoom excesivo
      const listener = google.maps.event.addListener(map, "idle", function() { 
        if (map.getZoom()! > 16) map.setZoom(16); 
        google.maps.event.removeListener(listener); 
      });
    } else {
      map.setCenter(center)
      map.setZoom(14)
    }

    setMap(map)
  }, [orders, currentLocation, center])

  const onUnmount = useCallback(function callback(map: google.maps.Map) {
    setMap(null)
  }, [])

  const centerOnLocation = () => {
    if (map && currentLocation) {
      map.panTo(currentLocation)
      map.setZoom(16)
    }
  }

  // Separar órdenes válidas
  const pickupOrders = useMemo(() => orders.filter(o => {
    const isPickup = ['pendiente', 'recogido', 'en_transito', 'en_deposito'].includes(o.status)
    return isPickup && o.pickup_lat && o.pickup_lng
  }), [orders])
  
  const deliveryOrders = useMemo(() => orders.filter(o => {
    const isDelivery = ['listo', 'en_ruta_entrega'].includes(o.status)
    return isDelivery && o.delivery_lat && o.delivery_lng
  }), [orders])

  // -- MANEJO DE ESTADOS DE CARGA --

  if (loadError) {
    return (
      <div className={cn("flex flex-col items-center justify-center bg-destructive/10 text-destructive text-sm text-center p-4 h-full w-full rounded-lg border border-destructive/20", className)} style={{ minHeight: '300px' }}>
        <p className="font-bold">Error crítico de Google Maps</p>
        <p className="text-xs mt-1">Verifica la consola del navegador y tu API Key.</p>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className={cn("flex items-center justify-center bg-muted h-full w-full rounded-lg border", className)} style={{ minHeight: '300px' }}>
        <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
            <p className="text-muted-foreground font-medium text-sm">Cargando Google Maps...</p>
        </div>
      </div>
    )
  }

  // -- RENDERIZADO DEL MAPA CUANDO ESTÁ LISTO --

  return (
    <div className={cn("relative h-full w-full", className)} style={{ minHeight: '300px' }}>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={14}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          disableDefaultUI: true,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        }}
      >
        {/* Marcador del Domiciliario */}
        {currentLocation && (
          <Marker
            position={currentLocation}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: "#3b82f6",
              fillOpacity: 1,
              strokeWeight: 2,
              strokeColor: "#ffffff",
            }}
            title="Tu ubicación"
          />
        )}

        {/* Marcadores de Recogida */}
        {pickupOrders.map((order) => {
          const position = { lat: Number(order.pickup_lat), lng: Number(order.pickup_lng) }
          return (
            <Marker
              key={`pickup-${order.id}`}
              position={position}
              icon={{ url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png' }}
              onClick={() => {
                setSelectedOrder({ ...order, position, type: 'pickup' })
                onOrderClick?.(order)
              }}
            />
          )
        })}

        {/* Marcadores de Entrega */}
        {deliveryOrders.map((order) => {
          const position = { lat: Number(order.delivery_lat), lng: Number(order.delivery_lng) }
          return (
            <Marker
              key={`delivery-${order.id}`}
              position={position}
              icon={{ url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png' }}
              onClick={() => {
                setSelectedOrder({ ...order, position, type: 'delivery' })
                onOrderClick?.(order)
              }}
            />
          )
        })}

        {/* Ventana de información */}
        {selectedOrder && (
          <InfoWindow
            position={selectedOrder.position}
            onCloseClick={() => setSelectedOrder(null)}
          >
            <div className="p-1 max-w-[200px] text-foreground">
              <div className={cn(
                "font-bold text-sm mb-1", 
                selectedOrder.type === 'pickup' ? "text-blue-600" : "text-green-600"
              )}>
                {selectedOrder.type === 'pickup' ? 'Recogida' : 'Entrega'}
              </div>
              <div className="font-medium mb-1">
                {selectedOrder.cliente?.full_name || 'Cliente'}
              </div>
              <div className="text-xs text-muted-foreground mb-2 line-clamp-2">
                {selectedOrder.type === 'pickup' ? selectedOrder.pickup_address : selectedOrder.delivery_address}
              </div>
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

      {/* Botón flotante para centrar */}
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
      <div className="absolute top-4 left-4 z-[10] bg-card/95 backdrop-blur rounded-lg p-3 shadow-lg border">
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