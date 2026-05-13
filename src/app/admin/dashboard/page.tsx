"use client";

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  LayoutDashboard, 
  LogOut, 
  Truck, 
  Bell, 
  Users, 
  RotateCcw,
  Loader2,
  MapPin
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, updateDoc, orderBy, deleteField } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function AdminDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);

  const driversQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "drivers"), where("status", "==", "pending"));
  }, [firestore]);

  const requestsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "requests"), where("status", "==", "pending"), orderBy("timestamp", "desc"));
  }, [firestore]);

  const customersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "customers"), orderBy("timestamp", "desc"));
  }, [firestore]);

  const { data: drivers } = useCollection<any>(driversQuery);
  const { data: requests } = useCollection<any>(requestsQuery);
  const { data: customers } = useCollection<any>(customersQuery);

  const handleResetUserAccount = async (id: string, name: string) => {
    if (!firestore) return;
    setResettingUserId(id);
    try {
      await updateDoc(doc(firestore, "customers", id), {
        pin: deleteField(),
        deviceId: deleteField(),
        sessionId: deleteField()
      });
      toast({ title: "تم التصفير", description: `تم تصفير حساب ${name} بنجاح.` });
    } catch (e) {
      toast({ variant: "destructive", title: "خطأ في التصفير" });
    } finally {
      setResettingUserId(null);
    }
  };

  const handleUpdateStatus = (id: string, status: 'approved' | 'rejected') => {
    if (!firestore) return;
    updateDoc(doc(firestore, "drivers", id), { status })
      .then(() => toast({ title: "تم التحديث" }));
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col" dir="rtl">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="bg-primary p-2 rounded-lg text-white"><LayoutDashboard className="w-5 h-5" /></div>
          <h1 className="text-xl font-bold">لوحة تحكم المشرف</h1>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleRefresh} className="text-slate-400 hover:text-primary"><RotateCcw className="w-4 h-4" /></Button>
          <Button variant="ghost" onClick={() => router.push('/')} className="text-red-500 font-bold"><LogOut className="w-4 h-4 ml-2" /> خروج</Button>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-primary text-white p-6 shadow-lg"><Truck className="mb-2 opacity-50" /> <p className="text-sm">وكالات معلقة</p> <h3 className="text-3xl font-black">{drivers?.length || 0}</h3></Card>
          <Card className="bg-slate-800 text-white p-6 shadow-lg"><Bell className="mb-2 opacity-50" /> <p className="text-sm">أجراس نشطة</p> <h3 className="text-3xl font-black">{requests?.length || 0}</h3></Card>
          <Card className="bg-white p-6 border-2 shadow-md"><Users className="mb-2 text-primary opacity-50" /> <p className="text-sm">إجمالي العملاء</p> <h3 className="text-3xl font-black">{customers?.length || 0}</h3></Card>
        </div>

        <Tabs defaultValue="drivers" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white border p-1 rounded-xl h-14">
            <TabsTrigger value="drivers" className="font-bold">طلبات الانضمام</TabsTrigger>
            <TabsTrigger value="requests" className="font-bold">الأجراس</TabsTrigger>
            <TabsTrigger value="customers" className="font-bold">العملاء</TabsTrigger>
          </TabsList>

          <TabsContent value="drivers" className="grid gap-4">
            {drivers?.map((d: any) => (
              <Card key={d.id} className="p-4 flex justify-between items-center flex-row-reverse border-2">
                <div className="text-right">
                  <h3 className="font-black text-lg">{d.name}</h3>
                  <p className="text-xs text-muted-foreground">{d.phone} | {d.companyLicense}</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => handleUpdateStatus(d.id, 'approved')} className="bg-green-600 font-bold">موافقة</Button>
                  <Button onClick={() => handleUpdateStatus(d.id, 'rejected')} variant="outline" className="text-red-600 font-bold">رفض</Button>
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="customers">
            <div className="bg-white rounded-xl border shadow overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="p-4 font-bold text-sm">الاسم</th>
                    <th className="p-4 font-bold text-sm">الهاتف</th>
                    <th className="p-4 font-bold text-sm">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {customers?.map((c: any) => (
                    <tr key={c.id}>
                      <td className="p-4 font-bold">{c.name}</td>
                      <td className="p-4">{c.phone}</td>
                      <td className="p-4">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-amber-600 font-bold">
                              {resettingUserId === c.id ? <Loader2 className="animate-spin" /> : <RotateCcw className="w-4 h-4 ml-2" />}
                              تصفير هذا المستخدم
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent dir="rtl">
                            <AlertDialogHeader>
                              <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                              <AlertDialogDescription>سيتم مسح بيانات الـ PIN والجهاز لهذا المستخدم، وسيتعين عليه التسجيل من جديد باستخدام هاتفه.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>إلغاء</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleResetUserAccount(c.id, c.name)} className="bg-amber-600">تأكيد التصفير</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="requests" className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {requests?.map((r: any) => (
              <Card key={r.id} className="p-5 text-right border-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1 h-full bg-primary" />
                <h3 className="font-black text-lg mb-2">{r.customerName}</h3>
                <div className="flex justify-between text-sm mb-4">
                  <Badge variant="outline">{r.cylinders} أسطوانات</Badge>
                  <span className="font-bold">{r.phoneNumber}</span>
                </div>
                <Button variant="outline" className="w-full text-xs font-bold" onClick={() => window.open(`https://www.google.com/maps?q=${r.lat},${r.lng}`)}>
                  <MapPin className="w-3 h-3 ml-2" /> الموقع الجغرافي
                </Button>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}