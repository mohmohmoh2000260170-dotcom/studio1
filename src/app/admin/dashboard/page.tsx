"use client";

import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Bell
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, errorEmitter } from '@/firebase';
import { collection, query, where, doc, updateDoc, orderBy } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';

interface PendingDriver {
  id: string;
  name: string;
  phone: string;
  companyLicense: string;
  status: string;
  uid: string;
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

  const { data: drivers, loading: loadingDrivers } = useCollection<PendingDriver>(driversQuery);
  const { data: requests, loading: loadingRequests } = useCollection<ActiveRequest>(requestsQuery);

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
        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-red-500">
          <LogOut className="w-4 h-4 ml-2" />
          خروج
        </Button>
      </header>

      <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
        <Tabs defaultValue="drivers" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 h-12 bg-white border">
            <TabsTrigger value="drivers" className="text-base font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
              <Truck className="w-4 h-4 ml-2" />
              طلبات الشركات ({(drivers || []).length})
            </TabsTrigger>
            <TabsTrigger value="requests" className="text-base font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
              <Bell className="w-4 h-4 ml-2" />
              طلبات العملاء الحالية ({(requests || []).length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="drivers" className="space-y-4">
            <div className="mb-4 text-right">
              <h2 className="text-2xl font-bold text-slate-800">طلبات الانضمام المعلقة</h2>
              <p className="text-muted-foreground mt-1">قم بمراجعة بيانات الشركات والسائقين قبل تفعيل الحسابات</p>
            </div>

            {loadingDrivers ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : !drivers || drivers.length === 0 ? (
              <Card className="border-dashed border-2 py-20 text-center">
                <CardContent className="space-y-4">
                  <div className="bg-slate-100 p-4 rounded-full w-fit mx-auto">
                    <Check className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-muted-foreground font-medium">لا يوجد طلبات انضمام معلقة</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {drivers.map((driver) => (
                  <Card key={driver.id} className="overflow-hidden border-2 hover:border-primary/20 transition-all shadow-sm">
                    <CardContent className="p-0 text-right">
                      <div className="flex flex-col md:flex-row-reverse">
                        <div className="flex-1 p-6 space-y-4">
                          <div className="flex items-center justify-between flex-row-reverse">
                            <div className="flex items-center gap-3 flex-row-reverse">
                              <div className="bg-primary/10 p-2 rounded-full">
                                <User className="w-5 h-5 text-primary" />
                              </div>
                              <h3 className="text-lg font-bold">{driver.name}</h3>
                            </div>
                            <Badge variant="secondary" className="bg-amber-100 text-amber-700">قيد المراجعة</Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center gap-2 text-sm text-slate-600 justify-end">
                              {driver.phone} <span className="font-medium">:رقم الهاتف</span>
                              <Phone className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-600 justify-end">
                              {driver.companyLicense} <span className="font-medium">:الرخصة</span>
                              <FileText className="w-4 h-4 text-muted-foreground" />
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-slate-50 border-t md:border-t-0 md:border-l p-4 flex md:flex-col gap-2 justify-center min-w-[160px]">
                          <Button 
                            onClick={() => handleUpdateStatus(driver.id, 'approved')}
                            className="flex-1 bg-green-600 hover:bg-green-700 gap-2 font-bold"
                          >
                            <Check className="w-4 h-4" />
                            تفعيل الحساب
                          </Button>
                          <Button 
                            onClick={() => handleUpdateStatus(driver.id, 'rejected')}
                            variant="outline" 
                            className="flex-1 text-red-600 border-red-200 hover:bg-red-50 gap-2 font-bold"
                          >
                            <X className="w-4 h-4" />
                            رفض الطلب
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="requests" className="space-y-4">
            <div className="mb-4 text-right">
              <h2 className="text-2xl font-bold text-slate-800">طلبات التوصيل النشطة</h2>
              <p className="text-muted-foreground mt-1">إجمالي الطلبات التي أرسلها العملاء حالياً</p>
            </div>

            {loadingRequests ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : !requests || requests.length === 0 ? (
              <Card className="border-dashed border-2 py-20 text-center">
                <CardContent className="space-y-4">
                  <div className="bg-slate-100 p-4 rounded-full w-fit mx-auto">
                    <Bell className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-muted-foreground font-medium">لا توجد طلبات توصيل نشطة</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {requests.map((req) => (
                  <Card key={req.id} className="border-2 hover:border-primary/20 transition-all shadow-sm text-right">
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-center justify-between flex-row-reverse">
                        <div className="flex items-center gap-3 flex-row-reverse">
                          <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                            <User className="w-5 h-5" />
                          </div>
                          <h3 className="text-lg font-bold">{req.customerName}</h3>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <Clock className="w-3 h-3" />
                          {req.timestamp?.toDate()?.toLocaleTimeString('ar-JO', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-2 text-sm justify-end">
                          {req.cylinders} <span className="font-medium">:عدد الأسطوانات</span>
                          <ShoppingCart className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex items-center gap-2 text-sm justify-end">
                          {req.phoneNumber} <span className="font-medium">:رقم الهاتف</span>
                          <Phone className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex items-center gap-2 text-sm text-blue-600 justify-end">
                          GPS: {req.lat.toFixed(4)}, {req.lng.toFixed(4)}
                          <MapPin className="w-4 h-4" />
                        </div>
                      </div>

                      <Button 
                        variant="secondary"
                        className="w-full text-xs h-8"
                        onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${req.lat},${req.lng}`, '_blank')}
                      >
                        عرض موقع العميل على الخريطة
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}