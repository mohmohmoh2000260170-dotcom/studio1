
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, User, Phone, FileText, LayoutDashboard, LogOut } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface PendingDriver {
  id: string;
  name: string;
  phone: string;
  companyLicense: string;
  status: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const [drivers, setDrivers] = useState<PendingDriver[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const isAdmin = localStorage.getItem('isAdmin');
    if (isAdmin !== 'true') {
      router.push('/admin');
      return;
    }

    const q = query(
      collection(db, "drivers"),
      where("status", "==", "pending")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const docs: PendingDriver[] = [];
      querySnapshot.forEach((doc) => {
        docs.push({ id: doc.id, ...doc.data() } as PendingDriver);
      });
      setDrivers(docs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleUpdateStatus = async (id: string, newStatus: 'approved' | 'rejected') => {
    try {
      await updateDoc(doc(db, "drivers", id), {
        status: newStatus
      });
      toast({
        title: newStatus === 'approved' ? "تمت الموافقة" : "تم الرفض",
        description: `تم تحديث حالة السائق بنجاح.`,
      });
    } catch (error) {
      console.error("Error updating driver:", error);
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "لم نتمكن من تحديث الحالة.",
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('isAdmin');
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="bg-primary p-2 rounded-lg">
            <LayoutDashboard className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">إدارة السائقين</h1>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-red-500">
          <LogOut className="w-4 h-4 ml-2" />
          خروج
        </Button>
      </header>

      <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-800">طلبات الانضمام المعلقة</h2>
          <p className="text-muted-foreground mt-1">قم بمراجعة بيانات الشركات والسائقين قبل تفعيل الحسابات</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : drivers.length === 0 ? (
          <Card className="border-dashed border-2 py-20 text-center">
            <CardContent className="space-y-4">
              <div className="bg-slate-100 p-4 rounded-full w-fit mx-auto">
                <Check className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-muted-foreground font-medium">لا يوجد طلبات معلقة حالياً</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {drivers.map((driver) => (
              <Card key={driver.id} className="overflow-hidden border-2 hover:border-primary/20 transition-all shadow-sm">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row">
                    <div className="flex-1 p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-primary/10 p-2 rounded-full">
                            <User className="w-5 h-5 text-primary" />
                          </div>
                          <h3 className="text-lg font-bold">{driver.name}</h3>
                        </div>
                        <Badge variant="secondary" className="bg-amber-100 text-amber-700">قيد الانتظار</Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">رقم الهاتف:</span> {driver.phone}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">الرخصة:</span> {driver.companyLicense}
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-slate-50 border-t md:border-t-0 md:border-r p-4 flex md:flex-col gap-2 justify-center min-w-[160px]">
                      <Button 
                        onClick={() => handleUpdateStatus(driver.id, 'approved')}
                        className="flex-1 bg-green-600 hover:bg-green-700 gap-2 font-bold"
                      >
                        <Check className="w-4 h-4" />
                        موافقة
                      </Button>
                      <Button 
                        onClick={() => handleUpdateStatus(driver.id, 'rejected')}
                        variant="outline" 
                        className="flex-1 text-red-600 border-red-200 hover:bg-red-50 gap-2 font-bold"
                      >
                        <X className="w-4 h-4" />
                        رفض
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
