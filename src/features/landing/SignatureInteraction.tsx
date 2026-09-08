import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

const signatureSteps = [
  { id: 'variant', label: 'VARIANT', what: 'rs4244285 detected', why: 'Loss-of-function allele identified in patient VCF.', evidence: 'dbSNP / ClinVar', rule: 'N/A' },
  { id: 'gene', label: 'GENE', what: 'Mapped to CYP2C19', why: 'Variant falls within the exonic region of CYP2C19.', evidence: 'HGNC:2621', rule: 'N/A' },
  { id: 'allele', label: 'STAR ALLELE', what: '*2 assigned', why: 'Defining variant for *2 haplotype present.', evidence: 'PharmVar', rule: 'N/A' },
  { id: 'diplotype', label: 'DIPLOTYPE', what: '*2/*2 resolved', why: 'Homozygous presence of *2 allele.', evidence: 'CPIC Allele Definition', rule: 'N/A' },
  { id: 'phenotype', label: 'PHENOTYPE', what: 'Poor Metabolizer', why: 'Activity Score of 0 based on *2/*2.', evidence: 'CPIC Phenotype Mapping', rule: 'Diplotype-Phenotype Table' },
  { id: 'drug', label: 'DRUG', what: 'Citalopram (SSRI)', why: 'Drug order received from EHR.', evidence: 'RxNorm', rule: 'N/A' },
  { id: 'rule', label: 'RULE', what: 'CPIC Level A Matched', why: 'Drug and Phenotype match established guideline.', evidence: 'CPIC Guideline v2026', rule: 'If Poor Metabolizer AND Citalopram -> High Risk' },
  { id: 'risk', label: 'RISK', what: 'High Risk (Efficacy/Toxicity)', why: 'Reduced clearance of Citalopram leads to elevated plasma levels.', evidence: 'Deterministic Engine', rule: 'Actionable Recommendation' }
];

export function SignatureInteraction() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <section className="py-32 bg-[#020617] relative flex flex-col items-center min-h-[80vh] justify-center overflow-hidden">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.05)_0%,rgba(2,6,23,1)_60%)] pointer-events-none" />

      <div className="text-center mb-12 relative z-10">
        <h2 className="text-3xl md:text-4xl font-bold text-white font-['Outfit'] mb-4">The Pharmakon Pipeline</h2>
        <p className="text-slate-400">Interact with the core to reveal the reasoning chain.</p>
      </div>

      <div className="relative z-20 w-full max-w-4xl mx-auto flex flex-col items-center">
        
        {/* Core Trigger Node */}
        <motion.button 
          onClick={() => setIsExpanded(!isExpanded)}
          className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 z-50 ${isExpanded ? 'bg-[#22d3ee] shadow-[0_0_50px_rgba(34,211,238,0.8)]' : 'bg-[#0f172a] border border-[#22d3ee] shadow-[0_0_20px_rgba(34,211,238,0.4)] hover:shadow-[0_0_30px_rgba(34,211,238,0.6)]'}`}
          animate={{ scale: isExpanded ? 1.1 : 1 }}
        >
          <span className={`font-mono-tech font-bold text-sm transition-colors ${isExpanded ? 'text-[#020617]' : 'text-[#22d3ee]'}`}>
            {isExpanded ? 'CLOSE' : 'EXPAND'}
          </span>
          {!isExpanded && (
            <motion.div 
              className="absolute inset-0 rounded-full border border-[#22d3ee]"
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
        </motion.button>

        {/* Expanded Pipeline */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
              className="w-full mt-12 overflow-hidden"
            >
              <div className="flex flex-col items-center pb-12">
                {signatureSteps.map((step, idx) => (
                  <motion.div 
                    key={step.id}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.15 + 0.3, duration: 0.5 }}
                    className="flex flex-col items-center w-full"
                  >
                    {/* Connection Line */}
                    {idx !== 0 && (
                      <div className="w-0.5 h-8 bg-gradient-to-b from-[#22d3ee] to-[#8b5cf6]" />
                    )}
                    
                    {/* Node Card */}
                    <div className="glass-panel w-full max-w-2xl p-6 rounded-xl border border-white/10 hover:border-[#22d3ee]/50 transition-colors flex flex-col md:flex-row gap-6 items-start md:items-center relative group">
                      
                      {/* Left: Label */}
                      <div className="w-full md:w-1/4 text-center md:text-right border-b md:border-b-0 md:border-r border-white/10 pb-4 md:pb-0 md:pr-6 shrink-0">
                        <span className="text-lg font-bold font-['Outfit'] text-white tracking-widest">{step.label}</span>
                      </div>

                      {/* Right: Details */}
                      <div className="flex-1 space-y-3">
                        <div>
                          <span className="text-xs font-mono-tech text-slate-500 uppercase">What happened</span>
                          <div className="text-white font-medium">{step.what}</div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <span className="text-xs font-mono-tech text-slate-500 uppercase">Why</span>
                            <div className="text-slate-300 text-sm">{step.why}</div>
                          </div>
                          <div>
                            <span className="text-xs font-mono-tech text-slate-500 uppercase">Evidence/Rule</span>
                            <div className="text-slate-300 text-sm">{step.evidence}</div>
                          </div>
                        </div>
                      </div>

                      {/* Hover effect glow */}
                      <div className="absolute inset-0 bg-gradient-to-r from-[#22d3ee]/0 via-[#22d3ee]/5 to-[#8b5cf6]/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl pointer-events-none" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </section>
  );
}
