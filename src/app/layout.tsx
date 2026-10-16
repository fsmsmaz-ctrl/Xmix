import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  metadataBase: new URL("https://xmix.om"),
  title: "Xmix — سوق المنتجات والخدمات الزراعية | Xmix Agri Marketplace",
  description:
    "Xmix السوق الإلكتروني المتخصص بالمنتجات والخدمات الزراعية في سلطنة عُمان — بذور وشتلات، محاصيل طازجة، أسمدة وتربة، أنظمة ري، أدوات ومعدات، وخدمات زراعية بقيادة قت عمان. Oman's agri products & services marketplace by Qat Oman.",
  keywords: ["Xmix", "قت عمان", "منتجات زراعية", "خدمات زراعية", "زراعة عمان", "agriculture", "Oman", "marketplace", "farming"],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Xmix — سوق المنتجات والخدمات الزراعية",
    description: "كل ما تحتاجه أرضك في رفّ واحد — بذور ومحاصيل وري ومعدات وخدمات زراعية من قت عمان",
    type: "website",
    images: [{ url: "/logo-card.png", width: 512, height: 512, alt: "Xmix" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0d0b14",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased bg-background text-foreground min-h-screen">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
