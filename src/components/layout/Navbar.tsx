"use client";

import { useState, useEffect } from "react";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { Search, User, CalendarPlus, Menu, X, Activity } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { name: "Home", href: "/" },
  { name: "Healthcare", href: "/#ecosystem" },
  { name: "Solutions", href: "/#solutions" },
  { name: "AI Intelligence", href: "/#diagnostics" },
  { name: "Doctors", href: "/#doctors" },
  { name: "Hospitals", href: "/hospitals" },
  { name: "About", href: "/#about" },
];

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 20);
  });

  return (
    <>
      <motion.nav
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out border-b border-transparent",
          isScrolled
            ? "bg-white/80 backdrop-blur-md shadow-sm border-slate-200 py-3"
            : "bg-transparent py-5"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <Link href="/" className="flex-shrink-0 flex items-center gap-2 hover:opacity-90 transition-opacity">
              <Image
                src="/PharmaKon.png"
                alt="PharmaKon Logo"
                width={32}
                height={32}
                className="w-8 h-8 object-contain"
              />
              <span className={cn(
                "font-bold text-xl tracking-tight",
                isScrolled ? "text-slate-900" : "text-white"
              )}>
                PharmaKon
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={(e) => {
                    if (link.href.startsWith("/#") && window.location.pathname === "/") {
                      e.preventDefault();
                      const id = link.href.replace("/#", "");
                      const element = document.getElementById(id);
                      if (element) {
                        element.scrollIntoView({ behavior: "smooth" });
                      }
                    }
                  }}
                  className={cn(
                    "px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    isScrolled 
                      ? "text-slate-600 hover:text-medical-600 hover:bg-medical-50" 
                      : "text-slate-300 hover:text-white hover:bg-white/10"
                  )}
                >
                  {link.name}
                </Link>
              ))}
            </div>

            {/* Right Actions */}
            <div className="hidden lg:flex items-center space-x-3">
              <button className={cn(
                "p-2 transition-colors rounded-full mr-2",
                isScrolled 
                  ? "text-slate-400 hover:text-slate-600 hover:bg-slate-100" 
                  : "text-slate-400 hover:text-white hover:bg-white/10"
              )}>
                <Search size={18} />
              </button>
              <Link href="/patient/login" className="flex items-center gap-2 bg-teal-50 text-teal-700 px-5 py-2.5 rounded-full text-sm font-bold hover:bg-teal-100 transition-all">
                <span>Patient Login</span>
              </Link>
              <Link href="/login" className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-full text-sm font-medium hover:bg-slate-800 hover:shadow-lg transition-all active:scale-95">
                <span>Staff Login</span>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <div className="lg:hidden flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={cn(
                  "p-2 rounded-md transition-colors",
                  isScrolled
                    ? "text-slate-600 hover:bg-slate-100"
                    : "text-slate-300 hover:bg-white/10"
                )}
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu Drawer */}
      <motion.div
        initial={false}
        animate={mobileMenuOpen ? "open" : "closed"}
        variants={{
          open: { opacity: 1, x: 0 },
          closed: { opacity: 0, x: "100%" },
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed inset-y-0 right-0 z-40 w-full sm:w-80 bg-white shadow-2xl border-l border-slate-100 lg:hidden pt-20"
      >
        <div className="flex flex-col h-full overflow-y-auto px-6 pb-6">
          <div className="flex-1 space-y-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="block px-3 py-4 text-base font-medium text-slate-900 border-b border-slate-100 hover:bg-slate-50"
                onClick={(e) => {
                  setMobileMenuOpen(false);
                  if (link.href.startsWith("/#") && window.location.pathname === "/") {
                    e.preventDefault();
                    const id = link.href.replace("/#", "");
                    const element = document.getElementById(id);
                    if (element) {
                      setTimeout(() => {
                        element.scrollIntoView({ behavior: "smooth" });
                      }, 300); // Wait for menu to close
                    }
                  }
                }}
              >
                {link.name}
              </Link>
            ))}
          </div>
          <div className="mt-8 space-y-3">
            <Link href="/patient/login" className="w-full flex items-center justify-center gap-2 bg-teal-50 text-teal-700 border border-teal-100 px-4 py-3 rounded-lg text-sm font-bold hover:bg-teal-100 transition-colors">
              <span>Patient Login</span>
            </Link>
            <Link href="/login" className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors">
              <span>Staff Login</span>
            </Link>
          </div>
        </div>
      </motion.div>
    </>
  );
}
