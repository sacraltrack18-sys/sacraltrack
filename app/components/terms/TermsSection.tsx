import { motion } from 'framer-motion';

interface TermsSectionProps {
  id: string;
  title: string;
  children: React.ReactNode;
}

export const TermsSection = ({ id, title, children }: TermsSectionProps) => {
  return (
    <motion.section 
      id={id}
      className="mb-16"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <div className="bg-[#1A2338] rounded-2xl p-8 shadow-xl border border-[#20DDBB]/10">
        <h2 className="text-2xl font-bold mb-6 text-[#20DDBB]">{title}</h2>
        <div className="space-y-6">
          {children}
        </div>
      </div>
    </motion.section>
  );
};

// Common UI components
export const InfoCard = ({ icon, title, children }: { icon: string; title?: string; children: React.ReactNode }) => (
  <div className="p-4 bg-white/5 rounded-xl border border-white/10">
    <div className="flex items-center gap-3 mb-3">
      <div className="w-10 h-10 rounded-full bg-[#20DDBB]/10 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      {title && <h3 className="font-medium">{title}</h3>}
    </div>
    <div>
      {children}
    </div>
  </div>
);

export const FeatureGrid = ({ features }: { features: { icon: string; title: string; desc: string }[] }) => (
  <div className="grid grid-cols-2 gap-4">
    {features.map((feature, index) => (
      <div key={index} className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#20DDBB]/10 flex items-center justify-center flex-shrink-0">
          {feature.icon}
        </div>
        <div>
          <h4 className="font-medium mb-1">{feature.title}</h4>
          <p className="text-sm text-white/60">{feature.desc}</p>
        </div>
      </div>
    ))}
  </div>
);

export const Notice = ({ type = 'info', title, children }: { type?: 'info' | 'warning'; title?: string; children: React.ReactNode }) => (
  <div className={`p-4 ${
    type === 'warning' 
      ? 'bg-red-500/5 border-red-500/10' 
      : 'bg-[#018CFD]/5 border-[#018CFD]/10'
  } rounded-xl border`}>
    {title && (
      <h4 className={`font-medium mb-2 ${
        type === 'warning' ? 'text-red-400' : 'text-[#018CFD]'
      }`}>
        {type === 'warning' ? '⚠️ ' : 'ℹ️ '}{title}
      </h4>
    )}
    <p className="text-sm text-white/60">{children}</p>
  </div>
);

export const CheckList = ({ items }: { items: string[] }) => (
  <ul className="space-y-2">
    {items.map((item, index) => (
      <li key={index} className="flex items-center gap-2">
        <span className="text-[#20DDBB]">✓</span>
        <span className="text-white/80">{item}</span>
      </li>
    ))}
  </ul>
);

export default TermsSection; 