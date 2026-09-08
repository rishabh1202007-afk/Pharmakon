import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

const knowledgeFiles = [
  { name: 'genes.json', description: 'Chromosomal loci and valid transcripts.', size: '12 KB', color: '#3b82f6' },
  { name: 'star_alleles.json', description: 'Variant to haplotype definitions.', size: '840 KB', color: '#22d3ee' },
  { name: 'phenotype_rules.json', description: 'Diplotype to activity score mappings.', size: '45 KB', color: '#10b981' },
  { name: 'drug_gene_rules.json', description: 'Guideline execution logic.', size: '1.2 MB', color: '#8b5cf6' },
  { name: 'recommendations.json', description: 'Actionable clinical text payloads.', size: '210 KB', color: '#f59e0b' },
  { name: 'evidence.json', description: 'Citations, PMIDs, and confidence scores.', size: '560 KB', color: '#ef4444' },
];

const sampleCode = `{
  "gene": "CYP2C19",
  "drug": "citalopram",
  "guideline": "CPIC",
  "rules": [
    {
      "phenotype": "Poor Metabolizer",
      "recommendation_id": "REC-8924-A",
      "classification": "High Risk",
      "action": "Consider a 50% reduction of starting dose."
    }
  ]
}`;

export function KnowledgeLayer() {
  const [activeFile, setActiveFile] = useState(knowledgeFiles[3].name);

  return (
    <section className="py-24 bg-[#020617] relative">
      <div className="max-w-6xl mx-auto px-6 md:px-8">
        
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white font-['Outfit'] mb-4">Knowledge Repository</h2>
          <p className="text-lg text-[#22d3ee] font-mono-tech uppercase tracking-widest max-w-2xl mx-auto mb-2">
            Code implements the engine. Structured data represents the clinical knowledge.
          </p>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Our engine is completely decoupled from clinical guidelines. Updates to medical literature don't require code changes—only a data update.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-start">
          
          {/* Left: File System */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            {knowledgeFiles.map((file) => (
              <button
                key={file.name}
                onClick={() => setActiveFile(file.name)}
                className={`text-left p-4 rounded-xl border transition-all duration-300 flex items-center justify-between group ${
                  activeFile === file.name 
                    ? 'bg-white/10 border-white/20 shadow-lg'
                    : 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/10'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded bg-[#0f172a] border border-white/10 flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={file.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                  </div>
                  <div>
                    <div className={`font-mono-tech text-sm font-semibold transition-colors ${activeFile === file.name ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                      {file.name}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">{file.description}</div>
                  </div>
                </div>
                <div className="text-xs font-mono-tech text-slate-600">{file.size}</div>
              </button>
            ))}
          </div>

          {/* Right: Code Viewer */}
          <div className="lg:col-span-7">
            <div className="glass-panel rounded-xl border border-slate-700 bg-[#0b1221] overflow-hidden shadow-2xl">
              {/* Header */}
              <div className="flex items-center px-4 py-3 bg-[#050c17] border-b border-slate-700">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                </div>
                <div className="mx-auto text-xs font-mono-tech text-slate-500">{activeFile}</div>
                <div className="w-10" />
              </div>
              
              {/* Body */}
              <div className="p-6 relative">
                <div className="absolute top-0 left-0 w-12 h-full bg-[#050c17]/50 border-r border-slate-800 flex flex-col items-center py-6 text-xs text-slate-600 font-mono-tech select-none">
                  {[...Array(15)].map((_, i) => <div key={i}>{i + 1}</div>)}
                </div>
                <pre className="pl-12 font-mono-tech text-sm text-[#22d3ee] overflow-x-auto leading-loose">
                  <code>
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeFile}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                      >
                        {activeFile === 'drug_gene_rules.json' ? sampleCode : `{\n  "metadata": "Data for ${activeFile} loaded",\n  "status": "synchronized"\n}`}
                      </motion.div>
                    </AnimatePresence>
                  </code>
                </pre>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
