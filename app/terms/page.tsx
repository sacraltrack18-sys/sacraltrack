"use client"
import { useState, useEffect } from 'react';
import { useRouter } from "next/navigation";
import { useUser } from "@/app/context/user";
import { BsChevronLeft } from "react-icons/bs";
import TopNav from "@/app/layouts/includes/TopNav";
import { motion } from 'framer-motion';
import TermsSection, { InfoCard, FeatureGrid, Notice, CheckList } from '../components/terms/TermsSection';

const sections = [
  { id: 'introduction', title: 'Introduction', icon: '📝' },
  { id: 'acceptance', title: 'Terms Acceptance', icon: '✅' },
  { id: 'intellectual-property', title: 'Intellectual Property', icon: '⚖️' },
  { id: 'registration', title: 'Registration', icon: '🔐' },
  { id: 'copyright', title: 'Copyright', icon: '🎵' },
  { id: 'publication', title: 'Publication', icon: '📤' },
  { id: 'royalty', title: 'Royalty', icon: '💰' },
  { id: 'payment', title: 'Payment', icon: '💳' }
];

export default function TermsOfUse() {
  const router = useRouter();
  const userContext = useUser();
  const [activeSection, setActiveSection] = useState('introduction');
  const [showBackToTop, setShowBackToTop] = useState(false);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setActiveSection(sectionId);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 500);
      
      const sections = document.querySelectorAll('section[id]');
      sections.forEach(section => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= 100 && rect.bottom >= 100) {
          setActiveSection(section.id);
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <TopNav params={{ id: userContext?.user?.id as string }} />
      
      <div className="min-h-screen bg-gradient-to-b from-[#1f1239] to-[#150c28] text-white">
        <div className="flex">
          {/* Side Navigation */}
          <motion.div 
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="fixed top-[80px] left-0 w-[280px] h-[calc(100vh-80px)] bg-[#1A2338]/90 backdrop-blur-lg border-r border-[#20DDBB]/10 overflow-y-auto"
          >
            <div className="p-6">
              <h2 className="text-xl font-bold mb-6 bg-gradient-to-r from-[#20DDBB] to-[#018CFD] bg-clip-text text-transparent">
                Table of Contents
              </h2>
              <nav className="space-y-2">
                {sections.map((section) => (
                  <motion.button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className={`w-full text-left p-3 rounded-xl transition-all duration-200 flex items-center gap-3
                               ${activeSection === section.id 
                                 ? 'bg-[#20DDBB]/10 text-[#20DDBB]' 
                                 : 'hover:bg-white/5'}`}
                    whileHover={{ x: 5 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="text-xl">{section.icon}</span>
                    <span className="text-sm">{section.title}</span>
                  </motion.button>
                ))}
              </nav>
            </div>
          </motion.div>

          {/* Main Content */}
          <div className="flex-1 ml-[280px] p-8 pt-[100px]">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-3xl mx-auto"
            >
              <TermsSection id="introduction" title="Introduction">
                <p className="text-white/80 leading-relaxed">
                  Welcome to sacraltrack.com. The Site, all services and APIs are the property of Sacral Projects, 
                  registered under Partnership No. OC436704 at Palliser House Second Floor - London, United Kingdom.
                </p>
                <div className="mt-6 p-4 bg-[#20DDBB]/5 rounded-xl border border-[#20DDBB]/10">
                  <h3 className="text-[#20DDBB] font-medium mb-2">Key Features:</h3>
                  <CheckList items={[
                    'Upload and sell tracks',
                    'Track sales statistics',
                    'Create playlists',
                    'Interact with users'
                  ]} />
                </div>
              </TermsSection>

              <TermsSection id="acceptance" title="Terms Acceptance">
                <p className="text-white/80 leading-relaxed">
                  The right to use ST Systems is granted subject to acceptance of all terms and conditions 
                  contained in this document.
                </p>
                <Notice title="Important">
                  By using ST Systems in any form, you automatically agree to be bound by these Terms of Use.
                </Notice>
              </TermsSection>

              <TermsSection id="intellectual-property" title="Intellectual Property Rights">
                <p className="text-white/80 leading-relaxed">
                  Copyright for the design, database and any other intellectual property, including the Content belongs to Sacral Projects.
                </p>
                <div className="bg-[#20DDBB]/5 rounded-xl p-6 border border-[#20DDBB]/10">
                  <h3 className="text-[#20DDBB] font-medium mb-4">Protected Content Includes:</h3>
                  <FeatureGrid features={[
                    { icon: '💻', title: 'Software', desc: 'Programs, source code, documentation' },
                    { icon: '🎨', title: 'Graphics', desc: 'Images, drawings, animations' },
                    { icon: '🎵', title: 'Audio', desc: 'Music tracks and sound effects' },
                    { icon: '⚡', title: 'API', desc: 'Interfaces and endpoints' }
                  ]} />
                </div>
                <Notice type="warning" title="Copyright Notice">
                  No Content may be copied, reproduced, distributed, displayed, published, downloaded, 
                  transferred, sold or otherwise used without prior written permission from ST Systems.
                </Notice>
              </TermsSection>

              <TermsSection id="registration" title="Registration">
                <InfoCard icon="🔐" title="Account Security">
                  <p className="text-sm text-white/80">
                    Your username and password are crucial for account security. Never share them with third parties.
                  </p>
                </InfoCard>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-[#20DDBB]/5 rounded-xl border border-[#20DDBB]/10">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <span className="text-[#20DDBB]">✓</span>
                      Free Registration
                    </h4>
                    <p className="text-sm text-white/60">
                      Create your account for free with email and SMS verification
                    </p>
                  </div>
                  <div className="p-4 bg-[#20DDBB]/5 rounded-xl border border-[#20DDBB]/10">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <span className="text-[#20DDBB]">✓</span>
                      Data Protection
                    </h4>
                    <p className="text-sm text-white/60">
                      Your personal data is protected and only used for essential services
                    </p>
                  </div>
                </div>

                <Notice title="Contact Support">
                  If you suspect any security issues with your account, contact us immediately at: 
                  <a href="mailto:sacraltrack@gmail.com" className="text-[#018CFD] ml-1 hover:underline">
                    sacraltrack@gmail.com
                  </a>
                </Notice>
              </TermsSection>

              {/* Add more sections here... */}
            </motion.div>
          </div>
        </div>

        {/* Back to Top Button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: showBackToTop ? 1 : 0 }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-8 right-8 bg-[#20DDBB] text-white p-4 rounded-full shadow-lg
                   hover:bg-[#1CB399] transition-colors z-50"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <BsChevronLeft className="transform rotate-90" size={20} />
        </motion.button>
      </div>
    </>
  );
}

// Add custom scrollbar styles to globals.css
/*
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #20DDBB;
  border-radius: 20px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #1CB399;
}
*/
