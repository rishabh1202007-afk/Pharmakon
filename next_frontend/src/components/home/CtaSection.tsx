"use client";

import { motion } from "framer-motion";
import { ArrowRight, Download, Building2 } from "lucide-react";
import { SwipeText } from "@/components/ui/SwipeText";

export function CtaSection() {
  return (
    <section className="py-32 relative overflow-hidden bg-[#04101A]">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 right-1/4 w-[60vw] h-[60vw] bg-teal-500/10 rounded-full blur-[150px] pointer-events-none transform translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-1/4 w-[60vw] h-[60vw] bg-blue-600/10 rounded-full blur-[150px] pointer-events-none transform -translate-x-1/2 translate-y-1/2" />
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay" />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <div className="mb-8">
            <SwipeText>
              <h2 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-white tracking-tight">
                Join the Future of <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">Health.</span>
              </h2>
            </SwipeText>
          </div>
          <p className="text-xl md:text-2xl text-slate-400 font-medium mb-16 max-w-3xl mx-auto leading-relaxed">
            Whether you're a patient looking for seamless care or a provider seeking intelligent infrastructure—PharmaKon is ready.
          </p>

        </motion.div>
      </div>
    </section>
  );
}
