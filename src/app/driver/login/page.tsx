"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Phone, LogIn, Loader2, UserPlus, AlertCircle, Clock, XCircle, Lock, MessageSquare, RotateCcw } from 'lucide-react';
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
        return;
      }

      const driverDoc = snap.docs[0];
      const data = driverDoc.data();
      const currentDeviceId = getDeviceId();

      if (data.pin !== formData.pin) {
        toast({ variant: "destructive", title: "خطأ في الدخول", description: "رمز PIN غير صحيح" });
        return;
      }

      if (data.deviceId && data.deviceId !== currentDeviceId) {
        setStatusMessage({ type: 'error', text: 'تنبيه أمني: هذا الحساب مرتبط بجهاز آخر.' });
        return;
      }

      if (data.status === 'pending') {
        setStatusMessage({ type: 'pending', text: 'حسابك قيد المراجعة حالياً.' });
      } else if (data.status === 'rejected') {
        setStatusMessage({ type: 'rejected', text: 'تم رفض طلب الانضمام.' });
      } else if (data.status === 'approved') {
        const newSessionId = Math.random().toString(36).substring(2, 15);
        await updateDoc(doc(firestore, "drivers", driverDoc.id), { sessionId: newSessionId });
        
        localStorage.setItem('driverId', data.uid);
        localStorage.setItem('sessionId', newSessionId);
        
        toast({ title: "تم تسجيل الدخول" });
        router.push('/driver');
      }
    } catch (error) {
      toast({ variant: "destructive", title: "خطأ", description: "حدث خطأ غير متوقع" });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-[#FBF3EE] flex flex-col items-center justify-center p-6 text-right" dir="rtl">
      <header className="absolute top-0 w-full p-4 flex justify-between items-center bg-white/50 backdrop-blur border-b">
         <Button variant="ghost" size="icon" onClick={handleRefresh} className="text-primary"><RotateCcw className="w-5 h-5" /></Button>
         <h2 className="font-bold text-primary">لوحة السائقين</h2>
      </header>
      <Card className="w-full max-w-md shadow-xl border-primary/20 bg-white mt-16">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto bg-primary/10 p-4 rounded-2xl w-fit mb-2"><LogIn className="w-10 h-10 text-primary" /></div>
          <CardTitle className="text-2xl font-bold">دخول السائقين</CardTitle>
          <CardDescription>أدخل بياناتك المسجلة للمتابعة</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label>رقم الهاتف</Label>
              <Input type="tel" placeholder="07XXXXXXXX" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} required className="h-12" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Button variant="link" className="p-0 h-auto text-xs font-bold" onClick={() => setShowResetDialog(true)}>نسيت PIN؟</Button>
                <Label>رمز PIN (4 أرقام)</Label>
              </div>
              <Input type="password" maxLength={4} placeholder="****" value={formData.pin} onChange={(e) => setFormData({...formData, pin: e.target.value.replace(/\D/g, '')})} required className="h-12" />
            </div>

            {statusMessage && (
              <Alert variant={statusMessage.type === 'error' ? "destructive" : "default"} className={statusMessage.type === 'pending' ? "bg-amber-50" : ""}>
                <AlertDescription>{statusMessage.text}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={loading} className="w-full h-14 text-lg font-bold">
              {loading ? <Loader2 className="animate-spin" /> : "تسجيل الدخول"}
            </Button>
          </form>

          <Link href="/driver/register" className="block"><Button variant="outline" className="w-full h-12 border-primary text-primary">تسجيل كشركة غاز جديدة</Button></Link>
          <Link href="/"><Button variant="ghost" className="w-full">رجوع للرئيسية</Button></Link>
        </CardContent>
      </Card>
    </div>
  );
}
