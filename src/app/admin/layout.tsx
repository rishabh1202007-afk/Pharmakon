"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, Users, UserRoundCog, Calendar, Activity, 
  BedDouble, Pill, FileText, CreditCard, PieChart, Settings, 
  Building2, LogOut, Search, Bell
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

const ADMIN_LINKS = [
  { name: "Overview", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Patients", href: "/admin/patients", icon: Users },
  { name: "Doctors & Staff", href: "/admin/staff", icon: UserRoundCog },
  { name: "Appointments", href: "/admin/appointments", icon: Calendar },
  { name: "Departments", href: "/admin/departments", icon: Building2 },
  { name: "Bed Management", href: "/admin/beds", icon: BedDouble },
  { name: "Pharmacy", href: "/admin/pharmacy", icon: Pill },
  { name: "Diagnostics", href: "/admin/diagnostics", icon: Activity },
  { name: "Billing", href: "/admin/billing", icon: CreditCard },
  { name: "Reports", href: "/admin/reports", icon: PieChart },
  { name: "Settings", href: "/admin/settings", icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-slate-50">
      
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 hidden md:flex flex-col fixed inset-y-0 z-50">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <Image 
            src="/PharmaKon.png" 
            alt="PharmaKon Logo" 
            width={32} 
            height={32} 
            className="w-8 h-8 object-contain" 
          />
          <span className="font-bold text-xl tracking-tight text-white">
            PharmaKon
          </span>
        </div>
        
        <div className="px-6 py-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Enterprise Admin</p>
          <div className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-xl border border-slate-700">
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-white">
              AK
            </div>
            <div>
              <p className="text-sm font-bold text-white">Admin Portal</p>
              <p className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Network Online
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
          {ADMIN_LINKS.map((link) => {
            const isActive = pathname === link.href || (pathname.startsWith(link.href) && link.href !== '/admin/dashboard');
            return (
              <Link
                key={link.name}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                  isActive 
                    ? "bg-medical-500 text-white shadow-md shadow-medical-500/20" 
                    : "hover:bg-slate-800 hover:text-white"
                )}
              >
                <link.icon className={cn("w-4 h-4", isActive ? "text-white" : "text-slate-400")} />
                {link.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition-colors">
            <LogOut className="w-4 h-4" />
            System Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 md:pl-64 flex flex-col min-h-screen">
        
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-40">
          <div className="flex items-center text-slate-500">
            <span className="font-semibold text-slate-900">Hospital Operations</span>
            <span className="mx-2">/</span>
            <span className="text-sm">Global Dashboard</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search patient ID, staff..." 
                className="pl-9 pr-4 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-medical-300 w-64"
              />
            </div>
            <button className="relative p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 border-2 border-white" />
            </button>
          </div>
        </header>

        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
