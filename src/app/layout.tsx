import type {Metadata} from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'غاز دليفري - توصيل اسطوانات الغاز',
  description: 'تطبيق توصيل اسطوانات الغاز الأسرع في الأردن',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased selection:bg-primary/30">
        {children}
      </body>
    </html>
  );
}