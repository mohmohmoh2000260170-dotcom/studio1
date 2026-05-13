
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Truck, FileText, Phone, User } from 'lucide-react';
import { useFirestore, errorEmitter } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import Link from 'next/link';

export default function DriverRegistration() {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    companyLicense: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.companyLicense) {
      toast({ variant: "destructive", title: "خطأ", description: "يرجى تعبئة جميع الحقول" });
      return;
    }

    if (!firestore) return;

    setLoading(true);
    const driversRef = collection(firestore, "drivers");
    const driverData = {
      ...formData,
      status: 'pending',
      timestamp: serverTimestamp(),
    };

    // Use the non-blocking pattern for Firestore mutations
    addDoc(driversRef, driverData)
      .then((docRef) => {
        localStorage.setItem('driverId', docRef.id);
        toast({
          title: "تم إرسال الطلب بنجاح",
          description: "طلبك قيد المراجعة من قبل الإدارة. سيتم تفعيل حسابك قريباً.",
        });
        router.push('/driver');
      })
      .catch(async (err) => {
        const permissionError = new FirestorePermissionError({
          path: 'drivers',
          operation: 'create',
          requestResourceData: driverData,
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <div className="min-h-screen bg-[#FBF3EE] flex flex-col items-center justify-center p-6">
      <Card className="w-full max-w-md shadow-xl border-primary/20 bg-white">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto bg-primary/10 p-4 rounded-2xl w-fit mb-2">
            <Truck className="w-10 h-10 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">تسجيل سائق جديد</CardTitle>
          <CardDescription>انضم إلى أسطول غاز دليفري وابدأ باستقبال الطلبات</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">اسم السائق / الشركة</Label>
              <div className="relative">
                <User className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input 
                  id="name" 
                  placeholder="الاسم الكامل" 
                  className="pr-10"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">رقم الهاتف</Label>
              <div className="relative">
                <Phone className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input 
                  id="phone" 
                  type="tel"
                  placeholder="07XXXXXXXX" 
                  className="pr-10"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="license">رقم رخصة الشركة / السجل التجاري</Label>
              <div className="relative">
                <FileText className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input 
                  id="license" 
                  placeholder="أدخل رقم الرخصة" 
                  className="pr-10"
                  value={formData.companyLicense}
                  onChange={(e) => setFormData({...formData, companyLicense: e.target.value})}
                />
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full h-12 text-lg font-bold mt-6">
              {loading ? "جاري الإرسال..." : "تقديم طلب انضمام"}
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
