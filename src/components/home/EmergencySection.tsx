"use client";

import { motion } from "framer-motion";
import { Phone, AlertCircle, Ambulance, Crosshair, ArrowRight } from "lucide-react";
import { SwipeText } from "@/components/ui/SwipeText";

export function EmergencySection() {
  return (
    <section className="py-24 bg-[#0B1F33] relative overflow-hidden">
      {/* High Contrast Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-600/10 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          {/* Left: Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-red-500/30 bg-red-500/10 backdrop-blur-md mb-8 shadow-sm">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[11px] font-bold text-red-300 tracking-widest uppercase">
                24/7 Critical Response
              </span>
            </div>

            <div className="mb-6">
              <SwipeText>
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight">
                  Instant <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-rose-500">Emergency Response.</span>
                </h2>
              </SwipeText>
            </div>
            
            <p className="text-lg text-rose-100/70 font-medium mb-10 max-w-lg">
              When every second counts, our integrated emergency network dispatches the closest ambulance and alerts the ER to prepare for your arrival instantly.
            </p>

            <div className="grid sm:grid-cols-2 gap-6 mb-12">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-red-900/50 flex items-center justify-center shrink-0 border border-red-500/20 text-red-400">
                  <Crosshair className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-white font-bold mb-1">GPS Tracking</h4>
                  <p className="text-sm text-rose-300/70">Pinpoint location sharing directly to first responders.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-red-900/50 flex items-center justify-center shrink-0 border border-red-500/20 text-red-400">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-white font-bold mb-1">Vital Sharing</h4>
                  <p className="text-sm text-rose-300/70">Smartwatch vitals beamed directly to the ER.</p>
                </div>
              </div>
            </div>

          </motion.div>

          {/* Right: Emergency Call to Action Box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl flex flex-col items-center text-center overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-red-500/10 to-transparent" />
            
            {/* Pulsing Alert Circle */}
            <div className="relative mb-10 mt-4">
              <div className="absolute inset-0 bg-red-500 rounded-full blur-xl opacity-40 animate-pulse" />
              <div className="relative w-24 h-24 rounded-full bg-red-500 flex items-center justify-center border-4 border-red-400/50 shadow-[0_0_50px_rgba(239,68,68,0.6)]">
                <Phone className="w-10 h-10 text-white" />
              </div>
            </div>

            <h3 className="text-2xl font-bold text-white mb-2 relative z-10">Need Immediate Help?</h3>
            <p className="text-rose-200/80 mb-8 relative z-10">Swipe in the app or call now for instant dispatch.</p>
            
            <button className="relative z-10 group w-full py-5 rounded-2xl bg-white text-red-600 font-extrabold text-xl overflow-hidden hover:scale-[1.02] transition-transform shadow-[0_10px_30px_rgba(255,255,255,0.1)]">
              <div className="absolute inset-0 bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="relative z-10 flex items-center justify-center gap-3">
                Call Emergency <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </span>
            </button>
            <p className="text-sm text-rose-300/50 mt-6 relative z-10">Average response time: 6.4 minutes</p>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
