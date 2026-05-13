
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { User, Truck, Flame, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function Home() {
  const heroImage = PlaceHolderImages.find(img => img.id === 'landing-hero');

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-background relative overflow-hidden" dir="rtl">
      <div className="absolute top-6 left-6 z-20">
        <Link href="/admin">
          <Button variant="outline" className="gap-2 bg-white/50 backdrop-blur hover:bg-white border-primary/20 shadow-sm">
            <ShieldCheck className="w-4 h-4 text-primary" />
            لوحة الإدارة
          </Button>
        </Link>
      </div>

      <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-primary/10 to-transparent z-0" />
      
      <div className="z-10 w-full max-w-4xl text-center space-y-8">
        <div className="flex flex-col items-center space-y-4">
          <div className="bg-primary p-4 rounded-2xl shadow-xl shadow-primary/20 transform rotate-3 hover:rotate-0 transition-transform">
            <Flame className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-foreground">غاز دليفري</h1>
          <p className="text-xl text-muted-foreground font-medium">أسرع وسيلة لطلب اسطوانة الغاز في منطقتك</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
          <Link href="/customer" className="group">
            <Card className="h-full border-2 border-transparent hover:border-primary transition-all duration-300 shadow-lg hover:shadow-primary/10 bg-white/80 backdrop-blur">
              <CardHeader className="text-center">
                <div className="mx-auto bg-primary/10 p-5 rounded-full w-fit group-hover:scale-110 transition-transform duration-300">
                  <User className="w-10 h-10 text-primary" />
                </div>
                <CardTitle className="text-2xl mt-4">أنا عميل</CardTitle>
                <CardDescription className="text-base">أريد طلب اسطوانة غاز لمنزلي</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full text-lg h-12" variant="default">دخول كعميل</Button>
              </CardContent>
            </Card>
          </Link>

          <Link href="/driver/login" className="group">
            <Card className="h-full border-2 border-transparent hover:border-primary transition-all duration-300 shadow-lg hover:shadow-primary/10 bg-white/80 backdrop-blur">
              <CardHeader className="text-center">
                <div className="mx-auto bg-secondary p-5 rounded-full w-fit group-hover:scale-110 transition-transform duration-300">
                  <Truck className="w-10 h-10 text-primary" />
                </div>
                <CardTitle className="text-2xl mt-4">أنا سائق / شركة</CardTitle>
                <CardDescription className="text-base">تسجيل الدخول أو الانضمام للشبكة</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full text-lg h-12 bg-secondary text-primary hover:bg-secondary/80" variant="secondary">دخول السائقين</Button>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="mt-12 text-muted-foreground text-sm">
          تطبيق غاز دليفري - يخدم جميع مناطق المملكة الأردنية الهاشمية 🇯🇴
        </div>
      </div>

      {heroImage && (
        <div className="absolute bottom-0 opacity-10 pointer-events-none w-full h-1/3">
          <Image 
            src={heroImage.imageUrl} 
            alt={heroImage.description} 
            fill 
            className="object-cover" 
          />
        </div>
      )}
    </main>
  );
}
