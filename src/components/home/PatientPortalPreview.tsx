"use client";

import { motion } from "framer-motion";
import { Calendar, Pill, FileText, ArrowRight, Video, FileCheck, CheckCircle2 } from "lucide-react";
import Image from "next/image";

import { SwipeText } from "@/components/ui/SwipeText";

export function PatientPortalPreview() {
  return (
    <section className="py-24 bg-primary-950 border-t border-slate-800 overflow-hidden relative">
      {/* Background Decor */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[600px] bg-gradient-to-r from-teal-500/10 to-blue-500/10 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-teal-500/30 bg-teal-500/10 mb-6"
          >
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            <span className="text-xs font-semibold text-teal-300 tracking-wider uppercase">
              Unified Platform
            </span>
          </motion.div>
          <div className="mb-6">
            <SwipeText>
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
                Your Health <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-400">Dashboard.</span>
              </h2>
            </SwipeText>
          </div>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-lg text-slate-400 font-medium"
          >
            Manage appointments, view test results, and track your active prescriptions—all in one secure, intuitive interface.
          </motion.p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="relative max-w-5xl mx-auto"
        >
          {/* Dashboard Frame (Glassmorphism) */}
          <div className="rounded-3xl border border-white/60 bg-white/40 backdrop-blur-2xl shadow-[0_30px_60px_-20px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col min-h-[650px] relative">
            
            {/* Glossy Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/60 to-transparent pointer-events-none" />

            {/* Dashboard Sidebar + Content Grid */}
            <div className="flex flex-1 relative z-10">
              
              {/* Sidebar */}
              <div className="hidden md:flex flex-col w-64 bg-white/50 border-r border-white/60 p-6">
                <div className="flex items-center gap-3 mb-10">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-medical-600 flex items-center justify-center shadow-md">
                    <span className="text-white font-bold text-sm">P</span>
                  </div>
                  <span className="font-bold text-primary-950">PharmaKon</span>
                </div>
                
                <nav className="space-y-2">
                  <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-teal-50 text-teal-700 font-semibold shadow-sm border border-teal-100/50">
                    <Calendar className="w-4 h-4" /> Appointments
                  </div>
                  <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-600 font-medium hover:bg-white/60 transition-colors">
                    <Pill className="w-4 h-4" /> Prescriptions
                  </div>
                  <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-600 font-medium hover:bg-white/60 transition-colors">
                    <FileText className="w-4 h-4" /> Lab Results
                  </div>
                </nav>

                <div className="mt-auto flex items-center gap-3 p-4 bg-white/60 rounded-xl border border-white">
                  <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden relative">
                     <Image src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100&h=100" alt="User" fill className="object-cover" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-primary-950">Jane Doe</p>
                    <p className="text-xs text-slate-500">Premium Member</p>
                  </div>
                </div>
              </div>

              {/* Main Content */}
              <div className="flex-1 p-6 md:p-10 flex flex-col gap-8">
                
                {/* Header */}
                <div className="flex justify-between items-end">
                  <div>
                    <h3 className="text-2xl font-extrabold text-primary-950 mb-1">Good morning, Jane</h3>
                    <p className="text-slate-500 font-medium">Here is your health summary for today.</p>
                  </div>
                  <button className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-primary-900 text-white rounded-xl text-sm font-semibold hover:bg-primary-800 transition-colors shadow-lg">
                    Book Visit <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                  
                  {/* Upcoming Appointment */}
                  <div className="bg-white/80 rounded-2xl p-6 border border-white shadow-sm flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                      <h4 className="font-bold text-primary-950">Upcoming Appointment</h4>
                      <span className="text-xs font-bold text-medical-600 bg-medical-50 px-2.5 py-1 rounded-full">Today, 2:30 PM</span>
                    </div>
                    <div className="flex gap-4 mb-6">
                      <div className="w-14 h-14 rounded-full overflow-hidden relative border-2 border-white shadow-sm shrink-0">
                         <Image src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=150&h=150" alt="Doctor" fill className="object-cover" />
                      </div>
                      <div>
                        <p className="font-bold text-primary-950">Dr. Sarah Chen</p>
                        <p className="text-sm text-slate-500">Cardiology Specialist</p>
                      </div>
                    </div>
                    <div className="mt-auto flex gap-3">
                      <button className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-teal-50 text-teal-700 font-semibold rounded-xl text-sm border border-teal-100 hover:bg-teal-100 transition-colors">
                        <Video className="w-4 h-4" /> Join Call
                      </button>
                      <button className="px-4 py-2.5 text-slate-500 text-sm font-semibold hover:bg-slate-100 rounded-xl transition-colors">
                        Reschedule
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-6">
                    {/* Active Prescriptions */}
                    <div className="bg-white/80 rounded-2xl p-6 border border-white shadow-sm flex-1">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-primary-950">Active Prescriptions</h4>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                            <Pill className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-bold text-primary-950 text-sm">Amoxicillin 500mg</p>
                            <p className="text-xs text-slate-500">2 capsules daily</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                          <CheckCircle2 className="w-4 h-4" /> Shipped
                        </div>
                      </div>
                      <button className="text-sm font-semibold text-medical-600 hover:text-medical-700">Request Refill</button>
                    </div>

                    {/* Latest Lab Results */}
                    <div className="bg-white/80 rounded-2xl p-6 border border-white shadow-sm flex-1">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-primary-950">Latest Lab Results</h4>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 mb-2 cursor-pointer hover:bg-white transition-colors">
                        <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                          <FileCheck className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-primary-950 text-sm">Comprehensive Metabolic Panel</p>
                          <p className="text-xs text-slate-500">Oct 12, 2023 • All within normal range</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
