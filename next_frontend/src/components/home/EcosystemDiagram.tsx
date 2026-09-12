"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HeartPulse, Stethoscope, Building2, ActivitySquare, Pill, ClipboardCheck, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const NODES = [
  { id: "patient", icon: HeartPulse, label: "Patient", color: "text-rose-500", bg: "bg-rose-50", desc: "Central health profile and unified medical records." },
  { id: "doctor", icon: Stethoscope, label: "Doctor", color: "text-slate-700", bg: "bg-slate-50", desc: "Specialist consultation and intelligent diagnosis." },
  { id: "hospital", icon: Building2, label: "Hospital", color: "text-medical-600", bg: "bg-medical-50", desc: "Resource allocation and facility management." },
  { id: "diagnostics", icon: ActivitySquare, label: "Diagnostics", color: "text-purple-600", bg: "bg-purple-50", desc: "Integrated lab reports and imaging data." },
  { id: "pharmacy", icon: Pill, label: "Pharmacy", color: "text-brand-500", bg: "bg-brand-50", desc: "Smart prescription fulfillment and reminders." },
  { id: "followup", icon: ClipboardCheck, label: "Follow-up", color: "text-emerald-600", bg: "bg-emerald-50", desc: "Continuous monitoring and care continuity." },
];

export function EcosystemDiagram() {
  const [activeNode, setActiveNode] = useState<string | null>(null);

  return (
    <section className="py-24 bg-white overflow-hidden relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-slate-900 mb-6">
            One Platform. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-medical-600 to-brand-500">
              Every Healthcare Journey.
            </span>
          </h2>
          <p className="text-lg text-slate-600">
            A seamlessly connected architecture where data flows securely between patients, providers, and facilities.
          </p>
        </div>

        <div className="relative">
          {/* Connection Lines (Desktop) */}
          <div className="hidden lg:block absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2" />
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:flex lg:justify-between lg:items-center gap-8 relative z-10">
            {NODES.map((node, i) => (
              <div 
                key={node.id}
                className="relative flex flex-col items-center group cursor-pointer"
                onMouseEnter={() => setActiveNode(node.id)}
                onMouseLeave={() => setActiveNode(null)}
              >
                {/* Arrow between nodes (Desktop) */}
                {i < NODES.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 left-full -translate-y-1/2 w-full flex justify-center z-0">
                    <ArrowRight className="w-4 h-4 text-slate-300" />
                  </div>
                )}
                
                <motion.div 
                  className={cn(
                    "w-20 h-20 md:w-24 md:h-24 rounded-3xl flex items-center justify-center transition-all duration-300 relative z-10",
                    "border-2 bg-white",
                    activeNode === node.id ? "border-medical-400 shadow-xl scale-110" : "border-slate-100 shadow-sm hover:border-slate-200"
                  )}
                  animate={activeNode === node.id ? { y: -10 } : { y: 0 }}
                >
                  <node.icon className={cn("w-8 h-8 md:w-10 md:h-10 transition-colors duration-300", activeNode === node.id ? node.color : "text-slate-400 group-hover:text-slate-600")} />
                </motion.div>
                
                <h3 className={cn(
                  "mt-6 font-semibold transition-colors duration-300",
                  activeNode === node.id ? "text-slate-900" : "text-slate-500"
                )}>
                  {node.label}
                </h3>

                <AnimatePresence>
                  {activeNode === node.id && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute top-full mt-4 w-48 p-4 bg-white border border-slate-100 rounded-2xl shadow-xl z-20 pointer-events-none"
                    >
                      <div className={cn("w-8 h-8 rounded-full mb-2 flex items-center justify-center", node.bg)}>
                        <node.icon className={cn("w-4 h-4", node.color)} />
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {node.desc}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
