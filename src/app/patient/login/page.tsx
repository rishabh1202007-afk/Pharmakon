"use client";

import { motion } from "framer-motion";
import { ArrowLeft, User, Lock, Activity, ShieldCheck, Fingerprint } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { SwipeText } from "@/components/ui/SwipeText";
import { useRouter } from "next/navigation";
import { PharmacySection } from "@/components/home/PharmacySection";
import { EmergencySection } from "@/components/home/EmergencySection";

export default function PatientLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    // Always succeed for presentation purposes!
    setSuccess(true);
    setTimeout(() => {
      router.push("/patient/dashboard");
    }, 1000);
  };

  return (
    <div className="bg-[#04101A] min-h-screen">
      <main className="min-h-screen relative flex items-center justify-center overflow-hidden">
        {/* Background Decor */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[50vw] h-[50vw] bg-teal-500/10 rounded-full blur-[150px] transform translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-[50vw] h-[50vw] bg-blue-600/10 rounded-full blur-[150px] transform -translate-x-1/2 translate-y-1/2" />
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay" />
          
          {/* Floating elements */}
          <motion.div 
            animate={{ y: [0, -20, 0], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/4 left-1/4 hidden lg:block"
          >
            <Activity className="w-12 h-12 text-teal-500/30" />
          </motion.div>
          <motion.div 
            animate={{ y: [0, 20, 0], opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute bottom-1/4 right-1/4 hidden lg:block"
          >
            <ShieldCheck className="w-16 h-16 text-blue-500/20" />
          </motion.div>
        </div>

        <div className="relative z-10 w-full max-w-md px-4 sm:px-6">
          
          {/* Back Link */}
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-slate-400 hover:text-teal-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 rounded transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Home</span>
          </Link>

          {/* Login Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-[#0B1F33]/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden"
          >
            {/* Subtle top highlight */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 via-emerald-400 to-blue-500" />

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
                <h1 className="text-3xl font-extrabold text-white mb-2">Patient Portal</h1>
              </SwipeText>
              <p className="text-slate-400 text-sm text-center">
                Securely access your health records, prescriptions, and appointments.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              
              {/* Form Messages */}
              <div aria-live="polite" className="empty:hidden">
                {error && (
                  <div role="alert" className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm font-medium text-center shadow-lg">
                    {error}
                  </div>
                )}
                {success && (
                  <div role="alert" className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 px-4 py-3 rounded-lg text-sm font-medium text-center shadow-lg">
                    Login successful! Redirecting...
                  </div>
                )}
              </div>

              <div className="space-y-5">
                {/* Email Input */}
                <div className="relative group pt-2">
                  <input 
                    type="email" 
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder=" " 
                    aria-invalid={!!error}
                    className="peer w-full bg-[#04101A] border border-slate-700 text-white rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1F33] transition-all placeholder-transparent"
                    required
                  />
                  <label 
                    htmlFor="email"
                    className="absolute left-12 text-slate-500 text-base transition-all duration-200 peer-placeholder-shown:text-base peer-placeholder-shown:text-slate-500 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-focus:top-0 peer-focus:text-xs peer-focus:text-teal-400 peer-focus:-translate-y-1/2 peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:-translate-y-1/2 pointer-events-none bg-[#0B1F33] px-1"
                  >
                    Email or Patient ID
                  </label>
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 peer-focus:text-teal-400 transition-colors pt-2">
                    <User className="w-5 h-5" />
                  </div>
                </div>

                {/* Password Input */}
                <div className="relative group pt-2">
                  <input 
                    type="password" 
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder=" " 
                    aria-invalid={!!error}
                    className="peer w-full bg-[#04101A] border border-slate-700 text-white rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1F33] transition-all placeholder-transparent"
                    required
                  />
                  <label 
                    htmlFor="password"
                    className="absolute left-12 text-slate-500 text-base transition-all duration-200 peer-placeholder-shown:text-base peer-placeholder-shown:text-slate-500 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-focus:top-0 peer-focus:text-xs peer-focus:text-teal-400 peer-focus:-translate-y-1/2 peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:-translate-y-1/2 pointer-events-none bg-[#0B1F33] px-1"
                  >
                    Password
                  </label>
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 peer-focus:text-teal-400 transition-colors pt-2">
                    <Lock className="w-5 h-5" />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label htmlFor="remember-me" className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    id="remember-me"
                    className="w-4.5 h-4.5 rounded border-slate-600 bg-[#04101A] text-teal-500 focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1F33] cursor-pointer transition-colors" 
                  />
                  <span className="text-slate-300 group-hover:text-white transition-colors">Remember me</span>
                </label>
                <Link href="/patient/forgot-password" className="text-teal-400 hover:text-teal-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 rounded transition-colors font-medium">
                  Forgot Password?
                </Link>
              </div>

              <button 
                type="submit" 
                className="w-full py-4 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1F33] text-[#04101A] font-bold rounded-xl transition-all shadow-[0_10px_20px_-10px_rgba(20,184,166,0.5)] hover:shadow-[0_10px_30px_-10px_rgba(20,184,166,0.6)] hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Fingerprint className="w-5 h-5" />
                Sign In Securely
              </button>
            </form>

            <div className="mt-8 text-center border-t border-slate-800 pt-6">
              <p className="text-slate-400 text-sm">
                New to PharmaKon? <Link href="/patient/register" className="text-teal-400 hover:text-teal-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 rounded font-medium transition-colors">Create an account</Link>
              </p>
            </div>
          </motion.div>

          <div className="mt-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            Protected by PharmaKon Enterprise Security
          </div>
        </div>
      </main>

      {/* Sections Added for Showcase */}
      <PharmacySection />
      <EmergencySection />
    </div>
  );
}
