"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { SwipeText } from "@/components/ui/SwipeText";

const STATS = [
  { value: 12, suffix: "M+", label: "Patients Worldwide" },
  { value: 500, suffix: "+", label: "Connected Hospitals" },
  { value: 99.9, suffix: "%", label: "Uptime & Reliability", isFloat: true },
  { value: 2.4, suffix: "B+", label: "Data Points Analyzed", isFloat: true },
];

function AnimatedNumber({ value, isFloat = false }: { value: number; isFloat?: boolean }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  useEffect(() => {
    if (isInView) {
      let start = 0;
      const end = value;
      const duration = 2000;
      let startTimestamp: number | null = null;

      const step = (timestamp: number) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        
        // easeOutQuart
        const easeProgress = 1 - Math.pow(1 - progress, 4);
        const current = start + easeProgress * (end - start);
        
        setCount(current);

        if (progress < 1) {
          window.requestAnimationFrame(step);
        }
      };

      window.requestAnimationFrame(step);
    }
  }, [isInView, value]);

  return (
    <span ref={ref}>
      {isFloat ? count.toFixed(1) : Math.floor(count)}
    </span>
  );
}

export function StatisticsSection() {
  return (
    <section className="py-24 bg-[#04101A] relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 z-0">
        <div className="absolute -top-[200px] left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-teal-900/20 rounded-[100%] blur-[100px] pointer-events-none" />
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <SwipeText>
            <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">
              The Scale of <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">Care.</span>
            </h2>
          </SwipeText>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12 divide-x-0 lg:divide-x divide-slate-800">
          {STATS.map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="text-center px-4"
            >
              <div className="text-5xl md:text-6xl font-black text-white mb-2 tracking-tighter drop-shadow-[0_0_20px_rgba(45,212,191,0.2)]">
                <AnimatedNumber value={stat.value} isFloat={stat.isFloat} />
                <span className="text-teal-400">{stat.suffix}</span>
              </div>
              <p className="text-slate-400 font-medium text-lg">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
