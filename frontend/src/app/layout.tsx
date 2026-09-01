import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Suspense } from "react";
import { Analytics } from "@vercel/analytics/next";
import { ReferralCapture } from "@/components/ReferralCapture";
import "./globals.css";

export const metadata: Metadata = {
  title: "SPARAI - AI Combat & Boxing Coach",
  description: "High-performance AI boxing coach, reflex enhancer, and weekly training roadmap. Sharpen form and reaction with real-time computer vision analysis.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Load Space Grotesk at runtime */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap"
        />
        {/* Google Analytics (gtag.js) */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-RY45QTG3FS"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-RY45QTG3FS');
          `}
        </Script>
      </head>
      <body className="font-sans antialiased bg-bg-dark text-white">
        <Suspense fallback={null}>
          <ReferralCapture />
        </Suspense>
        {children}
        <Analytics />
      </body>
    </html>
  );
}