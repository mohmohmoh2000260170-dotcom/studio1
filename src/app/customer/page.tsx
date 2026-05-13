
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
  Truck,
  AlertCircle,
  User,
  Plus,
  Minus
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useMemoFirebase, errorEmitter } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, where, doc, setDoc } from 'firebase/firestore';
import { FirestorePermissionError } from '@/firebase/errors';
import Link from 'next/link';

interface Driver {
  id: string;
  name: string;
  status: string;
  availability: string;
  lat: number;
  lng: number;
  lastSeen?: string;
}

const PRICE_PER_CYLINDER = 7; // Estimated price in JOD

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 999;
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

export default function CustomerDashboard() {
  const { toast } = useToast();
  const firestore = useFirestore();
  
  const [step, setStep] = useState<'details' | 'discovery'>('details');
  const [isRinging, setIsRinging] = useState(false);
  const [loadingRegistration, setLoadingRegistration] = useState(false);
  const [location, setLocation] = useState({ lat: 31.9454, lng: 35.9284 });
  const [locPermission, setLocPermission] = useState<'granted' | 'denied' | 'pending'>('pending');
  
  const [formData, setFormData] = useState({
    customerName: '',
    phoneNumber: '',
    cylinders: 1,
  });

  useEffect(() => {
    const savedId = localStorage.getItem('customerId');
    const savedName = localStorage.getItem('customerName');
    const savedPhone = localStorage.getItem('customerPhone');
    
    if (savedId && savedName && savedPhone) {
      setFormData(prev => ({ ...prev, customerName: savedName, phoneNumber: savedPhone }));
      setStep('discovery');
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLocPermission('granted');
        },
        (error) => {
          console.error("Loc error", error);
          setLocPermission('denied');
        },
        { enableHighAccuracy: true }
      );
    }
  }, []);

  const approvedDriversQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "drivers"), where("status", "==", "approved"));
  }, [firestore]);

  const { data: drivers, loading: loadingDrivers } = useCollection<Driver>(approvedDriversQuery);

  const nearestAgencies = useMemo(() => {
    if (!drivers) return [];
    return drivers
      .filter(d => d.lat && d.lng && d.availability === 'available')
      .map(driver => ({
        ...driver,
        distance: calculateDistance(location.lat, location.lng, driver.lat, driver.lng)
      }))
      .sort((a, b) => a.distance - b.distance);
  }, [drivers, location]);

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName || !formData.phoneNumber) {
      toast({ variant: "destructive", title: "خطأ", description: "يرجى تعبئة جميع الحقول" });
      return;
    }

    if (!firestore) return;

    setLoadingRegistration(true);
    try {
      const tempId = 'cust_' + Math.random().toString(36).substr(2, 9);
      const customerRef = doc(firestore, "customers", tempId);
      
      const customerData = {
        name: formData.customerName,
        phone: formData.phoneNumber,
        uid: tempId,
        timestamp: serverTimestamp(),
      };

      await setDoc(customerRef, customerData);
      
      localStorage.setItem('customerId', tempId);
      localStorage.setItem('customerName', formData.customerName);
      localStorage.setItem('customerPhone', formData.phoneNumber);
      
      setStep('discovery');
      toast({
        title: "تم التسجيل بنجاح",
        description: "أهلاً بك! يمكنك الآن طلب الغاز مباشرة.",
      });
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "خطأ", description: "حدث خطأ أثناء التسجيل" });
    } finally {
      setLoadingRegistration(false);
    }
  };

  const incrementCylinders = () => setFormData(prev => ({ ...prev, cylinders: prev.cylinders + 1 }));
  const decrementCylinders = () => setFormData(prev => ({ ...prev, cylinders: Math.max(1, prev.cylinders - 1) }));

  const handleRingBell = () => {
    if (!firestore) return;
    setIsRinging(true);
    
    const customerId = localStorage.getItem('customerId') || 'guest';
    const requestsRef = collection(firestore, "requests");
    const requestData = {
      customerName: formData.customerName,
      phoneNumber: formData.phoneNumber,
      cylinders: formData.cylinders.toString(),
      uid: customerId,
      lat: location.lat,
      lng: location.lng,
      status: 'pending',
      timestamp: serverTimestamp(),
    };

    addDoc(requestsRef, requestData)
      .then(() => {
        toast({
          title: "تم رن الجرس! 🔔",
          description: `تم إرسال طلب لـ ${formData.cylinders} أسطوانات لجميع الموزعين.`,
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

  const handleLogout = () => {
    localStorage.removeItem('customerId');
    localStorage.removeItem('customerName');
    localStorage.removeItem('customerPhone');
    setStep('details');
  };

  if (step === 'details') {
    return (
      <div className="min-h-screen bg-[#FBF3EE] flex flex-col items-center justify-center p-6 text-right" dir="rtl">
        <Card className="w-full max-w-md shadow-xl border-primary/20 bg-white">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto bg-primary/10 p-4 rounded-2xl w-fit mb-2">
              <User className="w-10 h-10 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">دخول العملاء</CardTitle>
            <CardDescription>أدخل معلوماتك للبدء في طلب الغاز فوراً</CardDescription>
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
              <Button type="submit" disabled={loadingRegistration} className="w-full h-12 text-lg font-bold mt-6">
                {loadingRegistration ? <Loader2 className="animate-spin ml-2" /> : null}
                دخول للنظام
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
          <Button variant="ghost" size="icon" onClick={handleLogout} className="rounded-full">
            <ArrowRight className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold text-primary flex items-center gap-2">
            <Navigation className="w-5 h-5" />
            الموزعين القريبين منك
          </h1>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {locPermission === 'denied' && (
          <div className="absolute top-4 left-4 right-4 z-50">
            <Badge variant="destructive" className="w-full py-2 flex items-center justify-center gap-2 text-sm shadow-lg">
              <AlertCircle className="w-4 h-4" />
              خدمة الموقع معطلة. يرجى تفعيل GPS لرؤية الموزعين حولك.
            </Badge>
          </div>
        )}

        {/* Sidebar List */}
        <div className="w-full md:w-96 bg-white border-l overflow-y-auto p-4 space-y-4 shadow-xl z-10">
          <div className="p-2">
            <h2 className="text-sm font-bold text-muted-foreground mb-4">
              {loadingDrivers ? "جاري البحث..." : `تم العثور على ${nearestAgencies.length} موزع نشط`}
            </h2>
            
            {loadingDrivers ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : nearestAgencies.length === 0 ? (
              <div className="text-center py-10 space-y-4">
                <Truck className="w-12 h-12 text-slate-200 mx-auto" />
                <p className="text-muted-foreground italic text-sm">لا يوجد موزعون نشطون حالياً في منطقتك</p>
              </div>
            ) : (
              <div className="space-y-3">
                {nearestAgencies.map((agency) => (
                  <Card key={agency.id} className="border-2 hover:border-primary/50 transition-all shadow-sm cursor-pointer group">
                    <CardContent className="p-4 flex items-center justify-between flex-row-reverse">
                      <div className="flex items-center gap-3 flex-row-reverse">
                        <div className="bg-primary/10 p-2 rounded-full group-hover:bg-primary group-hover:text-white transition-colors">
                          <Truck className="w-5 h-5" />
                        </div>
                        <div className="text-right">
                          <h3 className="font-bold text-sm">{agency.name}</h3>
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5 justify-end">
                            {agency.distance.toFixed(1)} كم بعيداً
                            <MapPin className="w-3 h-3" />
                          </div>
                        </div>
                      </div>
                      <Badge className="bg-green-100 text-green-700">متاح</Badge>
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
              isOnline: true
            }))
          ]} />

          <div className="absolute bottom-6 left-0 right-0 px-6 flex justify-center">
            <Card className="w-full max-w-sm shadow-2xl border-primary/20 bg-white/95 backdrop-blur-sm rounded-[2rem] overflow-hidden">
              <CardContent className="p-6 space-y-6">
                <div className="space-y-4">
                  <h3 className="text-center font-bold text-slate-800">كم أسطوانة غاز تحتاج؟</h3>
                  
                  <div className="flex items-center justify-center gap-6">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={decrementCylinders}
                      className="w-12 h-12 rounded-full border-2 border-primary/20 text-primary hover:bg-primary/10"
                    >
                      <Minus className="w-6 h-6" />
                    </Button>
                    
                    <div className="flex flex-col items-center min-w-[60px]">
                      <span className="text-4xl font-black text-primary">{formData.cylinders}</span>
                      <span className="text-[10px] text-muted-foreground font-bold">أسطوانة</span>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={incrementCylinders}
                      className="w-12 h-12 rounded-full border-2 border-primary/20 text-primary hover:bg-primary/10"
                    >
                      <Plus className="w-6 h-6" />
                    </Button>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border flex flex-col items-center gap-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                    <ShoppingCart className="w-3 h-3" />
                    السعر التقديري للطلب
                  </div>
                  <div className="text-2xl font-black text-slate-900">
                    {formData.cylinders * PRICE_PER_CYLINDER} JOD
                  </div>
                  <p className="text-[9px] text-muted-foreground">شامل التوصيل للموقع الحالي</p>
                </div>

                <Button 
                  onClick={handleRingBell} 
                  disabled={isRinging}
                  className="w-full h-16 text-xl gap-3 rounded-2xl shadow-xl shadow-primary/30 transition-transform active:scale-95 bg-primary hover:bg-primary/90"
                >
                  {isRinging ? <Loader2 className="animate-spin" /> : <Bell className="w-6 h-6" />}
                  رن الجرس للجميع 🔔
                </Button>
                <p className="text-[10px] text-center text-muted-foreground font-medium">سيتم إرسال طلبك لـ {nearestAgencies.length} موزع قريب منك</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
