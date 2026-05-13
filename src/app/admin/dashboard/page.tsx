
"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Check, 
  X, 
  User, 
  Phone, 
  FileText, 
  LayoutDashboard, 
  LogOut, 
  ShoppingCart, 
  MapPin, 
  Clock,
  Truck,
  Bell,
  Users,
  Search,
  Trash2,
  AlertTriangle,
  Loader2,
  Database,
  RotateCcw,
  UserCog
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, errorEmitter } from '@/firebase';
import { collection, query, where, doc, updateDoc, orderBy, getDocs, writeBatch, deleteField } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
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

interface PendingDriver {
  id: string;
  name: string;
  phone: string;
  companyLicense: string;
  status: string;
  uid: string;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  timestamp: any;
  deviceId?: string;
  pin?: string;
}

interface ActiveRequest {
  id: string;
  customerName: string;
  phoneNumber: string;
  cylinders: string;
  lat: number;
  lng: number;
  status: string;
  timestamp: any;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isResetting, setIsResetting] = useState(false);
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);

  useEffect(() => {
    const isAdmin = localStorage.getItem('isAdmin');
    if (isAdmin !== 'true') {
      router.push('/admin');
    }
  }, [router]);

  const driversQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, "drivers"),
      where("status", "==", "pending")
    );
  }, [firestore]);

  const requestsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, "requests"),
      where("status", "==", "pending"),
      orderBy("timestamp", "desc")
    );
  }, [firestore]);

  const customersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, "customers"),
      orderBy("timestamp", "desc")
    );
  }, [firestore]);

  const { data: drivers, loading: loadingDrivers } = useCollection<PendingDriver>(driversQuery);
  const { data: requests, loading: loadingRequests } = useCollection<ActiveRequest>(requestsQuery);
  const { data: customers, loading: loadingCustomers } = useCollection<Customer>(customersQuery);

  const handleUpdateStatus = (id: string, newStatus: 'approved' | 'rejected') => {
    if (!firestore) return;
    
    const driverRef = doc(firestore, "drivers", id);
    updateDoc(driverRef, { status: newStatus })
      .then(() => {
        toast({
          title: newStatus === 'approved' ? "تمت الموافقة" : "تم الرفض",
          description: `تم تحديث حالة السائق بنجاح.`,
        });
      })
      .catch(async (err) => {
        const permissionError = new FirestorePermissionError({
          path: driverRef.path,
          operation: 'update',
          requestResourceData: { status: newStatus },
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  const handleResetUserAccount = async (id: string, name: string) => {
    if (!firestore) return;
    setResettingUserId(id);
    
    try {
      const userRef = doc(firestore, "customers", id);
      await updateDoc(userRef, {
        pin: deleteField(),
        deviceId: deleteField(),
        sessionId: deleteField()
      });
      
      toast({
        title: "تم تصفير الحساب",
        description: `تم تصفير حساب العميل ${name} بنجاح. يمكنه الآن تسجيل الدخول أو إعداد حسابه من جديد.`,
      });
    } catch (error) {
      console.error("Reset account failed:", error);
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "فشل تصفير حساب المستخدم.",
      });
    } finally {
      setResettingUserId(null);
    }
  };

  const handleResetSystem = async () => {
    if (!firestore) return;
    setIsResetting(true);

    try {
      const collectionsToWipe = ['drivers', 'customers', 'requests'];
      
      for (const colName of collectionsToWipe) {
        const snap = await getDocs(collection(firestore, colName));
        const batch = writeBatch(firestore);
        snap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }

      toast({
        title: "تم تصفير النظام بنجاح",
        description: "تم حذف جميع السائقين، العملاء، والطلبات. سيتم إعادة توجيهك الآن.",
      });
      
      localStorage.clear();
      router.push('/');
    } catch (error) {
      console.error("Reset failed:", error);
      toast({
        variant: "destructive",
        title: "فشل التصفير",
        description: "حدث خطأ غير متوقع أثناء محاولة مسح البيانات.",
      });
    } finally {
      setIsResetting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('isAdmin');
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col" dir="rtl">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="bg-primary p-2 rounded-lg">
            <LayoutDashboard className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">لوحة تحكم المشرف</h1>
        </div>
        <div className="flex items-center gap-2">
           <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50 font-bold">
                <Database className="w-4 h-4 ml-2" />
                تصفير النظام بالكامل
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent dir="rtl">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-right">تحذير أمني: تصفير شامل!</AlertDialogTitle>
                <AlertDialogDescription className="text-right">
                  سيؤدي هذا الإجراء إلى حذف جميع السائقين والعملاء وجميع بيانات تسجيل الدخول ورموز PIN والطلبات بشكل نهائي. لن يتمكن أي مستخدم من الدخول بجهازه القديم وسيتعين على الجميع التسجيل من جديد.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-row-reverse gap-2">
                <AlertDialogCancel className="ml-2">إلغاء</AlertDialogCancel>
                <AlertDialogAction onClick={handleResetSystem} className="bg-red-600 hover:bg-red-700">
                  {isResetting ? <Loader2 className="w-4 h-4 animate-spin" /> : "تأكيد الحذف الشامل"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-red-500">
            <LogOut className="w-4 h-4 ml-2" />
            خروج
          </Button>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-primary text-white overflow-hidden relative border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm opacity-80 mb-1">وكالات بانتظار الموافقة</p>
                  <h3 className="text-3xl font-black">{drivers?.length || 0}</h3>
                </div>
                <Truck className="w-10 h-10 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 text-white overflow-hidden relative border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm opacity-80 mb-1">طلبات جرس نشطة</p>
                  <h3 className="text-3xl font-black">{requests?.length || 0}</h3>
                </div>
                <Bell className="w-10 h-10 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-2 text-slate-800 overflow-hidden relative shadow-md">
            <CardContent className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-slate-500 mb-1">إجمالي العملاء المسجلين</p>
                  <h3 className="text-3xl font-black">{customers?.length || 0}</h3>
                </div>
                <Users className="w-10 h-10 text-primary opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="drivers" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 h-14 bg-white border p-1 rounded-xl shadow-sm">
            <TabsTrigger value="drivers" className="rounded-lg font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
              <Truck className="w-4 h-4 ml-2" />
              طلبات الانضمام
            </TabsTrigger>
            <TabsTrigger value="requests" className="rounded-lg font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
              <Bell className="w-4 h-4 ml-2" />
              الأجراس النشطة
            </TabsTrigger>
            <TabsTrigger value="customers" className="rounded-lg font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
              <Users className="w-4 h-4 ml-2" />
              قاعدة العملاء
            </TabsTrigger>
          </TabsList>

          <TabsContent value="drivers" className="space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl font-black text-slate-800">شركات غاز جديدة</h2>
              <Badge variant="outline" className="font-bold">{drivers?.length || 0} طلب</Badge>
            </div>
            {loadingDrivers ? (
              <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>
            ) : drivers?.length === 0 ? (
              <Card className="p-12 text-center border-dashed border-2 bg-slate-50/50">
                <Truck className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <p className="text-muted-foreground font-medium">لا توجد طلبات انضمام معلقة</p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {drivers?.map((driver) => (
                  <Card key={driver.id} className="overflow-hidden border-2 shadow-sm transition-all hover:border-primary/20">
                    <CardContent className="p-6 flex flex-col md:flex-row justify-between items-center gap-4 text-right">
                      <div className="flex gap-2">
                        <Button onClick={() => handleUpdateStatus(driver.id, 'approved')} className="bg-green-600 hover:bg-green-700 font-bold px-8">موافقة</Button>
                        <Button onClick={() => handleUpdateStatus(driver.id, 'rejected')} variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">رفض</Button>
                      </div>
                      <div className="flex-1 space-y-2">
                        <h3 className="text-lg font-black">{driver.name}</h3>
                        <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-1 text-sm text-slate-600">
                          <span className="flex items-center gap-2">{driver.phone} <Phone className="w-4 h-4 text-slate-400" /></span>
                          <span className="flex items-center gap-2">{driver.companyLicense} <FileText className="w-4 h-4 text-slate-400" /></span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="requests" className="space-y-4">
            <h2 className="text-xl font-black text-slate-800 mb-4">أجراس تطلب الغاز الآن</h2>
            {loadingRequests ? (
              <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>
            ) : requests?.length === 0 ? (
              <Card className="p-12 text-center border-dashed border-2 bg-slate-50/50">
                <Bell className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <p className="text-muted-foreground font-medium">الهدوء يعم المكان.. لا طلبات حالياً</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {requests?.map((req) => (
                  <Card key={req.id} className="p-6 text-right border-2 border-primary/10 relative overflow-hidden shadow-sm">
                    <div className="absolute top-0 right-0 w-1.5 h-full bg-primary" />
                    <div className="flex justify-between items-start mb-6">
                      <Badge className="bg-blue-100 text-blue-700 animate-pulse border-none">طلب نشط</Badge>
                      <div className="text-right">
                        <h3 className="font-black text-lg">{req.customerName}</h3>
                        <p className="text-xs text-slate-400 flex items-center justify-end gap-1">
                          {req.timestamp?.toDate()?.toLocaleTimeString('ar-JO')} <Clock className="w-3 h-3" />
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                      <div className="bg-slate-50 p-3 rounded-xl border">
                        <p className="text-[10px] text-slate-400 mb-1">الكمية</p>
                        <p className="font-black text-primary">{req.cylinders} أسطوانات</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border">
                        <p className="text-[10px] text-slate-400 mb-1">رقم الهاتف</p>
                        <p className="font-bold">{req.phoneNumber}</p>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full text-xs gap-2 font-bold" onClick={() => window.open(`https://www.google.com/maps?q=${req.lat},${req.lng}`)}>
                      تحديد الموقع الجغرافي <MapPin className="w-3 h-3" />
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="customers" className="space-y-4">
            <div className="mb-6">
              <h2 className="text-xl font-black text-slate-800">إدارة سجل العملاء</h2>
              <p className="text-sm text-slate-500">متابعة جميع المستهلكين المسجلين في نظام غاز دليفري</p>
            </div>
            
            {loadingCustomers ? (
              <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>
            ) : !customers || customers.length === 0 ? (
              <Card className="p-12 text-center border-dashed border-2 bg-slate-50/50">
                <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <p className="text-muted-foreground font-medium">لا توجد سجلات لعملاء مسجلين بعد</p>
              </Card>
            ) : (
              <div className="bg-white rounded-2xl border-2 shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead>
                      <tr className="bg-slate-50 border-b">
                        <th className="px-6 py-4 font-bold text-sm text-slate-600">اسم العميل</th>
                        <th className="px-6 py-4 font-bold text-sm text-slate-600">رقم الهاتف</th>
                        <th className="px-6 py-4 font-bold text-sm text-slate-600">تاريخ الانضمام</th>
                        <th className="px-6 py-4 font-bold text-sm text-slate-600">الحالة</th>
                        <th className="px-6 py-4 font-bold text-sm text-slate-600">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {customers.map((customer) => (
                        <tr key={customer.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3 flex-row-reverse justify-end">
                              <div className="bg-slate-100 p-2 rounded-full"><User className="w-4 h-4 text-slate-500" /></div>
                              <span className="font-bold text-slate-800">{customer.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-600 font-bold">{customer.phone}</td>
                          <td className="px-6 py-4 text-slate-400 text-xs">
                            {customer.timestamp?.toDate()?.toLocaleDateString('ar-JO', { year: 'numeric', month: 'long', day: 'numeric' })}
                          </td>
                          <td className="px-6 py-4">
                            <Badge className="bg-green-50 text-green-600 border-green-100 hover:bg-green-100 transition-colors">مستخدم نشط</Badge>
                          </td>
                          <td className="px-6 py-4">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 font-bold">
                                  <RotateCcw className="w-4 h-4 ml-2" />
                                  تصفير هذا المستخدم
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent dir="rtl">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-right">تصفير حساب العميل</AlertDialogTitle>
                                  <AlertDialogDescription className="text-right">
                                    هل أنت متأكد من تصفير حساب {customer.name}؟ سيتم حذف الرمز السري ومعلومات الجهاز بشكل كامل لهذا المستخدم فقط، مما يسمح له بإعادة إعداد حسابه من جديد.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="flex-row-reverse gap-2">
                                  <AlertDialogCancel className="ml-2">إلغاء</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleResetUserAccount(customer.id, customer.name)} className="bg-amber-600 hover:bg-amber-700">
                                    {resettingUserId === customer.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "تأكيد تصفير المستخدم"}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
