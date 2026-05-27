import type { Metadata, Viewport } from "next";
import { Syne, Inter } from "next/font/google";
import "./globals.css";
import { PWAProvider } from "@/components/pwa/PWAProvider";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { UpdateToast } from "@/components/pwa/UpdateToast";
import { AuthProvider } from "@/components/auth/AuthProvider";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "LifeRise Solutions",
  description: "Simplifying Services, Enhancing Lives",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/liferise_icon.ico", sizes: "any" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/liferise_icon.ico",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "LifeRise",
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0F1E",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${syne.variable} ${inter.variable} h-full`}>
      <head>
        <link rel="icon" href="/liferise_icon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-full bg-midnight text-lr-white antialiased">
        <AuthProvider>
          <PWAProvider>
            {children}
            <InstallPrompt />
            <UpdateToast />
          </PWAProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
