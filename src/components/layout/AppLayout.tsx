"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Routes that should not have the global Navbar and Footer
  const isStandaloneRoute = pathname?.startsWith("/patient");

  if (isStandaloneRoute) {
    return (
      <main className="flex-1 flex flex-col min-h-screen">
        {children}
      </main>
    );
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 flex flex-col pt-20">
        {children}
      </main>
      <Footer />
    </>
  );
}
