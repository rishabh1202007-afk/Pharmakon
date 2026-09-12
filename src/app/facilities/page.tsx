"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Activity, Microscope, Scan, Dna, Stethoscope, HeartPulse, Building2, X, CheckCircle2 } from "lucide-react";
import Link from "next/link";

interface FacilityDetail {
  title: string;
  description: string;
}

interface Facility {
  title: string;
  description: string;
  icon: any;
  color: string;
  bg: string;
  border: string;
  hoverBorder: string;
  details?: FacilityDetail[];
}

const facilities: Facility[] = [
  {
    title: "Advanced Imaging Center",
    description: "State-of-the-art 3T MRI, 256-slice CT, and PET scans with AI-assisted analysis for millimeter-precise diagnostics.",
    icon: Scan,
    color: "text-teal-400",
    bg: "bg-teal-500/20",
    border: "border-teal-500/30",
    hoverBorder: "hover:border-teal-500/60",
    details: [
      { title: "3T MRI", description: "High-resolution imaging for the brain, spine, joints, organs, and soft tissues." },
      { title: "256-Slice CT", description: "Fast, detailed cross-sectional imaging for cardiac, vascular, neurological, and emergency evaluation." },
      { title: "PET-CT", description: "Combines metabolic and anatomical imaging to support cancer detection, staging, and treatment monitoring." },
      { title: "AI-Assisted Analysis", description: "Intelligent image analysis helps radiologists identify subtle patterns and abnormalities." },
      { title: "3D Reconstruction", description: "Converts scan data into detailed 3D anatomical views for improved clinical planning." }
    ]
  },
  {
    title: "Automated Pathology Lab",
    description: "Robotic sample processing and digital pathology with zero-error tolerance. Results delivered directly to your portal.",
    icon: Microscope,
    color: "text-emerald-400",
    bg: "bg-emerald-500/20",
    border: "border-emerald-500/30",
    hoverBorder: "hover:border-emerald-500/60",
    details: [
      { title: "Automated Sample Processing", description: "Streamlined handling, sorting, and preparation of laboratory samples." },
      { title: "Digital Pathology", description: "High-resolution digital slides enable efficient examination, documentation, and sharing." },
      { title: "AI-Assisted Analysis", description: "Intelligent tools can support specialists by highlighting relevant patterns and potential abnormalities." },
      { title: "Automated Workflow Tracking", description: "Samples can be tracked throughout the testing process to improve traceability." },
      { title: "Integrated Reporting", description: "Results can be securely connected with the hospital's digital records and authorized clinical teams." }
    ]
  },
  {
    title: "Genomics & Sequencing",
    description: "Comprehensive DNA profiling and genetic screening to enable highly personalized medicine and targeted treatments.",
    icon: Dna,
    color: "text-purple-400",
    bg: "bg-purple-500/20",
    border: "border-purple-500/30",
    hoverBorder: "hover:border-purple-500/60",
    details: [
      { title: "DNA Sequencing", description: "Analyzes selected regions or broader portions of the genome to identify genetic variants." },
      { title: "Genetic Screening", description: "Helps assess specific inherited or clinically relevant genetic conditions." },
      { title: "Molecular Profiling", description: "Examines genetic characteristics that can support disease classification and treatment planning." },
      { title: "Pharmacogenomics", description: "Helps evaluate how genetic differences may influence an individual's response to certain medications." },
      { title: "Cancer Genomics", description: "Genetic profiling can help identify clinically relevant tumor alterations for oncology care." }
    ]
  },
  {
    title: "Cardiology & Cath Lab",
    description: "24/7 advanced cardiac care unit equipped with the latest hemodynamic monitoring and interventional technology.",
    icon: HeartPulse,
    color: "text-rose-400",
    bg: "bg-rose-500/20",
    border: "border-rose-500/30",
    hoverBorder: "hover:border-rose-500/60",
    details: [
      { title: "Cardiac Diagnostics", description: "ECG, echocardiography, stress testing, and other cardiac evaluations." },
      { title: "Coronary Angiography", description: "Detailed imaging of coronary arteries to identify blockages and narrowing." },
      { title: "Cardiac Catheterization", description: "Minimally invasive assessment and treatment of cardiovascular conditions." },
      { title: "Coronary Interventions", description: "Catheter-based procedures such as angioplasty and stent placement when clinically indicated." },
      { title: "Hemodynamic Monitoring", description: "Real-time monitoring of blood pressure and cardiovascular parameters during procedures." },
      { title: "Emergency Cardiac Care", description: "Rapid coordination for time-sensitive cardiac emergencies." }
    ]
  },
  {
    title: "Specialized Clinics",
    description: "Multi-disciplinary centers for oncology, neurology, and orthopedics featuring world-class specialists.",
    icon: Stethoscope,
    color: "text-blue-400",
    bg: "bg-blue-500/20",
    border: "border-blue-500/30",
    hoverBorder: "hover:border-blue-500/60",
    details: [
      { title: "Oncology Center", description: "Comprehensive cancer care covering diagnosis, treatment planning, chemotherapy coordination, radiation therapy support, and long-term monitoring." },
      { title: "Neurology & Neurosciences", description: "Specialized evaluation and management of neurological conditions with access to advanced imaging, diagnostics, and multidisciplinary consultation." },
      { title: "Orthopedics & Joint Care", description: "Focused care for bones, joints, muscles, sports injuries, spine conditions, and mobility-related disorders." },
      { title: "Cardiac Sciences", description: "Specialist-led cardiovascular evaluation, diagnostics, interventional procedures, and ongoing cardiac management." },
      { title: "Women’s Health", description: "Dedicated services for gynecology, reproductive health, pregnancy care, and women-specific medical needs." },
      { title: "Gastroenterology", description: "Diagnosis and management of digestive-system disorders supported by advanced imaging and endoscopic services." }
    ]
  },
  {
    title: "Intensive Care Units",
    description: "Smart ICUs with continuous AI monitoring, predictive alerting systems, and 1-to-1 dedicated critical care nursing.",
    icon: Activity,
    color: "text-amber-400",
    bg: "bg-amber-500/20",
    border: "border-amber-500/30",
    hoverBorder: "hover:border-amber-500/60",
    details: [
      { title: "24/7 Patient Monitoring", description: "Continuous monitoring of vital parameters such as heart rate, blood pressure, oxygen saturation, respiratory status, and other critical indicators." },
      { title: "AI-Assisted Monitoring", description: "Intelligent monitoring tools can help identify concerning changes in patient parameters and support faster clinical attention." },
      { title: "Predictive Alerting", description: "Advanced systems can analyze patient trends and generate alerts when predefined or clinically relevant changes require review." },
      { title: "Advanced Life Support", description: "ICU infrastructure supports patients requiring respiratory support, hemodynamic monitoring, and other intensive interventions." },
      { title: "Dedicated Critical-Care Nursing", description: "Close bedside observation and continuous nursing support help maintain patient safety and timely care." },
      { title: "Multidisciplinary Care", description: "Critical-care specialists, nurses, respiratory therapists, and other clinical teams collaborate to manage complex conditions." }
    ]
  }
];

