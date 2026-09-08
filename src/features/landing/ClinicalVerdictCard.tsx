import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

const explanationSteps = [
  { step: 1, title: 'Variant Detected', desc: 'rs4244285 found in input VCF' },
  { step: 2, title: 'Gene Affected', desc: 'Mapped to CYP2C19' },
  { step: 3, title: 'Diplotype Resolved', desc: 'Inherited *2/*2 loss-of-function alleles' },
  { step: 4, title: 'Phenotype Mapped', desc: 'Classified as Poor Metabolizer' },
  { step: 5, title: 'Rule Matched', desc: 'CPIC SSRI Level A guideline triggered' },
  { step: 6, title: 'Risk Assigned', desc: 'High Risk for adverse events at standard dose' },
];

export function ClinicalVerdictCard() {
  const [isWhyExpanded, setIsWhyExpanded] = useState(false);

  return (
    <section id="product" className="relative py-24 bg-[#020617]">
      <div className="max-w-5xl mx-auto px-6 md:px-8">
        
        <div className="glass-panel rounded-3xl p-8 md:p-12 relative overflow-hidden border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          {/* Subtle Background Glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#ef4444] rounded-full blur-[120px] opacity-10 pointer-events-none" />

          {/* Patient Profile Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/10 pb-6 mb-8 gap-4">
            <div>
              <div className="text-slate-400 font-mono-tech text-xs uppercase tracking-widest mb-1">Patient Profile</div>
              <div className="text-2xl font-bold text-white tracking-tight">PT-2041</div>
            </div>
            <div className="flex flex-wrap gap-4">
               <div className="bg-[#1e293b] px-4 py-2 rounded-lg border border-white/5">
                 <span className="text-slate-400 font-mono-tech text-xs block mb-1">Selected Drug</span>
                 <span className="text-white font-medium">Citalopram (SSRI)</span>
               </div>
               <div className="bg-[#1e293b] px-4 py-2 rounded-lg border border-white/5">
                 <span className="text-slate-400 font-mono-tech text-xs block mb-1">Genomic Profile</span>
                 <span className="text-white font-medium">CYP2C19 *2/*2</span>
               </div>
            </div>
          </div>

          {/* Primary Verdict (Strongest Hierarchy) */}
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444] font-mono-tech text-sm font-semibold tracking-widest mb-6 uppercase">
              Clinical Assessment Status: High Risk
            </div>
            
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white font-['Outfit'] tracking-tight leading-tight mb-6 max-w-3xl mx-auto">
              Avoid standard starting dose.
            </h2>
            
            <p className="text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Consider 50% dose reduction or an alternative antidepressant not primarily metabolized by CYP2C19.
            </p>
          </div>

          {/* Why This Result? */}
          <div className="mt-8 border-t border-white/10 pt-8">
            <button 
              onClick={() => setIsWhyExpanded(!isWhyExpanded)}
              className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/10"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#3b82f6]/20 text-[#3b82f6] flex items-center justify-center font-bold">?</div>
                <h3 className="text-xl font-semibold text-white font-['Outfit']">Why this result?</h3>
              </div>
              <div className={`transform transition-transform duration-300 ${isWhyExpanded ? 'rotate-180' : ''}`}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </div>
            </button>

            <AnimatePresence>
              {isWhyExpanded && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-8 pb-4 px-4">
                    <div className="relative">
                      {/* Vertical connecting line */}
                      <div className="absolute left-[15px] top-4 bottom-4 w-px bg-slate-700" />
                      
                      <div className="space-y-6">
                        {explanationSteps.map((step, idx) => (
                          <motion.div 
                            key={step.step}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="relative flex gap-6"
                          >
                            <div className="w-8 h-8 rounded-full bg-[#1e293b] border-2 border-[#3b82f6] flex items-center justify-center text-xs font-bold text-white relative z-10 shrink-0 shadow-[0_0_10px_rgba(59,130,246,0.3)]">
                              {step.step}
                            </div>
                            <div className="bg-[#0f172a] border border-white/5 p-4 rounded-lg flex-1">
                              <h4 className="text-white font-medium mb-1">{step.title}</h4>
                              <p className="text-slate-400 text-sm font-mono-tech">{step.desc}</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </div>
    </section>
  );
}
