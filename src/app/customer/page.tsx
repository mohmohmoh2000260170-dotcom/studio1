"use client";

import React, { useState } from 'react';
import { GoogleMapsView } from '@/components/google-maps-view';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, Phone, MessageSquare, Flame, Navigation, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { driverRequestSummaryGeneration } from '@/ai/flows/driver-request-summary-generation';

const MOCK_DRIVERS = [
  { id: 'd1', name: 'أحمد السائق', lat: 31.95, lng: 35.93, type: 'driver' as const, isOnline: true },
  { id: 'd2', name: 'محمد النقل', lat: 31.94, lng: 35.91, type: 'driver' as const, isOnline: true },
  { id: 'd3', name: 'توصيل السريع', lat: 31.96, lng: 35.94, type: 'driver' as const, isOnline: true },
];

export default function CustomerDashboard() {
  const { toast } = useToast();
  const [isRinging, setIsRinging] = useState(false);
  const [assignedDriver, setAssignedDriver] = useState<typeof MOCK_DRIVERS[0] | null>(null);

  const handleRingBell = async () => {
    setIsRinging(true);
    
    // Simulate AI summary generation for dispatch
    try {
      const summary = await driverRequestSummaryGeneration({
        customerName: "خالد العميل",
        customerAddress: "شارع المدينة المنورة، عمان",
        latitude: 31.945,
        longitude: 35.928,
        deliveryNotes: "الطابق الثالث، شقة 5"
      });

      console.log("Dispatch Summary:", summary);

      // Simulate finding nearest driver
      setTimeout(() => {
        setIsRinging(false);
        setAssignedDriver(MOCK_DRIVERS[0]);
        toast({
          title: "تم رن الجرس! 🔔",
          description: "تم إرسال طلبك لأقرب سائق متاح. سيصلك السائق قريباً.",
        });
      }, 2000);
    } catch (error) {
      setIsRinging(false);
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "حدث خطأ أثناء إرسال الطلب.",
      });
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm z-20">
        <div className="flex items-center gap-2">
          <div className="bg-primary p-2 rounded-lg">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-headline font-bold text-primary">غاز دليفري</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-left">
            <p className="text-xs text-muted-foreground">مرحباً</p>
            <p className="text-sm font-bold">خالد</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-secondary border-2 border-primary/20" />
        </div>
      </header>

      {/* Main Map View */}
      <div className="flex-1 relative">
        <GoogleMapsView markers={[
          ...MOCK_DRIVERS,
          { id: 'c1', name: 'موقعي', lat: 31.945, lng: 35.928, type: 'customer' as const }
        ]} />

        {/* Floating Action Cards */}
        <div className="absolute bottom-0 left-0 right-0 p-4 space-y-4">
          {!assignedDriver ? (
            <Card className="shadow-2xl border-primary/20 bg-white/95 backdrop-blur">
              <CardContent className="p-6 text-center space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-bold">هل تحتاج أسطوانة غاز؟</h3>
                  <p className="text-sm text-muted-foreground">اضغط على الجرس لتنبيه السائقين القريبين منك</p>
                </div>
                <Button 
                  onClick={handleRingBell} 
                  disabled={isRinging}
                  className="w-full h-16 text-xl gap-3 rounded-2xl shadow-lg shadow-primary/30 transition-all hover:scale-[1.02]"
                >
                  {isRinging ? <Loader2 className="animate-spin" /> : <Bell className="w-6 h-6" />}
                  رن الجرس 🔔
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-2xl border-primary bg-white/95 backdrop-blur animate-in slide-in-from-bottom-5">
              <CardHeader className="pb-2 border-b">
                <div className="flex justify-between items-center">
                  <Badge className="bg-green-500">جاري التوصيل</Badge>
                  <span className="text-xs text-muted-foreground">يبعد 500 متر</span>
                </div>
              </CardHeader>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center">
                    <Truck className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-bold">{assignedDriver.name}</h4>
                    <p className="text-xs text-muted-foreground">تويوتا هيلوكس - أبيض</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="icon" variant="outline" className="rounded-full border-primary text-primary hover:bg-primary/10">
                    <Phone className="w-5 h-5" />
                  </Button>
                  <Button size="icon" variant="outline" className="rounded-full border-primary text-primary hover:bg-primary/10">
                    <MessageSquare className="w-5 h-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}