import { MapPin, Star, Calendar, Clock, ChevronRight, Building } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const DOCTORS = [
  {
    id: "dr-sarah-mehta",
    name: "Dr. Sarah Mehta",
    specialization: "Cardiology",
    experience: "15 Years",
    hospital: "PharmaKon General Hospital",
    location: "New York, NY",
    rating: 4.9,
    reviews: 124,
    nextAvailable: "Today, 2:30 PM",
    image: "SM",
    color: "bg-rose-100 text-rose-700"
  },
  {
    id: "dr-james-chen",
    name: "Dr. James Chen",
    specialization: "Neurology",
    experience: "12 Years",
    hospital: "Central Medical Center",
    location: "San Francisco, CA",
    rating: 4.8,
    reviews: 89,
    nextAvailable: "Tomorrow, 10:00 AM",
    image: "JC",
    color: "bg-blue-100 text-blue-700"
  },
  {
    id: "dr-elena-rodriguez",
    name: "Dr. Elena Rodriguez",
    specialization: "Pediatrics",
    experience: "8 Years",
    hospital: "PharmaKon Children's Wing",
    location: "Chicago, IL",
    rating: 5.0,
    reviews: 210,
    nextAvailable: "Today, 4:15 PM",
    image: "ER",
    color: "bg-purple-100 text-purple-700"
  },
  {
    id: "dr-michael-chang",
    name: "Dr. Michael Chang",
    specialization: "Orthopedics",
    experience: "20 Years",
    hospital: "Westside Orthopedic Institute",
    location: "Los Angeles, CA",
    rating: 4.7,
    reviews: 156,
    nextAvailable: "Mon, 9:00 AM",
    image: "MC",
    color: "bg-brand-100 text-brand-700"
  }
];

export default function DoctorsPage() {
  return (
    <div className="bg-slate-50 min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header & Search */}
        <div className="mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Find the Right Specialist.</h1>
          <p className="text-slate-600 mb-8 max-w-2xl">
            Connect with top-tier healthcare professionals across the PharmaKon network. Filter by specialty, location, or availability.
          </p>
          
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4">
            <input 
              type="text" 
              placeholder="Search doctors, specialties, or symptoms..." 
              className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 outline-none focus:border-medical-300 focus:ring-2 focus:ring-medical-100 transition-all"
            />
            <select className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 outline-none focus:border-medical-300 text-slate-700">
              <option>All Specialties</option>
              <option>Cardiology</option>
              <option>Neurology</option>
              <option>Orthopedics</option>
            </select>
            <select className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 outline-none focus:border-medical-300 text-slate-700">
              <option>Availability</option>
              <option>Available Today</option>
              <option>Available Tomorrow</option>
            </select>
            <button className="bg-slate-900 text-white px-8 py-3 rounded-xl font-medium hover:bg-slate-800 transition-colors">
              Search
            </button>
          </div>
        </div>

        {/* Results Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-6">
          {DOCTORS.map(doctor => (
            <div key={doctor.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col sm:flex-row gap-6">
              
              {/* Image Placeholder */}
              <div className={cn("w-24 h-24 sm:w-32 sm:h-32 rounded-2xl flex items-center justify-center text-3xl font-bold shrink-0", doctor.color)}>
                {doctor.image}
              </div>

              <div className="flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{doctor.name}</h3>
                    <p className="text-medical-600 font-medium">{doctor.specialization}</p>
                  </div>
                  <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-md">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="text-sm font-bold text-slate-900">{doctor.rating}</span>
                    <span className="text-xs text-slate-500">({doctor.reviews})</span>
                  </div>
                </div>

                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Building className="w-4 h-4 text-slate-400" />
                    {doctor.hospital}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    {doctor.location}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium mt-2">
                    <Clock className="w-4 h-4" />
                    Next: {doctor.nextAvailable}
                  </div>
                </div>

                <div className="mt-auto flex gap-3">
                  <Link href={`/doctors/${doctor.id}`} className="flex-1 text-center py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors">
                    View Profile
                  </Link>
                  <Link href="/book" className="flex-1 text-center py-2.5 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors">
                    Book Now
                  </Link>
                </div>
              </div>

            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
