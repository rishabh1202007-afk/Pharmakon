import { motion } from 'framer-motion';

const traceNodes = [
  {
    type: 'INPUT',
    identifier: 'de-identified_case_002.vcf',
    status: 'VALIDATED',
    source: 'EHR Intake',
    timestamp: '2026-04-02T09:41:59Z',
    details: 'VCF parsing successful. Quality control passed.'
  },
  {
    type: 'VARIANT',
    identifier: 'rs4244285',
    status: 'DETECTED',
    source: 'dbSNP / ClinVar',
    details: 'Confidence: 99.9%. Call: loss-of-function.'
  },
  {
    type: 'GENE',
    identifier: 'CYP2C19',
    status: 'MAPPED',
    source: 'HGNC:2621',
    details: 'Chromosome 10. Cytochrome P450 family.'
  },
  {
    type: 'DIPLOTYPE',
    identifier: '*2/*2',
    status: 'RESOLVED',
    source: 'PharmVar / CPIC',
    details: 'Biallelic loss of function. No structural variants detected.'
  },
  {
    type: 'PHENOTYPE',
    identifier: 'Poor Metabolizer',
    status: 'INFERRED',
    source: 'Deterministic Mapping',
    details: 'Activity score: 0.0'
  },
  {
    type: 'RULE',
    identifier: 'CPIC SSRI-CYP2C19',
    status: 'MATCHED',
    source: 'Guideline Level A',
    ruleVersion: 'v2026.03',
    details: 'Rule condition met: Phenotype == Poor Metabolizer AND Drug == Citalopram.'
  },
  {
    type: 'DECISION',
    identifier: 'High Risk',
    status: 'GENERATED',
    source: 'Decision Engine',
    timestamp: '2026-04-02T09:42:00Z',
    details: 'Avoid standard starting dose. Recommended 50% reduction.'
  }
];

export function EvidenceTraceTimeline() {
  return (
    <section id="evidence" className="py-24 bg-[#050c17] relative">
      <div className="max-w-4xl mx-auto px-6 md:px-8">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-bold text-white font-['Outfit'] mb-4">Evidence Trace</h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            A complete, reproducible forensic timeline. Every step is anchored in verifiable clinical literature and patient data.
          </p>
        </div>

        <div className="relative">
          {/* Main vertical trunk */}
          <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-[#22d3ee]/20 via-[#8b5cf6]/20 to-[#22d3ee]/20 md:-translate-x-1/2 rounded-full" />

          <div className="space-y-12">
            {traceNodes.map((node, idx) => (
              <motion.div 
                key={node.type}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                className={`relative flex flex-col md:flex-row items-start md:items-center ${idx % 2 === 0 ? 'md:flex-row-reverse' : ''}`}
              >
                
                {/* Node Center Dot */}
                <div className="absolute left-8 md:left-1/2 w-4 h-4 rounded-full bg-[#050c17] border-2 border-[#22d3ee] -translate-x-[6px] md:-translate-x-1/2 z-10" />
                
                {/* Content Box */}
                <div className={`pl-20 md:pl-0 w-full md:w-1/2 ${idx % 2 === 0 ? 'md:pr-12 md:text-right' : 'md:pl-12 text-left'}`}>
                  <div className="glass-panel p-6 rounded-xl relative group hover:border-[#22d3ee]/50 transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#22d3ee]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl pointer-events-none" />
                    
                    <div className={`flex items-center gap-3 mb-2 ${idx % 2 === 0 ? 'md:justify-end' : 'justify-start'}`}>
                      <span className="text-[#22d3ee] font-mono-tech text-xs tracking-wider">{node.type}</span>
                      <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono-tech text-slate-300 uppercase">
                        {node.status}
                      </span>
                    </div>

                    <h4 className="text-xl font-bold text-white mb-2 font-['Outfit']">{node.identifier}</h4>
                    
                    <p className="text-slate-400 text-sm mb-4 leading-relaxed">{node.details}</p>
                    
                    <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-mono-tech text-slate-500 ${idx % 2 === 0 ? 'md:justify-end' : 'justify-start'}`}>
                      <span>Source: <span className="text-slate-300">{node.source}</span></span>
                      {node.ruleVersion && (
                        <span>Version: <span className="text-slate-300">{node.ruleVersion}</span></span>
                      )}
                      {node.timestamp && (
                        <span>Time: <span className="text-slate-300">{node.timestamp}</span></span>
                      )}
                    </div>
                  </div>
                </div>

              </motion.div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
