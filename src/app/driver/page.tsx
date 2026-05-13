"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Flame, 
  MapPin, 
  Clock, 
  ShoppingCart, 
  Phone, 
  LogOut, 
  Activity,
  Loader2,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, orderBy, getDocs, doc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

interface GasRequest {
  id: string;
  customerName: string;
  phoneNumber: string;
  cylinders: string;
  lat: number;
  lng: number;
  status: string;
  timestamp: any;
}

interface DriverInfo {
  id: string;
  uid: string;
  status: 'pending' | 'approved' | 'rejected';
  availability: 'available' | 'busy';
  name: string;
  phone: string;
  sessionId: string;
}

export default function DriverDashboard() {
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [driverId, setDriverId] = useState<string | null>(null);
  const [driverData, setDriverData] = useState<DriverInfo | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [gpsError, setGpsError] = useState<string | null>(null);

  useEffect(() => {
    const id = localStorage.getItem('driverId');
    if (!id) {
      router.push('/driver/login');
    } else {
      setDriverId(id);
    }
  }, [router]);

  useEffect(() => {
    if (!firestore || !driverId) return;
    const fetchDriver = async () => {
      try {
        const q = query(collection(firestore, "drivers"), where("uid", "==", driverId));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const docSnap = snap.docs[0];
          setDriverData({ id: docSnap.id, ...docSnap.data() } as DriverInfo);
        } else {
          handleLogout();
        }
      } catch (e) { 
        console.error(e); 
      } finally { 
        setLoadingInfo(false); 
      }
    };
    fetchDriver();
  }, [firestore, driverId]);

  const driverDocRef = useMemo(() => {
    if (!firestore || !driverData?.id) return null;
    return doc(firestore, "drivers", driverData.id);
  }, [firestore, driverData?.id]);

  const { data: realTimeDriver, loading: loadingRealTime } = useDoc<DriverInfo>(driverDocRef);

  useEffect(() => {
    if (driverId && !loadingRealTime && !realTimeDriver && !loadingInfo) {
      handleLogout();
      return;
    }

    if (realTimeDriver && realTimeDriver.sessionId) {
      const localSessionId = localStorage.getItem('sessionId');
      if (localSessionId && realTimeDriver.sessionId !== localSessionId) {
        toast({
          variant: "destructive",
          title: "جلسة نشطة أخرى",
          description: "تم تسجيل الدخول من جهاز آخر.",
        });
        handleLogout();
      }
    }
  }, [realTimeDriver, loadingRealTime, driverId, loadingInfo]);

  useEffect(() => {
    if (!firestore || !realTimeDriver || realTimeDriver.status !== 'approved' || realTimeDriver.availability !== 'available') return;
    const updateLocation = () => {
      if (typeof window !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          updateDoc(doc(firestore, "drivers", driverData!.id), {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            lastSeen: new Date().toISOString()
          }).catch(() => {});
        }, () => setGpsError("يرجى تفعيل GPS"), { enableHighAccuracy: true });
      }
    };
    const interval = setInterval(updateLocation, 30000);
    updateLocation();
    return () => clearInterval(interval);
  }, [firestore, realTimeDriver]);

  const requestsQuery = useMemoFirebase(() => {
    if (!firestore || realTimeDriver?.status !== 'approved' || realTimeDriver?.availability !== 'available') return null;
    return query(collection(firestore, "requests"), where("status", "==", "pending"), orderBy("timestamp", "desc"));
  }, [firestore, realTimeDriver]);

  const { data: requests } = useCollection<GasRequest>(requestsQuery);

  const toggleAvailability = async () => {
    if (!firestore || !driverData) return;
    const newStatus = realTimeDriver?.availability === 'available' ? 'busy' : 'available';
    updateDoc(doc(firestore, "drivers", driverData.id), { availability: newStatus })
      .then(() => toast({ title: newStatus === 'available' ? "أنت متاح" : "أنت مشغول" }));
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/driver/login');
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  if (loadingInfo) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FBF3EE] space-y-4">
        <Loader2 className="animate-spin text-primary w-10 h-10" />
        <Button variant="outline" onClick={handleRefresh} className="gap-2">
          <RotateCcw className="w-4 h-4" /> تحديث الصفحة
        </Button>
      </div>
    );
  }

  if (realTimeDriver?.status === 'pending') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-[#FBF3EE]" dir="rtl">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md space-y-6">
          <Clock className="w-16 h-16 text-amber-600 mx-auto" />
          <h1 className="text-2xl font-bold text-slate-900">بانتظار موافقة الإدارة</h1>
          <p className="text-muted-foreground">حسابك قيد المراجعة حالياً. سيتم تفعيله من قبل المشرف قريباً.</p>
          <div className="flex flex-col gap-2">
            <Button onClick={handleRefresh} className="w-full h-12 gap-2">
              <RotateCcw className="w-4 h-4" /> تحديث الحالة
            </Button>
            <Button onClick={handleLogout} variant="outline" className="w-full h-12">خروج</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF3EE] flex flex-col" dir="rtl">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleLogout} className="rounded-full"><LogOut className="w-5 h-5" /></Button>
          <h1 className="text-lg font-bold text-primary">لوحة السائق</h1>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleRefresh} className="text-slate-400 hover:text-primary">
            <RotateCcw className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">{realTimeDriver?.availability === 'available' ? 'متاح' : 'مشغول'}</span>
            <Switch checked={realTimeDriver?.availability === 'available'} onCheckedChange={toggleAvailability} />
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-4 max-w-3xl mx-auto w-full">
        {gpsError && realTimeDriver?.availability === 'available' && <div className="bg-red-50 p-4 rounded-xl text-red-700 font-bold flex items-center gap-3"><AlertTriangle className="w-5 h-5" /> {gpsError}</div>}
        
        {realTimeDriver?.availability === 'busy' && (
          <div className="p-10 text-center space-y-4 bg-white rounded-3xl border shadow-sm">
            <Activity className="w-12 h-12 text-slate-400 mx-auto" />
            <h2 className="text-xl font-bold text-slate-800">أنت حالياً في وضع "مشغول"</h2>
            <p className="text-sm text-slate-500">لن تظهر للعملاء على الخريطة ولن تستقبل طلبات جديدة حتى تفعل وضع التوافر.</p>
          </div>
        )}

        {realTimeDriver?.availability === 'available' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-black text-slate-800">الطلبات الواردة</h2>
              <Badge variant="secondary" className="bg-slate-100">{requests?.length || 0} طلب</Badge>
            </div>
            {requests?.length === 0 && (
              <Card className="p-12 text-center border-dashed border-2 bg-white/50">
                <Flame className="w-10 h-10 text-slate-200 mx-auto mb-4" />
                <p className="text-muted-foreground">لا توجد طلبات في منطقتك حالياً</p>
              </Card>
            )}
            <div className="grid gap-4">
              {requests?.map((req) => (
                <Card key={req.id} className="border-2 shadow-md bg-white p-5 transition-all hover:border-primary/30">
                  <div className="flex justify-between items-center mb-4 border-b pb-3">
                    <Badge className="bg-primary border-none">طلب جديد</Badge>
                    <h3 className="font-bold text-lg">{req.customerName}</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-primary/5 p-3 rounded-xl border border-primary/10 flex items-center gap-3">
                      <div className="bg-primary/10 p-2 rounded-lg"><ShoppingCart className="w-4 h-4 text-primary" /></div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-500">الكمية</p>
                        <p className="font-black text-primary">{req.cylinders} أسطوانات</p>
                      </div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border flex items-center gap-3">
                      <div className="bg-slate-200 p-2 rounded-lg"><Phone className="w-4 h-4 text-slate-600" /></div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-500">رقم الهاتف</p>
                        <p className="font-bold text-slate-800">{req.phoneNumber}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1 h-12 font-bold" onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${req.lat},${req.lng}`, '_blank')}>
                      <MapPin className="w-4 h-4 ml-2" /> موقع العميل
                    </Button>
                    <Link href={`tel:${req.phoneNumber}`} className="flex-1">
                      <Button className="w-full h-12 bg-primary font-black text-lg">
                        <Phone className="w-4 h-4 ml-2" /> اتصال مباشر
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
