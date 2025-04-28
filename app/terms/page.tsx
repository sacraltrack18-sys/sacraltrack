"use client"
import { useState, useEffect, useRef } from 'react';
import { useRouter } from "next/navigation";
import { useUser } from "@/app/context/user";
import { BsChevronLeft, BsChevronDown } from "react-icons/bs";
import TopNav from "@/app/layouts/includes/TopNav";
import { motion, AnimatePresence } from 'framer-motion';
import TermsSection, { InfoCard, FeatureGrid, Notice, CheckList } from '../components/terms/TermsSection';
import { FaArrowRight, FaListUl } from "react-icons/fa";

const sections = [
  { id: 'introduction', title: 'Introduction', icon: '📝' },
  { id: 'acceptance', title: 'Terms Acceptance', icon: '✅' },
  { id: 'intellectual-property', title: 'Intellectual Property', icon: '⚖️' },
  { id: 'registration', title: 'Registration', icon: '🔐' },
  { id: 'features', title: 'Platform Features', icon: '⭐' },
  { id: 'technical', title: 'Technical Specifications', icon: '🔧' },
  { id: 'copyright', title: 'Copyright & Licensing', icon: '🎵' },
  { id: 'publication', title: 'Publication', icon: '📤' },
  { id: 'ranking', title: 'Ranking System', icon: '🏆' },
  { id: 'royalty', title: 'Royalties & Revenue', icon: '💰' },
  { id: 'payment', title: 'Payment', icon: '💳' },
  { id: 'marketing', title: 'Marketing Terms', icon: '📢' },
  { id: 'purchased-content', title: 'Purchased Content', icon: '🛒' },
  { id: 'third-party', title: 'Third-party Sites', icon: '🔗' },
];

