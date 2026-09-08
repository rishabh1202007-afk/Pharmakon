import { useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';

// Import New Landing Features
import { LandingNavigation } from '../features/landing/LandingNavigation';
import { HeroSection } from '../features/landing/HeroSection';
import { CinematicScroll } from '../features/landing/CinematicScroll';
import { SignatureInteraction } from '../features/landing/SignatureInteraction';
import { ClinicalVerdictCard } from '../features/landing/ClinicalVerdictCard';
import { EvidenceTraceTimeline } from '../features/landing/EvidenceTraceTimeline';
import { AuditConsole } from '../features/landing/AuditConsole';
import { CounterfactualEngine } from '../features/landing/CounterfactualEngine';
import { GenomicAtlas } from '../features/landing/GenomicAtlas';
import { AiVsDeterministic } from '../features/landing/AiVsDeterministic';
import { ProductArchitecture } from '../features/landing/ProductArchitecture';
import { KnowledgeLayer } from '../features/landing/KnowledgeLayer';

function FinalWowMoment() {
  const controls = useAnimation();

  useEffect(() => {
    controls.start(i => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.3 + 1, duration: 0.8 }
    }));
  }, [controls]);

  return (
    <section className="min-h-screen bg-[#020617] flex flex-col justify-center items-center py-32 relative overflow-hidden">
      
      {/* Cinematic Background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 150, repeat: Infinity, ease: "linear" }}
          className="w-[150vw] h-[150vw] md:w-[80vw] md:h-[80vw] border border-white/5 rounded-full border-dashed"
        />
        <motion.div 
          animate={{ rotate: -360 }}
          transition={{ duration: 100, repeat: Infinity, ease: "linear" }}
          className="absolute w-[120vw] h-[120vw] md:w-[60vw] md:h-[60vw] border border-[#22d3ee]/10 rounded-full border-dotted"
        />
      </div>

      <div className="text-center z-10 space-y-16 max-w-5xl mx-auto px-6">
        
        <div>
          <motion.h2 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="text-6xl md:text-8xl lg:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-300 to-slate-800 font-['Outfit'] tracking-tighter leading-none"
          >
            FROM GENOME
            <br />
            TO DECISION
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 1 }}
            className="text-2xl md:text-3xl text-slate-400 mt-6 font-['Outfit'] italic"
          >
            Every conclusion has a trail.
          </motion.p>
        </div>

        {/* Final Pipeline Animation */}
        <div className="flex flex-wrap justify-center gap-2 md:gap-4 font-mono-tech text-xs md:text-sm">
          {['VCF', 'Variant', 'Gene', 'Diplotype', 'Phenotype', 'Drug', 'Rule', 'Risk'].map((node, i) => (
            <motion.div 
              key={node}
              custom={i}
              initial={{ opacity: 0, y: 10 }}
              animate={controls}
              className="flex items-center gap-2 md:gap-4"
            >
              <span className={`${i === 7 ? 'text-rose-400 font-bold border border-rose-500/30 px-3 py-1 rounded bg-rose-500/10' : 'text-[#22d3ee]'}`}>
                {node}
              </span>
              {i < 7 && <span className="text-slate-600">→</span>}
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1.5, delay: 4 }}
          className="pt-16"
        >
          <h3 className="text-4xl md:text-5xl font-bold text-white font-['Outfit'] tracking-tight mb-2">
            PHARMAKON
          </h3>
          <p className="text-[#22d3ee] uppercase tracking-widest text-sm font-mono-tech font-bold">
            Precision medicine, explained.
          </p>
        </motion.div>

      </div>
    </section>
  );
}

export function LandingPage() {
  // Apply a theme class to body to isolate Landing Page styles from the ERP
  useEffect(() => {
    document.body.classList.add('landing-theme');
    return () => {
      document.body.classList.remove('landing-theme');
    };
  }, []);

  return (
    <main className="landing-page-redesign min-h-screen bg-[#020617] text-slate-300 font-sans selection:bg-[#22d3ee]/30 selection:text-white">
      <LandingNavigation />
      
      <HeroSection />
      
      <CinematicScroll />
      
      <SignatureInteraction />
      
      <ClinicalVerdictCard />
      
      <EvidenceTraceTimeline />
      
      <AuditConsole />
      
      <CounterfactualEngine />
      
      <GenomicAtlas />
      
      <AiVsDeterministic />
      
      <ProductArchitecture />
      
      <KnowledgeLayer />
      
      <FinalWowMoment />

    </main>
  );
}
