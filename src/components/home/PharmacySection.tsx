"use client";

import { motion } from "framer-motion";
import { Pill, Clock, RotateCw, CheckCircle2, ArrowRight } from "lucide-react";
import Image from "next/image";
import { SwipeText } from "@/components/ui/SwipeText";

const features = [
  { icon: Clock, title: "24/7 Delivery", desc: "Medications delivered to your door within 2 hours in metro areas." },
  { icon: RotateCw, title: "Auto-Refills", desc: "Never run out. Our AI predicts and processes your refills automatically." },
  { icon: CheckCircle2, title: "Digital Prescriptions", desc: "Instantly routed from your consultation directly to the pharmacy." }
];

export function PharmacySection() {
  return (
    <section className="py-24 bg-[#0B1F33] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          {/* Left: Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex flex-col"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-teal-500/30 bg-teal-500/10 backdrop-blur-md mb-8 shadow-sm self-start">
              <Pill className="w-4 h-4 text-teal-400" />
              <span className="text-[11px] font-bold text-teal-300 tracking-widest uppercase">
                PharmaKon E-Pharmacy
              </span>
            </div>

            <div className="mb-6">
              <SwipeText>
                <h2 className="text-4xl md:text-5xl font-extrabold text-white leading-tight">
                  Seamless <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-400">E-Pharmacy.</span>
                </h2>
              </SwipeText>
            </div>
            
            <p className="text-lg text-slate-400 font-medium mb-10">
              Skip the lines and the wait. Get your prescriptions delivered instantly, manage refills automatically, and track everything in real-time through the PharmaKon app.
            </p>

            <div className="space-y-8 mb-10">
              {features.map((feature, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 * i }}
                  className="flex gap-4"
                >
                  <div className="w-12 h-12 rounded-xl bg-slate-800/50 flex items-center justify-center shrink-0 border border-slate-700">
                    <feature.icon className="w-6 h-6 text-teal-400" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-white mb-1">{feature.title}</h4>
                    <p className="text-slate-400 leading-relaxed">{feature.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <button className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl font-semibold overflow-hidden transition-all hover:scale-[1.02] hover:shadow-[0_10px_40px_-10px_rgba(20,184,166,0.5)] self-start">
              <div className="absolute inset-0 bg-gradient-to-r from-teal-400 to-emerald-400 transition-opacity opacity-0 group-hover:opacity-100" />
              <span className="relative z-10">Order Medications</span>
              <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>

          {/* Right: Floating UI / 3D Meds */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative h-[600px] rounded-[40px] bg-gradient-to-tr from-[#102D46] to-[#04101A] border border-slate-700/50 flex items-center justify-center shadow-xl group overflow-hidden"
          >
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-[80px]" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px]" />

            {/* Central Floating Element */}
            <motion.div 
              animate={{ y: [-10, 10, -10] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="relative w-4/5 h-3/5"
            >
              <Image 
                src="https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=800&h=800" 
                alt="Medication"
                fill
                className="object-cover rounded-3xl shadow-2xl mix-blend-screen opacity-80"
              />
            </motion.div>
            
            {/* UI Card Floating */}
            <motion.div 
              animate={{ y: [10, -10, 10] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -bottom-8 -left-8 bg-[#0B1F33]/90 backdrop-blur-xl p-6 rounded-2xl shadow-2xl border border-slate-700 w-72"
            >
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-bold text-white">Delivery Status</span>
                <span className="text-xs font-semibold text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2 py-1 rounded-full">Arriving in 15m</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-4">
                <div className="h-full bg-teal-500 w-[80%] rounded-full relative">
                  <div className="absolute right-0 top-0 bottom-0 w-4 bg-white/30 animate-pulse" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden relative border border-slate-700">
                  <Image src="https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=100&h=100" alt="Courier" fill className="object-cover" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">David M.</p>
                  <p className="text-xs text-slate-400">PharmaKon Courier</p>
                </div>
              </div>
            </motion.div>

          </motion.div>

        </div>
      </div>
    </section>
  );
}
