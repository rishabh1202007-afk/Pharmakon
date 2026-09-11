"use client";

import { Users, Calendar, Activity, BedDouble, Pill, ArrowUpRight, ArrowDownRight, MoreHorizontal, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const STATS = [
  { label: "Total Patients", value: "24,892", change: "+12.5%", trend: "up", icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
  { label: "Today's Appts", value: "3,842", change: "+5.2%", trend: "up", icon: Calendar, color: "text-purple-600", bg: "bg-purple-50" },
  { label: "Available Beds", value: "42", change: "-12", trend: "down", icon: BedDouble, color: "text-amber-600", bg: "bg-amber-50" },
  { label: "Emergency Queue", value: "18", change: "+4", trend: "up", icon: Activity, color: "text-rose-600", bg: "bg-rose-50" },
];

export default function AdminDashboard() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {STATS.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", stat.bg)}>
                <stat.icon className={cn("w-6 h-6", stat.color)} />
              </div>
              <div className={cn(
                "flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md",
                stat.trend === "up" && stat.color !== "text-rose-600" ? "text-emerald-700 bg-emerald-50" : 
                stat.trend === "down" && stat.color === "text-amber-600" ? "text-rose-700 bg-rose-50" :
                "text-amber-700 bg-amber-50"
              )}>
                {stat.trend === "up" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {stat.change}
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-900 mb-1">{stat.value}</p>
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Chart Area */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Hospital Operations Activity</h3>
              <p className="text-sm text-slate-500">Patient intake vs discharges over last 7 days</p>
            </div>
            <select className="bg-slate-50 border border-slate-200 text-sm font-medium rounded-lg px-3 py-1.5 outline-none">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>
          
          <div className="flex-1 relative flex items-end justify-between gap-4 px-2 pt-10 pb-2">
            {[45, 60, 35, 80, 95, 55, 75].map((h, i) => (
              <div key={i} className="w-full relative group h-full flex items-end justify-center">
                <div className="w-full max-w-[40px] bg-slate-100 rounded-t-md relative hover:bg-slate-200 transition-colors" style={{ height: '100%' }}>
                  <div className="absolute bottom-0 w-full bg-medical-500 rounded-t-md transition-all" style={{ height: `${h}%` }} />
                  <div className="absolute bottom-0 w-full bg-brand-400 rounded-t-md opacity-80" style={{ height: `${h * 0.6}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between px-4 mt-4 border-t border-slate-100 pt-4">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
              <span key={d} className="text-xs font-medium text-slate-400">{d}</span>
            ))}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          
          {/* Capacity Alert */}
          <div className="bg-rose-50 border border-rose-100 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h4 className="font-bold text-rose-900 mb-1">ICU Capacity Critical</h4>
                <p className="text-sm text-rose-700 mb-3">Intensive Care Unit is currently at 95% capacity. Only 2 beds available.</p>
                <button className="text-xs font-bold text-rose-600 bg-white px-3 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 transition-colors">
                  Manage Beds
                </button>
              </div>
            </div>
          </div>

          {/* Department Status */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col min-h-[300px]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-900">Department Status</h3>
              <button className="p-1 hover:bg-slate-50 rounded-md text-slate-400"><MoreHorizontal className="w-5 h-5" /></button>
            </div>
            
            <div className="space-y-5 flex-1">
              {[
                { name: "Emergency", load: 85, color: "bg-rose-500" },
                { name: "Cardiology", load: 60, color: "bg-medical-500" },
                { name: "Neurology", load: 45, color: "bg-purple-500" },
                { name: "Pediatrics", load: 30, color: "bg-emerald-500" },
              ].map(dept => (
                <div key={dept.name}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium text-slate-700">{dept.name}</span>
                    <span className="text-slate-500 font-semibold">{dept.load}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className={cn("h-2 rounded-full", dept.color)} style={{ width: `${dept.load}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
