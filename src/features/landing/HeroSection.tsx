import { motion } from 'framer-motion';

const nodes = [
  { id: 'vcf', label: 'VCF Data', x: 10, y: 50 },
  { id: 'variant', label: 'Variant', x: 25, y: 30 },
  { id: 'gene', label: 'Gene', x: 40, y: 50 },
  { id: 'diplotype', label: 'Diplotype', x: 55, y: 30 },
  { id: 'phenotype', label: 'Phenotype', x: 70, y: 50 },
  { id: 'drug', label: 'Drug Rule', x: 85, y: 30 },
  { id: 'risk', label: 'Risk Output', x: 95, y: 60 },
];

const paths = [
  { from: 0, to: 1 },
  { from: 1, to: 2 },
  { from: 2, to: 3 },
  { from: 3, to: 4 },
  { from: 4, to: 5 },
  { from: 5, to: 6 },
];

function GenomicCore() {
  return (
    <div className="relative w-full h-full min-h-[400px] flex items-center justify-center">
      {/* Background Orbs */}
      <motion.div 
        animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute w-64 h-64 bg-[#22d3ee] rounded-full blur-[100px] opacity-20 top-1/2 left-1/4 -translate-y-1/2"
      />
      <motion.div 
        animate={{ scale: [1, 1.5, 1], opacity: [0.1, 0.2, 0.1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute w-80 h-80 bg-[#8b5cf6] rounded-full blur-[120px] opacity-20 top-1/2 right-1/4 -translate-y-1/2"
      />

      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full overflow-visible">
        {/* Draw edges */}
        {paths.map((p, i) => (
          <motion.line
            key={`edge-${i}`}
            x1={nodes[p.from].x}
            y1={nodes[p.from].y}
            x2={nodes[p.to].x}
            y2={nodes[p.to].y}
            stroke="rgba(34, 211, 238, 0.2)"
            strokeWidth="0.5"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 2, delay: i * 0.3, ease: "easeInOut" }}
          />
        ))}
        {/* Animated Particles along paths */}
        {paths.map((p, i) => (
          <motion.circle
            key={`particle-${i}`}
            r="1"
            fill="#22d3ee"
            initial={{ cx: nodes[p.from].x, cy: nodes[p.from].y, opacity: 0 }}
            animate={{ 
              cx: [nodes[p.from].x, nodes[p.to].x], 
              cy: [nodes[p.from].y, nodes[p.to].y],
              opacity: [0, 1, 0]
            }}
            transition={{ 
              duration: 2.5, 
              repeat: Infinity, 
              delay: i * 0.4,
              ease: "linear"
            }}
            style={{ filter: 'drop-shadow(0 0 4px #22d3ee)' }}
          />
        ))}

        {/* Draw nodes */}
        {nodes.map((node, i) => (
          <g key={`node-${node.id}`}>
            <motion.circle
              cx={node.x}
              cy={node.y}
              r="2"
              fill="#0f172a"
              stroke="#22d3ee"
              strokeWidth="0.5"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.3 + 0.5, type: "spring" }}
            />
            {/* Inner pulsing core */}
            <motion.circle
              cx={node.x}
              cy={node.y}
              r="1"
              fill="#fff"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
            />
            <motion.text
              x={node.x}
              y={node.y + 6}
              fill="#94a3b8"
              fontSize="3"
              textAnchor="middle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.3 + 1 }}
              className="font-mono-tech uppercase tracking-wider"
            >
              {node.label}
            </motion.text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export function HeroSection() {
  const scrollToProduct = () => document.getElementById('product')?.scrollIntoView({ behavior: 'smooth' });
  const scrollToPipeline = () => document.getElementById('pipeline')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <section id="hero" className="relative min-h-screen flex items-center pt-24 pb-12 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 md:px-8 w-full z-10 grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
        
        {/* Left: Text Content */}
        <div className="flex flex-col items-start text-left space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-md"
          >
            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
            <span className="text-xs font-mono-tech text-slate-300 tracking-wide uppercase">Engine Version 2.4 Active</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold font-['Outfit'] tracking-tight leading-[1.1] text-white"
          >
            Precision medicine, <br/>
            <span className="text-gradient">explained.</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-lg md:text-xl text-slate-400 max-w-xl leading-relaxed"
          >
            Turn genomic complexity into transparent, evidence-traceable drug-risk insights. Clinical rules decide. AI explains.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
          >
            <button 
              onClick={scrollToProduct}
              className="px-8 py-4 rounded-full bg-white text-slate-900 font-semibold text-lg hover:bg-slate-200 transition-colors shadow-[0_0_30px_rgba(255,255,255,0.2)]"
            >
              Explore Pharmakon
            </button>
            <button 
              onClick={scrollToPipeline}
              className="px-8 py-4 rounded-full bg-transparent border border-slate-600 text-white font-semibold text-lg hover:border-[#22d3ee] hover:bg-[#22d3ee]/10 transition-all"
            >
              View Clinical Pipeline
            </button>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.8 }}
            className="pt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-mono-tech text-slate-500"
          >
            <div className="flex items-center gap-2">
              <span className="text-[#22d3ee]">✓</span> Deterministic reasoning
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#8b5cf6]">✓</span> Evidence traceability
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#f59e0b]">✓</span> Uncertainty-aware
            </div>
          </motion.div>
        </div>

        {/* Right: Genomic Intelligence Core */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.4 }}
          className="relative w-full h-[500px] glass-panel rounded-2xl overflow-hidden"
        >
          <GenomicCore />
          
          <div className="absolute top-4 left-4 flex gap-2">
             <div className="w-3 h-3 rounded-full bg-slate-700" />
             <div className="w-3 h-3 rounded-full bg-slate-700" />
             <div className="w-3 h-3 rounded-full bg-slate-700" />
          </div>
          <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
            <span className="text-xs font-mono-tech text-slate-500 uppercase">SYS_TRACE: ALIVE</span>
            <span className="text-xs font-mono-tech text-[#22d3ee] uppercase tracking-widest animate-pulse">PROCESSING_VCF</span>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
