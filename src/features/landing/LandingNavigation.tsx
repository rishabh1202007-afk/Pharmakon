import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export function LandingNavigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const section = document.getElementById(id);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <motion.nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${
        isScrolled
          ? 'bg-[#050c17]/70 backdrop-blur-md border-white/10 py-3 shadow-lg'
          : 'bg-transparent border-transparent py-5'
      }`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-8 flex items-center justify-between">
        {/* Brand */}
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => scrollToSection('hero')}
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#22d3ee] to-[#8b5cf6] p-[1px] shadow-[0_0_15px_rgba(34,211,238,0.4)] group-hover:shadow-[0_0_25px_rgba(34,211,238,0.6)] transition-all duration-300">
            <div className="w-full h-full bg-[#020617] rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xs font-mono-tech tracking-wider">PK</span>
            </div>
          </div>
          <span className="text-xl font-bold tracking-tight text-white font-['Outfit']">
            PHARMAKON
          </span>
        </div>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
          <button onClick={() => scrollToSection('product')} className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Product</button>
          <button onClick={() => scrollToSection('how-it-works')} className="text-sm font-medium text-slate-300 hover:text-white transition-colors">How It Works</button>
          <button onClick={() => scrollToSection('genomics')} className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Genomics</button>
          <button onClick={() => scrollToSection('evidence')} className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Evidence</button>
          <button onClick={() => scrollToSection('audit')} className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Audit</button>
        </div>

        {/* CTA */}
        <div>
          <button 
            onClick={() => navigate('/login')}
            className="relative overflow-hidden group px-6 py-2.5 rounded-full bg-white/5 border border-white/10 hover:border-[#22d3ee]/50 transition-all duration-300"
          >
            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-[#22d3ee]/20 to-[#8b5cf6]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
            <span className="relative text-sm font-semibold text-white tracking-wide">Launch Pharmakon</span>
          </button>
        </div>
      </div>
    </motion.nav>
  );
}
