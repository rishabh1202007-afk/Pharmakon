"use client";

import { motion } from "framer-motion";

interface SwipeTextProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function SwipeText({ children, className = "", delay = 0 }: SwipeTextProps) {
  return (
    <div className="relative overflow-hidden inline-block w-full">
      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true, margin: "-10%" }}
        transition={{ 
          duration: 0.8, 
          ease: [0.16, 1, 0.3, 1], // Custom sophisticated ease-out
          delay: delay 
        }}
        className={className}
      >
        {children}
      </motion.div>
    </div>
  );
}