export default function FacilitiesPage() {
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);

  return (
    <div className="min-h-screen bg-[#04101A] pt-24 pb-20 selection:bg-teal-500/30 selection:text-teal-200">
      
      {/* Background Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-teal-600/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 left-1/4 w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[150px]" />
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Navigation & Header */}
        <div className="mb-16">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-slate-400 hover:text-teal-400 transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Home</span>
          </Link>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-teal-500/30 bg-teal-500/10 backdrop-blur-md mb-6">
              <Building2 className="w-4 h-4 text-teal-400" />
              <span className="text-xs font-bold text-teal-300 tracking-widest uppercase">
                PharmaKon Facilities
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-tight mb-6">
              World-Class <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-400">Infrastructure.</span>
            </h1>
            <p className="text-xl text-slate-400 max-w-3xl leading-relaxed">
              Explore our cutting-edge medical facilities designed to provide unparalleled care, accurate diagnostics, and a seamless healing environment.
            </p>
          </motion.div>
        </div>

        {/* Facilities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {facilities.map((facility, index) => (
            <motion.div
              key={facility.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`p-8 rounded-3xl bg-[#0B1F33]/50 backdrop-blur-xl border border-slate-800 ${facility.hoverBorder} transition-all duration-300 hover:shadow-[0_0_30px_rgba(20,184,166,0.1)] group flex flex-col h-full`}
            >
              <div className={`w-14 h-14 rounded-2xl ${facility.bg} ${facility.color} flex items-center justify-center mb-6 border ${facility.border} group-hover:scale-110 transition-transform duration-500`}>
                <facility.icon className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">{facility.title}</h3>
              <p className="text-slate-400 leading-relaxed flex-grow">{facility.description}</p>
              
              <div className="mt-8 pt-6 border-t border-slate-800/50">
                <button 
                  onClick={() => setSelectedFacility(facility)}
                  className="text-sm font-bold text-teal-400 hover:text-teal-300 transition-colors flex items-center gap-2 cursor-pointer group"
                >
                  View Details
                  <ArrowLeft className="w-4 h-4 rotate-180 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Call to action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-20 p-10 rounded-[40px] bg-gradient-to-r from-teal-900/40 to-blue-900/40 border border-teal-500/20 backdrop-blur-xl text-center relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay" />
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Experience Care Redefined</h2>
            <p className="text-slate-300 mb-8 max-w-2xl mx-auto">
              Schedule a visit or book an appointment at any of our state-of-the-art facilities today.
            </p>
            <Link href="/patient/login" className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-teal-500 hover:bg-teal-400 text-[#04101A] rounded-full font-bold transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(20,184,166,0.3)]">
              Book Appointment
            </Link>
          </div>
        </motion.div>
        
      </div>

      {/* Facility Details Modal */}
      <AnimatePresence>
        {selectedFacility && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pt-20 pb-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#04101A]/80 backdrop-blur-sm"
              onClick={() => setSelectedFacility(null)}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-3xl bg-[#0B1F33] border border-slate-700 rounded-3xl overflow-hidden shadow-2xl z-10 max-h-full flex flex-col"
            >
              <div className="p-6 md:p-8 overflow-y-auto">
                <button 
                  onClick={() => setSelectedFacility(null)}
                  className="absolute top-6 right-6 p-2 bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                
                <div className={`w-16 h-16 rounded-2xl ${selectedFacility.bg} ${selectedFacility.color} flex items-center justify-center mb-6 border ${selectedFacility.border}`}>
                  <selectedFacility.icon className="w-8 h-8" />
                </div>
                
                <h2 className="text-3xl font-bold text-white mb-2">{selectedFacility.title}</h2>
                <p className="text-slate-400 mb-8 max-w-2xl">{selectedFacility.description}</p>
                
                {selectedFacility.details && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white mb-4">Available Technologies & Services</h3>
                    <div className="grid gap-4">
                      {selectedFacility.details.map((detail, idx) => (
                        <div key={idx} className="flex gap-4 p-4 rounded-2xl bg-[#04101A]/50 border border-slate-800 hover:border-slate-700 transition-colors">
                          <CheckCircle2 className={`w-6 h-6 flex-shrink-0 ${selectedFacility.color}`} />
                          <div>
                            <h4 className="text-white font-medium mb-1">{detail.title}</h4>
                            <p className="text-sm text-slate-400 leading-relaxed">{detail.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
