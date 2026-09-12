"use client";

import { motion } from "framer-motion";
import { ArrowLeft, User, Lock, Activity, ShieldCheck, UserPlus, Mail } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { SwipeText } from "@/components/ui/SwipeText";
import { useRouter } from "next/navigation";

export default function PatientRegister() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Always succeed for presentation purposes!
    setSuccess(true);
    setTimeout(() => {
      router.push("/patient/dashboard");
    }, 1500);
  };

  return (
    <main className="min-h-screen bg-[#04101A] relative flex items-center justify-center overflow-hidden py-12">
      {/* Background Decor */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-[50vw] h-[50vw] bg-teal-500/10 rounded-full blur-[150px] transform -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-[50vw] h-[50vw] bg-emerald-600/10 rounded-full blur-[150px] transform translate-x-1/2 translate-y-1/2" />
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay" />
        
        {/* Floating elements */}
        <motion.div 
          animate={{ y: [0, -20, 0], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 right-1/4 hidden lg:block"
        >
          <Activity className="w-12 h-12 text-teal-500/30" />
        </motion.div>
        <motion.div 
          animate={{ y: [0, 20, 0], opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-1/4 left-1/4 hidden lg:block"
        >
          <ShieldCheck className="w-16 h-16 text-emerald-500/20" />
        </motion.div>
      </div>

      <div className="relative z-10 w-full max-w-md px-4 sm:px-6">
        
        {/* Back Link */}
        <Link 
          href="/patient/login" 
          className="inline-flex items-center gap-2 text-slate-400 hover:text-teal-400 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to Login</span>
        </Link>

        {/* Register Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-[#0B1F33]/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden"
        >
          {/* Subtle top highlight */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500" />

          <div className="flex flex-col items-center mb-8">
            <Link href="/" className="mb-6">
              <Image 
                src="/PharmaKon.png" 
                alt="PharmaKon Logo" 
                width={48} 
                height={48} 
                className="w-12 h-12 object-contain" 
              />
            </Link>
            <SwipeText>
              <h1 className="text-3xl font-extrabold text-white mb-2 text-center">Create Account</h1>
            </SwipeText>
            <p className="text-slate-400 text-sm text-center">
              Join PharmaKon and take control of your healthcare journey.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {success && (
              <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 px-4 py-3 rounded-lg text-sm font-medium text-center">
                Account created successfully! Redirecting...
              </div>
            )}

            <div className="space-y-4">
              {/* Full Name Input */}
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-teal-400 transition-colors">
                  <User className="w-5 h-5" />
                </div>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full Legal Name" 
                  className="w-full bg-[#04101A] border border-slate-700 text-white rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all placeholder:text-slate-600"
                  required
                />
              </div>

              {/* Email Input */}
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-teal-400 transition-colors">
                  <Mail className="w-5 h-5" />
                </div>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email Address" 
                  className="w-full bg-[#04101A] border border-slate-700 text-white rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all placeholder:text-slate-600"
                  required
                />
              </div>

              {/* Password Input */}
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-teal-400 transition-colors">
                  <Lock className="w-5 h-5" />
                </div>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create Password" 
                  className="w-full bg-[#04101A] border border-slate-700 text-white rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all placeholder:text-slate-600"
                  required
                />
              </div>
            </div>

            <div className="text-xs text-slate-400 leading-relaxed">
              By creating an account, you agree to our <span className="text-teal-400">Terms of Service</span> and <span className="text-teal-400">Privacy Policy</span>.
            </div>

            <button 
              type="submit" 
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-[#04101A] font-bold rounded-xl transition-all shadow-[0_10px_20px_-10px_rgba(20,184,166,0.5)] hover:shadow-[0_10px_30px_-10px_rgba(20,184,166,0.6)] hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              <UserPlus className="w-5 h-5" />
              Register Account
            </button>
          </form>

          <div className="mt-8 text-center border-t border-slate-800 pt-6">
            <p className="text-slate-400 text-sm">
              Already have an account? <Link href="/patient/login" className="text-teal-400 hover:text-teal-300 font-medium transition-colors">Sign in here</Link>
            </p>
          </div>
        </motion.div>

        <div className="mt-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4" />
          HIPAA Compliant & Encrypted
        </div>
      </div>
    </main>
  );
}
