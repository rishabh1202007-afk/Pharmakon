import { motion } from 'framer-motion';
import { useState } from 'react';

const architectureNodes = [
  { id: 'frontend', label: 'Frontend', desc: 'React/Vite dashboard for clinical presentation.' },
  { id: 'api', label: 'API Gateway', desc: 'Secure endpoints for data transmission.' },
  { id: 'vcf-val', label: 'VCF Validator', desc: 'Ensures file integrity and format compliance.' },
  { id: 'vcf-parse', label: 'VCF Parser', desc: 'Extracts relevant genomic variants efficiently.' },
  { id: 'var-filter', label: 'Variant Filter', desc: 'Isolates clinically actionable pharmacogenes.' },
  { id: 'dip-resolve', label: 'Diplotype Resolver', desc: 'Phases alleles into standardized star classifications.' },
  { id: 'pheno-map', label: 'Phenotype Mapper', desc: 'Translates diplotypes into metabolic activity states.' },
  { id: 'rule-engine', label: 'Clinical Rule Engine', desc: 'Executes deterministic CPIC / PharmGKB rules.' },
  { id: 'risk-assess', label: 'Risk Assessment', desc: 'Generates the final unalterable clinical verdict.' },
  { id: 'audit-trace', label: 'Evidence / Audit Trace', desc: 'Logs the entire deterministic pipeline for compliance.' },
  { id: 'fact-pack', label: 'Fact Pack', desc: 'Structured JSON payload of all validated facts.' },
  { id: 'explanation', label: 'Constrained Explanation', desc: 'LLM translates the Fact Pack into a human-readable summary.' }
];

export function ProductArchitecture() {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  return (
    <section className="py-24 bg-[#050c17] relative border-t border-white/5">
      <div className="max-w-6xl mx-auto px-6 md:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white font-['Outfit'] mb-4">System Architecture</h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Hover over any component to explore the pipeline that turns a 3GB VCF file into a precise clinical recommendation.
          </p>
        </div>

        <div className="relative max-w-4xl mx-auto">
          {/* Connecting Line Behind Nodes */}
          <div className="absolute top-8 left-6 right-6 md:left-1/2 md:-translate-x-1/2 md:top-6 md:bottom-6 w-0.5 md:h-auto h-[90%] bg-gradient-to-b from-[#3b82f6]/20 via-[#8b5cf6]/20 to-[#22d3ee]/20 z-0" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-24 gap-y-6 relative z-10">
            {architectureNodes.map((node, index) => {
              const isEven = index % 2 === 0;
              const isHovered = hoveredNode === node.id;
              
              return (
                <motion.div 
                  key={node.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  className={`relative flex items-center ${isEven ? 'md:justify-end' : 'md:justify-start'}`}
                >
                  <div className={`
                    w-full max-w-sm p-4 rounded-xl border transition-all duration-300 cursor-pointer backdrop-blur-sm
                    ${isHovered 
                      ? 'bg-[#1e293b]/90 border-[#22d3ee]/60 shadow-[0_0_20px_rgba(34,211,238,0.2)] scale-105 z-20' 
                      : 'bg-[#0f172a]/80 border-white/10'
                    }
                  `}>
                    <h4 className={`text-lg font-bold font-['Outfit'] mb-1 transition-colors ${isHovered ? 'text-[#22d3ee]' : 'text-white'}`}>
                      {node.label}
                    </h4>
                    <p className={`text-sm transition-all duration-300 overflow-hidden ${isHovered ? 'text-slate-300 h-auto opacity-100' : 'text-slate-500 h-5 opacity-70 truncate'}`}>
                      {node.desc}
                    </p>
                  </div>

                  {/* Connection Node */}
                  <div className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 transition-colors duration-300 z-10
                    ${isEven ? 'md:-right-[3.25rem] right-auto left-4 md:left-auto' : 'md:-left-[3.25rem] left-4 md:left-auto'}
                    ${isHovered ? 'bg-[#22d3ee] border-[#22d3ee] shadow-[0_0_10px_rgba(34,211,238,0.8)]' : 'bg-[#050c17] border-white/20'}
                    hidden md:block
                  `} />
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
