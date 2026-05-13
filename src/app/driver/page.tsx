"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Flame, MapPin, Clock, ArrowRight, Truck, ShoppingCart, Phone, ExternalLink, ShieldAlert } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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
  name: string;
}

export default function DriverDashboard() {
  const router = useRouter();
  const firestore = useFirestore();
  const [driverId, setDriverId] = useState<string | null>(null);
  const [driverInfo, setDriverInfo] = useState<DriverInfo | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(true);

  useEffect(() => {
    const id = localStorage.getItem('driverId');
    if (!id) {
      router.push('/driver/register');
    } else {
      setDriverId(id);
    }
  }, [router]);

  useEffect(() => {
    if (!firestore || !driverId) return;

    const fetchDriver = async () => {
      const q = query(collection(firestore, "drivers"), where("uid", "==", driverId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const doc = snap.docs[0];
        setDriverInfo({ id: doc.id, ...doc.data() } as DriverInfo);
      }
      setLoadingInfo(false);
    };

    fetchDriver();
  }, [firestore, driverId]);

  const requestsQuery = useMemoFirebase(() => {
    if (!firestore || driverInfo?.status !== 'approved') return null;
    return query(
      collection(firestore, "requests"),
      where("status", "==", "pending"),
      orderBy("timestamp", "desc")
    );
  }, [firestore, driverInfo]);

  const { data: requests, loading: loadingRequests } = useCollection<GasRequest>(requestsQuery);

  const openInGoogleMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
  };

  if (loadingInfo) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );

  if (!driverInfo) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-xl font-bold">لم يتم العثور على حسابك</h1>
      <Link href="/driver/register" className="mt-4">
        <Button>سجل الآن</Button>
      </Link>
    </div>
  );

  if (driverInfo.status === 'pending') {
    return (
      <div className="min-h-screen bg-[#FBF3EE] flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-xl border-2 border-primary/10 max-w-md space-y-6">
          <div className="mx-auto bg-amber-100 p-6 rounded-full w-fit animate-pulse">
            <ShieldAlert className="w-16 h-16 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">بانتظار موافقة الإدارة</h1>
          <p className="text-muted-foreground leading-relaxed">
            أهلاً يا {driverInfo.name}. تم التحقق من رقم هاتفك بنجاح. 
            حسابك حالياً قيد المراجعة من قبل الإدارة. سيتم تفعيل حسابك لتبدأ باستقبال الطلبات فور التأكد من بياناتك.
          </p>
          <Link href="/">
            <Button variant="outline" className="w-full">العودة للرئيسية</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF3EE] flex flex-col">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
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
            <h1 className="text-lg font-bold text-primary">طلبات التوصيل</h1>
          </div>
        </div>
        <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 px-3 py-1">
          <span className="w-2 h-2 bg-green-500 rounded-full ml-2 animate-pulse"></span>
          متصل
        </Badge>
      </header>

      <main className="flex-1 p-6 space-y-4">
        {loadingRequests ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-4 text-sm">جاري تحميل الطلبات...</p>
          </div>
        ) : !requests || requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-50">
            <Truck className="w-16 h-16 text-muted-foreground" />
            <p className="text-muted-foreground font-medium">لا يوجد طلبات نشطة حالياً</p>
          </div>
        ) : (
          requests.map((req) => (
            <Card key={req.id} className="border-2 border-primary/10 shadow-md bg-white hover:border-primary/30 transition-all overflow-hidden">
              <CardHeader className="pb-2 bg-slate-50 flex flex-row items-center justify-between border-b">
                <div>
                  <CardTitle className="text-lg font-bold">{req.customerName}</CardTitle>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <Clock className="w-3 h-3" />
                    {req.timestamp?.toDate().toLocaleTimeString('ar-JO', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <Badge className="bg-primary">جديد</Badge>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border">
                    <ShoppingCart className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">عدد الأسطوانات</p>
                      <p className="font-bold">{req.cylinders}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border">
                    <Phone className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">رقم الهاتف</p>
                      <p className="font-bold">{req.phoneNumber}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-sm px-1">
                  <MapPin className="w-4 h-4 text-primary mt-0.5" />
                  <p className="text-muted-foreground">الإحداثيات: {req.lat.toFixed(6)}, {req.lng.toFixed(6)}</p>
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={() => openInGoogleMaps(req.lat, req.lng)}
                    variant="outline"
                    className="flex-1 h-12 gap-2 border-primary text-primary hover:bg-primary/5"
                  >
                    <ExternalLink className="w-4 h-4" />
                    موقع GPS
                  </Button>
                  <Link href={`tel:${req.phoneNumber}`} className="flex-1">
                    <Button className="w-full h-12 gap-2 font-bold bg-primary hover:bg-primary/90">
                      <Phone className="w-4 h-4" />
                      اتصال
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </main>
    </div>
  );
}
