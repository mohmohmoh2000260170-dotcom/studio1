"use client";

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Truck, FileText, Phone, User, Loader2, ShieldCheck } from 'lucide-react';
import { useFirestore, useAuth, errorEmitter } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import Link from 'next/link';

export default function DriverRegistration() {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const auth = useAuth();

  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    companyLicense: '',
  });
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  const recaptchaContainerRef = useRef<HTMLDivElement>(null);
  const recaptchaVerifier = useRef<RecaptchaVerifier | null>(null);

  const initRecaptcha = () => {
    if (!recaptchaVerifier.current && auth && recaptchaContainerRef.current) {
      try {
        recaptchaVerifier.current = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
          size: 'invisible',
          'callback': () => {
            console.log("reCAPTCHA verified");
          }
        });
      } catch (e) {
        console.error("Recaptcha init failed", e);
      }
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.companyLicense) {
      toast({ variant: "destructive", title: "خطأ", description: "يرجى تعبئة جميع الحقول" });
      return;
    }

    let formattedPhone = formData.phone;
    if (!formattedPhone.startsWith('+')) {
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '+962' + formattedPhone.substring(1);
      } else if (!formattedPhone.startsWith('962')) {
        formattedPhone = '+962' + formattedPhone;
      } else {
        formattedPhone = '+' + formattedPhone;
      }
    }

    setLoading(true);
    try {
      initRecaptcha();
      if (!recaptchaVerifier.current) throw new Error("Recaptcha not initialized");

      const result = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier.current);
      setConfirmationResult(result);
      setStep('otp');
      toast({ title: "تم إرسال الرمز", description: "يرجى إدخال رمز التحقق (أو رمز الاختبار)" });
    } catch (error: any) {
      console.error(error);
      toast({ 
        variant: "destructive", 
        title: "خطأ في الإرسال", 
        description: error.message 
      });
      if (recaptchaVerifier.current) {
        recaptchaVerifier.current.clear();
        recaptchaVerifier.current = null;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode || !confirmationResult || !firestore) return;

    setLoading(true);
    try {
      const result = await confirmationResult.confirm(verificationCode);
      const uid = result.user.uid;

      const driversRef = collection(firestore, "drivers");
      const driverData = {
        name: formData.name,
        phone: formData.phone,
        companyLicense: formData.companyLicense,
        uid: uid,
        status: 'pending',
        timestamp: serverTimestamp(),
      };

      await addDoc(driversRef, driverData);
      
      localStorage.setItem('driverId', uid);
      toast({
        title: "تم إرسال الطلب بنجاح",
        description: "تم التحقق من رقم هاتفك. طلبك الآن قيد المراجعة من قبل الإدارة.",
      });
      router.push('/driver');
    } catch (error: any) {
      console.error(error);
      toast({ variant: "destructive", title: "خطأ في التحقق", description: "الرمز المدخل غير صحيح" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF3EE] flex flex-col items-center justify-center p-6 text-right" dir="rtl">
      <div ref={recaptchaContainerRef}></div>
      <Card className="w-full max-w-md shadow-xl border-primary/20 bg-white">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto bg-primary/10 p-4 rounded-2xl w-fit mb-2">
            {step === 'form' ? <Truck className="w-10 h-10 text-primary" /> : <ShieldCheck className="w-10 h-10 text-primary" />}
          </div>
          <CardTitle className="text-2xl font-bold">
            {step === 'form' ? "تسجيل سائق جديد" : "تأكيد رقم الهاتف"}
          </CardTitle>
          <CardDescription>
            {step === 'form' 
              ? "انضم إلى أسطول غاز دليفري وابدأ باستقبال الطلبات" 
              : `أدخل الرمز المرسل إلى ${formData.phone}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'form' ? (
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="block text-right">اسم السائق / الشركة</Label>
                <div className="relative">
                  <User className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input 
                    id="name" 
                    placeholder="الاسم الكامل" 
                    className="pr-10 text-right"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="block text-right">رقم الهاتف (أردني)</Label>
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
                <Label htmlFor="license" className="block text-right">رقم رخصة الشركة / السجل التجاري</Label>
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
              <Button type="submit" disabled={loading} className="w-full h-12 text-lg font-bold mt-6">
                {loading ? <Loader2 className="animate-spin ml-2" /> : null}
                إرسال رمز التحقق
              </Button>
              <Link href="/">
                <Button variant="ghost" className="w-full mt-2">رجوع</Button>
              </Link>
            </form>
          ) : (
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp" className="block text-right">رمز التحقق</Label>
                <Input 
                  id="otp" 
                  type="text"
                  maxLength={6}
                  placeholder="000000" 
                  className="text-center text-2xl tracking-[1em] h-14"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full h-12 text-lg font-bold mt-6">
                {loading ? <Loader2 className="animate-spin ml-2" /> : null}
                تأكيد الرمز وتقديم الطلب
              </Button>
              <Button variant="ghost" className="w-full mt-2" onClick={() => setStep('form')}>تعديل البيانات</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}