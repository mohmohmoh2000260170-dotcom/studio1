
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
  Phone, 
  MapPin, 
  Navigation,
  Truck,
  User,
  Plus,
  Minus,
  Lock,
  CheckCircle2,
  UserPlus,
  LogIn,
  AlertCircle,
  HelpCircle,
  MessageSquare
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useMemoFirebase, errorEmitter, useDoc } from '@/firebase';
import { collection, query, where, doc, setDoc, getDocs, updateDoc, serverTimestamp } from 'firebase/firestore';
import { FirestorePermissionError } from '@/firebase/errors';
import { getDeviceId } from '@/lib/device';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { ADMIN_CONFIG } from '@/lib/constants';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";

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
  deviceId: string;
  pin: string;
  name: string;
  phone: string;
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
  const router = useRouter();
  
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<'auth' | 'discovery'>('auth');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isRinging, setIsRinging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState({ lat: 31.9454, lng: 35.9284 });
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Forgot PIN state
  const [resetData, setResetData] = useState({ phone: '', name: '', newPin: '' });
  const [resetStep, setResetStep] = useState<'verify' | 'new-pin'>('verify');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);

  const [formData, setFormData] = useState({
    customerName: '',
    phoneNumber: '',
    pin: '',
    cylinders: 1,
  });

  useEffect(() => {
    setMounted(true);
    const savedId = localStorage.getItem('customerId');
    const isRegistered = localStorage.getItem('isRegistered') === 'true';
    
    if (isRegistered) {
      setAuthMode('login');
    } else {
      setAuthMode('register');
    }

    if (savedId) {
      setCustomerId(savedId);
      setStep('discovery');
    }
  }, []);

  useEffect(() => {
    if (mounted && step === 'discovery' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        },
        () => console.log("Location access denied"),
        { enableHighAccuracy: true }
      );
    }
  }, [mounted, step]);

  const customerDocRef = useMemo(() => {
    if (!firestore || !customerId) return null;
    return doc(firestore, "customers", customerId);
  }, [firestore, customerId]);

  const { data: profile } = useDoc<CustomerProfile>(customerDocRef);

  useEffect(() => {
    if (profile && profile.sessionId && customerId) {
      const localSessionId = localStorage.getItem('sessionId');
      if (localSessionId && profile.sessionId !== localSessionId) {
        handleLogout();
      }
    }
  }, [profile, customerId]);

  const approvedDriversQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "drivers"), where("status", "==", "approved"));
  }, [firestore]);

  const { data: drivers } = useCollection<Driver>(approvedDriversQuery);

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

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setErrorMsg(null);

    if (!formData.phoneNumber || formData.pin.length !== 4) {
      setErrorMsg("يرجى إدخال الهاتف ورمز PIN المكون من 4 أرقام");
      return;
    }
    
    setLoading(true);

    try {
      const currentDeviceId = getDeviceId();
      const newSessionId = Math.random().toString(36).substring(2, 15);
      
      const q = query(collection(firestore, "customers"), where("phone", "==", formData.phoneNumber));
      const snap = await getDocs(q);

      if (authMode === 'login') {
        if (snap.empty) {
          throw new Error("رقم الهاتف غير مسجل. يرجى تسجيل حساب جديد أولاً.");
        }

        const docSnap = snap.docs[0];
        const data = docSnap.data();

        if (data.pin !== formData.pin) {
          throw new Error("رمز PIN غير صحيح");
        }
        
        if (data.deviceId && data.deviceId !== currentDeviceId) {
          throw new Error("تنبيه أمني: هذا الحساب مرتبط بجهاز آخر.");
        }

        const targetId = docSnap.id;
        await updateDoc(doc(firestore, "customers", targetId), { 
          sessionId: newSessionId, 
          lastSeen: serverTimestamp() 
        });

        localStorage.setItem('customerId', targetId);
        localStorage.setItem('sessionId', newSessionId);
        localStorage.setItem('isRegistered', 'true');
        setCustomerId(targetId);
        setStep('discovery');
      } else {
        if (!snap.empty) {
          throw new Error("هذا الرقم مسجل مسبقاً، يرجى تسجيل الدخول أو استخدام رقم آخر");
        }

        if (!formData.customerName) {
          throw new Error("يرجى إدخال اسمك للتسجيل");
        }

        const uid = 'cust_' + Math.random().toString(36).substring(2, 11);
        const customerData = {
          name: formData.customerName,
          phone: formData.phoneNumber,
          pin: formData.pin,
          deviceId: currentDeviceId,
          uid: uid,
          sessionId: newSessionId,
          timestamp: serverTimestamp(),
        };

        await setDoc(doc(firestore, "customers", uid), customerData);

        localStorage.setItem('customerId', uid);
        localStorage.setItem('sessionId', newSessionId);
        localStorage.setItem('isRegistered', 'true');
        setCustomerId(uid);
        setStep('discovery');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPin = async () => {
    if (resetStep === 'verify') {
      setResetLoading(true);
      setResetError(null);
      try {
        const q = query(collection(firestore, "customers"), 
          where("phone", "==", resetData.phone),
          where("name", "==", resetData.name)
        );
        const snap = await getDocs(q);
        if (snap.empty) {
          throw new Error("لم يتم العثور على حساب مطابق لهذه البيانات. تأكد من إدخال الاسم المسجل تماماً.");
        }
        setResetStep('new-pin');
      } catch (err: any) {
        setResetError(err.message);
      } finally {
        setResetLoading(false);
      }
    } else {
      if (resetData.newPin.length !== 4) {
        setResetError("الرمز الجديد يجب أن يكون 4 أرقام");
        return;
      }
      setResetLoading(true);
      try {
        const q = query(collection(firestore, "customers"), where("phone", "==", resetData.phone));
        const snap = await getDocs(q);
        if (!snap.empty) {
          await updateDoc(doc(firestore, "customers", snap.docs[0].id), { pin: resetData.newPin });
          toast({ title: "تم تغيير الرمز بنجاح", description: "يمكنك الآن تسجيل الدخول بالرمز الجديد." });
          setShowResetDialog(false);
          setResetStep('verify');
          setResetData({ phone: '', name: '', newPin: '' });
        }
      } catch (err: any) {
        setResetError("حدث خطأ أثناء التحديث");
      } finally {
        setResetLoading(false);
      }
    }
  };

  const handleRingBell = () => {
    if (!firestore || !customerId) return;
    setIsRinging(true);
    
    const requestData = {
      customerName: profile?.name || formData.customerName || "عميل",
      phoneNumber: formData.phoneNumber || profile?.phone,
      cylinders: formData.cylinders.toString(),
      uid: customerId,
      lat: location.lat,
      lng: location.lng,
      status: 'pending',
      timestamp: serverTimestamp(),
    };

    setDoc(doc(collection(firestore, "requests")), requestData)
      .then(() => {
        toast({ title: "تم رن الجرس! 🔔" });
      })
      .catch(async (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: 'requests',
          operation: 'create',
          requestResourceData: requestData,
        }));
      })
      .finally(() => setIsRinging(false));
  };

  const handleLogout = () => {
    localStorage.removeItem('customerId');
    localStorage.removeItem('sessionId');
    setStep('auth');
    setCustomerId(null);
  };

  if (!mounted) return <div className="min-h-screen bg-[#FBF3EE] flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  if (step === 'auth') {
    return (
      <div className="min-h-screen bg-[#FBF3EE] flex flex-col items-center justify-center p-6 text-right" dir="rtl">
        <Card className="w-full max-w-md shadow-2xl border-primary/20 bg-white overflow-hidden">
          <CardHeader className="text-center pb-2 bg-slate-50 border-b mb-6">
            <div className="mx-auto bg-primary/10 p-4 rounded-2xl w-fit mb-2"><User className="w-10 h-10 text-primary" /></div>
            <CardTitle className="text-2xl font-bold">دخول العملاء</CardTitle>
            <div className="flex justify-center gap-2 mt-4">
              <Button 
                variant={authMode === 'login' ? 'default' : 'outline'} 
                size="sm"
                className="flex-1 font-bold gap-2"
                onClick={() => { setAuthMode('login'); setErrorMsg(null); }}
              >
                <LogIn className="w-4 h-4" /> دخول سريع
              </Button>
              <Button 
                variant={authMode === 'register' ? 'default' : 'outline'} 
                size="sm"
                className="flex-1 font-bold gap-2"
                onClick={() => { setAuthMode('register'); setErrorMsg(null); }}
              >
                <UserPlus className="w-4 h-4" /> تسجيل جديد
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="block text-right">رقم الهاتف</Label>
                <Input 
                  type="tel" 
                  placeholder="07XXXXXXXX" 
                  value={formData.phoneNumber} 
                  onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})} 
                  required 
                  className="text-right h-12"
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
                    <DialogTrigger asChild>
                      <Button variant="link" className="p-0 h-auto text-xs text-primary font-bold">نسيت رمز PIN؟</Button>
                    </DialogTrigger>
                    <DialogContent dir="rtl" className="text-right">
                      <DialogHeader>
                        <DialogTitle className="text-right">استعادة رمز الدخول</DialogTitle>
                        <DialogDescription className="text-right">
                          {resetStep === 'verify' 
                            ? "أدخل هاتفك واسمك المسجل لتأكيد هويتك." 
                            : "تم التحقق بنجاح! أدخل رمز PIN الجديد المكون من 4 أرقام."}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        {resetStep === 'verify' ? (
                          <>
                            <div className="space-y-2">
                              <Label>رقم الهاتف</Label>
                              <Input 
                                placeholder="07XXXXXXXX" 
                                value={resetData.phone}
                                onChange={(e) => setResetData({...resetData, phone: e.target.value})}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>الاسم المسجل كاملاً</Label>
                              <Input 
                                placeholder="أدخل اسمك كما سجلته أول مرة"
                                value={resetData.name}
                                onChange={(e) => setResetData({...resetData, name: e.target.value})}
                              />
                            </div>
                          </>
                        ) : (
                          <div className="space-y-2">
                            <Label>رمز PIN الجديد (4 أرقام)</Label>
                            <Input 
                              type="password"
                              maxLength={4}
                              placeholder="****"
                              value={resetData.newPin}
                              onChange={(e) => setResetData({...resetData, newPin: e.target.value.replace(/\D/g, '')})}
                            />
                          </div>
                        )}
                        {resetError && (
                          <Alert variant="destructive" className="bg-red-50 border-red-200 p-2">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription className="text-[10px] mr-2">{resetError}</AlertDescription>
                          </Alert>
                        )}
                      </div>
                      <DialogFooter className="flex flex-col gap-2">
                        <Button onClick={handleResetPin} disabled={resetLoading} className="w-full font-bold">
                          {resetLoading ? <Loader2 className="animate-spin" /> : (resetStep === 'verify' ? "تحقق" : "حفظ الرمز الجديد")}
                        </Button>
                        <div className="relative my-2">
                          <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                          <div className="relative flex justify-center text-[10px] uppercase"><span className="bg-white px-2 text-muted-foreground font-bold">أو تواصل معنا</span></div>
                        </div>
                        <Button variant="outline" className="w-full text-green-600 border-green-200 hover:bg-green-50 font-bold gap-2" onClick={() => window.open(`https://wa.me/962${ADMIN_CONFIG.phone.substring(1)}?text=أريد استعادة رمز PIN لحسابي: ${resetData.phone}`)}>
                          <MessageSquare className="w-4 h-4" /> تواصل مع الإدارة عبر واتساب
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Label className="block text-right">رمز PIN (4 أرقام)</Label>
                </div>
                <Input 
                  type="password" 
                  maxLength={4}
                  placeholder="****" 
                  value={formData.pin} 
                  onChange={(e) => setFormData({...formData, pin: e.target.value.replace(/\D/g, '')})} 
                  required 
                  className="text-right h-12"
                />
              </div>

              {authMode === 'register' && (
                <div className="space-y-2 animate-in slide-in-from-top-2">
                  <Label className="block text-right">الاسم الكامل</Label>
                  <Input 
                    placeholder="مثال: خالد أحمد" 
                    value={formData.customerName} 
                    onChange={(e) => setFormData({...formData, customerName: e.target.value})} 
                    required={authMode === 'register'}
                    className="text-right h-12"
                  />
                </div>
              )}

              {errorMsg && (
                <Alert variant="destructive" className="bg-red-50 border-red-200">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs font-bold mr-2">
                    {errorMsg}
                  </AlertDescription>
                </Alert>
              )}

              <Button type="submit" disabled={loading} className="w-full h-14 text-lg font-bold shadow-lg">
                {loading ? <Loader2 className="animate-spin" /> : (authMode === 'login' ? "دخول" : "تسجيل ودخول")}
              </Button>
              
              <Link href="/" className="block mt-4">
                <Button variant="ghost" className="w-full text-xs">رجوع للرئيسية</Button>
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
          <Button variant="ghost" size="icon" onClick={handleLogout} className="rounded-full"><ArrowRight className="w-5 h-5" /></Button>
          <h1 className="text-lg font-bold text-primary flex items-center gap-2">
            <Navigation className="w-5 h-5" /> 
            غاز دليفري
          </h1>
        </div>
        <Badge variant="outline" className="bg-primary/5 text-primary">
          {profile?.name || "عميل"}
        </Badge>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        <div className="w-full md:w-96 bg-white border-l overflow-y-auto p-4 space-y-4 shadow-xl z-10 hidden md:block">
          <div className="p-2">
            <h2 className="text-sm font-bold text-muted-foreground mb-4">
              الموزعين المتاحين ({nearestAgencies.length})
            </h2>
            <div className="space-y-3">
              {nearestAgencies.map((agency) => (
                <Card key={agency.id} className="border-2 hover:border-primary transition-all shadow-sm">
                  <CardContent className="p-4 flex items-center justify-between flex-row-reverse">
                    <div className="flex items-center gap-3 flex-row-reverse">
                      <div className="bg-primary/10 p-2 rounded-full text-primary"><Truck className="w-5 h-5" /></div>
                      <div className="text-right">
                        <h3 className="font-bold text-sm">{agency.name}</h3>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1 justify-end">
                          <span>يبعد {agency.distance.toFixed(1)} كم</span>
                          <MapPin className="w-3 h-3" />
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-700 text-[10px]">متاح</Badge>
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
            <Card className="w-full max-w-sm shadow-2xl bg-white/95 rounded-[2rem] p-6 border-2 border-primary/20 backdrop-blur">
              <div className="space-y-4">
                <div className="space-y-4">
                  <h3 className="text-center font-bold text-slate-800">كم أسطوانة غاز تحتاج؟</h3>
                  <div className="flex items-center justify-center gap-6">
                    <Button 
                      variant="outline" size="icon" className="rounded-full w-12 h-12"
                      onClick={() => setFormData(p => ({...p, cylinders: Math.max(1, p.cylinders-1)}))}
                    >
                      <Minus className="w-5 h-5" />
                    </Button>
                    <div className="flex flex-col items-center">
                      <span className="text-5xl font-black text-primary">{formData.cylinders}</span>
                      <span className="text-xs text-muted-foreground font-bold">أسطوانة</span>
                    </div>
                    <Button 
                      variant="outline" size="icon" className="rounded-full w-12 h-12"
                      onClick={() => setFormData(p => ({...p, cylinders: p.cylinders+1}))}
                    >
                      <Plus className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
                <div className="bg-primary/5 p-4 rounded-2xl text-center border">
                  <p className="text-[10px] font-bold text-primary mb-1">السعر التقديري</p>
                  <p className="text-3xl font-black text-slate-800">{formData.cylinders * PRICE_PER_CYLINDER} دينار</p>
                </div>
                <Button 
                  onClick={handleRingBell} 
                  disabled={isRinging} 
                  className="w-full h-16 text-xl rounded-2xl shadow-xl bg-primary hover:bg-primary/90"
                >
                  {isRinging ? <Loader2 className="animate-spin" /> : <Bell className="w-6 h-6 ml-2" />}
                  رن الجرس 🔔
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
