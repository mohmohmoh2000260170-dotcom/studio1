"use client";

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Navigation, RotateCcw } from 'lucide-react';

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
  
  const centerMarker = markers.find(m => m.id === 'me') || markers[0];
  const centerPosition: [number, number] = centerMarker ? [centerMarker.lat, centerMarker.lng] : [31.9454, 35.9284];

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      import('leaflet').then((leaflet) => {
        setL(leaflet);
      });
    }
  }, []);

  if (!mounted || !L) return (
    <div className="w-full h-full bg-slate-100 animate-pulse flex items-center justify-center font-bold">
      جاري تحميل الخريطة...
    </div>
  );

  const createIcon = (type: 'driver' | 'customer', isOnline?: boolean) => {
    const color = type === 'driver' ? '#FA6619' : '#B31E1E';
    const iconHtml = `
      <div style="background-color: ${color}; padding: 8px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.2); width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;" class="${isOnline ? 'animate-pulse' : ''}">
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="white" stroke-width="2" fill="none">
          ${type === 'driver' 
            ? '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2M15 18H9M19 18h2a1 1 0 0 0 1-1v-3.28a1 1 0 0 0-.684-.948l-4.893-1.631A2 2 0 0 1 15 9.186V18"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>'
            : '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>'
          }
        </svg>
      </div>
    `;

    return L.divIcon({
      html: iconHtml,
      className: 'custom-icon',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  };

  return (
    <div className="relative w-full h-full overflow-hidden">
      <MapContainer 
        center={centerPosition} 
        zoom={14} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap'
        />
        {markers.map((marker) => (
          <Marker 
            key={marker.id} 
            position={[marker.lat, marker.lng]} 
            icon={createIcon(marker.type, marker.isOnline)}
          >
            <Popup>
              <div className="text-right font-bold" dir="rtl">
                {marker.name}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <div className="absolute bottom-6 left-6 z-[1000] flex flex-col gap-2">
        <button 
          className="bg-white p-3 rounded-full shadow-lg border hover:bg-slate-50 transition-all active:scale-95"
          onClick={() => window.location.reload()}
          title="تحديث التطبيق"
        >
          <RotateCcw className="w-6 h-6 text-primary" />
        </button>
        <button 
          className="bg-white p-3 rounded-full shadow-lg border hover:bg-slate-50 transition-all active:scale-95"
          onClick={() => {
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition((pos) => {
                 window.location.reload();
              });
            }
          }}
          title="موقعي الحالي"
        >
          <Navigation className="w-6 h-6 text-slate-600" />
        </button>
      </div>
    </div>
  );
}
