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
import { useFirestore, useCollection, useMemoFirebase, errorEmitter, useDoc } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, where, doc, setDoc, updateDoc } from 'firebase/firestore';
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

interface CustomerProfile {
  uid: string;
  sessionId: string;
}

const PRICE_PER_CYLINDER = 7;

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 999;
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function CustomerDashboard() {
  const { toast } = useToast();
  const firestore = useFirestore();
  
  const [step, setStep] = useState<'details' | 'discovery'>('details');
  const [isRinging, setIsRinging] = useState(false);
  const [loadingRegistration, setLoadingRegistration] = useState(false);
  const [location, setLocation] = useState({ lat: 31.9454, lng: 35.9284 });
  const [locPermission, setLocPermission] = useState<'granted' | 'denied' | 'pending'>('pending');
  const [customerId, setCustomerId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    customerName: '',
    phoneNumber: '',
    cylinders: 1,
  });

  // Session Management
  const customerDocRef = useMemo(() => {
    if (!firestore || !customerId) return null;
    return doc(firestore, "customers", customerId);
  }, [firestore, customerId]);

  const { data: profile } = useDoc<CustomerProfile>(customerDocRef);

  useEffect(() => {
    const savedId = localStorage.getItem('customerId');
    const savedName = localStorage.getItem('customerName');
    const savedPhone = localStorage.getItem('customerPhone');
    
    if (savedId && savedName && savedPhone) {
      setFormData(prev => ({ ...prev, customerName: savedName, phoneNumber: savedPhone }));
      setCustomerId(savedId);
      setStep('discovery');
    }
  }, []);

  // Unique Session Policy Check
  useEffect(() => {
    if (profile && profile.sessionId) {
      const localSessionId = localStorage.getItem('sessionId');
      if (localSessionId && profile.sessionId !== localSessionId) {
        toast({
          variant: "destructive",
          title: "جلسة نشطة أخرى",
          description: "تم تسجيل الدخول من جهاز آخر. سيتم الخروج من هذا الجهاز.",
        });
        handleLogout();
      }
    }
  }, [profile]);

  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
          setLocPermission('granted');
        },
        () => setLocPermission('denied'),
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
      const uid = 'cust_' + Math.random().toString(36).substr(2, 9);
      const newSessionId = Math.random().toString(36).substr(2, 12);
      const customerRef = doc(firestore, "customers", uid);
      
      const customerData = {
        name: formData.customerName,
        phone: formData.phoneNumber,
        uid: uid,
        sessionId: newSessionId,
        timestamp: serverTimestamp(),
      };

      await setDoc(customerRef, customerData);
      
      localStorage.setItem('customerId', uid);
      localStorage.setItem('customerName', formData.customerName);
      localStorage.setItem('customerPhone', formData.phoneNumber);
      localStorage.setItem('sessionId', newSessionId);
      
      setCustomerId(uid);
      setStep('discovery');
      toast({ title: "أهلاً بك", description: "تم تسجيل دخولك بنجاح." });
    } catch (err) {
      toast({ variant: "destructive", title: "خطأ", description: "حدث خطأ أثناء التسجيل" });
    } finally {
      setLoadingRegistration(false);
    }
  };

  const handleRingBell = () => {
    if (!firestore || !customerId) return;
    setIsRinging(true);
    
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
        toast({ title: "تم رن الجرس! 🔔", description: `تم إرسال طلبك لـ ${formData.cylinders} أسطوانات.` });
      })
      .catch(async (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: requestsRef.path,
          operation: 'create',
          requestResourceData: requestData,
        }));
      })
      .finally(() => setIsRinging(false));
  };

  const handleLogout = () => {
    localStorage.clear();
    setStep('details');
    setCustomerId(null);
  };

  if (step === 'details') {
    return (
      <div className="min-h-screen bg-[#FBF3EE] flex flex-col items-center justify-center p-6 text-right" dir="rtl">
        <Card className="w-full max-w-md shadow-xl bg-white">
          <CardHeader className="text-center">
            <div className="mx-auto bg-primary/10 p-4 rounded-2xl w-fit mb-2"><User className="w-10 h-10 text-primary" /></div>
            <CardTitle className="text-2xl font-bold">دخول العملاء</CardTitle>
            <CardDescription>أدخل معلوماتك للبدء فوراً</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleDetailsSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="block text-right">الاسم بالكامل</Label>
                <Input placeholder="مثال: خالد أحمد" value={formData.customerName} onChange={(e) => setFormData({...formData, customerName: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label className="block text-right">رقم الهاتف</Label>
                <Input type="tel" placeholder="07XXXXXXXX" value={formData.phoneNumber} onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})} required />
              </div>
              <Button type="submit" disabled={loadingRegistration} className="w-full h-12 text-lg font-bold">
                {loadingRegistration && <Loader2 className="animate-spin ml-2" />}
                دخول للنظام
              </Button>
              <Link href="/"><Button variant="ghost" className="w-full">رجوع</Button></Link>
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
          <Button variant="ghost" size="icon" onClick={handleLogout} className="rounded-full"><ArrowRight className="w-5 h-5" /></Button>
          <h1 className="text-lg font-bold text-primary flex items-center gap-2"><Navigation className="w-5 h-5" /> غاز دليفري</h1>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        <div className="w-full md:w-96 bg-white border-l overflow-y-auto p-4 space-y-4 shadow-xl z-10">
          <div className="p-2">
            <h2 className="text-sm font-bold text-muted-foreground mb-4">
              {loadingDrivers ? "جاري البحث..." : `تم العثور على ${nearestAgencies.length} موزع متاح`}
            </h2>
            <div className="space-y-3">
              {nearestAgencies.map((agency) => (
                <Card key={agency.id} className="border-2 hover:border-primary/50 transition-all cursor-pointer">
                  <CardContent className="p-4 flex items-center justify-between flex-row-reverse">
                    <div className="flex items-center gap-3 flex-row-reverse">
                      <div className="bg-primary/10 p-2 rounded-full"><Truck className="w-5 h-5" /></div>
                      <div className="text-right">
                        <h3 className="font-bold text-sm">{agency.name}</h3>
                        <p className="text-[10px] text-muted-foreground">{agency.distance.toFixed(1)} كم</p>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-700">متاح</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 relative">
          <GoogleMapsView markers={[
            { id: 'me', lat: location.lat, lng: location.lng, type: 'customer', name: 'موقعي' },
            ...nearestAgencies.map(a => ({ id: a.id, lat: a.lat, lng: a.lng, type: 'driver' as const, name: a.name, isOnline: true }))
          ]} />

          <div className="absolute bottom-6 left-0 right-0 px-6 flex justify-center">
            <Card className="w-full max-w-sm shadow-2xl bg-white/95 rounded-[2rem] p-6">
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-center font-bold text-slate-800">كم أسطوانة غاز تحتاج؟</h3>
                  <div className="flex items-center justify-center gap-6">
                    <Button variant="outline" size="icon" onClick={() => setFormData(p => ({...p, cylinders: Math.max(1, p.cylinders-1)}))}><Minus /></Button>
                    <div className="flex flex-col items-center">
                      <span className="text-4xl font-black text-primary">{formData.cylinders}</span>
                      <span className="text-xs text-muted-foreground">أسطوانة</span>
                    </div>
                    <Button variant="outline" size="icon" onClick={() => setFormData(p => ({...p, cylinders: p.cylinders+1}))}><Plus /></Button>
                  </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl text-center border">
                  <p className="text-xs font-bold text-slate-500">السعر التقديري</p>
                  <p className="text-2xl font-black">{formData.cylinders * PRICE_PER_CYLINDER} JOD</p>
                </div>
                <Button onClick={handleRingBell} disabled={isRinging} className="w-full h-16 text-xl rounded-2xl shadow-lg bg-primary">
                  {isRinging ? <Loader2 className="animate-spin" /> : <Bell className="w-6 h-6 ml-2" />}
                  رن الجرس للجميع 🔔
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}