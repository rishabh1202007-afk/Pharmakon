"use client";

import { motion } from "framer-motion";
import { LogOut, User, Calendar, Activity, FileText, Bell, ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function PatientDashboard() {
  return (
    <div className="min-h-screen bg-[#04101A] text-slate-200 font-sans selection:bg-teal-500/30 selection:text-teal-200">
      {/* Sidebar / Top Nav Area */}
      <nav className="border-b border-slate-800 bg-[#0B1F33]/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3">
              <Image 
                src="/PharmaKon.png" 
                alt="PharmaKon Logo" 
                width={32} 
                height={32} 
                className="w-8 h-8 object-contain" 
              />
              <span className="font-bold text-xl text-white tracking-tight">PharmaKon</span>
            </Link>
            
            <div className="flex items-center gap-6">
              <button className="relative text-slate-400 hover:text-teal-400 transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              </button>
              <div className="flex items-center gap-3 pl-6 border-l border-slate-700">
                <div className="w-8 h-8 bg-teal-500/20 text-teal-400 rounded-full flex items-center justify-center font-bold text-sm border border-teal-500/30">
                  JD
                </div>
                <span className="text-sm font-medium hidden sm:block">John Doe</span>
                <Link href="/" className="ml-4 text-slate-500 hover:text-red-400 transition-colors" title="Logout">
                  <LogOut className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Welcome Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10"
        >
          <h1 className="text-3xl font-extrabold text-white mb-2">Welcome back, John!</h1>
          <p className="text-slate-400">Here's a summary of your health profile and upcoming activities.</p>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {[
            { label: "Upcoming Appointments", value: "2", icon: Calendar, color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
            { label: "Active Prescriptions", value: "3", icon: Activity, color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" },
            { label: "Lab Results", value: "1 New", icon: FileText, color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20" },
            { label: "Health Score", value: "92/100", icon: User, color: "text-teal-400", bg: "bg-teal-400/10", border: "border-teal-400/20" },
          ].map((stat, i) => (
            <motion.div 
              key={stat.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className={`p-6 rounded-2xl border ${stat.border} bg-[#0B1F33]/30 backdrop-blur-sm`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`w-10 h-10 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-3xl font-bold text-white mb-1">{stat.value}</h3>
              <p className="text-sm font-medium text-slate-400">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-8">
            {/* Appointments */}
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-[#0B1F33]/30 border border-slate-800 rounded-3xl p-6 md:p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Upcoming Appointments</h2>
                <button className="text-teal-400 hover:text-teal-300 text-sm font-medium transition-colors">View All</button>
              </div>
              
              <div className="space-y-4">
                {[
                  { dr: "Dr. Sarah Jenkins", spec: "Cardiology", date: "Tomorrow, 10:00 AM", type: "In-Person" },
                  { dr: "Dr. Marcus Chen", spec: "General Practice", date: "Oct 15, 2:30 PM", type: "Video Consult" },
                ].map((apt, i) => (
                  <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-800 bg-[#04101A]/50 hover:border-teal-500/30 transition-colors gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center text-slate-400">
                        <User className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-base">{apt.dr}</h4>
                        <p className="text-sm text-slate-400">{apt.spec}</p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:items-end gap-1">
                      <span className="text-sm font-medium text-slate-300">{apt.date}</span>
                      <span className={`text-xs font-bold px-2 py-1 rounded-md ${apt.type === 'Video Consult' ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                        {apt.type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>
          </div>

          {/* Sidebar Area */}
          <div className="space-y-8">
            <motion.section 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="bg-gradient-to-br from-teal-900/20 to-[#0B1F33]/30 border border-teal-500/20 rounded-3xl p-6"
            >
              <h2 className="text-lg font-bold text-white mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <button className="w-full text-left px-4 py-3 bg-[#04101A] border border-slate-700 hover:border-teal-500/50 rounded-xl text-sm font-medium text-white transition-all hover:bg-slate-800 flex items-center justify-between group">
                  Book Appointment
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-teal-400 transition-colors" />
                </button>
                <button className="w-full text-left px-4 py-3 bg-[#04101A] border border-slate-700 hover:border-teal-500/50 rounded-xl text-sm font-medium text-white transition-all hover:bg-slate-800 flex items-center justify-between group">
                  Request Refill
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-teal-400 transition-colors" />
                </button>
                <button className="w-full text-left px-4 py-3 bg-[#04101A] border border-slate-700 hover:border-teal-500/50 rounded-xl text-sm font-medium text-white transition-all hover:bg-slate-800 flex items-center justify-between group">
                  Message Doctor
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-teal-400 transition-colors" />
                </button>
              </div>
            </motion.section>
          </div>
        </div>
      </main>
    </div>
  );
}
