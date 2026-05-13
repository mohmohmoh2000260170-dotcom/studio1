
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { GoogleMapsView } from '@/components/google-maps-view';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  Flame, 
  Loader2, 
  ArrowRight, 
  ShoppingCart, 
  Phone, 
  MapPin, 
  Navigation,
  Truck
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useMemoFirebase, errorEmitter } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { FirestorePermissionError } from '@/firebase/errors';
import Link from 'next/link';

interface Driver {
  id: string;
  name: string;
  status: string;
  availability: string;
  lat: number;
  lng: number;
}

// Haversine formula to calculate distance in KM
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

export default function CustomerDashboard() {
  const { toast } = useToast();
  const firestore = useFirestore();
  
  const [step, setStep] = useState<'details' | 'discovery'>('details');
  const [isRinging, setIsRinging] = useState(false);
  const [location, setLocation] = useState({ lat: 31.9454, lng: 35.9284 });
  const [formData, setFormData] = useState({
    customerName: '',
    phoneNumber: '',
    cylinders: '1',
  });

  // Get user location
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => console.log("Using default location (Amman)")
      );
    }
  }, []);

  // Fetch Approved Drivers
  const approvedDriversQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "drivers"), where("status", "==", "approved"));
  }, [firestore]);

  const { data: drivers, loading: loadingDrivers } = useCollection<Driver>(approvedDriversQuery);

  // Calculate distances and sort
  const nearestAgencies = useMemo(() => {
    if (!drivers) return [];
    return drivers
      .map(driver => ({
        ...driver,
        distance: calculateDistance(location.lat, location.lng, driver.lat, driver.lng)
      }))
      .sort((a, b) => a.distance - b.distance);
  }, [drivers, location]);

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName || !formData.phoneNumber || !formData.cylinders) {
      toast({ variant: "destructive", title: "خطأ", description: "يرجى تعبئة جميع الحقول" });
      return;
    }
    setStep('discovery');
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
          description: "تم إرسال طلبك للوكالات القريبة.",
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
            <CardTitle className="text-2xl font-bold">طلب جديد</CardTitle>
            <CardDescription>أدخل معلوماتك للعثور على أقرب موزعي الغاز</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleDetailsSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="block text-right">الاسم بالكامل</Label>
                <Input 
                  id="name" 
                  placeholder="خالد أحمد" 
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
                البحث عن أقرب موزع
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
    <div className="flex flex-col h-screen bg-[#FBF3EE]" dir="rtl">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm z-20">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setStep('details')} className="rounded-full">
            <ArrowRight className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold text-primary flex items-center gap-2">
            <Navigation className="w-5 h-5" />
            الموزعين القريبين منك
          </h1>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Sidebar List */}
        <div className="w-full md:w-96 bg-white border-l overflow-y-auto p-4 space-y-4">
          <div className="p-2">
            <h2 className="text-sm font-bold text-muted-foreground mb-4">تم العثور على {nearestAgencies.length} وكالة معتمدة</h2>
            
            {loadingDrivers ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : nearestAgencies.length === 0 ? (
              <p className="text-center py-10 text-muted-foreground italic">لا يوجد موزعون معتمدون في منطقتك حالياً</p>
            ) : (
              <div className="space-y-3">
                {nearestAgencies.map((agency) => (
                  <Card key={agency.id} className="border-2 hover:border-primary/50 transition-colors shadow-sm cursor-pointer">
                    <CardContent className="p-4 flex items-center justify-between flex-row-reverse">
                      <div className="flex items-center gap-3 flex-row-reverse">
                        <div className="bg-primary/10 p-2 rounded-full">
                          <Truck className="w-5 h-5 text-primary" />
                        </div>
                        <div className="text-right">
                          <h3 className="font-bold text-sm">{agency.name}</h3>
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5 justify-end">
                            {agency.distance.toFixed(1)} كم بعيداً
                            <MapPin className="w-3 h-3" />
                          </div>
                        </div>
                      </div>
                      <Badge 
                        variant={agency.availability === 'available' ? 'default' : 'secondary'}
                        className={agency.availability === 'available' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}
                      >
                        {agency.availability === 'available' ? 'متاح' : 'مشغول'}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Map Area */}
        <div className="flex-1 relative bg-slate-100">
          <GoogleMapsView markers={[
            { id: 'me', lat: location.lat, lng: location.lng, type: 'customer', name: 'موقعي' },
            ...nearestAgencies.map(a => ({
              id: a.id,
              lat: a.lat,
              lng: a.lng,
              type: 'driver' as const,
              name: a.name,
              isOnline: a.availability === 'available'
            }))
          ]} />

          <div className="absolute bottom-10 left-0 right-0 px-6 flex justify-center">
            <Card className="w-full max-w-sm shadow-2xl border-primary/20 bg-white/95 backdrop-blur-sm rounded-3xl overflow-hidden">
              <CardContent className="p-5 space-y-4">
                <div className="flex justify-between items-center text-xs px-2">
                  <span className="bg-slate-100 px-3 py-1 rounded-full">{formData.cylinders} اسطوانات</span>
                  <span className="font-bold text-primary">{formData.customerName}</span>
                </div>
                <Button 
                  onClick={handleRingBell} 
                  disabled={isRinging}
                  className="w-full h-16 text-xl gap-3 rounded-2xl shadow-lg shadow-primary/30 transition-transform active:scale-95 bg-primary"
                >
                  {isRinging ? <Loader2 className="animate-spin" /> : <Bell className="w-6 h-6" />}
                  رن الجرس للجميع 🔔
                </Button>
                <p className="text-[10px] text-center text-muted-foreground">سيتم إرسال موقعك للموزعين المتاحين القريبين منك</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
