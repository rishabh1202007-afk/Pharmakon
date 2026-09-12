"use client";

import { motion } from "framer-motion";
import { User, Users, Building, Pill, Activity, BrainCircuit } from "lucide-react";
import { cn } from "@/lib/utils";

const SERVICES = [
  {
    title: "Smart Patient Care",
    description: "Personalized healthcare journeys built around every patient with continuous monitoring.",
    icon: User,
    color: "from-rose-100 to-rose-50",
    iconColor: "text-rose-600",
    borderColor: "border-rose-100",
  },
  {
    title: "Doctor Network",
    description: "Discover world-class specialists, manage appointments, and conduct teleconsultations.",
    icon: Users,
    color: "from-blue-100 to-blue-50",
    iconColor: "text-blue-600",
    borderColor: "border-blue-100",
  },
  {
    title: "Hospital Intelligence",
    description: "Modern hospital operations, bed management, and optimized resource allocation.",
    icon: Building,
    color: "from-medical-100 to-medical-50",
    iconColor: "text-medical-600",
    borderColor: "border-medical-100",
  },
  {
    title: "Smart Pharmacy",
    description: "Intelligent prescription management, medicine availability, and refill reminders.",
    icon: Pill,
    color: "from-brand-100 to-brand-50",
    iconColor: "text-brand-600",
    borderColor: "border-brand-100",
  },
  {
    title: "Diagnostics",
    description: "Connected diagnostic workflows, secure lab reports, and integrated imaging.",
    icon: Activity,
    color: "from-purple-100 to-purple-50",
    iconColor: "text-purple-600",
    borderColor: "border-purple-100",
  },
  {
    title: "Healthcare AI",
    description: "Intelligent clinical decision support and predictive analytics for healthcare professionals.",
    icon: BrainCircuit,
    color: "from-slate-200 to-slate-50",
    iconColor: "text-slate-700",
    borderColor: "border-slate-200",
  },
];

export function ServicesGrid() {
  return (
    <section className="py-24 bg-slate-50 relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-medical-50/50 to-transparent pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="mb-16 max-w-2xl">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-slate-900 mb-4">
            Everything Healthcare, <br />
            Connected.
          </h2>
          <p className="text-lg text-slate-600">
            A comprehensive suite of clinical and operational tools designed for the modern healthcare ecosystem.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SERVICES.map((service, i) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={cn(
                "group p-8 rounded-3xl bg-white border shadow-sm hover:shadow-xl transition-all duration-300 relative overflow-hidden",
                service.borderColor
              )}
            >
              <div className={cn("absolute top-0 right-0 w-32 h-32 bg-gradient-to-br rounded-bl-[100px] opacity-20 transition-transform duration-500 group-hover:scale-110", service.color)} />
              
              <div className="relative z-10">
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-gradient-to-br", service.color)}>
                  <service.icon className={cn("w-7 h-7", service.iconColor)} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{service.title}</h3>
                <p className="text-slate-600 leading-relaxed mb-6">
                  {service.description}
                </p>
                <button className={cn("text-sm font-semibold flex items-center gap-2 group/btn", service.iconColor)}>
                  Explore Solution
                  <span className="transform transition-transform group-hover/btn:translate-x-1">→</span>
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
