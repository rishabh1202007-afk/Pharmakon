"use client";

import { useState } from "react";
import { Star, MapPin, Building, GraduationCap, Languages, ChevronRight, Clock, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useParams } from "next/navigation";

const DOCTOR_DATA = {
  name: "Dr. Sarah Mehta",
  specialization: "Cardiology",
  experience: "15+ Years Experience",
  hospital: "PharmaKon General Hospital",
  location: "New York, NY",
  rating: 4.9,
  reviews: 124,
  about: "Dr. Sarah Mehta is a board-certified cardiologist with over 15 years of experience specializing in interventional cardiology and preventive cardiovascular medicine. She completed her fellowship at Johns Hopkins and has been recognized for her pioneering work in minimally invasive procedures.",
  education: ["MD, Harvard Medical School", "Fellowship in Interventional Cardiology, Johns Hopkins"],
  languages: ["English", "Spanish", "Hindi"],
  certifications: ["American Board of Internal Medicine", "Cardiovascular Disease Certification"],
};

const WEEK_DATES = [
  { day: "Mon", date: "10 Sep" },
  { day: "Tue", date: "11 Sep" },
  { day: "Wed", date: "12 Sep" },
  { day: "Thu", date: "13 Sep" },
  { day: "Fri", date: "14 Sep" },
];

const TIME_SLOTS = ["09:00 AM", "09:30 AM", "10:00 AM", "11:30 AM", "01:00 PM", "02:30 PM", "04:00 PM"];

export default function DoctorProfilePage() {
  const params = useParams();
  const [selectedDate, setSelectedDate] = useState("10 Sep");
  const [selectedTime, setSelectedTime] = useState("");

  return (
    <div className="bg-slate-50 min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-8">
          <Link href="/doctors" className="hover:text-medical-600">Doctors</Link>
          <ChevronRight className="w-4 h-4" />
          <Link href="/doctors" className="hover:text-medical-600">Cardiology</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-slate-900 font-medium">{DOCTOR_DATA.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Doctor Info */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Header Card */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-8">
              <div className="w-32 h-32 md:w-40 md:h-40 bg-rose-100 text-rose-700 rounded-3xl flex items-center justify-center text-4xl md:text-5xl font-bold shrink-0">
                SM
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h1 className="text-3xl font-bold text-slate-900">{DOCTOR_DATA.name}</h1>
                    <p className="text-lg text-medical-600 font-medium">{DOCTOR_DATA.specialization}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 mb-6 mt-4">
                  <div className="flex items-center gap-1.5"><Building className="w-4 h-4" /> {DOCTOR_DATA.hospital}</div>
                  <div className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {DOCTOR_DATA.location}</div>
                  <div className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {DOCTOR_DATA.experience}</div>
                </div>
                <div className="flex gap-4 border-t border-slate-100 pt-6">
                  <div className="flex flex-col">
                    <span className="text-2xl font-bold text-slate-900 flex items-center gap-1">
                      {DOCTOR_DATA.rating} <Star className="w-5 h-5 text-amber-500 fill-amber-500 mb-1" />
                    </span>
                    <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Patient Rating</span>
                  </div>
                  <div className="w-px bg-slate-200" />
                  <div className="flex flex-col">
                    <span className="text-2xl font-bold text-slate-900">{DOCTOR_DATA.reviews}</span>
                    <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Total Reviews</span>
                  </div>
                </div>
              </div>
            </div>

            {/* About Card */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 mb-4">About Doctor</h2>
              <p className="text-slate-600 leading-relaxed mb-8">{DOCTOR_DATA.about}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-medical-600" /> Education
                  </h3>
                  <ul className="space-y-3">
                    {DOCTOR_DATA.education.map((edu, i) => (
                      <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-medical-300 mt-1.5 shrink-0" /> {edu}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Award className="w-4 h-4 text-medical-600" /> Certifications
                  </h3>
                  <ul className="space-y-3">
                    {DOCTOR_DATA.certifications.map((cert, i) => (
                      <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-medical-300 mt-1.5 shrink-0" /> {cert}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Languages className="w-4 h-4 text-medical-600" /> Languages Spoken
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {DOCTOR_DATA.languages.map((lang, i) => (
                      <span key={i} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm font-medium">{lang}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Appointment Booking Widget */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xl sticky top-28">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Book Appointment</h2>
              
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-900">Select Date</h3>
                  <span className="text-xs font-medium text-medical-600 bg-medical-50 px-2 py-1 rounded-md">September 2026</span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {WEEK_DATES.map((d) => (
                    <button
                      key={d.date}
                      onClick={() => setSelectedDate(d.date)}
                      className={cn(
                        "py-3 flex flex-col items-center justify-center rounded-xl border transition-all",
                        selectedDate === d.date 
                          ? "bg-slate-900 border-slate-900 text-white shadow-md" 
                          : "bg-white border-slate-200 text-slate-600 hover:border-medical-300 hover:bg-medical-50"
                      )}
                    >
                      <span className="text-[10px] uppercase font-semibold mb-1">{d.day}</span>
                      <span className={cn("text-lg font-bold", selectedDate === d.date ? "text-white" : "text-slate-900")}>
                        {d.date.split(" ")[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Select Time</h3>
                <div className="grid grid-cols-3 gap-2">
                  {TIME_SLOTS.map((time) => (
                    <button
                      key={time}
                      onClick={() => setSelectedTime(time)}
                      className={cn(
                        "py-2 text-xs font-semibold rounded-lg border transition-all",
                        selectedTime === time 
                          ? "bg-medical-50 border-medical-500 text-medical-700 shadow-sm" 
                          : "bg-white border-slate-200 text-slate-600 hover:border-medical-300"
                      )}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 border-t border-slate-100 pt-6">
                <p className="text-xs text-slate-500 text-center mb-2">Consultation fee: <span className="font-bold text-slate-900">$150</span></p>
                <Link href="/book" className="block w-full text-center py-3.5 rounded-xl bg-slate-900 text-white font-semibold shadow-lg shadow-slate-900/20 hover:bg-slate-800 hover:-translate-y-0.5 transition-all">
                  Proceed to Book
                </Link>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
