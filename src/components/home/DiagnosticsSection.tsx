"use client";

import { motion } from "framer-motion";
import { Dna, Microscope, Scan, ArrowRight, Brain, Activity } from "lucide-react";
import { SwipeText } from "@/components/ui/SwipeText";

export function DiagnosticsSection() {
  return (
    <section id="diagnostics" className="py-24 bg-[#04101A] relative overflow-hidden">
      {/* Ambient Lighting & Grid */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {/* Soft, masked grid */}
        <div 
          className="absolute inset-0 opacity-[0.04]"
          style={{ 
            backgroundImage: "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)", 
            backgroundSize: "40px 40px",
            maskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)" 
          }}
        />
        <div className="absolute top-1/4 right-0 w-[600px] h-[600px] bg-teal-600/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[150px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-teal-500/30 bg-teal-500/10 backdrop-blur-md mb-6 shadow-[0_0_20px_rgba(20,184,166,0.15)]">
              <Activity className="w-4 h-4 text-teal-400 animate-pulse" />
              <span className="text-xs font-bold text-teal-300 tracking-widest uppercase">
                PharmaKon Labs
              </span>
            </div>
            <div className="mb-4">
              <SwipeText>
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight">
                  Precision <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-400">Diagnostics.</span>
                </h2>
              </SwipeText>
            </div>
            <p className="text-xl text-slate-400 font-medium leading-relaxed">
              State-of-the-art imaging, genomics, and pathology. Results delivered directly to your app in record time.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <button className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 bg-slate-800/50 hover:bg-teal-500/10 border border-slate-700 hover:border-teal-500/50 text-white rounded-2xl font-semibold transition-all duration-300 backdrop-blur-xl overflow-hidden">
              <span className="relative z-10 group-hover:text-teal-300 transition-colors">Explore Facilities</span>
              <ArrowRight className="w-5 h-5 relative z-10 text-teal-400 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </div>

        {/* Diagnostic Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[300px]">
          
          {/* Main Card: Advanced Imaging */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="md:col-span-2 md:row-span-2 rounded-[40px] bg-[#0A1929]/80 backdrop-blur-2xl border border-slate-700/50 p-10 relative overflow-hidden group hover:shadow-[0_0_50px_rgba(20,184,166,0.1)] transition-all duration-500 flex flex-col justify-end"
          >
            {/* Radar / Scanner Background */}
            <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity duration-700">
              {/* Radar Grid Circles */}
              <div className="absolute w-[300px] h-[300px] rounded-full border border-teal-500/10" />
              <div className="absolute w-[450px] h-[450px] rounded-full border border-teal-500/10" />
              <div className="absolute w-[600px] h-[600px] rounded-full border border-teal-500/10" />
              
              {/* Brain Icon Glow */}
              <div className="absolute">
                <Brain className="w-48 h-48 text-teal-500/20 stroke-[1]" />
                <div className="absolute inset-0 bg-teal-500/20 blur-3xl rounded-full" />
              </div>

              {/* Sweeping Radar Beam */}
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute w-[600px] h-[600px] rounded-full"
                style={{
                  background: "conic-gradient(from 0deg, transparent 70%, rgba(45,212,191,0.1) 95%, rgba(45,212,191,0.4) 100%)",
                }}
              >
                {/* Scanner Line */}
                <div className="absolute top-0 right-1/2 w-1 h-1/2 bg-teal-400 shadow-[0_0_15px_rgba(45,212,191,1)] origin-bottom" />
              </motion.div>
            </div>

            {/* Content Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#04101A] via-[#04101A]/60 to-transparent z-10" />

            <div className="relative z-20 mt-auto">
              <div className="w-16 h-16 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center mb-6 border border-teal-500/30 backdrop-blur-md group-hover:scale-110 transition-transform duration-500 shadow-[0_0_20px_rgba(20,184,166,0.3)]">
                <Scan className="w-8 h-8" />
              </div>
              <h3 className="text-3xl font-bold text-white mb-3">Advanced Imaging (MRI/CT)</h3>
              <p className="text-slate-400 max-w-lg text-lg leading-relaxed">
                Next-generation 3 Tesla MRI and 256-slice CT scanners for unparalleled clarity, enabling early and precise detection.
              </p>
            </div>
            
            {/* Live Status */}
            <div className="absolute top-8 right-8 z-20 flex items-center gap-2 px-4 py-2 bg-teal-950/60 border border-teal-500/30 rounded-full backdrop-blur-md">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500"></span>
              </span>
              <span className="text-[11px] font-mono font-bold text-teal-300 tracking-widest">SCANNING</span>
            </div>
          </motion.div>

          {/* Card 2: Pathology */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="rounded-[40px] bg-[#0A1929]/80 backdrop-blur-2xl border border-slate-700/50 p-8 relative overflow-hidden group hover:border-emerald-500/50 transition-colors flex flex-col justify-end shadow-xl"
          >
            {/* Cells Animation */}
            <div className="absolute inset-0 z-0 overflow-hidden opacity-40 group-hover:opacity-100 transition-opacity duration-700">
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ 
                    y: [0, -20, 0],
                    x: [0, i % 2 === 0 ? 10 : -10, 0],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ 
                    duration: 3 + i, 
                    repeat: Infinity, 
                    ease: "easeInOut",
                    delay: i * 0.5 
                  }}
                  className="absolute rounded-full border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-sm"
                  style={{
                    width: 20 + i * 10,
                    height: 20 + i * 10,
                    left: `${20 + i * 12}%`,
                    top: `${30 + (i % 3) * 15}%`
                  }}
                />
              ))}
              {/* Vertical scanning laser */}
              <motion.div 
                animate={{ left: ["0%", "100%", "0%"] }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute top-0 bottom-0 w-[1px] bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,1)] z-10"
              />
            </div>

            <div className="absolute inset-0 bg-gradient-to-t from-[#04101A] to-transparent z-10" />

            <div className="relative z-20">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-5 border border-emerald-500/30 backdrop-blur-md shadow-[0_0_15px_rgba(16,185,129,0.2)] group-hover:scale-110 transition-transform">
                <Microscope className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Automated Pathology</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Robotic blood and sample analysis with zero-error tolerance.</p>
            </div>
          </motion.div>

          {/* Card 3: Genomics */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="rounded-[40px] bg-[#0A1929]/80 backdrop-blur-2xl border border-slate-700/50 p-8 relative overflow-hidden group hover:border-purple-500/50 transition-colors flex flex-col justify-end shadow-xl"
          >
            {/* DNA Sequencer Animation */}
            <div className="absolute inset-0 z-0 opacity-30 group-hover:opacity-80 transition-opacity duration-700 flex items-end justify-center gap-1.5 pb-24 px-8">
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ height: ["20%", "80%", "30%", "100%", "20%"] }}
                  transition={{ 
                    duration: 2 + Math.random() * 2, 
                    repeat: Infinity, 
                    ease: "easeInOut",
                    delay: i * 0.1
                  }}
                  className="w-full bg-gradient-to-t from-purple-600/20 to-purple-400/80 rounded-t-sm"
                  style={{ transformOrigin: "bottom" }}
                />
              ))}
            </div>

            <div className="absolute inset-0 bg-gradient-to-t from-[#04101A] via-[#04101A]/80 to-transparent z-10" />

            <div className="relative z-20">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-5 border border-purple-500/30 backdrop-blur-md shadow-[0_0_15px_rgba(168,85,247,0.2)] group-hover:scale-110 transition-transform">
                <Dna className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Genomics & DNA</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Personalized medicine through advanced genetic sequencing.</p>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
