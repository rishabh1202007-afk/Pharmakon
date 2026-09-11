"use client";

import { motion } from "framer-motion";
import { Star, MapPin, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { SwipeText } from "@/components/ui/SwipeText";

const doctors = [
  {
    id: 1,
    name: "Dr. Sarah Chen",
    specialty: "Cardiology",
    rating: 4.9,
    reviews: 128,
    location: "PharmaKon Central",
    image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300&h=400",
  },
  {
    id: 2,
    name: "Dr. James Wilson",
    specialty: "Neurology",
    rating: 4.8,
    reviews: 93,
    location: "Westside Clinic",
    image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=300&h=400",
  },
  {
    id: 3,
    name: "Dr. Elena Rodriguez",
    specialty: "Pediatrics",
    rating: 5.0,
    reviews: 241,
    location: "Children's Center",
    image: "https://images.unsplash.com/photo-1594824432258-29476b701bc4?auto=format&fit=crop&q=80&w=300&h=400",
  },
  {
    id: 4,
    name: "Dr. Michael Chang",
    specialty: "Orthopedics",
    rating: 4.7,
    reviews: 156,
    location: "Sports Med Inst.",
    image: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=300&h=400",
  }
];

export function DoctorsSection() {
  return (
    <section id="doctors" className="py-24 bg-[#04101A] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl"
          >
            <div className="mb-4">
              <SwipeText>
                <h2 className="text-4xl md:text-5xl font-extrabold text-white">
                  Top Minds. <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-400">Advanced Care.</span>
                </h2>
              </SwipeText>
            </div>
            <p className="text-lg text-slate-400 font-medium">
              Connect with world-class specialists who are leaders in their fields, supported by our intelligent health network.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <Link href="/doctors" className="inline-flex items-center gap-2 text-medical-600 font-semibold hover:text-medical-700 transition-colors group">
              View all specialists
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {doctors.map((doctor, index) => (
            <motion.div
              key={doctor.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group relative rounded-3xl bg-slate-900/50 shadow-lg border border-slate-700/50 p-4 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
            >
              {/* Subtle Gradient Border on Hover */}
              <div className="absolute -inset-[1px] rounded-[25px] bg-gradient-to-b from-teal-400 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
              
              <div className="bg-[#0B1F33] rounded-[23px] h-full flex flex-col">
                <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden mb-5">
                  <Image
                    src={doctor.image}
                    alt={doctor.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  />
                  <div className="absolute top-3 right-3 bg-slate-900/90 backdrop-blur-sm border border-slate-700 px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="text-xs font-bold text-white">{doctor.rating}</span>
                  </div>
                </div>

                <div className="px-2 flex-grow flex flex-col">
                  <p className="text-teal-400 text-xs font-bold tracking-wider uppercase mb-1">{doctor.specialty}</p>
                  <h3 className="text-lg font-bold text-white mb-2">{doctor.name}</h3>
                  <div className="flex items-center gap-1.5 text-slate-400 text-sm mb-6 mt-auto">
                    <MapPin className="w-4 h-4" />
                    <span className="truncate">{doctor.location}</span>
                  </div>
                  
                  <button className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-teal-500/10 text-teal-400 border border-teal-500/20 group-hover:bg-teal-500 group-hover:text-white group-hover:border-teal-500 transition-colors duration-300">
                    Book Consultation
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
