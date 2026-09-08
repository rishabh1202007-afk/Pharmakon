import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const counterfactualScenarios = [
  {
    id: 'scenario-1',
    label: 'If Patient was Normal Metabolizer',
    biologicalState: 'CYP2C19 *1/*1',
    phenotype: 'Normal Metabolizer',
    classification: 'Standard Risk',
    action: 'Initiate standard starting dose.',
    color: '#10b981' // emerald
  },
  {
    id: 'scenario-2',
    label: 'If Patient was Ultra-Rapid Metabolizer',
    biologicalState: 'CYP2C19 *17/*17',
    phenotype: 'Ultra-Rapid Metabolizer',
    classification: 'Caution (Efficacy)',
    action: 'Potential therapy failure due to rapid clearance. Consider alternative.',
    color: '#f59e0b' // amber
  }
];

export function CounterfactualEngine() {
  const [activeScenario, setActiveScenario] = useState<string | null>(null);

  const scenario = activeScenario ? counterfactualScenarios.find(s => s.id === activeScenario) : null;

  return (
    <section className="py-24 bg-[#050c17] relative border-t border-white/5">
      <div className="max-w-6xl mx-auto px-6 md:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-white font-['Outfit'] mb-6">What would change the result?</h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Explore rule-grounded counterfactual reasoning. Our deterministic engine proves that clinical rules drive the outcome, not an AI hallucination.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          
          {/* Left: Controls */}
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-white font-['Outfit'] mb-4">Current State</h3>
            <div className="glass-panel p-6 rounded-xl border border-rose-500/30 bg-rose-500/5 shadow-[0_0_20px_rgba(244,63,94,0.1)] opacity-50 pointer-events-none">
              <div className="flex justify-between items-center mb-4">
                <span className="font-mono-tech text-slate-300 text-sm">CYP2C19 *2/*2</span>
                <span className="px-2 py-1 rounded bg-rose-500/20 text-rose-400 text-xs font-bold uppercase tracking-wider">Poor Metabolizer</span>
              </div>
              <div className="text-rose-400 font-medium mb-1">High Risk</div>
              <div className="text-sm text-slate-400">Avoid standard starting dose.</div>
            </div>

            <div className="h-px bg-white/10 my-8 w-full relative">
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#050c17] px-4 text-xs font-mono-tech text-slate-500 uppercase">Simulate Alternative Outcomes</div>
            </div>

            <div className="space-y-4">
              {counterfactualScenarios.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveScenario(activeScenario === s.id ? null : s.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-300 flex items-center justify-between ${
                    activeScenario === s.id 
                      ? 'border-[#22d3ee] bg-[#22d3ee]/10 shadow-[0_0_15px_rgba(34,211,238,0.2)]' 
                      : 'border-white/10 bg-[#0f172a]/50 hover:bg-[#0f172a] hover:border-white/30'
                  }`}
                >
                  <span className="font-medium text-white">{s.label}</span>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                    activeScenario === s.id ? 'border-[#22d3ee] bg-[#22d3ee]' : 'border-slate-600'
                  }`}>
                    {activeScenario === s.id && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right: Simulation Output */}
          <div className="h-full">
            <div className="h-full glass-panel p-8 md:p-12 rounded-3xl border border-white/5 relative overflow-hidden flex flex-col justify-center min-h-[400px]">
              
              {!scenario ? (
                <div className="text-center text-slate-500">
                  <div className="w-16 h-16 rounded-full border border-slate-700 flex items-center justify-center mx-auto mb-4">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
                  </div>
                  <p className="font-mono-tech uppercase text-sm tracking-widest">Select a scenario to simulate</p>
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={scenario.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.4 }}
                    className="relative z-10 space-y-8"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/5 border border-white/10 font-bold" style={{ color: scenario.color }}>
                        !
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-white font-['Outfit']">Simulation Result</h4>
                        <div className="text-sm font-mono-tech text-slate-400">Deterministic Engine Applied</div>
                      </div>
                    </div>

                    <div className="space-y-6 pl-4 border-l-2" style={{ borderColor: scenario.color }}>
                      <div>
                        <div className="text-xs font-mono-tech uppercase tracking-widest text-slate-500 mb-1">Biological State Change</div>
                        <div className="text-lg text-white font-medium">{scenario.biologicalState}</div>
                      </div>
                      
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        <div className="text-xs font-mono-tech uppercase tracking-widest text-slate-500 mb-1">Phenotype Mapped</div>
                        <div className="text-lg text-white font-medium">{scenario.phenotype}</div>
                      </motion.div>

                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                        className="pt-4 mt-4 border-t border-white/5"
                      >
                        <div className="text-xs font-mono-tech uppercase tracking-widest text-slate-500 mb-2">New Clinical Classification</div>
                        <div className="inline-block px-3 py-1 rounded-full bg-white/5 border mb-3 font-mono-tech text-sm font-semibold tracking-wider uppercase" style={{ borderColor: scenario.color, color: scenario.color }}>
                          {scenario.classification}
                        </div>
                        <p className="text-xl text-slate-300">{scenario.action}</p>
                      </motion.div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              )}

              {/* Background Glow */}
              <AnimatePresence>
                {scenario && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.15 }}
                    exit={{ opacity: 0 }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] rounded-full blur-[100px] pointer-events-none"
                    style={{ backgroundColor: scenario.color }}
                  />
                )}
              </AnimatePresence>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
