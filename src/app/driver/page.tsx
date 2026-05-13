"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Truck, MapPin, Phone, MessageSquare, Flame, CheckCircle2, XCircle, BellRing } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function DriverDashboard() {
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(false);
  const [activeRequest, setActiveRequest] = useState<{
    id: string;
    customer: string;
    address: string;
    summary: string;
  } | null>(null);

  const toggleOnline = (val: boolean) => {
    setIsOnline(val);
    toast({
      title: val ? "أنت الآن متاح" : "أنت الآن غير متاح",
      description: val ? "يمكنك استقبال طلبات الغاز الآن." : "لن تصلك طلبات جديدة.",
    });

    // Simulate a request appearing if they go online
    if (val) {
      setTimeout(() => {
        setActiveRequest({
          id: 'req123',
          customer: 'خالد العميل',
          address: 'شارع المدينة المنورة، عمان',
          summary: 'العميل يطلب اسطوانة واحدة، الطابق الثالث. يحتاج توصيل سريع.'
        });
      }, 3000);
    }
  };

  const handleAccept = () => {
    toast({
      title: "تم قبول الطلب",
      description: "توجه إلى موقع العميل الآن.",
    });
  };

  const handleReject = () => {
    setActiveRequest(null);
    toast({
      variant: "destructive",
      title: "تم رفض الطلب",
      description: "سيتم تحويل الطلب لسائق آخر.",
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-primary p-2 rounded-lg">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-headline font-bold text-primary">لوحة السائق</h1>
        </div>
        <div className="flex items-center gap-3 bg-secondary/50 px-3 py-1 rounded-full border">
          <span className={`text-sm font-bold ${isOnline ? 'text-green-600' : 'text-slate-500'}`}>
            {isOnline ? 'متاح' : 'غير متاح'}
          </span>
          <Switch checked={isOnline} onCheckedChange={toggleOnline} />
        </div>
      </header>

      <main className="flex-1 p-6 space-y-6">
        {/* Statistics Grid */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-white/50 backdrop-blur">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">طلبات اليوم</p>
              <p className="text-2xl font-bold text-primary">12</p>
            </CardContent>
          </Card>
          <Card className="bg-white/50 backdrop-blur">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">التقييم</p>
              <p className="text-2xl font-bold text-primary">4.9 ★</p>
            </CardContent>
          </Card>
        </div>

        {/* Request Area */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <BellRing className="w-5 h-5 text-primary" />
            طلبات التوصيل
          </h2>

          {!activeRequest ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-50">
              <Truck className="w-16 h-16 text-muted-foreground" />
              <p className="text-muted-foreground font-medium">
                {isOnline ? 'بانتظار طلبات جديدة...' : 'قم بتفعيل وضع "متاح" لاستقبال الطلبات'}
              </p>
            </div>
          ) : (
            <Card className="border-2 border-primary shadow-xl bg-white animate-bounce-subtle">
              <CardHeader className="bg-primary/5 pb-2">
                <div className="flex justify-between items-center">
                  <Badge variant="secondary" className="bg-primary text-white">طلب جديد!</Badge>
                  <span className="text-xs font-bold text-primary">يبعد 2.5 كم</span>
                </div>
                <CardTitle className="text-xl mt-2">{activeRequest.customer}</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-primary mt-1" />
                  <p className="text-sm font-medium">{activeRequest.address}</p>
                </div>
                
                <div className="bg-secondary/30 p-4 rounded-lg border border-primary/10">
                  <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-bold">ملخص الطلب (GenAI)</p>
                  <p className="text-sm italic text-foreground">{activeRequest.summary}</p>
                </div>

                <div className="flex gap-4 pt-2">
                  <Button onClick={handleAccept} className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    قبول
                  </Button>
                  <Button onClick={handleReject} variant="outline" className="flex-1 h-12 border-accent text-accent hover:bg-accent/5 gap-2">
                    <XCircle className="w-5 h-5" />
                    رفض
                  </Button>
                </div>

                <div className="flex gap-2 pt-2 border-t">
                  <Button variant="ghost" className="flex-1 gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    اتصال
                  </Button>
                  <Button variant="ghost" className="flex-1 gap-2 text-muted-foreground">
                    <MessageSquare className="w-4 h-4" />
                    محادثة
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}