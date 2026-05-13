
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Flame, 
  MapPin, 
  Clock, 
  Truck, 
  ShoppingCart, 
  Phone, 
  LogOut, 
  Activity,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, errorEmitter } from '@/firebase';
import { collection, query, where, orderBy, getDocs, doc, updateDoc } from 'firebase/firestore';
import { FirestorePermissionError } from '@/firebase/errors';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

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
  status: 'pending' | 'approved' | 'rejected';
  availability: 'available' | 'busy';
  name: string;
  phone: string;
  lat: number;
  lng: number;
}

export default function DriverDashboard() {
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [driverId, setDriverId] = useState<string | null>(null);
  const [driverInfo, setDriverInfo] = useState<DriverInfo | null>(null);
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
          setDriverInfo({ id: docSnap.id, ...docSnap.data() } as DriverInfo);
        } else {
          localStorage.removeItem('driverId');
          router.push('/driver/login');
        }
      } catch (e) {
        console.error("Error fetching driver info", e);
      } finally {
        setLoadingInfo(false);
      }
    };

    fetchDriver();
  }, [firestore, driverId, router]);

  // Background Location Update Logic (Every 30 seconds)
  useEffect(() => {
    if (!firestore || !driverInfo || driverInfo.status !== 'approved' || driverInfo.availability !== 'available') {
      return;
    }

    const updateLocation = () => {
      if (!navigator.geolocation) {
        setGpsError("المتصفح لا يدعم تحديد الموقع");
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const driverRef = doc(firestore, "drivers", driverInfo.id);
          updateDoc(driverRef, {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            lastSeen: new Date().toISOString()
          }).catch(async (err) => {
            const permissionError = new FirestorePermissionError({
              path: driverRef.path,
              operation: 'update',
              requestResourceData: { lat: pos.coords.latitude, lng: pos.coords.longitude },
            });
            errorEmitter.emit('permission-error', permissionError);
          });
          setGpsError(null);
        },
        (error) => {
          console.error("GPS Error:", error);
          setGpsError("يرجى تفعيل خدمة الموقع (GPS) لتتمكن من استقبال الطلبات");
        },
        { enableHighAccuracy: true }
      );
    };

    const interval = setInterval(updateLocation, 30000); // 30 seconds
    updateLocation();
    return () => clearInterval(interval);
  }, [firestore, driverInfo]);

  const requestsQuery = useMemoFirebase(() => {
    if (!firestore || driverInfo?.status !== 'approved' || driverInfo?.availability !== 'available') return null;
    return query(
      collection(firestore, "requests"),
      where("status", "==", "pending"),
      orderBy("timestamp", "desc")
    );
  }, [firestore, driverInfo]);

  const { data: requests, loading: loadingRequests } = useCollection<GasRequest>(requestsQuery);

  const toggleAvailability = async () => {
    if (!firestore || !driverInfo) return;
    
    const newStatus = driverInfo.availability === 'available' ? 'busy' : 'available';
    const driverRef = doc(firestore, "drivers", driverInfo.id);

    updateDoc(driverRef, { availability: newStatus })
      .then(() => {
        setDriverInfo({ ...driverInfo, availability: newStatus });
        toast({
          title: newStatus === 'available' ? "أنت متاح الآن" : "أنت مشغول الآن",
          description: newStatus === 'available' ? "سيتم تحديث موقعك تلقائياً كل 30 ثانية" : "تم إيقاف تحديث الموقع والطلبات",
        });
      })
      .catch(async (err) => {
        const permissionError = new FirestorePermissionError({
          path: driverRef.path,
          operation: 'update',
          requestResourceData: { availability: newStatus },
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  const handleLogout = () => {
    localStorage.removeItem('driverId');
    router.push('/driver/login');
  };

  if (loadingInfo) return (
    <div className="min-h-screen flex items-center justify-center bg-[#FBF3EE]">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (driverInfo?.status === 'pending') {
    return (
      <div className="min-h-screen bg-[#FBF3EE] flex flex-col items-center justify-center p-6 text-center" dir="rtl">
        <div className="bg-white p-8 rounded-3xl shadow-xl border-2 border-primary/10 max-w-md space-y-6">
          <div className="mx-auto bg-amber-100 p-6 rounded-full w-fit animate-pulse">
            <Clock className="w-16 h-16 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold">بانتظار موافقة الإدارة</h1>
          <p className="text-muted-foreground">أهلاً يا {driverInfo.name}. حسابك قيد المراجعة حالياً. سيتم تفعيله قريباً لتبدأ باستقبال الطلبات.</p>
          <Button onClick={handleLogout} variant="outline" className="w-full">خروج</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF3EE] flex flex-col" dir="rtl">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleLogout} className="rounded-full text-muted-foreground hover:text-red-500">
            <LogOut className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="bg-primary p-2 rounded-lg">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold text-primary">لوحة السائق</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end gap-0.5">
             <span className="text-[10px] text-muted-foreground">الحالة الحالية</span>
             <span className={`text-xs font-bold ${driverInfo?.availability === 'available' ? 'text-green-600' : 'text-slate-500'}`}>
               {driverInfo?.availability === 'available' ? 'متاح للطلب' : 'غير متاح'}
             </span>
          </div>
          <Switch 
            checked={driverInfo?.availability === 'available'} 
            onCheckedChange={toggleAvailability}
          />
        </div>
      </header>

      <main className="flex-1 p-6 space-y-4 max-w-3xl mx-auto w-full">
        {gpsError && driverInfo?.availability === 'available' && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p className="text-sm font-bold">{gpsError}</p>
          </div>
        )}

        {driverInfo?.availability === 'busy' && (
          <Card className="bg-slate-50 border-slate-200">
            <CardContent className="p-10 text-center space-y-4">
              <Activity className="w-12 h-12 text-slate-400 mx-auto" />
              <h2 className="text-xl font-bold">أنت حالياً في وضع "مشغول"</h2>
              <p className="text-muted-foreground">قم بتفعيل الحالة من الأعلى لتبدأ باستقبال طلبات العملاء القريبة منك وتحديث موقعك.</p>
            </CardContent>
          </Card>
        )}

        {driverInfo?.availability === 'available' && (
          <>
            <div className="flex items-center justify-between px-2 mb-2">
              <h2 className="font-bold flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-primary" />
                الطلبات القريبة ({requests?.length || 0})
              </h2>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 animate-pulse">جاري البحث عن طلبات...</Badge>
            </div>

            {loadingRequests ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : !requests || requests.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed space-y-4">
                <div className="bg-slate-50 p-6 rounded-full w-fit mx-auto">
                   <Truck className="w-12 h-12 text-slate-300" />
                </div>
                <p className="text-muted-foreground">لا توجد طلبات نشطة حالياً في منطقتك</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {requests.map((req) => (
                  <Card key={req.id} className="border-2 hover:border-primary/30 transition-all shadow-md overflow-hidden bg-white">
                    <div className="bg-primary/5 p-4 flex justify-between items-center border-b">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-primary">طلب جديد</Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {req.timestamp?.toDate()?.toLocaleTimeString('ar-JO', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <h3 className="font-bold">{req.customerName}</h3>
                    </div>
                    <CardContent className="p-5 space-y-5">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-3 rounded-xl border flex items-center gap-3">
                          <ShoppingCart className="w-5 h-5 text-primary" />
                          <div className="text-right">
                            <p className="text-[10px] text-muted-foreground">الكمية</p>
                            <p className="font-bold">{req.cylinders} اسطوانات</p>
                          </div>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border flex items-center gap-3">
                          <Phone className="w-5 h-5 text-primary" />
                          <div className="text-right">
                            <p className="text-[10px] text-muted-foreground">الهاتف</p>
                            <p className="font-bold">{req.phoneNumber}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          className="flex-1 h-12 border-primary text-primary hover:bg-primary/5 gap-2"
                          onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${req.lat},${req.lng}`, '_blank')}
                        >
                          <MapPin className="w-4 h-4" />
                          فتح الخريطة
                        </Button>
                        <Link href={`tel:${req.phoneNumber}`} className="flex-1">
                          <Button className="w-full h-12 gap-2 font-bold bg-primary">
                            <Phone className="w-4 h-4" />
                            اتصال سريع
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
