"use client";

import { motion } from "framer-motion";
import { Stethoscope, Building2, Pill, BrainCircuit, Activity } from "lucide-react";
import Image from "next/image";

export function ConnectedEcosystem() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
  };

  const nodeVariants = {
    hidden: { opacity: 0, scale: 0.8, y: 10 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="relative w-full max-w-[1000px] h-[320px] mt-8 flex items-center justify-center hidden sm:flex"
    >
      {/* SVG Connections */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1000 320" preserveAspectRatio="none" style={{ zIndex: 0 }}>
        <defs>
          <linearGradient id="lineGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="lineGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="lineGrad3" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="lineGrad4" x1="100%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.5" />
          </linearGradient>
          
          {/* Glow filter for paths */}
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Top Left Path */}
        <path
          d="M 120 80 Q 250 80 500 160"
          fill="none"
          stroke="url(#lineGrad1)"
          strokeWidth="1.5"
          className="path-animate"
        />
        {/* Top Right Path */}
        <path
          d="M 880 80 Q 750 80 500 160"
          fill="none"
          stroke="url(#lineGrad2)"
          strokeWidth="1.5"
          className="path-animate-reverse"
        />
        {/* Bottom Left Path */}
        <path
          d="M 120 240 Q 250 240 500 160"
          fill="none"
          stroke="url(#lineGrad3)"
          strokeWidth="1.5"
          className="path-animate"
        />
        {/* Bottom Right Path */}
        <path
          d="M 880 240 Q 750 240 500 160"
          fill="none"
          stroke="url(#lineGrad4)"
          strokeWidth="1.5"
          className="path-animate-reverse"
        />

        {/* Particles */}
        <circle r="3" fill="#10b981" filter="url(#glow)">
          <animateMotion dur="4s" repeatCount="indefinite" path="M 120 80 Q 250 80 500 160" />
        </circle>
        <circle r="3" fill="#0ea5e9" filter="url(#glow)">
          <animateMotion dur="4.5s" repeatCount="indefinite" path="M 880 80 Q 750 80 500 160" />
        </circle>
        <circle r="3" fill="#14b8a6" filter="url(#glow)">
          <animateMotion dur="3.5s" repeatCount="indefinite" path="M 120 240 Q 250 240 500 160" />
        </circle>
        <circle r="3" fill="#3b82f6" filter="url(#glow)">
          <animateMotion dur="5s" repeatCount="indefinite" path="M 880 240 Q 750 240 500 160" />
        </circle>
      </svg>

      {/* Center Node: PharmaKon */}
      <div className="absolute z-10 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <motion.div
          variants={nodeVariants}
        >
        <motion.div 
          animate={{ boxShadow: ["0 0 0px 0px rgba(16, 185, 129, 0)", "0 0 30px 10px rgba(16, 185, 129, 0.15)", "0 0 0px 0px rgba(16, 185, 129, 0)"] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="flex flex-col items-center justify-center w-36 h-36 rounded-full bg-white/70 backdrop-blur-xl border border-white/60 shadow-xl relative cursor-default hover:scale-105 transition-transform duration-500"
        >
          <div className="absolute inset-2 rounded-full border border-teal-100/50 bg-gradient-to-tr from-sky-50/50 to-emerald-50/50 flex flex-col items-center justify-center pointer-events-none">
            <Image src="/PharmaKon.png" alt="PharmaKon Logo" width={32} height={32} className="object-contain mb-1" />
            <span className="text-[11px] font-bold text-slate-800 tracking-tight leading-tight">PharmaKon</span>
            <span className="text-[9px] font-semibold text-emerald-600 tracking-wider uppercase mt-0.5">Connected Care</span>
          </div>
          <Activity className="absolute bottom-[-10px] w-5 h-5 text-medical-500 bg-white rounded-full p-1 shadow-sm border border-slate-100" />
        </motion.div>
        </motion.div>
      </div>

      {/* Floating Nodes */}
      <FloatingNode 
        icon={<Stethoscope className="w-5 h-5 text-sky-600" />}
        title="PHYSICIANS"
        subtitle="Expert Care"
        position="top-left"
        delay={0}
      />
      
      <FloatingNode 
        icon={<Building2 className="w-5 h-5 text-indigo-600" />}
        title="HOSPITALS"
        subtitle="Smart Healthcare"
        position="top-right"
        delay={1}
      />
      
      <FloatingNode 
        icon={<Pill className="w-5 h-5 text-emerald-600" />}
        title="PHARMACIES"
        subtitle="Easy Access"
        position="bottom-left"
        delay={2}
      />
      
      <FloatingNode 
        icon={<BrainCircuit className="w-5 h-5 text-purple-600" />}
        title="AI INTELLIGENCE"
        subtitle="Smart Insights"
        position="bottom-right"
        delay={3}
      />
    </motion.div>
  );
}

function FloatingNode({ icon, title, subtitle, position, delay }: { icon: React.ReactNode, title: string, subtitle: string, position: string, delay: number }) {
  
  const getPositionStyles = () => {
    switch (position) {
      case "top-left": return { left: '12%', top: '25%' };
      case "top-right": return { left: '88%', top: '25%' };
      case "bottom-left": return { left: '12%', top: '75%' };
      case "bottom-right": return { left: '88%', top: '75%' };
      default: return {};
    }
  };

  return (
    <div className="absolute z-10 -translate-x-1/2 -translate-y-1/2" style={getPositionStyles()}>
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: delay }}
        className="cursor-pointer group"
      >
        <div className="flex flex-col items-center gap-3 transition-transform duration-300 group-hover:-translate-y-2 group-hover:scale-105">
        <div className="relative">
          <div className="absolute inset-0 bg-white/40 blur-md rounded-2xl group-hover:bg-sky-100/60 transition-colors duration-300" />
          <div className="relative w-14 h-14 bg-white/80 backdrop-blur-md rounded-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center justify-center group-hover:shadow-[0_8px_30px_rgb(16,185,129,0.12)] transition-shadow duration-300">
            {icon}
          </div>
        </div>
        <div className="text-center bg-white/60 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/40 shadow-sm">
          <h4 className="text-[10px] font-bold text-slate-800 tracking-wider mb-0.5">{title}</h4>
          <p className="text-[9px] font-medium text-slate-500">{subtitle}</p>
        </div>
        </div>
      </motion.div>
    </div>
  );
}

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}
