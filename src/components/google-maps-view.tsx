
"use client";

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Truck, MapPin, Navigation } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';

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
  const center = markers.find(m => m.id === 'me') || { lat: 31.9454, lng: 35.9284 };

  useEffect(() => {
    import('leaflet').then((leaflet) => {
      setL(leaflet);
    });
  }, []);

  if (!L) return <div className="w-full h-full bg-slate-100 animate-pulse flex items-center justify-center">جاري تحميل الخريطة...</div>;

  // Custom Icon Function
  const createIcon = (type: 'driver' | 'customer', isOnline?: boolean) => {
    const iconHtml = renderToStaticMarkup(
      <div className={`
        p-2 rounded-full shadow-lg border-2 flex items-center justify-center
        ${type === 'driver' ? 'bg-primary border-white' : 'bg-accent border-white'}
        ${isOnline ? 'animate-pulse' : ''}
      `}>
        {type === 'driver' ? <Truck className="w-4 h-4 text-white" /> : <MapPin className="w-4 h-4 text-white" />}
      </div>
    );

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
        center={[center.lat, center.lng]} 
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
