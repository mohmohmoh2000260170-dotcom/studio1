
"use client";

import React, { useState, useEffect } from 'react';
import { GoogleMapsView } from '@/components/google-maps-view';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Bell, Flame, Loader2, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import Link from 'next/link';

export default function CustomerDashboard() {
  const { toast } = useToast();
  const [isRinging, setIsRinging] = useState(false);
  const [location, setLocation] = useState({ lat: 31.9454, lng: 35.9284 }); // Default Amman

  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          console.log("Using default location");
        }
      );
    }
  }, []);

  const handleRingBell = async () => {
    setIsRinging(true);
    try {
      // Save request to Firebase
      await addDoc(collection(db, "requests"), {
        customerName: "خالد",
        lat: location.lat,
        lng: location.lng,
        status: 'pending',
        timestamp: serverTimestamp(),
      });

      toast({
        title: "تم رن الجرس! 🔔",
        description: "تم إرسال موقعك للسائقين القريبين. سيصلك الرد قريباً.",
      });
    } catch (error) {
      console.error("Error sending request:", error);
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "لم نتمكن من إرسال طلبك، يرجى المحاولة مرة أخرى.",
      });
    } finally {
      setIsRinging(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Simple Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm z-20">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="bg-primary p-2 rounded-lg">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold text-primary">غاز دليفري</h1>
          </div>
        </div>
      </header>

      {/* Map View */}
      <div className="flex-1 relative">
        <GoogleMapsView markers={[
          { id: 'my-loc', lat: location.lat, lng: location.lng, type: 'customer', name: 'موقعي' }
        ]} />

        {/* Floating Bell Button */}
        <div className="absolute bottom-10 left-0 right-0 px-6 flex justify-center">
          <Card className="w-full max-w-sm shadow-2xl border-primary/20 bg-white/95 backdrop-blur rounded-3xl overflow-hidden">
            <CardContent className="p-4">
              <Button 
                onClick={handleRingBell} 
                disabled={isRinging}
                className="w-full h-16 text-xl gap-3 rounded-2xl shadow-lg shadow-primary/30 transition-all active:scale-95"
              >
                {isRinging ? <Loader2 className="animate-spin" /> : <Bell className="w-7 h-7" />}
                رن الجرس 🔔
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
