"use client";

import React, { useState, useEffect } from 'react';
import { GoogleMapsView } from '@/components/google-maps-view';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Bell, Flame, Loader2, ArrowRight, ShoppingCart, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, errorEmitter } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { FirestorePermissionError } from '@/firebase/errors';
import Link from 'next/link';

export default function CustomerDashboard() {
  const { toast } = useToast();
  const firestore = useFirestore();
  
  const [step, setStep] = useState<'details' | 'map'>('details');
  const [isRinging, setIsRinging] = useState(false);
  const [location, setLocation] = useState({ lat: 31.9454, lng: 35.9284 });
  const [formData, setFormData] = useState({
    customerName: '',
    phoneNumber: '',
    cylinders: '1',
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => console.log("Using default location")
      );
    }
  }, []);

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName || !formData.phoneNumber || !formData.cylinders) {
      toast({ variant: "destructive", title: "خطأ", description: "يرجى تعبئة جميع الحقول" });
      return;
    }
    setStep('map');
  };

  const handleRingBell = () => {
    if (!firestore) return;
    setIsRinging(true);
    
    const requestsRef = collection(firestore, "requests");
    const requestData = {
      customerName: formData.customerName,
      phoneNumber: formData.phoneNumber,
      cylinders: formData.cylinders,
      uid: 'cust_' + Math.random().toString(36).substr(2, 9),
      lat: location.lat,
      lng: location.lng,
      status: 'pending',
      timestamp: serverTimestamp(),
    };

    addDoc(requestsRef, requestData)
      .then(() => {
        toast({
          title: "تم رن الجرس! 🔔",
          description: "تم إرسال موقعك وتفاصيل طلبك للسائقين القريبين.",
        });
      })
      .catch(async (err) => {
        const permissionError = new FirestorePermissionError({
          path: requestsRef.path,
          operation: 'create',
          requestResourceData: requestData,
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsRinging(false);
      });
  };

  if (step === 'details') {
    return (
      <div className="min-h-screen bg-[#FBF3EE] flex flex-col items-center justify-center p-6 text-right" dir="rtl">
        <Card className="w-full max-w-md shadow-xl border-primary/20 bg-white">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto bg-primary/10 p-4 rounded-2xl w-fit mb-2">
              <Flame className="w-10 h-10 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">تفاصيل الطلب</CardTitle>
            <CardDescription>أدخل معلوماتك لتحديد موقعك وطلب الغاز</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleDetailsSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="block text-right">الاسم بالكامل</Label>
                <Input 
                  id="name" 
                  placeholder="مثال: خالد أحمد" 
                  className="text-right"
                  value={formData.customerName}
                  onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="block text-right">رقم الهاتف</Label>
                <div className="relative">
                  <Phone className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input 
                    id="phone" 
                    type="tel"
                    placeholder="07XXXXXXXX" 
                    className="pr-10 text-right"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cylinders" className="block text-right">عدد الاسطوانات</Label>
                <div className="relative">
                  <ShoppingCart className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input 
                    id="cylinders" 
                    type="number" 
                    min="1"
                    className="pr-10 text-right"
                    value={formData.cylinders}
                    onChange={(e) => setFormData({...formData, cylinders: e.target.value})}
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full h-12 text-lg font-bold mt-6">
                متابعة لتحديد الموقع
              </Button>
              <Link href="/">
                <Button variant="ghost" className="w-full mt-2">رجوع</Button>
              </Link>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background" dir="rtl">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm z-20">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setStep('details')} className="rounded-full">
            <ArrowRight className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="bg-primary p-2 rounded-lg">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold text-primary">تحديد الموقع</h1>
          </div>
        </div>
      </header>

      <div className="flex-1 relative">
        <GoogleMapsView markers={[
          { id: 'my-loc', lat: location.lat, lng: location.lng, type: 'customer', name: 'موقعي' }
        ]} />

        <div className="absolute bottom-10 left-0 right-0 px-6 flex justify-center">
          <Card className="w-full max-w-sm shadow-2xl border-primary/20 bg-white/95 backdrop-blur rounded-3xl overflow-hidden">
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-4 px-2">
                <div className="text-sm font-medium text-muted-foreground">عدد الاسطوانات: <span className="text-primary font-bold">{formData.cylinders}</span></div>
                <div className="text-sm font-medium text-muted-foreground">الاسم: <span className="text-primary font-bold">{formData.customerName}</span></div>
              </div>
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
