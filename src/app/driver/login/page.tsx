
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Phone, LogIn, Loader2, UserPlus, AlertCircle, Clock, XCircle, Lock, MessageSquare } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { getDeviceId } from '@/lib/device';
import Link from 'next/link';
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

export default function DriverLogin() {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ phone: '', pin: '' });
  const [statusMessage, setStatusMessage] = useState<{ type: 'pending' | 'rejected' | 'error', text: string } | null>(null);

  // Reset PIN State
  const [resetData, setResetData] = useState({ phone: '', name: '', newPin: '' });
  const [resetStep, setResetStep] = useState<'verify' | 'new-pin'>('verify');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.phone || formData.pin.length !== 4) {
      toast({ variant: "destructive", title: "خطأ", description: "يرجى إدخال رقم الهاتف ورمز PIN" });
      return;
    }

    setLoading(true);
    setStatusMessage(null);

    try {
      const q = query(collection(firestore, "drivers"), where("phone", "==", formData.phone));
      const snap = await getDocs(q);

      if (snap.empty) {
        setStatusMessage({ type: 'error', text: 'رقم الهاتف غير مسجل. يرجى تسجيل حساب جديد أولاً.' });
        setLoading(false);
        return;
      }

      const driverDoc = snap.docs[0];
      const data = driverDoc.data();
      const currentDeviceId = getDeviceId();

      if (data.pin !== formData.pin) {
        toast({ variant: "destructive", title: "خطأ في الدخول", description: "رمز PIN غير صحيح" });
        setLoading(false);
        return;
      }

      if (data.deviceId && data.deviceId !== currentDeviceId) {
        setStatusMessage({ type: 'error', text: 'تنبيه أمني: هذا الحساب مرتبط بجهاز آخر. لا يمكن الدخول من هذا الجهاز.' });
        setLoading(false);
        return;
      }

      if (data.status === 'pending') {
        setStatusMessage({ type: 'pending', text: 'حسابك لا يزال قيد المراجعة من قبل الإدارة. يرجى الانتظار.' });
      } else if (data.status === 'rejected') {
        setStatusMessage({ type: 'rejected', text: 'نعتذر، لقد تم رفض طلب انضمامك. يرجى التواصل مع الإدارة.' });
      } else if (data.status === 'approved') {
        const newSessionId = Math.random().toString(36).substring(2, 15);
        await updateDoc(doc(firestore, "drivers", driverDoc.id), { sessionId: newSessionId });
        
        localStorage.setItem('driverId', data.uid);
        localStorage.setItem('sessionId', newSessionId);
        
        toast({ title: "تم تسجيل الدخول", description: "مرحباً بك مجدداً!" });
        router.push('/driver');
      }
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "خطأ", description: "حدث خطأ أثناء محاولة تسجيل الدخول" });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPin = async () => {
    if (resetStep === 'verify') {
      setResetLoading(true);
      setResetError(null);
      try {
        const q = query(collection(firestore, "drivers"), 
          where("phone", "==", resetData.phone),
          where("name", "==", resetData.name)
        );
        const snap = await getDocs(q);
        if (snap.empty) {
          throw new Error("لم يتم العثور على وكالة مطابقة لهذه البيانات. تأكد من إدخال اسم الوكالة كما سجلته.");
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
        const q = query(collection(firestore, "drivers"), where("phone", "==", resetData.phone));
        const snap = await getDocs(q);
        if (!snap.empty) {
          await updateDoc(doc(firestore, "drivers", snap.docs[0].id), { pin: resetData.newPin });
          toast({ title: "تم تحديث الرمز", description: "يمكنك الآن الدخول باستخدام الرمز الجديد." });
          setShowResetDialog(false);
          setResetStep('verify');
          setResetData({ phone: '', name: '', newPin: '' });
        }
      } catch (err: any) {
        setResetError("حدث خطأ أثناء تحديث البيانات");
      } finally {
        setResetLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF3EE] flex flex-col items-center justify-center p-6 text-right" dir="rtl">
      <Card className="w-full max-w-md shadow-xl border-primary/20 bg-white">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto bg-primary/10 p-4 rounded-2xl w-fit mb-2">
            <LogIn className="w-10 h-10 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">دخول السائقين</CardTitle>
          <CardDescription>أدخل بياناتك المسجلة للمتابعة</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleLogin} className="space-y-4">
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
              <div className="flex items-center justify-between mb-1">
                <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
                  <DialogTrigger asChild>
                    <Button variant="link" className="p-0 h-auto text-xs text-primary font-bold">نسيت رمز PIN؟</Button>
                  </DialogTrigger>
                  <DialogContent dir="rtl" className="text-right">
                    <DialogHeader>
                      <DialogTitle className="text-right">استعادة حساب الوكالة</DialogTitle>
                      <DialogDescription className="text-right">
                        تأكد من إدخال رقم الهاتف واسم الوكالة كما تم تسجيلهما في النظام.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      {resetStep === 'verify' ? (
                        <>
                          <div className="space-y-2">
                            <Label>رقم هاتف الوكالة</Label>
                            <Input 
                              placeholder="07XXXXXXXX" 
                              value={resetData.phone}
                              onChange={(e) => setResetData({...resetData, phone: e.target.value})}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>اسم الوكالة / السائق</Label>
                            <Input 
                              placeholder="أدخل اسم الوكالة المسجل"
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
                          <AlertDescription className="text-xs font-bold mr-2">{resetError}</AlertDescription>
                        </Alert>
                      )}
                    </div>
                    <DialogFooter className="flex flex-col gap-2">
                      <Button onClick={handleResetPin} disabled={resetLoading} className="w-full font-bold">
                        {resetLoading ? <Loader2 className="animate-spin" /> : (resetStep === 'verify' ? "تحقق من البيانات" : "تحديث الرمز")}
                      </Button>
                      <div className="relative my-2">
                        <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                        <div className="relative flex justify-center text-[10px] uppercase"><span className="bg-white px-2 text-muted-foreground font-bold">تحتاج مساعدة؟</span></div>
                      </div>
                      <Button variant="outline" className="w-full text-green-600 border-green-200 hover:bg-green-50 font-bold gap-2" onClick={() => window.open(`https://wa.me/962${ADMIN_CONFIG.phone.substring(1)}?text=أريد تصفير رمز PIN لوكالة الغاز: ${resetData.phone}`)}>
                        <MessageSquare className="w-4 h-4" /> تواصل مع الإدارة (واتساب)
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Label htmlFor="pin" className="block text-right">رمز PIN (4 أرقام)</Label>
              </div>
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

            {statusMessage && (
              <Alert variant={statusMessage.type === 'error' || statusMessage.type === 'rejected' ? "destructive" : "default"} className={statusMessage.type === 'pending' ? "border-amber-200 bg-amber-50 text-amber-800" : ""}>
                {statusMessage.type === 'pending' && <Clock className="h-4 w-4 text-amber-600" />}
                {statusMessage.type === 'rejected' && <XCircle className="h-4 w-4" />}
                {statusMessage.type === 'error' && <AlertCircle className="h-4 w-4" />}
                <AlertTitle className="mr-6 font-bold">
                  {statusMessage.type === 'pending' ? "قيد المراجعة" : statusMessage.type === 'rejected' ? "تم الرفض" : "تنبيه أمني"}
                </AlertTitle>
                <AlertDescription className="mr-6">
                  {statusMessage.text}
                </AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={loading} className="w-full h-12 text-lg font-bold mt-2">
              {loading ? <Loader2 className="animate-spin ml-2" /> : null}
              تسجيل الدخول
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-muted-foreground">أو</span>
            </div>
          </div>

          <Link href="/driver/register" className="block">
            <Button variant="outline" className="w-full h-12 gap-2 border-primary text-primary hover:bg-primary/5">
              <UserPlus className="w-4 h-4" />
              تسجيل كشركة غاز جديدة
            </Button>
          </Link>
          
          <Link href="/">
            <Button variant="ghost" className="w-full">رجوع للرئيسية</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
