"use client";

import React, { useState, useEffect } from 'react';
import { Truck, MapPin, Navigation } from 'lucide-react';
import { Card } from '@/components/ui/card';
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
  // Simulated map view with a grid and movement
  const [currentLocation, setCurrentLocation] = useState({ lat: 31.9454, lng: 35.9284 }); // Amman, Jordan

  useEffect(() => {
    // In a real app, use navigator.geolocation
    const interval = setInterval(() => {
      // Simulate slight drift for realism
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-full bg-slate-100 overflow-hidden rounded-xl border shadow-inner">
      {/* Map Background Simulation */}
      <div className="absolute inset-0 grid grid-cols-12 grid-rows-12 gap-1 opacity-20">
        {Array.from({ length: 144 }).map((_, i) => (
          <div key={i} className="border border-slate-300" />
        ))}
      </div>

      {/* Roads and Terrain simulation */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute w-[2px] h-full bg-slate-300 left-1/4" />
        <div className="absolute w-[2px] h-full bg-slate-300 left-1/2" />
        <div className="absolute w-[2px] h-full bg-slate-300 left-3/4" />
        <div className="absolute w-full h-[2px] bg-slate-300 top-1/3" />
        <div className="absolute w-full h-[2px] bg-slate-300 top-2/3" />
      </div>

      {/* Markers */}
      {markers.map((marker) => (
        <div
          key={marker.id}
          className="absolute transition-all duration-1000 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
          style={{ 
            left: `${((marker.lng - 35.8) * 400) % 100}%`, 
            top: `${((marker.lat - 31.8) * 400) % 100}%` 
          }}
        >
          <div className={`
            p-2 rounded-full shadow-lg border-2 
            ${marker.type === 'driver' ? 'bg-primary text-white border-white' : 'bg-accent text-white border-white'}
            ${marker.isOnline ? 'animate-pulse' : ''}
          `}>
            {marker.type === 'driver' ? <Truck className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
          </div>
          <Badge variant="outline" className="mt-1 bg-white/90 backdrop-blur text-[10px] py-0">
            {marker.name}
          </Badge>
        </div>
      ))}

      {/* Map Controls */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-2">
        <button className="bg-white p-2 rounded-full shadow-md border hover:bg-slate-50">
          <Navigation className="w-5 h-5 text-primary" />
        </button>
      </div>

      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-medium border shadow-sm">
        عمان، الأردن
      </div>
    </div>
  );
}