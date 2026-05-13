
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export default function AdminLogin() {
  const router = useRouter();
  const { toast } = useToast();
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Simplified admin check for the prototype
    if (password === 'admin123') {
      localStorage.setItem('isAdmin', 'true');
      router.push('/admin/dashboard');
    } else {
      toast({
        variant: "destructive",
        title: "خطأ في الدخول",
        description: "كلمة المرور غير صحيحة",
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <Card className="w-full max-w-md shadow-2xl border-primary/20 bg-white">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto bg-primary/10 p-4 rounded-2xl w-fit mb-2">
            <ShieldCheck className="w-10 h-10 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">لوحة الإدارة</CardTitle>
          <CardDescription>الرجاء إدخال كلمة المرور السرية للمتابعة</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <div className="relative">
                <Lock className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input 
                  id="password" 
                  type="password"
                  placeholder="••••••••" 
                  className="pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            <Button type="submit" className="w-full h-12 text-lg font-bold mt-6">
              دخول المشرف
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
