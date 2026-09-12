"use client";

import { motion } from "framer-motion";
import { Shield, Lock, Server, Key, UserCheck, FileKey, ArrowRight, ShieldCheck } from "lucide-react";

const ARCHITECTURE_STEPS = [
  { id: "patient", icon: FileKey, label: "Patient Data", desc: "Local device encryption before transmission." },
  { id: "encryption", icon: Lock, label: "Encrypted Transit", desc: "End-to-end TLS 1.3 encrypted data pipelines." },
  { id: "infrastructure", icon: Server, label: "Secure Infrastructure", desc: "HIPAA-compliant isolated cloud environments." },
  { id: "access", icon: Key, label: "Authorized Access", desc: "Zero-trust verification and RBAC." },
  { id: "professional", icon: UserCheck, label: "Healthcare Professional", desc: "Decrypted only at the point of care." }
];

export default function SecurityPage() {
  return (
    <div className="bg-slate-50 min-h-screen py-20 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto mb-24">
          <div className="w-16 h-16 mx-auto bg-medical-100 text-medical-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">Built Around Trust.</h1>
          <p className="text-xl text-slate-600">
            PharmaKon employs military-grade encryption and zero-trust architecture to ensure patient data remains confidential and secure across the entire healthcare continuum.
          </p>
        </div>

        {/* Architecture Visualization */}
        <div className="relative max-w-5xl mx-auto mb-32">
          
          <div className="hidden lg:block absolute top-1/2 left-0 w-full h-1 bg-slate-200 -translate-y-1/2 z-0" />
          
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 lg:flex lg:justify-between lg:items-center gap-8">
            {ARCHITECTURE_STEPS.map((step, i) => (
              <motion.div 
                key={step.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.15 }}
                className="flex flex-col items-center text-center group relative"
              >
                {/* Connector Arrow (Mobile/Tablet) */}
                {i < ARCHITECTURE_STEPS.length - 1 && (
                  <div className="lg:hidden h-8 w-px bg-slate-200 my-2" />
                )}

                {/* Node */}
                <div className="w-24 h-24 bg-white rounded-2xl border-2 border-slate-200 shadow-md flex items-center justify-center mb-6 group-hover:border-medical-500 group-hover:shadow-medical-500/20 transition-all duration-300 relative z-10">
                  <step.icon className="w-10 h-10 text-slate-600 group-hover:text-medical-600 transition-colors" />
                </div>
                
                <h3 className="text-lg font-bold text-slate-900 mb-2">{step.label}</h3>
                <p className="text-sm text-slate-500 max-w-[160px] leading-relaxed">{step.desc}</p>
                
                {/* Active state indicator line */}
                <div className="absolute -bottom-4 w-12 h-1 bg-medical-500 rounded-full scale-0 group-hover:scale-100 transition-transform duration-300" />
              </motion.div>
            ))}
          </div>

          {/* Animated data flow */}
          <div className="hidden lg:block absolute top-1/2 left-0 w-full h-1 -translate-y-1/2 z-0 overflow-hidden">
            <motion.div 
              animate={{ x: ["-100%", "500%"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="w-1/4 h-full bg-gradient-to-r from-transparent via-medical-400 to-transparent blur-sm"
            />
          </div>
        </div>

        {/* Security Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {[
            { title: "End-to-End Encryption", desc: "Data is encrypted at rest and in transit." },
            { title: "Role-Based Access", desc: "Strict RBAC ensures only authorized personnel access records." },
            { title: "Immutable Audit Logs", desc: "Every action is logged and cryptographically secured." },
            { title: "HIPAA Compliant", desc: "Architecture designed to exceed healthcare compliance standards." }
          ].map((feature, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center hover:shadow-md transition-shadow">
              <ShieldCheck className="w-8 h-8 text-medical-600 mb-4" />
              <h4 className="font-bold text-slate-900 mb-2">{feature.title}</h4>
              <p className="text-sm text-slate-500 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
