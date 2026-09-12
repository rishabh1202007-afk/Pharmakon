"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Database, Cpu, BrainCircuit, Activity, Stethoscope, HeartPulse } from "lucide-react";

import { SwipeText } from "@/components/ui/SwipeText";

const PIPELINE = [
  { id: "patient", icon: Database, label: "Patient Information", desc: "Secure electronic health records and real-time vitals." },
  { id: "processing", icon: Cpu, label: "Data Processing", desc: "Normalization and secure cryptographic anonymization." },
  { id: "analysis", icon: BrainCircuit, label: "AI Analysis", desc: "Advanced pattern recognition against global clinical databases." },
  { id: "insight", icon: Activity, label: "Clinical Insight", desc: "Generated decision support markers and predictive alerts." },
  { id: "review", icon: Stethoscope, label: "Physician Review", desc: "Specialist evaluates AI-assisted diagnostic suggestions." },
  { id: "care", icon: HeartPulse, label: "Personalized Care", desc: "Precision-tailored treatment plan initiated instantly." },
];

export function AiIntelligence() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <section id="about" className="py-24 bg-primary-950 relative overflow-hidden">
      {/* Abstract Neural Network Background Elements */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-[20%] left-[10%] w-[40vw] h-[40vw] bg-teal-500/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] right-[10%] w-[50vw] h-[50vw] bg-blue-600/20 rounded-full blur-[150px]" />
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.button
            onClick={() => setIsExpanded(!isExpanded)}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-teal-500/30 bg-teal-500/10 backdrop-blur-md mb-6 hover:bg-teal-500/20 transition-colors cursor-pointer"
          >
            <BrainCircuit className="w-4 h-4 text-teal-400" />
            <span className="text-xs font-bold text-teal-300 tracking-widest uppercase">
              Decision Support Architecture
            </span>
          </motion.button>

          <div className="mb-6">
            <SwipeText>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
                Intelligence Behind <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500">Better Care.</span>
              </h2>
            </SwipeText>
          </div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-slate-400 font-medium leading-relaxed"
          >
            Our AI acts as an advanced decision support system. It processes millions of data points to provide actionable insights, empowering doctors to make the best clinical decisions—never replacing human expertise.
          </motion.p>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="max-w-5xl mx-auto relative mt-8 pb-16">
                {/* Animated background flow line */}
                <div className="absolute top-0 bottom-0 left-[27px] md:left-1/2 w-[2px] bg-slate-800 md:-translate-x-1/2 overflow-hidden rounded-full">
                  <motion.div
                    animate={{ y: ["-100%", "500%"] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="w-full h-32 bg-gradient-to-b from-transparent via-teal-400 to-transparent"
                  />
                </div>

                <div className="space-y-12 md:space-y-20 pt-8">
                  {PIPELINE.map((step, i) => (
                    <motion.div
                      key={step.id}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-100px" }}
                      transition={{ duration: 0.7, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                      className={`flex items-center gap-6 md:gap-16 relative z-10 ${i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse text-left md:text-right"
                        }`}
                    >
                      {/* Desktop Empty Space for alignment */}
                      <div className="hidden md:block md:flex-1" />

                      {/* Center Node */}
                      <div className="relative shrink-0">
                        <div className="w-14 h-14 rounded-2xl bg-primary-900 border border-slate-700 shadow-[0_0_30px_rgba(20,184,166,0.15)] flex items-center justify-center relative z-10">
                          <step.icon className="w-6 h-6 text-teal-400" />
                        </div>
                        {/* Glowing ring */}
                        <motion.div
                          animate={{ scale: [1, 1.4, 1], opacity: [0.2, 0.5, 0.2] }}
                          transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.3 }}
                          className="absolute inset-0 rounded-2xl bg-teal-500 blur-lg -z-10"
                        />
                      </div>

                      {/* Content Card */}
                      <div className="flex-1 md:flex-none md:w-[calc(50%-4rem)]">
                        <div className={`p-6 rounded-2xl bg-primary-900/50 backdrop-blur-md border border-slate-700/50 hover:bg-primary-900 transition-colors shadow-xl group relative overflow-hidden`}>
                          <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                          <h3 className={`text-xl font-bold text-white mb-3 flex items-center gap-3 ${i % 2 !== 0 && "md:flex-row-reverse"}`}>
                            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary-950 border border-slate-700 text-sm font-mono text-teal-400">
                              0{i + 1}
                            </span>
                            {step.label}
                          </h3>
                          <p className="text-slate-400 text-sm leading-relaxed">
                            {step.desc}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
