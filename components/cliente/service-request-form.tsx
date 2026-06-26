'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Shirt, Droplets, Sparkles, Wind, Palette,
  AlertTriangle, Loader2, MapPin, MapPinned, Phone, X, CheckCircle2, Minus, Plus
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { FRAGRANCE_OPTIONS, generateQRCode, formatUSD } from '@/lib/types'

import { useJsApiLoader, GoogleMap, Marker } from '@react-google-maps/api'

interface ServiceRequestFormProps {
  userId: string
  userAddress?: string | null
}

interface WashingPreferences {
  separateWhites: boolean
  separateColors: boolean
  useSoftener: boolean
  useDegreaser: boolean
  useBleach: boolean
  fragrance: string
  stainCount: number
  notes: string
}

const DEFAULT_PREFERENCES: WashingPreferences = {
  separateWhites: false,
  separateColors: false,
  useSoftener: true,
  useDegreaser: false,
  useBleach: false,
  fragrance: 'ninguno',
  stainCount: 0,
  notes: '',
}

const PRICE_PER_KG = 3.50
const MIN_PRICE = 12
const ADDITIONAL_PRICES = {
  separateWhites: 1.50,
  separateColors: 1.50,
  softener: 1,
  bleach: 0.75,
  degreaser: 1.25,
  stainTreatment: 2,
}

const DEFAULT_CENTER = { lat: 40.7556, lng: -73.8830 }

