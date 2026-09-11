"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Hero3D } from "./Hero3D";
import { ArrowRight, ShieldCheck, Calendar } from "lucide-react";
import { SwipeText } from "@/components/ui/SwipeText";

export function HeroSection() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" as const } }
  };

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-primary-950 pt-20 pb-16">
      {/* Subtle Ambient Background Gradients */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-teal-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-500/10 rounded-full blur-[150px]" />
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full z-10 grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
        
        {/* Left: Content */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate={mounted ? "visible" : "hidden"}
          className="flex flex-col items-start lg:col-span-1"
        >
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-teal-500/30 bg-teal-900/30 backdrop-blur-md mb-8 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            <span className="text-[11px] font-bold text-teal-100 tracking-widest uppercase">
              The Future of Connected Healthcare
            </span>
          </motion.div>

          <div className="mb-6">
            <SwipeText delay={0.2}>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.05]">
                Healthcare, <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400">
                  Reimagined.
                </span>
              </h1>
            </SwipeText>
          </div>

          <motion.p 
            variants={itemVariants}
            className="text-lg md:text-xl text-slate-300 max-w-lg leading-relaxed mb-10 font-medium"
          >
            A connected healthcare ecosystem bringing patients, physicians, hospitals, pharmacies and intelligent technology together.
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mb-10">
            <button className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl font-semibold overflow-hidden transition-all hover:scale-[1.02] hover:shadow-[0_10px_40px_-10px_rgba(20,184,166,0.5)]">
              <div className="absolute inset-0 bg-gradient-to-r from-teal-400 to-emerald-400 transition-opacity opacity-0 group-hover:opacity-100" />
              <span className="relative z-10">Explore Healthcare</span>
              <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/5 text-white border border-white/20 rounded-xl font-semibold transition-all hover:border-teal-400/50 hover:bg-teal-900/20 hover:shadow-sm">
              <Calendar className="w-4 h-4 text-teal-400" />
              <span>Book an Appointment</span>
            </button>
          </motion.div>

          <motion.div variants={itemVariants} className="flex items-center gap-3 text-sm font-medium text-slate-400">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>Trusted Healthcare Ecosystem</span>
          </motion.div>

        </motion.div>

        {/* Right side spacer for grid */}
        <div className="hidden lg:block lg:col-span-1 pointer-events-none"></div>

      </div>

      {/* 3D Visualization Background */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={mounted ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 1.5, delay: 0.5 }}
        className="absolute inset-0 w-full h-full z-0 pointer-events-auto"
      >
        {mounted && <Hero3D />}
      </motion.div>
    </section>
  );
}
