"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Building2, Clock, Users, ArrowRight } from "lucide-react";
import dynamic from "next/dynamic";
import { SwipeText } from "@/components/ui/SwipeText";

const HospitalMap = dynamic(() => import("./HospitalMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-100 rounded-3xl">
      <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  ),
});

const hospitals = [
  { id: 1, name: "AIIMS New Delhi", location: "Ansari Nagar, New Delhi", stats: { beds: "2400+", waitTime: "20 min", specialists: "500+" }, lat: 28.5672, lng: 77.2100 },
  { id: 2, name: "Apollo Hospitals", location: "Greams Road, Chennai", stats: { beds: "560+", waitTime: "15 min", specialists: "200+" }, lat: 13.0617, lng: 80.2520 },
  { id: 3, name: "Tata Memorial Hospital", location: "Parel, Mumbai", stats: { beds: "700+", waitTime: "30 min", specialists: "300+" }, lat: 19.0041, lng: 72.8402 },
  { id: 4, name: "Fortis Escorts Heart Institute", location: "Okhla Road, New Delhi", stats: { beds: "310+", waitTime: "10 min", specialists: "150+" }, lat: 28.5606, lng: 77.2774 },
  { id: 5, name: "Sir Sunderlal Hospital (BHU)", location: "Lanka, Varanasi", stats: { beds: "1200+", waitTime: "25 min", specialists: "250+" }, lat: 25.2750, lng: 82.9926 },
  { id: 6, name: "Medanta - The Medicity", location: "Sector 38, Gurugram", stats: { beds: "1250+", waitTime: "15 min", specialists: "350+" }, lat: 28.4357, lng: 77.0428 },
  { id: 7, name: "Christian Medical College (CMC)", location: "Ida Scudder Road, Vellore", stats: { beds: "3000+", waitTime: "40 min", specialists: "600+" }, lat: 12.9231, lng: 79.1332 },
  { id: 8, name: "Narayana Health City", location: "Bommasandra, Bengaluru", stats: { beds: "800+", waitTime: "12 min", specialists: "180+" }, lat: 12.8123, lng: 77.6834 },
  { id: 9, name: "PGIMER", location: "Sector 12, Chandigarh", stats: { beds: "1900+", waitTime: "35 min", specialists: "450+" }, lat: 30.7627, lng: 76.7766 }
];

export function HospitalsSection() {
  const [activeId, setActiveId] = useState(1);
  const activeHospital = hospitals.find((h) => h.id === activeId) || hospitals[0];

  return (
    <section className="py-24 bg-[#0B1F33] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="mb-6">
            <SwipeText>
              <h2 className="text-4xl md:text-5xl font-extrabold text-white">
                Care Locations <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">Near You</span>
              </h2>
            </SwipeText>
          </div>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-lg text-slate-400 font-medium"
          >
            Access our premium network of state-of-the-art hospitals and specialized care centers, fully integrated into the PharmaKon ecosystem.
          </motion.p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          
          {/* Left: Hospital List */}
          <div className="flex flex-col gap-4 max-h-[600px] overflow-y-auto pr-2 no-scrollbar">
            {hospitals.map((hospital, index) => {
              const isActive = hospital.id === activeId;
              return (
                <motion.div
                  key={hospital.id}
                  onClick={() => setActiveId(hospital.id)}
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className={`p-6 rounded-2xl border transition-all duration-300 cursor-pointer shrink-0 ${
                    isActive 
                    ? 'bg-[#04101A] shadow-[0_20px_50px_-20px_rgba(20,184,166,0.2)] border-teal-500/50 scale-[1.02] sticky top-0 bottom-0 z-10' 
                    : 'bg-slate-900/50 border-slate-800 hover:bg-slate-800 hover:border-teal-500/30 hover:shadow-md'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">{hospital.name}</h3>
                      <div className="flex items-center gap-1.5 text-slate-400 text-sm">
                        <MapPin className="w-4 h-4 text-teal-400" />
                        <span>{hospital.location}</span>
                      </div>
                    </div>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isActive ? 'bg-teal-500/20 text-teal-400' : 'bg-slate-800 text-slate-500'}`}>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-800">
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-400 font-medium uppercase mb-1 flex items-center gap-1"><Building2 className="w-3 h-3" /> Beds</span>
                      <span className="font-bold text-white">{hospital.stats.beds}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-400 font-medium uppercase mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> ER Wait</span>
                      <span className={`font-bold ${isActive ? 'text-emerald-400' : 'text-white'}`}>{hospital.stats.waitTime}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-400 font-medium uppercase mb-1 flex items-center gap-1"><Users className="w-3 h-3" /> Specialists</span>
                      <span className="font-bold text-white">{hospital.stats.specialists}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Right: Interactive Map */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative h-[600px] rounded-3xl overflow-hidden shadow-2xl group border border-slate-800"
          >
            <HospitalMap 
              center={[activeHospital.lat, activeHospital.lng]} 
              hospitals={hospitals} 
              activeId={activeId} 
            />
            
            {/* Map UI Elements Overlay */}
            <div className="absolute inset-0 p-8 flex flex-col justify-end pointer-events-none z-[400]">
              <div className="bg-[#04101A]/90 backdrop-blur-md border border-slate-700 p-6 rounded-2xl w-full max-w-sm pointer-events-auto shadow-xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                  <span className="text-white font-semibold tracking-wide">{activeHospital.name}</span>
                </div>
                <p className="text-slate-400 text-sm mb-4">Accepting new patients. Emergency room operating at normal capacity.</p>
                <button className="w-full py-2.5 bg-teal-500 hover:bg-teal-400 transition-colors text-white text-sm font-semibold rounded-lg shadow-md">
                  Get Directions
                </button>
              </div>
            </div>
          </motion.div>

        </div>

      </div>
    </section>
  );
}
