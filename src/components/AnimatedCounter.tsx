import React, { useState, useEffect } from 'react';
import { animate } from 'framer-motion';

export function AnimatedCounter({ from = 0, to, duration = 2, precision = 0 }: { from?: number, to: number, duration?: number, precision?: number }) {
  const [count, setCount] = useState(from);
  useEffect(() => {
    const controls = animate(from, to, {
      duration: duration,
      ease: 'easeOut',
      onUpdate: (latest) => setCount(latest)
    });
    return () => controls.stop();
  }, [from, to, duration]);
  
  const displayValue = precision > 0 
    ? count.toFixed(precision) 
    : Math.floor(count).toLocaleString();
    
  return <span>{displayValue}</span>;
}
