"use client";

import { motion } from "framer-motion";
import { ConnectedEcosystem } from "./ConnectedEcosystem";
import { useEffect, useState } from "react";
import { SwipeText } from "@/components/ui/SwipeText";

export function EcosystemSection() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <section id="ecosystem" className="relative py-24 bg-[#04101A] overflow-hidden">
      {/* Background Subtle Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary-950 to-[#0B1F33] pointer-events-none" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10 flex flex-col items-center">
        
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-3xl mb-16"
        >
          <div className="mb-6">
            <SwipeText>
              <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
                Everything Connected. <br className="hidden sm:block" />
                <span className="text-teal-400">Care, Simplified.</span>
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
            Experience a living digital healthcare network where patients, providers, and intelligent technology work together in perfect sync.
          </motion.p>
        </motion.div>

        {mounted && (
          <div className="w-full flex justify-center">
            <ConnectedEcosystem />
          </div>
        )}
      </div>
    </section>
  );
}
