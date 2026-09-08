import { motion } from 'framer-motion';

export function AiVsDeterministic() {
  return (
    <section className="py-32 bg-[#020617] relative overflow-hidden">
      {/* Background Styling */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.03)_0%,rgba(2,6,23,1)_70%)] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 md:px-8 relative z-10">
        
        <div className="text-center mb-20 space-y-4">
          <h2 className="text-4xl md:text-6xl font-bold font-['Outfit'] text-white tracking-tight">
            AI doesn't decide. <br />
            <span className="text-[#22d3ee]">It explains.</span>
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            We didn't build another AI that guesses. We built an engine that can show its work. 
            The clinical rule engine makes the assessment. The AI layer ONLY explains already-established facts.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-stretch">
          
          {/* Left: Deterministic Engine */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="glass-panel p-8 md:p-12 rounded-3xl border border-[#3b82f6]/30 relative group"
          >
            <div className="absolute top-0 right-0 p-4">
              <span className="px-3 py-1 rounded-full bg-[#3b82f6]/20 text-[#3b82f6] text-xs font-mono-tech uppercase tracking-widest font-bold">
                100% Deterministic
              </span>
            </div>
            
            <h3 className="text-3xl font-bold text-white font-['Outfit'] mb-8">Clinical Engine</h3>
            
            <div className="space-y-6 relative">
              <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-[#3b82f6]/20" />
              
              <div className="relative pl-16">
                <div className="absolute left-4 top-1 w-4 h-4 rounded-full bg-[#0f172a] border-2 border-[#3b82f6] shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                <h4 className="text-lg font-semibold text-white">Input VCF & Rules</h4>
                <p className="text-slate-400 text-sm mt-1">Ingests raw genomic data and strictly typed CPIC rules.</p>
              </div>
              
              <div className="relative pl-16">
                <div className="absolute left-4 top-1 w-4 h-4 rounded-full bg-[#0f172a] border-2 border-[#3b82f6] shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                <h4 className="text-lg font-semibold text-white">Rule Execution</h4>
                <p className="text-slate-400 text-sm mt-1">Evaluates variants against phenotypes deterministically.</p>
              </div>
              
              <div className="relative pl-16">
                <div className="absolute left-4 top-1 w-4 h-4 rounded-full bg-[#3b82f6] shadow-[0_0_15px_rgba(59,130,246,0.8)]" />
                <h4 className="text-xl font-bold text-[#3b82f6]">Clinical Assessment</h4>
                <p className="text-slate-300 text-sm mt-1">Produces the final, unalterable clinical decision.</p>
              </div>
            </div>
          </motion.div>

          {/* Center Divider for Desktop */}
          <div className="hidden lg:flex flex-col items-center justify-center -mx-8 z-20">
            <div className="w-12 h-12 rounded-full bg-[#050c17] border border-white/20 flex items-center justify-center text-slate-400">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
            </div>
          </div>

          {/* Right: AI Explanation */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="glass-panel p-8 md:p-12 rounded-3xl border border-[#8b5cf6]/30 relative overflow-hidden"
          >
            {/* Subtle purple glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#8b5cf6]/5 to-transparent pointer-events-none" />
            
            <div className="absolute top-0 right-0 p-4">
              <span className="px-3 py-1 rounded-full bg-[#8b5cf6]/20 text-[#8b5cf6] text-xs font-mono-tech uppercase tracking-widest font-bold">
                Constrained LLM
              </span>
            </div>

            <h3 className="text-3xl font-bold text-white font-['Outfit'] mb-8">AI Layer</h3>

            <div className="space-y-6 relative">
              <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-[#8b5cf6]/20" />
              
              <div className="relative pl-16">
                <div className="absolute left-4 top-1 w-4 h-4 rounded-full bg-[#0f172a] border-2 border-[#8b5cf6] shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
                <h4 className="text-lg font-semibold text-white">Fact Packet Injection</h4>
                <p className="text-slate-400 text-sm mt-1">Receives the locked assessment and evidence trace.</p>
              </div>
              
              <div className="relative pl-16">
                <div className="absolute left-4 top-1 w-4 h-4 rounded-full bg-[#0f172a] border-2 border-[#8b5cf6] shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
                <h4 className="text-lg font-semibold text-white">Contextualization</h4>
                <p className="text-slate-400 text-sm mt-1">Translates raw clinical rules into physician-friendly narrative.</p>
              </div>
              
              <div className="relative pl-16">
                <div className="absolute left-4 top-1 w-4 h-4 rounded-full bg-[#8b5cf6] shadow-[0_0_15px_rgba(139,92,246,0.8)]" />
                <h4 className="text-xl font-bold text-[#8b5cf6]">Natural Explanation</h4>
                <p className="text-slate-300 text-sm mt-1">A coherent, human-readable "Why?" that never hallucinates facts.</p>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
