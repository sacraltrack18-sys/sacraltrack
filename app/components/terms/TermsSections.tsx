import { motion } from 'framer-motion';

interface SectionProps {
  id: string;
  title: string;
  children: React.ReactNode;
}

const Section = ({ id, title, children }: SectionProps) => (
  <motion.section 
    id={id}
    className="mb-16"
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5 }}
  >
    <h2 className="text-2xl font-bold mb-6 text-[#20DDBB]">{title}</h2>
    <div className="bg-[#1A2338] rounded-2xl p-8 shadow-xl border border-[#20DDBB]/10">
      {children}
    </div>
  </motion.section>
);

export const TermsSections = () => {
  return (
    <div className="space-y-16">
      <Section id="introduction" title="Introduction">
        <div className="space-y-6">
          <p className="text-white/80 leading-relaxed">
            Welcome to sacraltrack.space. The Site, all services and APIs are the property of Sacral Projects, 
            registered under Partnership No. OC436704 at Palliser House Second Floor - London, United Kingdom.
          </p>
          <div className="mt-6 p-4 bg-[#20DDBB]/5 rounded-xl border border-[#20DDBB]/10">
            <h3 className="text-[#20DDBB] font-medium mb-2">Key Features:</h3>
            <ul className="grid grid-cols-2 gap-4">
              <li className="flex items-center gap-2">
                <span className="text-[#20DDBB]">✓</span>
                Upload and sell tracks
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#20DDBB]">✓</span>
                Track sales statistics
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#20DDBB]">✓</span>
                Create playlists
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#20DDBB]">✓</span>
                Interact with users
              </li>
            </ul>
          </div>
        </div>
      </Section>

      <Section id="acceptance" title="Terms Acceptance">
        <div className="space-y-4">
          <p className="text-white/80 leading-relaxed">
            The right to use ST Systems is granted subject to acceptance of all terms and conditions 
            contained in this document.
          </p>
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <p className="text-sm text-white/60">
              By using ST Systems in any form, you automatically agree to be bound by these Terms of Use.
            </p>
          </div>
        </div>
      </Section>

      <Section id="intellectual-property" title="Intellectual Property Rights">
        <div className="space-y-6">
          <p className="text-white/80 leading-relaxed">
            Copyright for the design, database and any other intellectual property, including the Content belongs to Sacral Projects.
          </p>
          <div className="bg-[#20DDBB]/5 rounded-xl p-6 border border-[#20DDBB]/10">
            <h3 className="text-[#20DDBB] font-medium mb-4">Protected Content Includes:</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: '💻', title: 'Software', desc: 'Programs, source code, documentation' },
                { icon: '🎨', title: 'Graphics', desc: 'Images, drawings, animations' },
                { icon: '🎵', title: 'Audio', desc: 'Music tracks and sound effects' },
                { icon: '⚡', title: 'API', desc: 'Interfaces and endpoints' }
              ].map((item, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#20DDBB]/10 flex items-center justify-center flex-shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">{item.title}</h4>
                    <p className="text-sm text-white/60">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section id="registration" title="Registration">
        <div className="space-y-6">
          <div className="flex items-start gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
            <div className="w-10 h-10 rounded-full bg-[#20DDBB]/10 flex items-center justify-center flex-shrink-0">
              🔐
            </div>
            <div>
              <h3 className="font-medium mb-2">Account Security</h3>
              <p className="text-sm text-white/80">
                Your username and password are crucial for account security. Never share them with third parties.
              </p>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { title: 'Free Registration', desc: 'Create your account for free with email and SMS verification' },
              { title: 'Data Protection', desc: 'Your personal data is protected and only used for essential services' }
            ].map((item, index) => (
              <div key={index} className="p-4 bg-[#20DDBB]/5 rounded-xl border border-[#20DDBB]/10">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <span className="text-[#20DDBB]">✓</span>
                  {item.title}
                </h4>
                <p className="text-sm text-white/60">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-[#018CFD]/5 rounded-xl border border-[#018CFD]/10">
            <h4 className="text-[#018CFD] font-medium mb-2">Important Notice</h4>
            <p className="text-sm text-white/60">
              If you suspect any security issues with your account, contact us immediately at: 
              <a href="mailto:sacraltrack@gmail.com" className="text-[#018CFD] ml-1 hover:underline">
                sacraltrack@gmail.com
              </a>
            </p>
          </div>
        </div>
      </Section>

      {/* Add more sections here... */}
    </div>
  );
};

export default TermsSections; 