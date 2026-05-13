
"use client";

import React from 'react';
import { Truck, MapPin, Navigation } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface MarkerProps {
  id: string;
  lat: number;
  lng: number;
  type: 'driver' | 'customer';
  name?: string;
  isOnline?: boolean;
}

export function GoogleMapsView({ markers }: { markers: MarkerProps[] }) {
  // We use a reference point to calculate relative offsets for the visual simulation
  // This is a mockup for a map while using real coordinates
  const center = markers.find(m => m.id === 'me') || { lat: 31.9454, lng: 35.9284 };

  const getPos = (lat: number, lng: number) => {
    // Zoom factor for the mockup
    const zoom = 1500; 
    const x = 50 + (lng - center.lng) * zoom;
    const y = 50 - (lat - center.lat) * zoom;
    return { left: `${x}%`, top: `${y}%` };
  };

  return (
    <div className="relative w-full h-full bg-[#f8f9fa] overflow-hidden rounded-xl border shadow-inner">
      {/* Map Background Simulation Grid */}
      <div className="absolute inset-0 grid grid-cols-12 grid-rows-12 gap-1 opacity-10">
        {Array.from({ length: 144 }).map((_, i) => (
          <div key={i} className="border border-slate-400" />
        ))}
      </div>

      {/* Simplified Roads Simulation */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute w-[4px] h-[200%] bg-white/50 rotate-45 -left-1/4 top-0 shadow-sm" />
        <div className="absolute w-[4px] h-[200%] bg-white/50 -rotate-45 left-3/4 top-0 shadow-sm" />
        <div className="absolute w-[200%] h-[4px] bg-white/50 left-0 top-1/2 shadow-sm" />
      </div>

      {/* Markers Rendering */}
      {markers.map((marker) => {
        const pos = getPos(marker.lat, marker.lng);
        return (
          <div
            key={marker.id}
            className="absolute transition-all duration-700 ease-out transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10"
            style={pos}
          >
            <div className={`
              p-2.5 rounded-full shadow-xl border-2 transition-transform hover:scale-125
              ${marker.type === 'driver' 
                ? 'bg-primary text-white border-white' 
                : 'bg-accent text-white border-white'}
              ${marker.isOnline ? 'animate-pulse' : ''}
            `}>
              {marker.type === 'driver' ? <Truck className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
            </div>
            
            <Badge variant="outline" className="mt-1.5 bg-white/95 backdrop-blur text-[10px] py-0 px-2 font-bold shadow-sm whitespace-nowrap">
              {marker.name}
              {marker.type === 'driver' && !marker.isOnline && " (مشغول)"}
            </Badge>
          </div>
        );
      })}

      {/* Controls Overlay */}
      <div className="absolute bottom-6 left-6 flex flex-col gap-3">
        <button className="bg-white p-3 rounded-full shadow-xl border hover:bg-slate-50 transition-colors active:scale-90">
          <Navigation className="w-6 h-6 text-primary" />
        </button>
      </div>

      <div className="absolute top-6 right-6 bg-white/95 backdrop-blur px-4 py-1.5 rounded-full text-xs font-bold border shadow-xl flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        مباشر: عمان، الأردن
      </div>
    </div>
  );
}
