"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Truck, FileText, Phone, User, Loader2, ArrowRight, MapPin, Lock, AlertCircle, Home } from 'lucide-react';
import { useFirestore, errorEmitter } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import { getDeviceId } from '@/lib/device';
import Link from 'next/link';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

export default function DriverRegistration() {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [location, setLocation] = useState({ lat: 31.9454, lng: 35.9284 });
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    companyLicense: '',
    pin: '',
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

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!formData.name || !formData.phone || !formData.companyLicense || formData.pin.length !== 4) {
      setErrorMsg("يرجى تعبئة جميع الحقول ووضع رمز PIN من 4 أرقام");
      return;
    }

    setLoading(true);
    try {
      const q = query(collection(firestore, "drivers"), where("phone", "==", formData.phone));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        throw new Error("هذا الرقم مسجل مسبقاً، يرجى تسجيل الدخول");
      }

      const driversRef = collection(firestore, "drivers");
      const tempId = 'drv_' + Math.random().toString(36).substr(2, 9);
      const deviceId = getDeviceId();
      const sessionId = Math.random().toString(36).substring(2, 15);
      
      const driverData = {
        name: formData.name,
        phone: formData.phone,
        companyLicense: formData.companyLicense,
        uid: tempId,
        status: 'pending',
        availability: 'available',
        lat: location.lat,
        lng: location.lng,
        pin: formData.pin,
        deviceId: deviceId,
        sessionId: sessionId,
        timestamp: serverTimestamp(),
      };

      await addDoc(driversRef, driverData);
      
      localStorage.setItem('driverId', tempId);
      localStorage.setItem('sessionId', sessionId);
      
      toast({
        title: "تم تقديم الطلب",
        description: "طلبك قيد المراجعة، سنقوم بتفعيل حسابك قريباً.",
      });
      router.push('/driver');
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || "حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF3EE] flex flex-col items-center justify-center p-6 text-right" dir="rtl">
      <Card className="w-full max-w-md shadow-xl border-primary/20 bg-white">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto bg-primary/10 p-4 rounded-2xl w-fit mb-2">
            <Truck className="w-10 h-10 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">تسجيل وكالة غاز</CardTitle>
          <CardDescription>انضم لشبكة التوزيع وابدأ باستقبال الطلبات في منطقتك</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="block text-right">اسم الوكالة / السائق</Label>
              <div className="relative">
                <User className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input 
                  id="name" 
                  placeholder="مثال: غاز التفاؤل" 
                  className="pr-10 text-right"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
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
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pin" className="block text-right">رمز PIN (4 أرقام)</Label>
              <div className="relative">
                <Lock className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input 
                  id="pin" 
                  type="password"
                  maxLength={4}
                  placeholder="****" 
                  className="pr-10 text-right"
                  value={formData.pin}
                  onChange={(e) => setFormData({...formData, pin: e.target.value.replace(/\D/g, '')})}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="license" className="block text-right">رقم الرخصة / السجل التجاري</Label>
              <div className="relative">
                <FileText className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input 
                  id="license" 
                  placeholder="أدخل رقم الرخصة" 
                  className="pr-10 text-right"
                  value={formData.companyLicense}
                  onChange={(e) => setFormData({...formData, companyLicense: e.target.value})}
                  required
                />
              </div>
            </div>

            {errorMsg && (
              <Alert variant="destructive" className="bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs font-bold mr-2">
                  {errorMsg}
                </AlertDescription>
              </Alert>
            )}

            <div className="bg-slate-50 p-3 rounded-lg border border-dashed text-xs text-muted-foreground flex items-center gap-2 justify-end">
              <span>{location.lat.toFixed(4)}, {location.lng.toFixed(4)}</span>
              <span>سيتم تسجيل موقعك الحالي كمركز للوكالة:</span>
              <MapPin className="w-3 h-3" />
            </div>

            <Button type="submit" disabled={loading} className="w-full h-12 text-lg font-bold mt-6">
              {loading ? <Loader2 className="animate-spin ml-2" /> : null}
              تقديم الطلب
            </Button>
            
            <Link href="/driver/login">
              <Button variant="outline" className="w-full mt-2 gap-2 h-12">
                لديك حساب؟ تسجيل الدخول
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>

            <Link href="/">
              <Button variant="ghost" className="w-full mt-2 gap-2 text-muted-foreground">
                <Home className="w-4 h-4" /> رجوع للرئيسية
              </Button>
            </Link>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
