"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, FlaskConical, LayoutDashboard } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SwipeText } from "@/components/ui/SwipeText";

export function EntryGateway() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    if (show) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [show]);

  const handleDemoSelect = () => {
    setShow(false);
  };

  const handleWorkspaceSelect = () => {
    // Let the Link handle the navigation naturally
    document.body.style.overflow = 'unset';
  };

  if (!show) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div 
          initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
          animate={{ opacity: 1, backdropFilter: "blur(40px)" }}
          exit={{ y: "-100%", opacity: 0, backdropFilter: "blur(0px)" }}
          transition={{ duration: 1, ease: [0.76, 0, 0.24, 1] }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#04101A]/95"
        >
          {/* Subtle Ambient Background Gradients */}
          <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
            <motion.div 
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1.5, delay: 0.2 }}
              className="absolute top-0 right-0 w-[50vw] h-[50vw] bg-teal-500/10 rounded-full blur-[120px] transform translate-x-1/2 -translate-y-1/2" 
            />
            <motion.div 
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1.5, delay: 0.4 }}
              className="absolute bottom-0 left-0 w-[50vw] h-[50vw] bg-blue-500/10 rounded-full blur-[150px] transform -translate-x-1/2 translate-y-1/2" 
            />
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay" />
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -50 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
            className="relative z-10 w-full max-w-2xl px-4 flex flex-col items-center text-center"
          >
            <motion.div 
              initial={{ y: 40, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.8, type: "spring", bounce: 0.4 }}
              className="mb-10"
            >
              <div className="flex justify-center mb-6 relative group">
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1.5 }}
                  transition={{ delay: 0.6, duration: 1, ease: "easeOut" }}
                  className="absolute inset-0 bg-teal-500/20 blur-2xl rounded-full" 
                />
                <Image 
                  src="/PharmaKon.png" 
                  alt="PharmaKon Logo" 
                  width={72} 
                  height={72} 
                  className="relative z-10 w-20 h-20 object-contain drop-shadow-[0_0_15px_rgba(20,184,166,0.3)] transition-transform duration-500 group-hover:scale-110" 
                />
              </div>
              <SwipeText>
                <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
                  Welcome to PharmaKon
                </h1>
              </SwipeText>
              <p className="text-lg text-slate-400 max-w-lg mx-auto">
                Please select your experience to continue. You can explore the public landing page or enter the secure workspace.
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-2 gap-6 w-full">
              {/* Demo Option */}
              <motion.button 
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.6, type: "spring", bounce: 0.3 }}
                onClick={handleDemoSelect}
                className="group relative flex flex-col items-center p-8 bg-[#0B1F33]/80 border border-slate-700 hover:border-teal-400 rounded-3xl transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(20,184,166,0.2)] text-left w-full h-full text-center"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-slate-800 to-[#04101A] rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-slate-700 group-hover:border-teal-500/50 group-hover:from-teal-500/20 group-hover:to-emerald-500/20">
                  <FlaskConical className="w-8 h-8 text-slate-400 group-hover:text-teal-400 transition-colors" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">View Demo</h3>
                <p className="text-sm text-slate-400">
                  Explore our public landing page, features, and platform ecosystem overview.
                </p>
                <div className="mt-6 flex items-center text-teal-400 font-medium opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300 group-hover:gap-2">
                  <span>Explore Features</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </motion.button>

              {/* Workspace Option */}
              <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.75, duration: 0.6, type: "spring", bounce: 0.3 }}
                className="w-full h-full"
              >
                <Link 
                  href="/patient/login"
                  onClick={handleWorkspaceSelect}
                  className="group relative flex flex-col items-center p-8 bg-gradient-to-br from-teal-900/40 to-[#0B1F33]/90 border border-slate-700 hover:border-teal-400 rounded-3xl transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(20,184,166,0.4)] text-left w-full h-full text-center"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 to-emerald-500/10 opacity-0 group-hover:opacity-100 rounded-3xl transition-opacity duration-300" />
                  <div className="relative z-10 flex flex-col items-center h-full">
                    <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-[0_0_20px_rgba(20,184,166,0.3)]">
                      <LayoutDashboard className="w-8 h-8 text-[#04101A]" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">Workspace</h3>
                    <p className="text-sm text-slate-400">
                      Enter the secure patient portal and application workspace.
                    </p>
                    <div className="mt-auto pt-6 flex items-center text-teal-400 font-medium group-hover:gap-2 transition-all">
                      <span>Enter Workspace</span>
                      <ArrowRight className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
