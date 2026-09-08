import { motion } from 'framer-motion';

const auditLogs = [
  { time: '09:41:59.012', level: 'INFO', process: 'VCF_INGEST', message: 'Loaded de-identified_case_002.vcf (2.4M lines)' },
  { time: '09:41:59.105', level: 'VALIDATE', process: 'QC_CHECK', message: 'Passed: GRCh38 assembly verified. Minimum read depth > 30x.' },
  { time: '09:41:59.432', level: 'FILTER', process: 'VARIANT_CALL', message: 'Targeting CYP2C19 locus. rs4244285 detected. Call: T>C' },
  { time: '09:41:59.601', level: 'RESOLVE', process: 'DIPLOTYPE', message: 'Phasing algorithms confirm *2/*2 loss-of-function.' },
  { time: '09:41:59.720', level: 'MAP', process: 'PHENOTYPE', message: 'Mapped *2/*2 -> Poor Metabolizer (Activity Score: 0)' },
  { time: '09:41:59.815', level: 'ENGINE', process: 'RULE_EVAL', message: 'Executing CPIC SSRI-CYP2C19 Guideline v2026.03' },
  { time: '09:41:59.840', level: 'MATCH', process: 'RULE_EVAL', message: 'Condition met: Drug=Citalopram AND Pheno=Poor_Metabolizer' },
  { time: '09:41:59.910', level: 'OUTPUT', process: 'DECISION', message: 'Generated Recommendation ID: REC-8924-A (High Risk)' },
  { time: '09:42:00.050', level: 'INFO', process: 'EXPLAIN', message: 'Generating human-readable fact packet from structured trace.' },
  { time: '09:42:00.320', level: 'SUCCESS', process: 'SYSTEM', message: 'Pipeline complete. Audit hash generated: 0x9a8f...4c2b' }
];

export function AuditConsole() {
  return (
    <section id="audit" className="py-24 bg-[#020617] relative">
      <div className="max-w-5xl mx-auto px-6 md:px-8">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <div>
            <h2 className="text-4xl md:text-5xl font-bold text-white font-['Outfit'] mb-4">Audit Mode</h2>
            <p className="text-lg text-slate-400 max-w-2xl">
              High-security scientific console. Not a black box. Every step is deterministically logged and reproducible.
            </p>
          </div>
          <div className="px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono-tech text-sm uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Trace Active
          </div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-xl overflow-hidden border border-slate-700 bg-[#050c17] shadow-2xl relative"
        >
          {/* Terminal Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#0f172a] border-b border-slate-700">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500" />
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
            </div>
            <div className="font-mono-tech text-xs text-slate-500 uppercase tracking-widest">
              PK-SYS // AUDIT_LOG // v2.4.0
            </div>
            <div className="w-4 h-4" /> {/* Spacer */}
          </div>

          {/* Terminal Body */}
          <div className="p-6 font-mono-tech text-sm md:text-base leading-relaxed h-[400px] overflow-y-auto">
            {auditLogs.map((log, idx) => {
              let colorClass = "text-slate-400";
              if (log.level === 'VALIDATE' || log.level === 'SUCCESS' || log.level === 'MATCH') colorClass = "text-emerald-400";
              if (log.level === 'FILTER' || log.level === 'RESOLVE' || log.level === 'MAP') colorClass = "text-[#22d3ee]";
              if (log.level === 'OUTPUT') colorClass = "text-amber-400";
              if (log.level === 'ENGINE') colorClass = "text-violet-400";

              return (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex flex-col sm:flex-row gap-2 sm:gap-6 hover:bg-white/5 px-2 py-1 rounded transition-colors"
                >
                  <div className="text-slate-600 shrink-0 w-28">[{log.time}]</div>
                  <div className={`${colorClass} shrink-0 w-24 font-bold`}>{log.level}</div>
                  <div className="text-slate-300">
                    <span className="text-slate-500 mr-2">[{log.process}]</span>
                    {log.message}
                  </div>
                </motion.div>
              );
            })}
            
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="mt-4 px-2 text-slate-500"
            >
              _
            </motion.div>
          </div>
          
          {/* Scanline overlay */}
          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] opacity-20" />
        </motion.div>
      </div>
    </section>
  );
}
