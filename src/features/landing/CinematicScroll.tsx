import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

const steps = [
  {
    id: '01',
    title: 'RAW GENOMIC DATA',
    desc: 'The system ingests and validates standard VCF files, extracting millions of unmapped data points.',
    visual: 'chr10 94981296 rs4244285 T C 100 PASS'
  },
  {
    id: '02',
    title: 'VARIANT',
    desc: 'Identifies clinically relevant genetic variants supported by established literature.',
    visual: 'Variant rs4244285 detected'
  },
  {
    id: '03',
    title: 'GENE',
    desc: 'Maps the variant to the specific pharmacogenomic gene.',
    visual: 'CYP2C19'
  },
  {
    id: '04',
    title: 'DIPLOTYPE',
    desc: 'Resolves inherited alleles into a standardized diplotype classification.',
    visual: '*2/*2'
  },
  {
    id: '05',
    title: 'PHENOTYPE',
    desc: 'Translates the genotype into a functional biological interpretation.',
    visual: 'Poor Metabolizer'
  },
  {
    id: '06',
    title: 'DRUG',
    desc: 'Cross-references the biological state with the prescribed medication.',
    visual: 'Citalopram (SSRI)'
  },
  {
    id: '07',
    title: 'CLINICAL RULE',
    desc: 'Applies deterministic CPIC Level A or PharmGKB guidelines.',
    visual: 'CPIC Guideline Matched: High Risk'
  },
  {
    id: '08',
    title: 'RECOMMENDATION',
    desc: 'Generates a transparent, evidence-backed decision support output.',
    visual: 'Reduce dose by 50% or consider alternative'
  }
];

function ScrollStep({ step, index }: { step: typeof steps[0], index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start center", "end center"]
  });

  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [0.2, 1, 0.2]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.95, 1, 0.95]);

  return (
    <motion.div 
      ref={ref}
      style={{ opacity, scale }}
      className="min-h-[50vh] flex flex-col md:flex-row items-center gap-12 py-24"
    >
      <div className="flex-1 space-y-4">
        <div className="text-[#22d3ee] font-mono-tech text-sm tracking-widest">STEP {step.id}</div>
        <h3 className="text-3xl md:text-5xl font-bold text-white tracking-tight">{step.title}</h3>
        <p className="text-slate-400 text-lg max-w-md leading-relaxed">{step.desc}</p>
      </div>
      <div className="flex-1 w-full">
        <div className="glass-panel p-8 rounded-2xl border border-white/5 bg-[#0f172a]/80 shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-[#22d3ee]/5 to-[#8b5cf6]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="font-mono-tech text-[#22d3ee] text-lg md:text-xl break-all">
            {step.visual}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function CinematicScroll() {
  return (
    <section id="pipeline" className="relative bg-[#020617] py-32">
      {/* Background line */}
      <div className="absolute left-1/2 md:left-1/4 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[#22d3ee]/20 to-transparent -translate-x-1/2" />
      
      <div className="max-w-5xl mx-auto px-6 md:px-8 relative z-10">
        <div className="text-center mb-32 space-y-6">
          <h2 className="text-4xl md:text-6xl font-bold text-white tracking-tight font-['Outfit']">
            How Pharmakon Thinks
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            A deterministic reasoning pipeline that translates raw genomic complexity into clinical clarity.
          </p>
        </div>

        <div className="space-y-0">
          {steps.map((step, index) => (
            <ScrollStep key={step.id} step={step} index={index} />
          ))}
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1 }}
          className="text-center mt-32"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white font-['Outfit'] italic text-gradient">
            "Every conclusion has a trail."
          </h2>
        </motion.div>
      </div>
    </section>
  );
}
