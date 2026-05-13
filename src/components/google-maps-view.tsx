
"use client";

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Truck, MapPin, Navigation } from 'lucide-react';

// Dynamic import for Leaflet because it requires 'window'
const MapContainer = dynamic(() => import('react-leaflet').then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then((mod) => mod.Popup), { ssr: false });

interface MarkerProps {
  id: string;
  lat: number;
  lng: number;
  type: 'driver' | 'customer';
  name?: string;
  isOnline?: boolean;
}

export function GoogleMapsView({ markers }: { markers: MarkerProps[] }) {
  const [L, setL] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  
  // Try to center on the customer ('me') or the first marker, else default to Amman
  const centerMarker = markers.find(m => m.id === 'me') || markers[0];
  const centerPosition: [number, number] = centerMarker ? [centerMarker.lat, centerMarker.lng] : [31.9454, 35.9284];

  useEffect(() => {
    setMounted(true);
    import('leaflet').then((leaflet) => {
      setL(leaflet);
    });
  }, []);

  if (!mounted || !L) return <div className="w-full h-full bg-slate-100 animate-pulse flex items-center justify-center">جاري تحميل الخريطة...</div>;

  // Custom Icon Function - Use a simple HTML string to avoid react-dom/server in client bundle
  const createIcon = (type: 'driver' | 'customer', isOnline?: boolean) => {
    const colorClass = type === 'driver' ? 'bg-primary' : 'bg-accent';
    const animationClass = isOnline ? 'animate-pulse' : '';
    
    // Simple inline HTML string for the icon to avoid hydration complexity
    const iconHtml = `
      <div class="p-2 rounded-full shadow-lg border-2 flex items-center justify-center ${colorClass} border-white ${animationClass}">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          ${type === 'driver' 
            ? '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.28a1 1 0 0 0-.684-.948l-4.893-1.631A2 2 0 0 1 15 9.186V18"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>'
            : '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>'
          }
        </svg>
      </div>
    `;

    return L.divIcon({
      html: iconHtml,
      className: 'custom-leaflet-icon',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  };

  return (
    <div className="relative w-full h-full overflow-hidden rounded-xl border shadow-inner">
      <MapContainer 
        center={centerPosition} 
        zoom={14} 
        scrollWheelZoom={true} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markers.map((marker) => (
          <Marker 
            key={marker.id} 
            position={[marker.lat, marker.lng]} 
            icon={createIcon(marker.type, marker.isOnline)}
          >
            <Popup>
              <div className="text-right font-bold text-xs" dir="rtl">
                {marker.name}
                {marker.type === 'driver' && !marker.isOnline && " (مشغول)"}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Controls Overlay */}
      <div className="absolute bottom-6 left-6 z-[1000] flex flex-col gap-3">
        <button 
          className="bg-white p-3 rounded-full shadow-xl border hover:bg-slate-50 transition-colors active:scale-90"
          onClick={() => window.location.reload()}
        >
          <Navigation className="w-6 h-6 text-primary" />
        </button>
      </div>

      <div className="absolute top-6 right-6 z-[1000] bg-white/95 backdrop-blur px-4 py-1.5 rounded-full text-xs font-bold border shadow-xl flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        مباشر: عمان، الأردن
      </div>
    </div>
  );
}
