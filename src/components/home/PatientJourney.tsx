"use client";

import { motion } from "framer-motion";
import { Building2, Users, BarChart3, BrainCircuit, ArrowRight } from "lucide-react";
import { useState } from "react";
import { SwipeText } from "@/components/ui/SwipeText";

const journeySteps = [
  {
    id: 1,
    title: "Hospital Operations",
    description: "PharmaKon centralizes essential hospital operations into one intelligent platform, giving administrators a clear view of what is happening across the hospital.",
    icon: Building2,
    color: "from-blue-500 to-cyan-400",
    shadow: "shadow-blue-500/20",
    capabilities: [
      "Department & facility management",
      "Bed and room availability",
      "Resource allocation",
      "Daily workflow monitoring",
      "Operational coordination"
    ]
  },
  {
    id: 2,
    title: "Clinical Management",
    description: "A connected clinical management system that helps coordinate doctors, nurses, departments, wards, and clinical activities efficiently.",
    icon: Users,
    color: "from-teal-500 to-emerald-400",
    shadow: "shadow-teal-500/20",
    capabilities: [
      "Doctor & staff coordination",
      "Department management",
      "Ward & clinical workflow management",
      "Staff scheduling",
      "Clinical activity tracking"
    ]
  },
  {
    id: 3,
    title: "Hospital Analytics",
    description: "Transform hospital data into meaningful insights with a centralized analytics layer designed for administrators and management teams.",
    icon: BarChart3,
    color: "from-purple-500 to-pink-400",
    shadow: "shadow-purple-500/20",
    capabilities: [
      "Hospital occupancy monitoring",
      "Department performance",
      "Resource utilization",
      "Revenue & financial indicators",
      "Real-time operational KPIs"
    ]
  },
  {
    id: 4,
    title: "AI-Powered Intelligence",
    description: "PharmaKon uses intelligent analytics to help hospital leadership identify patterns, anticipate operational needs, and optimize resources.",
    icon: BrainCircuit,
    color: "from-orange-500 to-amber-400",
    shadow: "shadow-orange-500/20",
    capabilities: [
      "Demand forecasting",
      "Resource optimization",
      "Operational trend detection",
      "Workflow recommendations",
      "Predictive insights"
    ]
  }
];

export function PatientJourney() {
  const [activeStep, setActiveStep] = useState(0);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  return (
    <section id="solutions" className="py-24 bg-[#0B1F33] relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <div className="text-center mb-20">
          <div className="mb-6">
            <SwipeText>
              <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
                Smarter Healthcare, <br className="sm:hidden" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">
                  Built for Your Hospital
                </span>
              </h2>
            </SwipeText>
          </div>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-lg text-slate-400 max-w-2xl mx-auto"
          >
            An intelligent hospital management ecosystem designed to streamline operations, empower clinical teams, and improve institutional performance.
          </motion.p>
        </div>

        {/* Journey Timeline */}
        <div className="relative">
          {/* Connecting Line (Desktop) */}
          <div className="hidden lg:block absolute top-1/2 left-0 w-full h-1 -translate-y-1/2 bg-slate-800 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-blue-500 via-teal-500 to-orange-500"
              initial={{ width: "0%" }}
              whileInView={{ width: "100%" }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-4 relative">
            {journeySteps.map((step, index) => (
              <motion.div 
                key={step.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                onMouseEnter={() => setActiveStep(index)}
                className="relative group"
              >
                {/* Step Connector Node (Desktop) */}
                <div className="hidden lg:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#0B1F33] border-4 border-slate-700 z-10 transition-colors duration-300 group-hover:border-teal-400" />

                <div className={`
                  bg-[#102D46] rounded-2xl p-8 border border-slate-700/50 transition-all duration-300
                  hover:-translate-y-2 hover:border-teal-500/30 hover:shadow-2xl ${step.shadow}
                  flex flex-col items-center text-center relative z-20 h-full
                  ${activeStep === index ? 'lg:-translate-y-4 lg:border-teal-500/50' : 'lg:translate-y-12'}
                `}>
                  
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-6 shadow-lg rotate-3 group-hover:rotate-6 transition-transform`}>
                    <step.icon className="w-8 h-8 text-white" />
                  </div>
                  
                  <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                  
                  <div className="flex-1 flex flex-col justify-center w-full">
                    {expandedStep === index && step.capabilities ? (
                      <div className="text-left w-full">
                        <p className="text-teal-400 font-semibold mb-2 text-sm text-center">Key capabilities</p>
                        <ul className="text-slate-300 text-sm space-y-2">
                          {step.capabilities.map((cap, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-teal-500 mt-0.5 shrink-0">•</span>
                              <span>{cap}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="text-slate-400 text-sm leading-relaxed">{step.description}</p>
                    )}
                  </div>
                  
                  <div className="mt-6 pt-6 border-t border-slate-700/50 w-full">
                    {step.capabilities ? (
                      <button 
                        onClick={() => setExpandedStep(expandedStep === index ? null : index)}
                        className="text-sm font-semibold text-teal-400 flex items-center justify-center gap-2 group/btn w-full"
                      >
                        {expandedStep === index ? "Show less" : "Learn more"}
                        <ArrowRight className={`w-4 h-4 transition-transform ${expandedStep === index ? '-rotate-90' : 'group-hover/btn:translate-x-1'}`} />
                      </button>
                    ) : (
                      <button className="text-sm font-semibold text-teal-400 flex items-center justify-center gap-2 group/btn w-full opacity-50 cursor-not-allowed">
                        Learn more 
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
