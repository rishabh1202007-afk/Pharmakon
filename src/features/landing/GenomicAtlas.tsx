import { motion } from 'framer-motion';

const supportedGenes = [
  { id: 'CYP2D6', name: 'Cytochrome P450 2D6', role: 'Metabolizes ~25% of commonly prescribed drugs.', interpretation: 'Crucial for antidepressants, antipsychotics, and opioids (e.g., Codeine).' },
  { id: 'CYP2C19', name: 'Cytochrome P450 2C19', role: 'Hepatic enzyme for varied drug classes.', interpretation: 'Primary driver for Clopidogrel (Plavix) activation and SSRI clearance.' },
  { id: 'CYP2C9', name: 'Cytochrome P450 2C9', role: 'Metabolizes narrow therapeutic index drugs.', interpretation: 'Key for Warfarin dosing and NSAID toxicity.' },
  { id: 'SLCO1B1', name: 'Solute Carrier Organic Anion Transporter', role: 'Facilitates hepatic uptake of statins.', interpretation: 'Strongly predicts statin-induced myopathy risk.' },
  { id: 'TPMT', name: 'Thiopurine S-methyltransferase', role: 'Metabolizes thiopurine drugs.', interpretation: 'Determines life-threatening myelosuppression risk.' },
  { id: 'DPYD', name: 'Dihydropyrimidine Dehydrogenase', role: 'Rate-limiting enzyme for fluoropyrimidines.', interpretation: 'Predicts severe toxicity in 5-FU based chemotherapy.' }
];

export function GenomicAtlas() {
  return (
    <section id="genomics" className="py-24 bg-[#050c17] relative border-t border-white/5">
      
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 md:px-8 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white font-['Outfit'] mb-4">Genomic Atlas</h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Our pipeline evaluates highly validated pharmacogenes to provide precise, CPIC-aligned guidance across major drug classes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {supportedGenes.map((gene, index) => (
            <motion.div
              key={gene.id}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="glass-panel group relative rounded-2xl p-6 h-64 overflow-hidden border border-white/10 hover:border-[#22d3ee]/50 transition-all duration-500 cursor-default"
            >
              {/* Default State (Logo/ID) */}
              <div className="absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-500 group-hover:opacity-0">
                <div className="w-16 h-16 rounded-full border border-slate-600 flex items-center justify-center mb-4 bg-[#0f172a]">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h5l3-9 5 18 3-9h4"/></svg>
                </div>
                <h3 className="text-2xl font-bold text-white font-mono-tech tracking-widest">{gene.id}</h3>
              </div>

              {/* Hover State (Details) */}
              <div className="absolute inset-0 p-6 flex flex-col justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[#0f172a]/90 backdrop-blur-md">
                <div>
                  <h4 className="text-xl font-bold text-[#22d3ee] font-mono-tech mb-2">{gene.id}</h4>
                  <p className="text-sm text-white font-medium mb-3">{gene.name}</p>
                  <p className="text-xs text-slate-400 leading-relaxed mb-3"><strong>Role:</strong> {gene.role}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-300 leading-relaxed border-t border-white/10 pt-3">
                    <strong>Interpretation:</strong> {gene.interpretation}
                  </p>
                </div>
              </div>

            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
