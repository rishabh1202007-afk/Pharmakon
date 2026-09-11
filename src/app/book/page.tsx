"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronRight, ArrowLeft, Stethoscope, Calendar, Clock, User, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, label: "Specialty" },
  { id: 2, label: "Doctor" },
  { id: 3, label: "Date" },
  { id: 4, label: "Time" },
  { id: 5, label: "Details" },
  { id: 6, label: "Confirm" }
];

export default function BookingPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    specialty: "",
    doctor: "",
    date: "",
    time: "",
    patientName: "",
    email: "",
    phone: "",
    reason: ""
  });

  const nextStep = () => setStep(s => Math.min(s + 1, 6));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const slideVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
  };

  return (
    <div className="bg-slate-50 min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Progress Bar */}
        <div className="mb-12 relative">
          <div className="overflow-hidden h-2 mb-4 text-xs flex rounded-full bg-slate-200">
            <div style={{ width: `${((step - 1) / 5) * 100}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-medical-500 transition-all duration-500"></div>
          </div>
          <div className="flex justify-between hidden sm:flex">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex flex-col items-center">
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mb-2 transition-colors duration-300", 
                  step > s.id ? "bg-medical-500 text-white" : step === s.id ? "bg-slate-900 text-white" : "bg-white text-slate-400 border border-slate-200"
                )}>
                  {step > s.id ? <Check className="w-4 h-4" /> : s.id}
                </div>
                <span className={cn("text-xs font-semibold uppercase tracking-wider", step >= s.id ? "text-slate-900" : "text-slate-400")}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden min-h-[500px] flex flex-col">
          
          {/* Header */}
          {step < 6 && (
            <div className="px-8 py-6 border-b border-slate-100 flex items-center gap-4 bg-slate-50/50">
              {step > 1 && (
                <button onClick={prevStep} className="p-2 -ml-2 rounded-full hover:bg-slate-200 text-slate-500 transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <h2 className="text-xl font-bold text-slate-900 flex-1">
                {step === 1 && "Select Specialization"}
                {step === 2 && "Choose a Doctor"}
                {step === 3 && "Select a Date"}
                {step === 4 && "Select a Time"}
                {step === 5 && "Patient Information"}
              </h2>
            </div>
          )}

          {/* Form Content */}
          <div className="p-8 flex-1 relative">
            <AnimatePresence mode="wait">
              
              {step === 1 && (
                <motion.div key="step1" variants={slideVariants} initial="initial" animate="animate" exit="exit" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {["Cardiology", "Neurology", "Orthopedics", "Pediatrics", "Dermatology", "General Medicine"].map(spec => (
                    <button 
                      key={spec}
                      onClick={() => { setFormData({...formData, specialty: spec}); nextStep(); }}
                      className={cn("p-6 text-left rounded-2xl border-2 transition-all hover:border-medical-300 hover:bg-medical-50 group flex items-center justify-between",
                        formData.specialty === spec ? "border-medical-500 bg-medical-50" : "border-slate-100 bg-white"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 group-hover:bg-medical-200 flex items-center justify-center text-medical-600 transition-colors">
                          <Stethoscope className="w-6 h-6" />
                        </div>
                        <span className="font-semibold text-slate-900">{spec}</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-medical-500 transition-colors" />
                    </button>
                  ))}
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="step2" variants={slideVariants} initial="initial" animate="animate" exit="exit" className="space-y-4">
                  {["Dr. Sarah Mehta", "Dr. James Chen", "Dr. Elena Rodriguez"].map(doc => (
                    <button 
                      key={doc}
                      onClick={() => { setFormData({...formData, doctor: doc}); nextStep(); }}
                      className={cn("w-full p-6 text-left rounded-2xl border-2 transition-all hover:border-medical-300 hover:bg-medical-50 group flex flex-col sm:flex-row sm:items-center justify-between gap-4",
                        formData.doctor === doc ? "border-medical-500 bg-medical-50" : "border-slate-100 bg-white"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-lg">
                          {doc.split(" ")[1][0]}{doc.split(" ")[2] ? doc.split(" ")[2][0] : ''}
                        </div>
                        <div>
                          <span className="block font-bold text-lg text-slate-900">{doc}</span>
                          <span className="text-sm text-slate-500">{formData.specialty} • PharmaKon General</span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-medical-500 transition-colors hidden sm:block" />
                    </button>
                  ))}
                </motion.div>
              )}

              {step === 3 && (
                <motion.div key="step3" variants={slideVariants} initial="initial" animate="animate" exit="exit" className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { day: "Mon", date: "10 Sep" },
                    { day: "Tue", date: "11 Sep" },
                    { day: "Wed", date: "12 Sep" },
                    { day: "Thu", date: "13 Sep" },
                    { day: "Fri", date: "14 Sep" },
                    { day: "Sat", date: "15 Sep" },
                    { day: "Sun", date: "16 Sep" },
                    { day: "Mon", date: "17 Sep" },
                  ].map(d => (
                    <button 
                      key={d.date}
                      onClick={() => { setFormData({...formData, date: d.date}); nextStep(); }}
                      className={cn("p-6 text-center rounded-2xl border-2 transition-all hover:border-medical-300 hover:bg-medical-50 flex flex-col items-center justify-center gap-2",
                        formData.date === d.date ? "border-medical-500 bg-medical-50" : "border-slate-100 bg-white"
                      )}
                    >
                      <span className="text-xs font-semibold uppercase text-slate-500">{d.day}</span>
                      <span className="text-xl font-bold text-slate-900">{d.date}</span>
                    </button>
                  ))}
                </motion.div>
              )}

              {step === 4 && (
                <motion.div key="step4" variants={slideVariants} initial="initial" animate="animate" exit="exit" className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {["09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "01:00 PM", "02:00 PM", "03:30 PM", "04:00 PM"].map(time => (
                    <button 
                      key={time}
                      onClick={() => { setFormData({...formData, time: time}); nextStep(); }}
                      className={cn("p-4 text-center rounded-xl border-2 transition-all hover:border-medical-300 hover:bg-medical-50 flex items-center justify-center gap-2 font-semibold text-slate-700",
                        formData.time === time ? "border-medical-500 bg-medical-50 text-medical-700" : "border-slate-100 bg-white"
                      )}
                    >
                      <Clock className="w-4 h-4" /> {time}
                    </button>
                  ))}
                </motion.div>
              )}

              {step === 5 && (
                <motion.div key="step5" variants={slideVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-900">Full Name</label>
                      <input 
                        type="text" 
                        value={formData.patientName} 
                        onChange={e => setFormData({...formData, patientName: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-medical-500 focus:bg-white transition-colors" 
                        placeholder="John Doe" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-900">Phone Number</label>
                      <input 
                        type="tel" 
                        value={formData.phone} 
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-medical-500 focus:bg-white transition-colors" 
                        placeholder="+1 (555) 000-0000" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-900">Email Address</label>
                    <input 
                      type="email" 
                      value={formData.email} 
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-medical-500 focus:bg-white transition-colors" 
                      placeholder="john@example.com" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-900">Reason for Visit</label>
                    <textarea 
                      value={formData.reason} 
                      onChange={e => setFormData({...formData, reason: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-medical-500 focus:bg-white transition-colors min-h-[100px] resize-none" 
                      placeholder="Briefly describe your symptoms or reason for consultation..." 
                    />
                  </div>
                  <div className="pt-4">
                    <button 
                      onClick={nextStep}
                      className="w-full bg-slate-900 text-white font-bold text-lg py-4 rounded-xl shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all active:scale-[0.98]"
                    >
                      Confirm Appointment
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 6 && (
                <motion.div key="step6" variants={slideVariants} initial="initial" animate="animate" exit="exit" className="flex flex-col items-center justify-center text-center h-full py-12">
                  <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-8 relative">
                    <div className="absolute inset-0 bg-emerald-100 rounded-full animate-ping opacity-50" />
                    <CheckCircle2 className="w-12 h-12 text-emerald-600 relative z-10" />
                  </div>
                  
                  <h2 className="text-3xl font-bold text-slate-900 mb-2">Appointment Confirmed</h2>
                  <p className="text-slate-600 mb-8 max-w-md mx-auto">
                    Your consultation details have been sent to your email. You can manage this appointment in your Patient Portal.
                  </p>

                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 w-full max-w-md text-left mb-8">
                    <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-slate-200">
                      <div>
                        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Doctor</p>
                        <p className="font-bold text-slate-900">{formData.doctor || "Dr. Sarah Mehta"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Specialty</p>
                        <p className="font-bold text-slate-900">{formData.specialty || "Cardiology"}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Date & Time</p>
                        <p className="font-bold text-slate-900">{formData.date || "10 Sep"}, {formData.time || "10:00 AM"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Appointment ID</p>
                        <p className="font-mono font-bold text-medical-600">PK-20481</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button className="px-6 py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors">
                      Go to Dashboard
                    </button>
                    <button className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors">
                      Add to Calendar
                    </button>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>

      </div>
    </div>
  );
}