export default function TermsOfUse() {
  const router = useRouter();
  const userContext = useUser();
  const [activeSection, setActiveSection] = useState('introduction');
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const yOffset = window.innerWidth < 768 ? -100 : -80; // Different offset for mobile
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
      setActiveSection(sectionId);
      setIsMobileMenuOpen(false);
    }
  };

  // Handle clicks outside mobile menu to close it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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

  // Table of contents component for mobile
  const MobileTableOfContents = () => (
    <div className="relative z-20" ref={mobileMenuRef}>
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="flex items-center gap-2 w-full p-3 bg-[#1A2338]/90 backdrop-blur-lg border border-[#20DDBB]/10 rounded-lg text-white"
      >
        <FaListUl className="text-[#20DDBB]" />
        <span className="flex-1 text-left">Table of Contents</span>
        <BsChevronDown className={`transition-transform duration-200 ${isMobileMenuOpen ? 'rotate-180' : ''}`} />
      </button>
      
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-1 max-h-[60vh] overflow-y-auto bg-[#1A2338]/95 backdrop-blur-lg border border-[#20DDBB]/10 rounded-lg shadow-xl"
          >
            <div className="py-2">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={`w-full text-left px-4 py-3 transition-all duration-200
                             ${activeSection === section.id 
                              ? 'bg-[#20DDBB]/10 text-[#20DDBB]' 
                              : 'text-white/80 hover:bg-white/5'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{section.icon}</span>
                    <span className="text-sm">{section.title}</span>
                  </div>
                </button>
              ))}
              <div className="p-4 m-3 rounded-xl bg-[#252742]/50 border border-[#3f2d63]/30">
                <p className="text-sm text-[#818BAC] mb-3">
                  Need help understanding our terms?
                </p>
                <a 
                  href="mailto:sacraltrack@gmail.com"
                  className="inline-flex items-center gap-2 text-sm text-[#20DDBB] hover:text-[#018CFD] transition-colors"
                >
                  <span>Contact Support</span>
                  <FaArrowRight className="text-xs" />
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <>
      <TopNav params={{ id: userContext?.user?.id as string }} />
      
      <div className="min-h-screen bg-gradient-to-b from-[#1f1239] to-[#150c28] text-white">
        <div className="flex flex-col md:flex-row">
          {/* Desktop Side Navigation */}
          <motion.div 
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="hidden md:block sticky top-[80px] w-[280px] lg:w-[320px] h-[calc(100vh-80px)] bg-[#1A2338]/90 backdrop-blur-lg border-r border-[#20DDBB]/10 overflow-y-auto custom-scrollbar"
          >
            <div className="p-4 lg:p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#20DDBB] to-[#018CFD] flex items-center justify-center">
                  <span className="text-xl">📋</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold bg-gradient-to-r from-[#20DDBB] to-[#018CFD] bg-clip-text text-transparent">
                    Terms of Use
                  </h2>
                  <p className="text-sm text-[#818BAC]">Last updated: {new Date().toLocaleDateString()}</p>
                </div>
              </div>

              <nav className="space-y-2">
                {sections.map((section) => (
                  <motion.button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className={`w-full text-left p-3 lg:p-4 rounded-xl transition-all duration-200
                               ${activeSection === section.id 
                                 ? 'bg-[#20DDBB]/10 text-[#20DDBB] border border-[#20DDBB]/20' 
                                 : 'hover:bg-white/5'}`}
                    whileHover={{ x: 5 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg lg:text-xl">{section.icon}</span>
                      <span className="text-xs lg:text-sm">{section.title}</span>
                    </div>
                  </motion.button>
                ))}
              </nav>

              <div className="mt-6 p-4 rounded-xl bg-[#252742]/50 border border-[#3f2d63]/30">
                <p className="text-sm text-[#818BAC] mb-3">
                  Need help understanding our terms?
                </p>
                <a 
                  href="mailto:sacraltrack@gmail.com"
                  className="inline-flex items-center gap-2 text-sm text-[#20DDBB] hover:text-[#018CFD] transition-colors"
                >
                  <span>Contact Support</span>
                  <FaArrowRight className="text-xs" />
                </a>
              </div>
            </div>
          </motion.div>

          {/* Main Content */}
          <div className="flex-1 px-4 md:px-6 lg:px-8 pt-[100px] md:pt-[100px] md:ml-0">
            {/* Mobile dropdown menu */}
            <div className="md:hidden mb-6 sticky top-[70px] z-50">
              <MobileTableOfContents />
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-3xl mx-auto space-y-10 md:space-y-12 pb-20"
            >
              {/* Introduction Section */}
              <TermsSection id="introduction" title="Introduction">
                <div className="space-y-6">
                  <div className="p-5 bg-gradient-to-b from-[#1f1239] to-[#150c28] text-white flex flex-col items-center">
                    <img src="/logo.png" alt="Sacral Track Logo" className="w-24 h-24 my-4" />
                    <h1 className="text-4xl md:text-5xl font-bold text-center mb-2">Welcome to <span className="bg-gradient-to-r from-[#20DDBB] to-[#018CFD] bg-clip-text text-transparent">Sacral Track</span></h1>
                    <h2 className="text-xl md:text-2xl text-center text-white/80 mb-8">Music Platform / Social Network</h2>
                    <p className="text-center text-white/80 max-w-2xl mb-8">
                      The premier music platform for artists and listeners with high-quality
                      audio and fair royalty distribution
                    </p>
                    
                    {/* Remove BETA VERSION section */}
                    {/* Previously beta version notice was here */}
                    
                    {/* Place buttons side by side */}
                    <div className="flex flex-col md:flex-row gap-4 z-10">
                      <a href="/get-started" className="bg-gradient-to-r from-[#20DDBB] to-[#018CFD] text-white py-3 px-8 rounded-full font-medium hover:shadow-lg transition-all duration-300">
                        Get Started
                      </a>
                      <a href="/terms" className="bg-[#1A2338]/80 text-white border border-white/20 py-3 px-8 rounded-full font-medium hover:bg-[#1A2338] transition-all duration-300">
                        Read Terms of Service
                      </a>
                    </div>
                  </div>

                  <InfoCard icon="🎵" title="Sacral Track Concept">
                    <p className="text-xs md:text-sm text-white/80 mb-4">
                      Sacral Track is a comprehensive music platform that seamlessly integrates a professional streaming service with a social network for music creators and enthusiasts. Unlike traditional platforms, Sacral Track offers a unified ecosystem where creativity, community, and commerce converge.
                    </p>
                    
                    <div className="p-4 md:p-5 bg-purple-900/30 rounded-xl border border-purple-500/20 mb-6">
                      <h3 className="text-purple-400 font-medium mb-3 text-sm md:text-base">Unified Account System</h3>
                      <p className="text-white/80 mb-3 text-xs md:text-sm">
                        Sacral Track uses a dynamic, single-account system that evolves based on your activities:
                      </p>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <span className="text-[#20DDBB] mt-1">•</span>
                          <p className="text-white/80 text-xs md:text-sm">Every user begins with a standard account that can evolve in multiple directions</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="text-[#20DDBB] mt-1">•</span>
                          <p className="text-white/80 text-xs md:text-sm">Accounts transform into artist profiles when users upload music or select artist badges</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="text-[#20DDBB] mt-1">•</span>
                          <p className="text-white/80 text-xs md:text-sm">Accounts develop listener features when users focus on consuming content</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="text-[#20DDBB] mt-1">•</span>
                          <p className="text-white/80 text-xs md:text-sm">All accounts have access to both creator and listener tools</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="text-[#20DDBB] mt-1">•</span>
                          <p className="text-white/80 text-xs md:text-sm"><strong>Free Listening:</strong> All music on the platform is available for free streaming</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="text-[#20DDBB] mt-1">•</span>
                          <p className="text-white/80 text-xs md:text-sm"><strong>Free Publication:</strong> Artists can upload and publish their music at no cost</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-3">
                        <h4 className="text-[#20DDBB] font-medium text-xs md:text-sm">Platform Features:</h4>
                        <CheckList items={[
                          'High-quality music streaming (320 kbps)',
                          'Music catalog with direct artist support',
                          'Release uploads and monetization',
                          'Customizable artist profiles',
                          'Vibration (vibe) creation and sharing',
                          'Community interaction and messaging',
                          'Customizable playlists and collections',
                          'Event creation and discovery',
                          'Audio message exchanges',
                          'Direct artist-fan connections',
                          'Visual waveform representations',
                          'Background audio processing'
                        ]} />
                      </div>
                      
                      <div className="space-y-3">
                        <h4 className="text-[#20DDBB] font-medium text-xs md:text-sm">Engagement Options:</h4>
                        <CheckList items={[
                          'Upload and sell your original tracks',
                          'Purchase and collect music directly from creators',
                          'Listen to streaming audio without limitations',
                          'Interact through comments and private messages',
                          'Create and promote events',
                          'Build and share themed playlists',
                          'Establish purchase plans for tracked releases',
                          'Upload photos, videos, and audio messages',
                          'Form connections with artists and listeners',
                          'Participate in exclusive communities',
                          'Develop a personal musical identity'
                        ]} />
                      </div>
                    </div>

                    <div className="p-4 md:p-5 bg-indigo-950/30 rounded-xl border border-indigo-500/30 mt-8">
                      <h3 className="text-lg md:text-xl font-semibold text-white mb-4">Content Rights Transfer</h3>
                      <p className="text-white/80 mb-4 text-xs md:text-sm">
                        IMPORTANT: By registering an account and uploading any content to Sacral Track, you explicitly agree to the following:
                      </p>
                      <ul className="space-y-3 mb-0 text-white/80">
                        <li className="flex items-start">
                          <span className="inline-flex items-center justify-center rounded-full bg-amber-600/20 p-1 mr-3 mt-0.5">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 md:w-5 md:h-5 text-amber-400">
                              <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                            </svg>
                          </span>
                          <span className="text-xs md:text-sm">All uploaded releases transfer usage rights to Sacral Track</span>
                        </li>
                        <li className="flex items-start">
                          <span className="inline-flex items-center justify-center rounded-full bg-amber-600/20 p-1 mr-3 mt-0.5">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 md:w-5 md:h-5 text-amber-400">
                              <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                            </svg>
                          </span>
                          <span className="text-xs md:text-sm">Sacral Track may use, promote, distribute, and monetize your content at its discretion</span>
                        </li>
                        <li className="flex items-start">
                          <span className="inline-flex items-center justify-center rounded-full bg-amber-600/20 p-1 mr-3 mt-0.5">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 md:w-5 md:h-5 text-amber-400">
                              <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                            </svg>
                          </span>
                          <span className="text-xs md:text-sm">Your content may appear in marketing materials, compilations, and partnerships</span>
                        </li>
                        <li className="flex items-start">
                          <span className="inline-flex items-center justify-center rounded-full bg-amber-600/20 p-1 mr-3 mt-0.5">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 md:w-5 md:h-5 text-amber-400">
                              <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                            </svg>
                          </span>
                          <span className="text-xs md:text-sm">Registration and content uploading constitutes legally binding acceptance of these terms</span>
                        </li>
                      </ul>
                    </div>
                  </InfoCard>

                  <Notice type="info" title="Important">
                    Please read these Terms of Use (hereinafter referred to as the "Agreement") carefully before using 
                    the Services offered by Sacral Track. This Agreement sets forth the legally binding terms and 
                    conditions for your use of the Site and the Services owned and operated by the Company.
                  </Notice>
                </div>
              </TermsSection>

              {/* Terms Acceptance Section */}
              <TermsSection id="acceptance" title="Terms Acceptance">
                <div className="space-y-6">
                  <p className="text-white/80 leading-relaxed text-sm md:text-base">
                    Within these Terms of Use, the Sacral Track platform and all its associated services, functionalities, and systems are collectively referred to as "ST Systems" for the purposes of this agreement.
                  </p>
                  
                  <p className="text-white/80 leading-relaxed text-sm md:text-base">
                    The right to use ST Systems is granted subject to acceptance, without modification, of all terms 
                    and conditions contained in this document (hereinafter referred to as the "Terms of Use"), which 
                    also include the Privacy Policy available at http://sacraltrack.space/terms the Copyright Policy 
                    available at http://sacraltrack.space/terms, as well as all other rules, policies and amendments 
                    that may be published from time to time on the Site by the Company.
                  </p>
                  
                  <div className="bg-white/5 rounded-xl p-4 md:p-5 border border-white/10">
                    <p className="text-white/80 leading-relaxed mb-4 text-sm md:text-base">
                      By using ST Systems in whatever form and by whatever medium, you agree to be bound by these Terms of Use. 
                      These Terms of Use apply to all users of ST Systems, including users, who are the authors of the content 
                      (Artists), information and other materials or services incorporated in ST Systems.
                    </p>
                    <CheckList items={[
                      'Users must fully familiarize themselves with these Terms of Use before registering',
                      'By obtaining access or using ST Systems, you agree to abide by these Terms and Conditions',
                      'By registering an account and publishing information, you automatically agree to our Terms and Conditions'
                    ]} />
                  </div>
                  
                  <Notice type="warning" title="Modification of the Terms of Use">
                    The Company reserves the right to modify or replace any of the conditions of these Terms of Use, 
                    as well as to modify, suspend or terminate the Service at its sole discretion at any time, by posting 
                    a notice on the Site or by sending you an email. It is your responsibility to periodically check these 
                    Terms of Use for possible modifications.
                  </Notice>
                </div>
              </TermsSection>

              {/* Intellectual Property Rights Section */}
              <TermsSection id="intellectual-property" title="Intellectual Property Rights">
                <div className="space-y-6">
                  <p className="text-white/80 leading-relaxed">
                    Copyright for the design, database and any other intellectual property, including the Content 
                    (computer programs, source and object codes, documentation, software graphics, texts, images, 
                    drawings, videos, animations, databases, logos, domain names, trade names, audio tracks) and 
                    other existing or future rights related to ST Systems are the property of Sacral Projects, 
                    its subsidiaries and Sacral Track project (ST Systems), as well as its affiliates and/or licensors.
                  </p>
                  
                  <div className="p-5 bg-[#20DDBB]/5 rounded-xl border border-[#20DDBB]/10">
                    <p className="text-white/80 leading-relaxed">
                      No Content may be copied (reproduced), processed, distributed, displayed in frame, published, 
                      downloaded, transferred, sold or otherwise used in whole or in part without the prior written 
                      permission of ST Systems or other intellectual property owner indicated on the Site.
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <p className="text-white/80 leading-relaxed">
                      Subject to strict observance of these terms and conditions, ST Systems provides you with the 
                      opportunity to purchase, listen and publicly perform tracks purchased on Sacral Track, as well 
                      as to use all functional capabilities of ST Systems.
                    </p>
                    
                    <div className="p-5 bg-amber-900/30 rounded-xl border border-amber-500/20">
                      <h3 className="text-amber-400 font-medium mb-4">Track Publication Requirements</h3>
                      <p className="text-white/80 mb-4">
                        ST Systems enforces strict publication requirements to maintain platform integrity and ensure proper rights management:
                      </p>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <span className="text-[#20DDBB] mt-1">•</span>
                          <p className="text-white/80">Only original tracks whose rights can be fully transferred to ST Systems may be published on Sacral Track</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="text-[#20DDBB] mt-1">•</span>
                          <p className="text-white/80">Releases previously published on other platforms can only be published on Sacral Track if the original label and distributor explicitly permit third-party publication</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="text-[#20DDBB] mt-1">•</span>
                          <p className="text-white/80">Artists must have complete ownership or distribution rights for any content uploaded to the platform</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="text-[#20DDBB] mt-1">•</span>
                          <p className="text-white/80">Content with shared ownership requires written consent from all rights holders prior to publication</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-5 bg-blue-900/30 rounded-xl border border-blue-500/20">
                      <h3 className="text-blue-400 font-medium mb-4">News Content and Sharing</h3>
                      <p className="text-white/80 mb-4">
                        ST Systems encourages the sharing of news, announcements, and informational content from Sacral Track:
                      </p>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <span className="text-[#20DDBB] mt-1">•</span>
                          <p className="text-white/80">News content from Sacral Track may be freely reposted and published on any resource provided that proper attribution is included</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="text-[#20DDBB] mt-1">•</span>
                          <p className="text-white/80">All shared news content must include a direct link back to the original Sacral Track source</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="text-[#20DDBB] mt-1">•</span>
                          <p className="text-white/80">The integrity of the news content must be maintained without substantive alterations that might change its meaning</p>
                        </div>
                      </div>
                    </div>
                    
                    <Notice type="warning" title="Important Restrictions">
                      It is prohibited to sell tracks purchased on Sacral Track through any third-party resources or 
                      to publish these tracks on other labels that do not have partnership agreements with Sacral Track.
                      The use of tracks in videos and any advertising products is possible only with the consent of the 
                      Sacral Track licensor. In order to do that, you can send a written request to the following address: 
                      sacraltrack@gmail.com.
                    </Notice>
                  </div>
                </div>
              </TermsSection>

              {/* Registration Section */}
              <TermsSection id="registration" title="Registration">
                <div className="space-y-6">
                  <p className="text-white/80 leading-relaxed">
                    In order to get access to all functional capabilities of ST Systems (Sacral Track), you should 
                    create an account (get registered). User registration in ST Systems is free and voluntary and 
                    is performed at the SMS verification with form e-mail and user name.
                  </p>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <InfoCard icon="✅" title="Registration Terms">
                      <CheckList items={[
                        'Registration is free and voluntary',
                        'Information provided must be complete and accurate',
                        'Username and password must not be shared with third parties',
                        'You are responsible for the security of your account'
                      ]} />
                    </InfoCard>
                    
                    <InfoCard icon="🔒" title="Data Protection">
                      <p className="text-sm text-white/80 mb-3">
                        ST Systems takes all necessary measures to protect your personal data from unauthorized access, 
                        modification, loss, accidental or illegal destruction.
                      </p>
                      <p className="text-sm text-white/80">
                        Full version of Privacy Policy is available at: https://sacraltrack.space/terms
                      </p>
                    </InfoCard>
                  </div>
                  
                  <Notice type="info" title="Account Security">
                    Should you have any reason to believe that your account is no longer secure, immediately inform 
                    Sacral Track of this at the following address: sacraltrack@gmail.com.
                  </Notice>
                </div>
              </TermsSection>

              {/* Platform Features Section */}
              <TermsSection id="features" title="Platform Features">
                <div className="space-y-6">
                  <p className="text-white/80 leading-relaxed">
                    Sacral Track is an interactive Web App (social media) and music store for creators and enthusiasts. 
                    The platform features a dynamic account system that evolves based on your activity and preferences.
                  </p>
                  
                  <div className="p-5 bg-purple-900/30 rounded-xl border border-purple-500/20 mb-6">
                    <h3 className="text-purple-400 font-medium mb-3">Dynamic Account System</h3>
                    <p className="text-white/80 mb-3">
                      Your Sacral Track account evolves organically based on how you use the platform:
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <span className="text-[#20DDBB] mt-1">•</span>
                        <p className="text-white/80">All users begin with a standard account with access to core platform features</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-[#20DDBB] mt-1">•</span>
                        <p className="text-white/80">When you upload music, your account automatically gains artist capabilities</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-[#20DDBB] mt-1">•</span>
                        <p className="text-white/80">When you purchase music, your account develops listener-focused features</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-[#20DDBB] mt-1">•</span>
                        <p className="text-white/80">All users can seamlessly transition between creator and consumer roles</p>
                      </div>
                    </div>
                  </div>
                  
                  <InfoCard icon="🎵" title="Platform Features">
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-[#20DDBB] font-medium mb-2">Music Core</h4>
                        <CheckList items={[
                          'High-quality music streaming (320 kbps)',
                          'Music catalog with direct artist support',
                          'Lossless WAV downloads for purchases',
                          'Visual waveform representations',
                          'Background audio processing',
                          'Music purchases and ownership',
                          'Advanced playlist features'
                        ]} />
                      </div>
                      
                      <div>
                        <h4 className="text-[#20DDBB] font-medium mb-2">Creator Tools</h4>
                        <CheckList items={[
                          'Track uploads and monetization',
                          'Customizable artist profiles',
                          'Sales statistics and analytics',
                          'Release management tools',
                          'Copyright protection system',
                          'Royalty tracking dashboard',
                          'Price control for releases'
                        ]} />
                      </div>
                      
                      <div>
                        <h4 className="text-[#20DDBB] font-medium mb-2">Social Interaction</h4>
                        <CheckList items={[
                          'Vibration (vibe) creation and sharing',
                          'Direct artist-fan connections',
                          'Profile customization options',
                          'User ranking and achievement system',
                          'Private messaging system',
                          'Comments and interactions',
                          'Follow artists and other users'
                        ]} />
                      </div>
                      
                      <div>
                        <h4 className="text-[#20DDBB] font-medium mb-2">Discovery & Engagement</h4>
                        <CheckList items={[
                          'Genre-based browsing',
                          'Personalized recommendations',
                          'Trending tracks and artists',
                          'Cart functionality for purchases',
                          'Media sharing capabilities',
                          'Event creation and discovery',
                          'Audio message exchanges'
                        ]} />
                      </div>
                    </div>
                  </InfoCard>
                  
                  <Notice type="info" title="Feature Development">
                    ST Systems is constantly evolving. All features are designed to enhance your experience as both a creator and a listener on our platform.
                  </Notice>
                </div>
              </TermsSection>

              {/* New Technical Specifications Section */}
              <TermsSection id="technical" title="Technical Specifications">
                <div className="space-y-6">
                  <p className="text-white/80 leading-relaxed">
                    Sacral Track has specific technical requirements and processes in place to ensure optimal audio quality 
                    and streaming performance. Understanding these specifications will help artists prepare their content 
                    for the platform.
                  </p>
                  
                  <div className="grid md:grid-cols-2 gap-5">
                    <InfoCard icon="🎵" title="Audio File Requirements">
                      <CheckList items={[
                        'Format: Only WAV files are accepted',
                        'Maximum file size: 200 MB',
                        'Maximum duration: 12 minutes',
                        'Sampling rate: 44.1 kHz (recommended)',
                        'Bit depth: 16-bit or 24-bit',
                        'Channels: Stereo (2 channels)'
                      ]} />
                    </InfoCard>
                    
                    <InfoCard icon="🖼️" title="Image Requirements">
                      <CheckList items={[
                        'Formats: JPEG, PNG, and WebP are accepted',
                        'Cover art: Required for all track uploads',
                        'All images are automatically converted to WebP format',
                        'Images are optimized for web delivery and performance',
                        'Cover art is embedded in the final audio files'
                      ]} />
                    </InfoCard>
                  </div>
                  
                  <div className="p-5 bg-[#20DDBB]/5 rounded-xl border border-[#20DDBB]/10">
                    <h3 className="text-[#20DDBB] font-medium mb-4">Audio Processing Information</h3>
                    <p className="text-white/80 leading-relaxed mb-4">
                      When you upload a WAV file to Sacral Track, the platform processes your audio using advanced techniques:
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <span className="text-[#20DDBB] mt-1">✓</span>
                        <p className="text-white/80"><span className="font-medium">Conversion:</span> Files are converted to MP3 (320 kbps) for streaming</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-[#20DDBB] mt-1">✓</span>
                        <p className="text-white/80"><span className="font-medium">Streaming:</span> Audio is delivered via optimized streaming protocols</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-[#20DDBB] mt-1">✓</span>
                        <p className="text-white/80"><span className="font-medium">Original Preservation:</span> Original WAV files are securely stored with limited access</p>
                      </div>
                    </div>
                  </div>
                  
                  <Notice type="info" title="Optimized Processing">
                    Sacral Track employs advanced processing techniques to enhance user experience:
                    <ul className="mt-2 ml-4 space-y-1">
                      <li>• Hardware acceleration for optimal conversion performance</li>
                      <li>• Parallel processing using multiple CPU threads</li>
                      <li>• Background processing beginning immediately after file selection</li>
                      <li>• Secure storage with Appwrite technology and permission controls</li>
                    </ul>
                  </Notice>
                </div>
              </TermsSection>

              {/* Copyright & Licensing Section */}
              <TermsSection id="copyright" title="Copyright & Licensing">
                <div className="space-y-6">
                  <p className="text-white/80 leading-relaxed">
                    As an artist uploading content to Sacral Track, you are agreeing to specific copyright terms and conditions 
                    that govern the use of your music on the platform.
                  </p>
                  
                  <div className="p-5 bg-[#20DDBB]/5 rounded-xl border border-[#20DDBB]/10">
                    <h3 className="text-[#20DDBB] font-medium mb-4">Artist Representations and Warranties</h3>
                    <p className="text-white/80 leading-relaxed mb-4">
                      You represent and warrant that to the extent that you are the author of tracks contained in your 
                      Artist accounts, in whole or in part (for example, in the capacity of a co-author), you have full 
                      right and authority to grant the rights set forth in these Terms of Use.
                    </p>
                    <p className="text-white/80 leading-relaxed">
                      You are solely responsible for taking all measures necessary to inform any performance rights organization (PRO) 
                      or music publisher that you have granted a free license to the Service for public reproduction and transfer 
                      to the public of your track, and that no fees or charges should be paid to any PRO or music publisher for 
                      public performance of publication of your tracks on ST Systems.
                    </p>
                  </div>
                  
                  <Notice type="warning" title="Important">
                    By clicking on the "Upload Track" button, the Artist agrees that he is the author of the track and that 
                    he possesses the source version of the track, which confirm this fact. In case you are uploading a third 
                    party track under your name, you take full responsibility for the consequences of such action. ST Systems 
                    is not responsible for your actions.
                  </Notice>
                  
                  <div className="p-5 bg-white/5 rounded-xl border border-white/10">
                    <h3 className="text-white font-medium mb-4">License Grant</h3>
                    <p className="text-white/80 leading-relaxed">
                      In order to authorize the Company to use your Music, you provide the Company with a worldwide, non-exclusive, 
                      gratuitous, transferable and non-transferable right to use, distribute, reproduce, copy and display trademarks, 
                      service marks, slogans, logos or similar property rights (collectively referred to as "Trademarks") solely in 
                      connection with the Service or in the field of marketing, promotion or advertising of the Service.
                    </p>
                  </div>
                  
                  <p className="text-white/80 leading-relaxed">
                    After uploading, your track will be automatically published on the platform in the main flow. 
                    ST Systems receives the rights to use the track, and the Artist, in turn, receives a fee in the 
                    amount of 50% of the cost of each download of this track. This does not apply to the circumstances 
                    where the Artist publishes a third party track under their name.
                  </p>
                </div>
              </TermsSection>

              {/* Publication Section */}
              <TermsSection id="publication" title="Publication">
                <div className="space-y-6">
                  <p className="text-white/80 leading-relaxed">
                    Publication Terms and Conditions: Before uploading a track to the Store, make sure that it is fully 
                    completed and meets all the requirements. Your creative output will be automatically published on 
                    the platform after upload, subject to meeting all requirements. <strong>Publication is completely free - there are no upload fees.</strong>
                  </p>
                  
                  <InfoCard icon="🎵" title="Track/Music Requirements">
                    <p className="text-sm text-white/80 mb-4">
                      Allowed for publication are the tracks that meet the following requirements:
                    </p>
                    <CheckList items={[
                      'The track is your work of authorship and you possess the source version of the track',
                      'The track went through the mastering stage and is fully completed in your opinion',
                      'The track corresponds to the quality of WAV 44100hz, 16 bit, WAV 44100hz, 24 bit',
                      'Track duration ranges from 3 to 12 minutes',
                      'The track has not been signed to a label and has not been released anywhere before'
                    ]} />
                    <p className="text-sm text-white/60 mt-3">*Free listening of tracks in the store available in 192kbps</p>
                  </InfoCard>
                  
                  <InfoCard icon="🖼️" title="Cover (Artwork) Requirements">
                    <p className="text-sm text-white/80 mb-4">
                      Allowed for publication are the Covers that meet the following requirements:
                    </p>
                    <CheckList items={[
                      'Artwork format: jpg, png, mp4 optimized for web',
                      'No copyright infringement of third parties'
                    ]} />
                    <p className="text-sm text-white/60 mt-3">If your image exceeds recommended dimensions, the Cover will be automatically resized.</p>
                  </InfoCard>
                  
                  <div className="p-5 bg-[#20DDBB]/5 rounded-xl border border-[#20DDBB]/10">
                    <h3 className="text-[#20DDBB] font-medium mb-4">Publication Period</h3>
                    <p className="text-white/80 leading-relaxed">
                      Subject to the terms of this Agreement, once your track is published on the Site, Sacral Track 
                      receives indefinite rights to this content. The publication period is not limited in time.
                    </p>
                    <p className="text-white/80 leading-relaxed mt-3">
                      Once the track has been uploaded, the author will be unable to remove the track from ST Systems. 
                      The artist has the opportunity to request the Sacral Track team through the Team Support function 
                      and ask to remove the track from publication in the Store. This is only possible in cases of 
                      copyright infringement.
                    </p>
                  </div>
                </div>
              </TermsSection>

              {/* Ranking System Section */}
              <TermsSection id="ranking" title="Ranking System">
                <div className="space-y-6">
                  <p className="text-white/80 leading-relaxed">
                    Sacral Track employs a sophisticated ranking system for both users and artists to enhance
                    platform engagement and reward active participation. These ranks determine visibility,
                    platform benefits, and revenue opportunities.
                  </p>

                  <div className="grid md:grid-cols-2 gap-5">
                    <InfoCard icon="👑" title="Artist Ranking">
                      <p className="text-white/80 mb-4">Artists are ranked based on multiple factors that evaluate popularity and engagement:</p>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <span className="text-[#20DDBB] mt-1">✓</span>
                          <p className="text-white/80">Listens and streams of released tracks</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="text-[#20DDBB] mt-1">✓</span>
                          <p className="text-white/80">Purchases of released tracks</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="text-[#20DDBB] mt-1">✓</span>
                          <p className="text-white/80">Comments and social engagement</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="text-[#20DDBB] mt-1">✓</span>
                          <p className="text-white/80">Consistency and frequency of releases</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="text-[#20DDBB] mt-1">✓</span>
                          <p className="text-white/80">Follower count and growth</p>
                        </div>
                      </div>
                    </InfoCard>
                    
                    <InfoCard icon="🏅" title="User Ranking">
                      <p className="text-white/80 mb-4">Users are ranked based on their activity and contributions to the platform:</p>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <span className="text-[#20DDBB] mt-1">✓</span>
                          <p className="text-white/80">Track purchases and consumption</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="text-[#20DDBB] mt-1">✓</span>
                          <p className="text-white/80">Commenting and interaction frequency</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="text-[#20DDBB] mt-1">✓</span>
                          <p className="text-white/80">Playlist creation and sharing</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="text-[#20DDBB] mt-1">✓</span>
                          <p className="text-white/80">Profile completeness</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="text-[#20DDBB] mt-1">✓</span>
                          <p className="text-white/80">Account age and activity consistency</p>
                        </div>
                      </div>
                    </InfoCard>
                  </div>

                  <div className="p-5 bg-purple-900/30 rounded-xl border border-purple-500/20">
                    <h3 className="text-purple-400 font-medium mb-4">Rank Benefits and Calculation</h3>
                    <p className="text-white/80 mb-4">
                      Ranks are calculated through an algorithm that assigns points to various activities.
                      Higher ranks provide increased benefits:
                    </p>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-white font-medium mb-2">For Artists:</h4>
                        <ul className="ml-5 space-y-2 text-white/80 list-disc">
                          <li>Enhanced visibility in searches and recommendations</li>
                          <li>Higher revenue share percentages</li>
                          <li>Access to exclusive platform features</li>
                          <li>Priority support and promotional opportunities</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-white font-medium mb-2">For Users:</h4>
                        <ul className="ml-5 space-y-2 text-white/80 list-disc">
                          <li>Discounts on purchases</li>
                          <li>Early access to new releases</li>
                          <li>Exclusive content and features</li>
                          <li>Influence on platform recommendations</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <Notice type="warning" title="Rank Adjustments">
                    Sacral Track reserves the right to adjust ranking algorithms and criteria to maintain platform integrity.
                    Any artificial manipulation of rank factors may result in account penalties or termination.
                  </Notice>
                </div>
              </TermsSection>

              {/* Royalties & Revenue Section */}
              <TermsSection id="royalty" title="Royalties & Revenue">
                <div className="space-y-6">
                  <p className="text-white/80 leading-relaxed">
                    By submitting a track to the Store, you agree to the royalty terms established by ST Systems.
                  </p>
                  
                  <div className="p-6 bg-[#20DDBB]/5 rounded-xl border border-[#20DDBB]/10">
                    <h3 className="text-[#20DDBB] font-medium mb-4">Royalty Agreement</h3>
                    <ul className="space-y-4">
                      <li className="flex items-start gap-3">
                        <span className="text-[#20DDBB] mt-1">✓</span>
                        <p className="text-white/80">Artists receive clean 50% royalties of the track price, with no hidden fees or deductions. This percentage is calculated from each download of the track.</p>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-[#20DDBB] mt-1">✓</span>
                        <p className="text-white/80">The Artist is entitled to establish the cost of the track within the limits determined by ST Systems.</p>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-[#20DDBB] mt-1">✓</span>
                        <p className="text-white/80">ST Systems reserves the right to change the royalty percentage at its discretion and at any time with the written notification of the Artist.</p>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-[#20DDBB] mt-1">✓</span>
                        <p className="text-white/80">ST Systems is entitled to change the limits for the cost of tracks and to assign discounts on Content through promotional codes/offers.</p>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-[#20DDBB] mt-1">✓</span>
                        <p className="text-white/80">Royalty payments are processed only when your account balance exceeds $10. This threshold helps optimize processing costs and ensures efficient payment handling.</p>
                      </li>
                    </ul>
                  </div>
                  
                  <div className="p-5 bg-[#20DDBB]/5 rounded-xl border border-[#20DDBB]/10">
                    <h3 className="text-[#20DDBB] font-medium mb-4">Payment Methods</h3>
                    <p className="text-white/80 leading-relaxed mb-4">
                      Artists can receive their royalty payments through the following methods:
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <span className="text-[#20DDBB] mt-1">✓</span>
                        <p className="text-white/80">Visa card payments</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-[#20DDBB] mt-1">✓</span>
                        <p className="text-white/80">PayPal transfers</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-[#20DDBB] mt-1">✓</span>
                        <p className="text-white/80">Direct bank account transfers</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-5 bg-white/5 rounded-xl border border-white/10">
                    <h3 className="text-white font-medium mb-4">Redistribution Policy</h3>
                    <p className="text-white/80 leading-relaxed">
                      Sacral Track may redistribute previously purchased copies of your products at the sole discretion of the 
                      Company to users, who received a damaged copy of your product, a version of your product with an incorrect 
                      file format, an incomplete copy of your product, or suffered the loss of your product due to a hard disk 
                      failure, damage, theft or destruction at no cost to the User.
                    </p>
                    <p className="text-white/80 leading-relaxed mt-3">
                      In the event of any of the above redistributions, no additional payments will be made to you for such redistributions.
                    </p>
                  </div>
                </div>
              </TermsSection>

              {/* Payment Section */}
              <TermsSection id="payment" title="Payment">
                <div className="space-y-6">
                  <p className="text-white/80 leading-relaxed">
                    ST Systems has partnerships with Stripe and other payment services and infrastructures. All money 
                    transactions made on the Site (https://sacraltrack.space, https://sacraltrack.space) are performed 
                    using the above services.
                  </p>
                  
                  <Notice type="info" title="Payment Terms">
                    By accepting the terms and conditions of these Terms of Use, you automatically agree to the terms 
                    and conditions of Stripe and other payment services and infrastructures. ST Systems is not responsible 
                    for the safety of your funds. ST Systems, for its part, ensures the confidentiality of your personal data.
                  </Notice>
                </div>
              </TermsSection>

              {/* Marketing Terms Section */}
              <TermsSection id="marketing" title="Marketing Terms">
                <div className="space-y-6">
                  <p className="text-white/80 leading-relaxed">
                    In order to authorize the Company to use your Music in accordance with the above provisions, you grant 
                    the Company with a worldwide, non-exclusive, gratuitous, transferable and non-transferable right to use, 
                    distribute, reproduce, copy and display trademarks, service marks, slogans, logos or similar property rights 
                    (collectively referred to as "Trademarks") solely in connection with the functional capabilities of ST Systems 
                    or in the field of marketing, promotion or advertising of the Service, including in all forms of marketing, 
                    as well as existing and future advertising materials.
                  </p>
                  
                  <div className="p-5 bg-[#20DDBB]/5 rounded-xl border border-[#20DDBB]/10">
                    <h3 className="text-[#20DDBB] font-medium mb-4">Marketing Usage</h3>
                    <p className="text-white/80 leading-relaxed mb-4">
                      ST Systems conducts large-scale advertising campaigns to further develop Sacral Track and to attract 
                      more users and artists. By accepting these terms, you agree that the personal information you publish 
                      on www.sacraltrack.space (tracks, biography, comments, reviews and more) can be used in any of the 
                      following marketing components and companies:
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[#20DDBB]">✓</span>
                        <span className="text-white/80">Social media marketing</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[#20DDBB]">✓</span>
                        <span className="text-white/80">PR campaigns</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[#20DDBB]">✓</span>
                        <span className="text-white/80">Media productions</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[#20DDBB]">✓</span>
                        <span className="text-white/80">Events</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[#20DDBB]">✓</span>
                        <span className="text-white/80">Brand-book</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[#20DDBB]">✓</span>
                        <span className="text-white/80">Merchandise</span>
                      </div>
                    </div>
                  </div>
                </div>
              </TermsSection>

              {/* Purchased Content Section */}
              <TermsSection id="purchased-content" title="Purchased Content">
                <div className="space-y-6">
                  <p className="text-white/80 leading-relaxed">
                    We cannot guarantee that the Content you purchased on ST Systems will be available to you for an unlimited period of time.
                  </p>
                  
                  <Notice type="warning" title="Content Removal">
                    If we receive a notice of an alleged copyright infringement from the copyright holder or his agent in 
                    relation to a specific Content, then US laws may require us to remove this Content from ST Systems and 
                    not make it available for future sale, and we may also refuse permanent access to anyone, who has 
                    previously purchased such Content.
                  </Notice>
                  
                  <div className="p-5 bg-white/5 rounded-xl border border-white/10">
                    <p className="text-white/80 leading-relaxed">
                      In the event that we are required by law to prohibit access through ST Systems to previously purchased 
                      Content, including by removing access to Content from the user's personal collection through any mobile 
                      application, then the Company and the Contractors will not indemnify the user, who purchased this Content, 
                      except as otherwise provided by applicable law. The users bear all the risks associated with the denial 
                      of access to any Content purchased through ST Systems.
                    </p>
                    <p className="text-white/80 leading-relaxed mt-4">
                      Since it is possible that we may deny your access to previously purchased Content, we recommend that you 
                      immediately download any Content purchased by you through ST Systems to your own devices, so that you 
                      retain control and ownership of such Content, even if we are required to remove such Content from ST Systems.
                    </p>
                  </div>
                </div>
              </TermsSection>

              {/* Third-party Sites Section */}
              <TermsSection id="third-party" title="Third-party Sites">
                <div className="space-y-6">
                  <p className="text-white/80 leading-relaxed">
                    Our Service may allow you to include links to other websites or resources on the Internet, and other 
                    websites or resources may contain links to the Site. When you choose to access any third-party websites, 
                    you do so at your own risk.
                  </p>
                  
                  <div className="p-5 bg-white/5 rounded-xl border border-white/10">
                    <p className="text-white/80 leading-relaxed">
                      These other websites are not under the control of ST Systems, and you acknowledge that ST Systems is 
                      not responsible for the content, function, accuracy, legitimacy, relevance or any other aspects of 
                      such websites or resources. The inclusion of any such link does not imply approval by ST Systems or 
                      any association with their operators.
                    </p>
                    <p className="text-white/80 leading-relaxed mt-4">
                      You also acknowledge and agree that ST Systems is not liable, directly or indirectly, for any damage 
                      or loss caused or presumably caused by or in connection with the use or reliance on any such Content, 
                      goods or services available on or through any of such websites or resources.
                    </p>
                  </div>
                  
                  <div className="p-5 bg-[#20DDBB]/5 rounded-xl border border-[#20DDBB]/10">
                    <h3 className="text-[#20DDBB] font-medium mb-4">Multi-Platform Distribution</h3>
                    <p className="text-white/80 leading-relaxed mb-4">
                      Sacral Track supports artists' freedom to distribute their music across multiple platforms:
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <span className="text-[#20DDBB] mt-1">✓</span>
                        <p className="text-white/80">Artists are permitted to release their tracks on other marketplaces and labels simultaneously with Sacral Track</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-[#20DDBB] mt-1">✓</span>
                        <p className="text-white/80">We encourage cross-platform promotion to maximize artist visibility and reach</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-[#20DDBB] mt-1">✓</span>
                        <p className="text-white/80">Label owners are invited to explore partnership opportunities with Sacral Track</p>
                      </div>
                    </div>
                    <p className="text-white/80 leading-relaxed mt-4">
                      Labels interested in collaboration or partnership opportunities can contact us directly at <a href="mailto:sacraltrack@gmail.com" className="text-[#20DDBB] hover:underline">sacraltrack@gmail.com</a>. We welcome discussions about joint releases, artist development, and innovative music distribution models.
                    </p>
                  </div>
                </div>
              </TermsSection>

              {/* Monetization Section - HIDDEN FOR NOW */}
              {/* <TermsSection id="monetization" title="Monetization">
                <div className="space-y-6">
                  <p className="text-white/80 leading-relaxed">
                    Sacral Track provides multiple monetization avenues for artists. Our platform is designed to ensure
                    fair compensation for creative work while maintaining accessibility for users.
                  </p>

                  <div className="grid md:grid-cols-2 gap-5">
                    <InfoCard icon="💰" title="Revenue Models">
                      <p className="text-white/80 mb-4">Artists can earn through multiple channels:</p>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <span className="text-[#20DDBB] mt-1">✓</span>
                          <p className="text-white/80">Direct track purchases</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="text-[#20DDBB] mt-1">✓</span>
                          <p className="text-white/80">Streaming royalties</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="text-[#20DDBB] mt-1">✓</span>
                          <p className="text-white/80">Subscription revenue share</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="text-[#20DDBB] mt-1">✓</span>
                          <p className="text-white/80">Exclusive content offerings</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="text-[#20DDBB] mt-1">✓</span>
                          <p className="text-white/80">Creator fund distributions</p>
                        </div>
                      </div>
                    </InfoCard>
                    
                    <InfoCard icon="📊" title="Revenue Shares">
                      <p className="text-white/80 mb-4">Our revenue share model is tiered based on artist ranking:</p>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <span className="text-[#20DDBB] mt-1">✓</span>
                          <p className="text-white/80">New artists: 70% to artist, 30% to platform</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="text-[#20DDBB] mt-1">✓</span>
                          <p className="text-white/80">Established artists: 75% to artist, 25% to platform</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="text-[#20DDBB] mt-1">✓</span>
                          <p className="text-white/80">Top tier artists: 80% to artist, 20% to platform</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="text-[#20DDBB] mt-1">✓</span>
                          <p className="text-white/80">Exclusive content: 85% to artist, 15% to platform</p>
                        </div>
                      </div>
                    </InfoCard>
                  </div>

                  <div className="p-5 bg-purple-900/30 rounded-xl border border-purple-500/20">
                    <h3 className="text-purple-400 font-medium mb-4">Payment Processing and Schedules</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-white font-medium mb-2">Payment Methods:</h4>
                        <ul className="ml-5 space-y-2 text-white/80 list-disc">
                          <li>Bank transfers via ACH or SEPA</li>
                          <li>PayPal integration</li>
                          <li>Cryptocurrency options (selected regions)</li>
                          <li>Platform credit (for reinvestment)</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-white font-medium mb-2">Payment Schedule:</h4>
                        <ul className="ml-5 space-y-2 text-white/80 list-disc">
                          <li>Monthly payments for balances over $50</li>
                          <li>Quarterly payments for smaller amounts</li>
                          <li>Real-time dashboard earnings tracking</li>
                          <li>Detailed financial reports and analytics</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 bg-blue-900/30 rounded-xl border border-blue-500/20 mt-4">
                    <h3 className="text-blue-400 font-medium mb-4">Tax and Legal Considerations</h3>
                    <p className="text-white/80 mb-4">
                      Artists are responsible for their tax obligations in accordance with their local laws.
                      Sacral Track provides necessary documentation but does not offer tax advice.
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <span className="text-[#20DDBB] mt-1">✓</span>
                        <p className="text-white/80">Annual earnings statements provided</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-[#20DDBB] mt-1">✓</span>
                        <p className="text-white/80">Tax forms issued according to regional requirements</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-[#20DDBB] mt-1">✓</span>
                        <p className="text-white/80">VAT/GST calculation and collection where applicable</p>
                      </div>
                    </div>
                  </div>

                  <Notice type="info" title="Transparency">
                    All transactions and revenue calculations are transparent and can be audited through the artist dashboard.
                    Questions regarding payments should be directed to our support team.
                  </Notice>
                </div>
              </TermsSection> */}

              {/* Technical Requirements - HIDDEN FOR NOW */}
              {/* <TermsSection id="technical-requirements" title="Technical Requirements and Limitations">
                <div className="space-y-6">
                  <p className="text-white/80 leading-relaxed">
                    To ensure optimal performance and compatibility with our platform, users and artists must adhere to the following technical requirements and limitations.
                  </p>

                  <div className="grid md:grid-cols-2 gap-5">
                    <InfoCard icon="🎵" title="Audio Format Requirements">
                      <p className="text-white/80 mb-4">Acceptable audio upload formats:</p>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <span className="text-[#20DDBB] mt-1">✓</span>
                          <p className="text-white/80">WAV: 16-bit or 24-bit, 44.1kHz or 48kHz</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="text-[#20DDBB] mt-1">✓</span>
                          <p className="text-white/80">FLAC: 16-bit or 24-bit, 44.1kHz or 48kHz</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="text-[#20DDBB] mt-1">✓</span>
                          <p className="text-white/80">AIFF: 16-bit or 24-bit, 44.1kHz or 48kHz</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="text-red-400 mt-1">✗</span>
                          <p className="text-white/80">MP3, AAC, OGG not accepted for initial uploads</p>
                        </div>
                      </div>
                    </InfoCard>
                    
                    <InfoCard icon="📁" title="File Size Limits">
                      <p className="text-white/80 mb-4">Upload constraints:</p>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <span className="text-[#20DDBB] mt-1">•</span>
                          <p className="text-white/80">Maximum file size: 500MB per track</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="text-[#20DDBB] mt-1">•</span>
                          <p className="text-white/80">Maximum track length: 180 minutes</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="text-[#20DDBB] mt-1">•</span>
                          <p className="text-white/80">Maximum upload batch: 20 tracks per release</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="text-[#20DDBB] mt-1">•</span>
                          <p className="text-white/80">Monthly storage quota: 10GB for standard accounts, 50GB for premium</p>
                        </div>
                      </div>
                    </InfoCard>
                  </div>

                  <div className="p-5 bg-indigo-900/30 rounded-xl border border-indigo-500/20">
                    <h3 className="text-indigo-400 font-medium mb-4">Supported Platforms and Browsers</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-white font-medium mb-2">Desktop:</h4>
                        <ul className="ml-5 space-y-2 text-white/80 list-disc">
                          <li>Chrome 90+</li>
                          <li>Firefox 88+</li>
                          <li>Safari 14+</li>
                          <li>Edge 90+</li>
                          <li>Opera 76+</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-white font-medium mb-2">Mobile:</h4>
                        <ul className="ml-5 space-y-2 text-white/80 list-disc">
                          <li>iOS Safari 14+</li>
                          <li>Android Chrome 90+</li>
                          <li>Android Firefox 88+</li>
                          <li>iOS Chrome 90+</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 bg-emerald-900/30 rounded-xl border border-emerald-500/20 mt-4">
                    <h3 className="text-emerald-400 font-medium mb-4">Processing and Conversion</h3>
                    <p className="text-white/80 mb-4">
                      Upon upload, your audio files undergo automatic processing:
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <span className="text-[#20DDBB] mt-1">1.</span>
                        <p className="text-white/80">Initial processing begins immediately after file selection</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-[#20DDBB] mt-1">2.</span>
                        <p className="text-white/80">Audio conversion to streaming formats occurs in the background</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-[#20DDBB] mt-1">3.</span>
                        <p className="text-white/80">Adaptive segmentation based on track length (10-20 second segments)</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-[#20DDBB] mt-1">4.</span>
                        <p className="text-white/80">Multiple quality levels created for different network conditions</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-[#20DDBB] mt-1">5.</span>
                        <p className="text-white/80">Waveform and spectrum analysis generation for visualization</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 bg-amber-900/30 rounded-xl border border-amber-500/20 mt-4">
                    <h3 className="text-amber-400 font-medium mb-4">Bandwidth and Network Requirements</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-white font-medium mb-2">For Streaming:</h4>
                        <ul className="ml-5 space-y-2 text-white/80 list-disc">
                          <li>Minimum: 2 Mbps for standard quality</li>
                          <li>Recommended: 5 Mbps for high quality</li>
                          <li>Optimal: 10 Mbps for lossless streaming</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-white font-medium mb-2">For Uploading:</h4>
                        <ul className="ml-5 space-y-2 text-white/80 list-disc">
                          <li>Minimum: 5 Mbps upload speed</li>
                          <li>Recommended: 10+ Mbps for faster uploads</li>
                          <li>Stable connection required for files {'>'} 100MB</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <Notice type="warning" title="Technical Limitations">
                    Our platform implements rate limiting to ensure fair resource allocation. Users may experience throttling 
                    after 500 API requests per hour or more than 50 track uploads in 24 hours. Background processing times 
                    vary based on file size, server load, and account tier.
                  </Notice>
                </div>
              </TermsSection> */}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Back to top button - Make larger on mobile for easier tapping and increase z-index */}
      {showBackToTop && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-6 md:bottom-8 right-6 md:right-8 w-14 h-14 md:w-12 md:h-12 rounded-full bg-[#20DDBB] flex items-center justify-center shadow-lg hover:bg-[#018CFD] transition-colors duration-300 z-50"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <BsChevronLeft className="transform rotate-90 text-black" size={20} />
        </motion.button>
      )}
    </>
  );
}