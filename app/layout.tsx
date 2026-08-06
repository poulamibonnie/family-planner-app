import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import NativeBootstrap from "@/components/NativeBootstrap";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FamilyPlanner",
  description: "Personal and family planning — tasks, goals, meals, and more.",
  // The manifest <link> is injected automatically by app/manifest.ts.
  appleWebApp: {
    capable: true,
    title: "FamilyPlanner",
    statusBarStyle: "default",
  },
};

// viewport-fit=cover lets content extend under the notch/home indicator so the
// safe-area-inset-* env() values in globals.css resolve to real numbers (needed
// for the iOS Capacitor shell). userScalable disabled to avoid pinch-zoom in-app.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#FAFAF8",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" style={{ background: 'var(--background)' }}>
        <NativeBootstrap />
        {children}
      </body>
    </html>
  );
}
