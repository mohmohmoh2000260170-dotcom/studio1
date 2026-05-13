"use client";

import React, { useEffect } from 'react';
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
  Users
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

interface Customer {
  id: string;
  name: string;
  phone: string;
  timestamp: any;
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
          <TabsList className="grid w-full grid-cols-3 h-12 bg-white border">
            <TabsTrigger value="drivers" className="text-xs md:text-sm font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
              <Truck className="w-4 h-4 ml-1" />
              الشركات ({(drivers || []).length})
            </TabsTrigger>
            <TabsTrigger value="requests" className="text-xs md:text-sm font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
              <Bell className="w-4 h-4 ml-1" />
              الطلبات ({(requests || []).length})
            </TabsTrigger>
            <TabsTrigger value="customers" className="text-xs md:text-sm font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
              <Users className="w-4 h-4 ml-1" />
              العملاء ({(customers || []).length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="drivers" className="space-y-4">
            <div className="mb-4 text-right">
              <h2 className="text-2xl font-bold text-slate-800">طلبات الانضمام المعلقة</h2>
            </div>
            {loadingDrivers ? (
              <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>
            ) : drivers?.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">لا يوجد طلبات معلقة</div>
            ) : (
              <div className="grid gap-4">
                {drivers?.map((driver) => (
                  <Card key={driver.id} className="overflow-hidden border-2 shadow-sm">
                    <CardContent className="p-6 flex flex-col md:flex-row-reverse justify-between items-center gap-4 text-right">
                      <div className="flex-1 space-y-2">
                        <h3 className="text-lg font-bold">{driver.name}</h3>
                        <p className="text-sm text-slate-600 flex items-center justify-end gap-2">{driver.phone} <Phone className="w-4 h-4" /></p>
                        <p className="text-sm text-slate-600 flex items-center justify-end gap-2">{driver.companyLicense} <FileText className="w-4 h-4" /></p>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => handleUpdateStatus(driver.id, 'approved')} className="bg-green-600 hover:bg-green-700">قبول</Button>
                        <Button onClick={() => handleUpdateStatus(driver.id, 'rejected')} variant="outline" className="text-red-600 border-red-200">رفض</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="requests" className="space-y-4">
            <div className="mb-4 text-right">
              <h2 className="text-2xl font-bold text-slate-800">الطلبات النشطة</h2>
            </div>
            {loadingRequests ? (
              <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>
            ) : requests?.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">لا توجد طلبات نشطة</div>
            ) : (
              <div className="grid gap-4">
                {requests?.map((req) => (
                  <Card key={req.id} className="p-6 text-right">
                    <div className="flex justify-between items-start mb-4">
                      <Badge className="bg-blue-100 text-blue-700">قيد الانتظار</Badge>
                      <h3 className="font-bold text-lg">{req.customerName}</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
                      <div>الكمية: {req.cylinders}</div>
                      <div>الهاتف: {req.phoneNumber}</div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="customers" className="space-y-4">
            <div className="mb-4 text-right">
              <h2 className="text-2xl font-bold text-slate-800">إدارة العملاء</h2>
              <p className="text-muted-foreground">قائمة بجميع العملاء المسجلين في النظام</p>
            </div>
            {loadingCustomers ? (
              <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>
            ) : !customers || customers.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">لا يوجد عملاء مسجلون حالياً</div>
            ) : (
              <div className="grid gap-4">
                {customers.map((customer) => (
                  <Card key={customer.id} className="p-6 text-right">
                    <div className="flex items-center justify-between flex-row-reverse">
                      <div className="flex items-center gap-3 flex-row-reverse">
                        <div className="bg-slate-100 p-2 rounded-full"><User className="w-5 h-5 text-slate-600" /></div>
                        <div>
                          <h3 className="font-bold">{customer.name}</h3>
                          <p className="text-xs text-muted-foreground">{customer.phone}</p>
                        </div>
                      </div>
                      <div className="text-xs text-slate-400">
                        {customer.timestamp?.toDate()?.toLocaleDateString('ar-JO')}
                      </div>
                    </div>
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

const Loader2 = ({ className }: { className?: string }) => (
  <div className={`animate-spin rounded-full h-8 w-8 border-b-2 border-primary ${className}`}></div>
);