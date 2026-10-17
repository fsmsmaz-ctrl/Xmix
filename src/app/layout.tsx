import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  metadataBase: new URL("https://xmix.om"),
  title: "Xmix — سوق التجارة العام: محلات ومنتجات وخدمات وتوصيل | Xmix Marketplace",
  description:
    "Xmix السوق الإلكتروني العام في سلطنة عُمان — محلات متنوعة تبيع المنتجات، خدمات احترافية تطلبها بضغطة، وتوصيل سريع يغطي المحافظات كلها. Oman's general marketplace: shops, products, services and delivery.",
  keywords: ["Xmix", "متجر إلكتروني", "سوق عمان", "منتجات", "خدمات", "توصيل", "محلات", "Oman", "marketplace", "shopping", "delivery"],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Xmix — محلات ومنتجات وخدمات وتوصيل",
    description: "كل ما تحتاجه في سوق واحد — منتجات من محلات موثوقة، خدمات احترافية، وتوصيل سريع يغطي عُمان",
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
