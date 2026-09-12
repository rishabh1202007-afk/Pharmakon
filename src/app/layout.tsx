import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppLayout } from "@/components/layout/AppLayout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PharmaKon | Healthcare, Reimagined.",
  description: "A connected healthcare ecosystem bringing patients, physicians, hospitals, pharmacies and intelligent technology together.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white min-h-screen flex flex-col`}
      >
        <div className="fixed inset-0 bg-medical-grid z-[-1] pointer-events-none" />
        <AppLayout>
          {children}
        </AppLayout>
      </body>
    </html>
  );
}
