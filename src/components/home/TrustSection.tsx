"use client";

import { motion } from "framer-motion";

const PARTNERS = [
  "Mayo Clinic", "Cleveland Clinic", "Johns Hopkins", "Mount Sinai", "Stanford Health", "UCLA Health", "Mass General", "NYU Langone"
];

export function TrustSection() {
  return (
    <section className="py-16 bg-white border-b border-slate-100 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8 text-center">
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
          Trusted by Global Health Leaders
        </p>
      </div>
      
      <div className="relative flex overflow-hidden group">
        {/* Left/Right Fades */}
        <div className="absolute top-0 left-0 bottom-0 w-32 bg-gradient-to-r from-white to-transparent z-10" />
        <div className="absolute top-0 right-0 bottom-0 w-32 bg-gradient-to-l from-white to-transparent z-10" />
        
        {/* Scrolling Content */}
        <motion.div 
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="flex items-center gap-16 whitespace-nowrap px-8"
        >
          {/* Double array for infinite seamless scrolling */}
          {[...PARTNERS, ...PARTNERS].map((partner, i) => (
            <div key={i} className="flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity grayscale hover:grayscale-0">
              <span className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">{partner}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
