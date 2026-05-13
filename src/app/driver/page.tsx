
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Flame, MapPin, Clock, ArrowRight, Truck } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import Link from 'next/link';

interface GasRequest {
  id: string;
  customerName: string;
  lat: number;
  lng: number;
  status: string;
  timestamp: any;
}

export default function DriverDashboard() {
  const [requests, setRequests] = useState<GasRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "requests"),
      where("status", "==", "pending"),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const reqs: GasRequest[] = [];
      querySnapshot.forEach((doc) => {
        reqs.push({ id: doc.id, ...doc.data() } as GasRequest);
      });
      setRequests(reqs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-[#FBF3EE] flex flex-col">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="bg-primary p-2 rounded-lg">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold text-primary">طلبات التوصيل</h1>
          </div>
        </div>
        <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 px-3">
          متصل
        </Badge>
      </header>

      <main className="flex-1 p-6 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-4 text-sm">جاري تحميل الطلبات...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-50">
            <Truck className="w-16 h-16 text-muted-foreground" />
            <p className="text-muted-foreground font-medium">لا يوجد طلبات نشطة حالياً</p>
          </div>
        ) : (
          requests.map((req) => (
            <Card key={req.id} className="border-2 border-primary/10 shadow-md bg-white hover:border-primary/30 transition-all">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{req.customerName}</CardTitle>
                  <p className="text-xs text-muted-foreground">طلب جديد الآن</p>
                </div>
                <Badge className="bg-primary">قيد الانتظار</Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-primary mt-0.5" />
                  <p>الإحداثيات: {req.lat.toFixed(4)}, {req.lng.toFixed(4)}</p>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <p>{req.timestamp?.toDate().toLocaleTimeString('ar-JO', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <Button className="w-full h-12 text-base font-bold bg-primary hover:bg-primary/90">
                  عرض على الخريطة
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </main>
    </div>
  );
}
