"use client";

import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import Image from "next/image";
import { SwipeText } from "@/components/ui/SwipeText";

const TESTIMONIALS = [
  {
    quote: "PharmaKon saved my life during a critical emergency. The paramedics had my complete medical history and allergies before they even arrived.",
    author: "Elena R.",
    role: "Patient",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=150&h=150"
  },
  {
    quote: "As a cardiologist, the AI decision support tool has been revolutionary. It catches subtle anomalies in EKGs that would take hours to manually cross-reference.",
    author: "Dr. Marcus T.",
    role: "Chief of Cardiology",
    image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=150&h=150"
  },
  {
    quote: "The seamless integration between my clinic and the pharmacy means my patients get their medications instantly, without the usual bureaucratic friction.",
    author: "Sarah L.",
    role: "General Practitioner",
    image: "https://images.unsplash.com/photo-1594824436998-d50d032252a1?auto=format&fit=crop&q=80&w=150&h=150"
  },
  {
    quote: "Managing my father's chronic condition used to be a full-time job. With the patient portal, all his records, upcoming labs, and prescriptions are in one place.",
    author: "David Chen",
    role: "Family Caregiver",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150&h=150"
  }
];

export function TestimonialsSection() {
  return (
    <section className="py-24 bg-[#0B1F33] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="mb-6">
            <SwipeText>
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white">
                Stories of <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-400">Better Health.</span>
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
            Don't just take our word for it. Hear how PharmaKon is transforming lives for patients and empowering healthcare professionals worldwide.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
          {TESTIMONIALS.map((testimonial, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
              className="bg-slate-900/50 rounded-[32px] p-8 md:p-10 shadow-sm border border-slate-800 hover:shadow-xl transition-shadow relative group"
            >
              <div className="absolute top-8 right-8 text-slate-800 group-hover:text-slate-700 transition-colors">
                <Quote className="w-12 h-12 rotate-180" />
              </div>
              
              <div className="flex gap-1 mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="w-5 h-5 text-amber-400 fill-amber-400" />
                ))}
              </div>
              
              <p className="text-lg md:text-xl text-slate-200 font-medium leading-relaxed mb-8 relative z-10">
                "{testimonial.quote}"
              </p>
              
              <div className="flex items-center gap-4 mt-auto">
                <div className="w-14 h-14 rounded-full overflow-hidden relative border border-slate-700">
                  <Image src={testimonial.image} alt={testimonial.author} fill className="object-cover" />
                </div>
                <div>
                  <h4 className="font-bold text-white">{testimonial.author}</h4>
                  <p className="text-sm text-slate-400 font-medium">{testimonial.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