export function ServiceRequestForm({ userId, userAddress }: ServiceRequestFormProps) {
  const router = useRouter()
  const supabase = createClient()

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  })

  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)

  const [address, setAddress] = useState(userAddress || '')
  const [phone, setPhone] = useState('')

  const [showMapModal, setShowMapModal] = useState(false)
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER)
  const [coordinates, setCoordinates] = useState<{lat: number, lng: number} | null>(null)

  const [preferences, setPreferences] = useState<WashingPreferences>(DEFAULT_PREFERENCES)

  useEffect(() => {
    async function loadPhone() {
      const { data } = await supabase.from('profiles').select('phone').eq('id', userId).single()
      if (data?.phone) setPhone(data.phone)
    }
    loadPhone()
  }, [userId, supabase])

  const handleOpenMap = () => {
    if (loadError) {
      toast.error('Error loading Google Maps. Check your API key.')
      return
    }

    setShowMapModal(true)

    if (navigator.geolocation && !coordinates) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMapCenter({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        },
        () => console.warn("GPS denied, using default center."),
        { timeout: 5000 }
      )
    } else if (coordinates) {
      setMapCenter(coordinates)
    }
  }

  const handleMarkerDragEnd = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      setMapCenter({ lat: e.latLng.lat(), lng: e.latLng.lng() })
    }
  }

  const handleConfirmLocation = () => {
    setCoordinates(mapCenter)
    setShowMapModal(false)
    toast.success('Exact location saved for the delivery driver')
  }

  const estimatePrice = () => {
    let total = MIN_PRICE
    if (preferences.separateWhites) total += ADDITIONAL_PRICES.separateWhites
    if (preferences.separateColors) total += ADDITIONAL_PRICES.separateColors
    if (preferences.useSoftener) total += ADDITIONAL_PRICES.softener
    if (preferences.useBleach) total += ADDITIONAL_PRICES.bleach
    if (preferences.useDegreaser) total += ADDITIONAL_PRICES.degreaser
    if (preferences.stainCount > 0) total += preferences.stainCount * ADDITIONAL_PRICES.stainTreatment
    return total
  }

  const handlePreferenceChange = (key: keyof WashingPreferences, value: boolean | string | number) => {
    setPreferences(prev => ({ ...prev, [key]: value }))
  }

  const handleContinueToStep2 = () => {
    if (!address.trim()) {
      toast.error('Please enter your written address')
      return
    }
    if (!phone.trim() || phone.length < 7) {
      toast.error('Please enter a valid phone number')
      return
    }
    if (!coordinates) {
      toast.error('Please pin your location on the interactive map')
      return
    }
    setStep(2)
  }

  const handleSubmit = async () => {
    if (!supabase) {
      toast.error('Connection error. Please reload the page.')
      return
    }

    setLoading(true)
    try {
      await supabase.from('profiles').update({ phone }).eq('id', userId)

      const qrCode = generateQRCode()
      const estimatedPrice = estimatePrice()
      const receptionCode = Math.floor(100000 + Math.random() * 900000).toString()

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          qr_code: qrCode,
          reception_code: receptionCode,
          user_id: userId,
          status: 'pendiente',
          pickup_address: address,
          pickup_lat: coordinates?.lat || null,
          pickup_lng: coordinates?.lng || null,
          base_price: estimatedPrice,
          total_price: estimatedPrice,
          notes: preferences.notes || null,
        })
        .select()
        .single()

      if (orderError) throw orderError

      const { error: prefError } = await supabase
        .from('order_preferences')
        .insert({
          order_id: order.id,
          separate_whites: preferences.separateWhites,
          separate_colors: preferences.separateColors,
          use_softener: preferences.useSoftener,
          use_degreaser: preferences.useDegreaser,
          use_bleach: preferences.useBleach,
          scent: preferences.fragrance,
          stain_treatment: preferences.stainCount > 0,
          stain_count: preferences.stainCount,
          special_instructions: preferences.notes || null,
        })

      if (prefError) throw prefError

      await supabase.from('order_history').insert({
        order_id: order.id,
        status: 'pendiente',
        notes: 'Order created by the client',
        changed_by: userId,
      })

      router.push(`/cliente/pedido-creado?id=${order.id}`)
    } catch (error: any) {
      console.error('Error creating order:', error)
      const msg = error?.message ?? error?.error_description ?? JSON.stringify(error)
      toast.error(`Error: ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="space-y-4 pb-24">
        <div className="flex items-center justify-center gap-2">
          <div className={`h-2 w-32 rounded-full transition-colors ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
          <div className={`h-2 w-32 rounded-full transition-colors ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
        </div>

        {/* Step 1 — Pickup details */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Pickup Details
              </CardTitle>
              <CardDescription>
                Where should we go and how can we reach you?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">

              <div className="space-y-2">
                <Label htmlFor="address">Written address *</Label>
                <Textarea
                  id="address"
                  placeholder="E.g.: 8201 Northern Blvd, Apt 5B"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={2}
                  className="resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label>GPS Location (For the delivery driver) *</Label>
                {coordinates ? (
                  <div className="flex items-center justify-between p-3 border rounded-md bg-green-50 border-green-200">
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="text-sm font-medium">Location pinned on the map</span>
                    </div>
                    <Button variant="ghost" size="sm" className="text-green-700 hover:text-green-800 hover:bg-green-100" onClick={handleOpenMap}>
                      Edit
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
                    onClick={handleOpenMap}
                    disabled={!isLoaded}
                  >
                    <MapPinned className="mr-2 h-4 w-4" />
                    {isLoaded ? 'Pin location on the map' : 'Loading component...'}
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Contact phone *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="E.g.: (555) 123-4567"
                    className="pl-9"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <Button
                className="w-full mt-6"
                onClick={handleContinueToStep2}
                disabled={!address.trim() || !phone.trim() || !coordinates}
              >
                Continue to preferences
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2 — Washing preferences */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Washing Preferences
              </CardTitle>
              <CardDescription>
                Customize how you want us to wash your laundry
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">

                {/* Separate whites */}
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <Shirt className="h-5 w-5 text-primary" />
                    <div>
                      <Label className="text-sm font-medium">Separate whites</Label>
                      <p className="text-xs text-muted-foreground">We wash your white clothes, towels, and sheets separately. (+{formatUSD(ADDITIONAL_PRICES.separateWhites)})</p>
                    </div>
                  </div>
                  <Switch checked={preferences.separateWhites} onCheckedChange={(c) => handlePreferenceChange('separateWhites', c)} />
                </div>

                {/* Separate colors */}
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <Shirt className="h-5 w-5 text-primary" />
                    <div>
                      <Label className="text-sm font-medium">Separate colors</Label>
                      <p className="text-xs text-muted-foreground">We separate your garments: dark with jeans and colored clothes apart. (+{formatUSD(ADDITIONAL_PRICES.separateColors)})</p>
                    </div>
                  </div>
                  <Switch checked={preferences.separateColors} onCheckedChange={(c) => handlePreferenceChange('separateColors', c)} />
                </div>

                {/* Softener */}
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <Droplets className="h-5 w-5 text-primary" />
                    <div>
                      <Label className="text-sm font-medium">Add fabric softener</Label>
                      <p className="text-xs text-muted-foreground">Leaves your clothes soft and fresh (+{formatUSD(ADDITIONAL_PRICES.softener)})</p>
                    </div>
                  </div>
                  <Switch checked={preferences.useSoftener} onCheckedChange={(c) => handlePreferenceChange('useSoftener', c)} />
                </div>

                {/* Active Oxygen */}
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <div>
                      <Label className="text-sm font-medium">Add Active Oxygen</Label>
                      <p className="text-xs text-muted-foreground">
                        Intensifies and brightens colors, helps remove stains, and controls bacteria. (+{formatUSD(ADDITIONAL_PRICES.bleach)})
                      </p>
                    </div>
                  </div>
                  <Switch checked={preferences.useBleach} onCheckedChange={(c) => handlePreferenceChange('useBleach', c)} />
                </div>

                {/* Degreaser */}
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <Wind className="h-5 w-5 text-primary" />
                    <div>
                      <Label className="text-sm font-medium">Add degreaser</Label>
                      <p className="text-xs text-muted-foreground">Ideal for work clothes (+{formatUSD(ADDITIONAL_PRICES.degreaser)} per load)</p>
                    </div>
                  </div>
                  <Switch checked={preferences.useDegreaser} onCheckedChange={(c) => handlePreferenceChange('useDegreaser', c)} />
                </div>

                {/* Stain treatment — counter */}
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-primary" />
                    <div>
                      <Label className="text-sm font-medium">Stain treatment</Label>
                      <p className="text-xs text-muted-foreground">
                        {preferences.stainCount > 0
                          ? `${preferences.stainCount} stain${preferences.stainCount > 1 ? 's' : ''} (+${formatUSD(preferences.stainCount * ADDITIONAL_PRICES.stainTreatment)})`
                          : `+${formatUSD(ADDITIONAL_PRICES.stainTreatment)} per stain`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handlePreferenceChange('stainCount', Math.max(0, preferences.stainCount - 1))}
                      disabled={preferences.stainCount === 0}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-6 text-center text-sm font-medium">{preferences.stainCount}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handlePreferenceChange('stainCount', preferences.stainCount + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

              </div>

              {/* Fragrance */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-primary" />
                  <Label>Fragrance</Label>
                </div>
                <Select value={preferences.fragrance} onValueChange={(v) => handlePreferenceChange('fragrance', v)}>
                  <SelectTrigger><SelectValue placeholder="Select a fragrance" /></SelectTrigger>
                  <SelectContent>
                    {FRAGRANCE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Special instructions */}
              <div className="space-y-2">
                <Label htmlFor="notes">Special instructions (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="E.g.: There's a shirt with a wine stain..."
                  value={preferences.notes}
                  onChange={(e) => handlePreferenceChange('notes', e.target.value)}
                  rows={3}
                />
              </div>

              {/* Summary */}
              <div className="rounded-lg bg-muted/50 p-4 space-y-3">
                <h4 className="font-semibold">Order summary</h4>
                <div className="text-sm space-y-1">
                  <p className="text-muted-foreground"><span className="font-medium text-foreground">Address:</span> {address}</p>
                  <p className="text-muted-foreground"><span className="font-medium text-foreground">Phone:</span> {phone}</p>
                  <div className="border-t pt-2 mt-2 space-y-1">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Price per lb:</span>
                      <span>{formatUSD(PRICE_PER_KG)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Minimum order (10 lb):</span>
                      <span>{formatUSD(MIN_PRICE)}</span>
                    </div>
                    {preferences.separateWhites && (
                      <div className="flex justify-between">
                        <span>Separate whites:</span>
                        <span>+{formatUSD(ADDITIONAL_PRICES.separateWhites)}</span>
                      </div>
                    )}
                    {preferences.separateColors && (
                      <div className="flex justify-between">
                        <span>Separate colors:</span>
                        <span>+{formatUSD(ADDITIONAL_PRICES.separateColors)}</span>
                      </div>
                    )}
                    {preferences.useSoftener && (
                      <div className="flex justify-between">
                        <span>Fabric softener:</span>
                        <span>+{formatUSD(ADDITIONAL_PRICES.softener)}</span>
                      </div>
                    )}
                    {preferences.useBleach && (
                      <div className="flex justify-between">
                        <span>Active Oxygen:</span>
                        <span>+{formatUSD(ADDITIONAL_PRICES.bleach)}</span>
                      </div>
                    )}
                    {preferences.useDegreaser && (
                      <div className="flex justify-between">
                        <span>Degreaser:</span>
                        <span>+{formatUSD(ADDITIONAL_PRICES.degreaser)}</span>
                      </div>
                    )}
                    {preferences.stainCount > 0 && (
                      <div className="flex justify-between">
                        <span>Stains ({preferences.stainCount}):</span>
                        <span>+{formatUSD(preferences.stainCount * ADDITIONAL_PRICES.stainTreatment)}</span>
                      </div>
                    )}
                    <div className="border-t pt-2 flex justify-between font-semibold">
                      <span>Estimated total:</span>
                      <span className="text-primary">{formatUSD(estimatePrice())}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">* The final price will be calculated when your laundry is weighed</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
                <Button className="flex-1" onClick={handleSubmit} disabled={loading}>
                  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : 'Request Service'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Map modal */}
      {showMapModal && isLoaded && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-background w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col h-[70vh]">
            <div className="p-4 border-b flex justify-between items-center bg-card">
              <div>
                <h3 className="font-semibold text-lg">Move the pin to your door</h3>
                <p className="text-xs text-muted-foreground">This helps the delivery driver find you quickly.</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowMapModal(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex-1 relative bg-muted">
              <GoogleMap
                mapContainerStyle={{ width: '100%', height: '100%' }}
                center={mapCenter}
                zoom={16}
                options={{
                  disableDefaultUI: true,
                  zoomControl: true,
                  gestureHandling: "greedy"
                }}
              >
                <Marker
                  position={mapCenter}
                  draggable={true}
                  onDragEnd={handleMarkerDragEnd}
                />
              </GoogleMap>
            </div>

            <div className="p-4 bg-card border-t">
              <Button className="w-full text-md py-6" onClick={handleConfirmLocation}>
                <MapPinned className="mr-2 h-5 w-5" />
                Confirm this location
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
