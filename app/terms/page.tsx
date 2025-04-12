"use client"
import { useState, useEffect } from 'react';
import { useRouter } from "next/navigation";
import { useUser } from "@/app/context/user";
import { BsChevronLeft } from "react-icons/bs";
import TopNav from "@/app/layouts/includes/TopNav";
import { motion } from 'framer-motion';
import TermsSection, { InfoCard, FeatureGrid, Notice, CheckList } from '../components/terms/TermsSection';
import { FaArrowRight } from "react-icons/fa";

const sections = [
  { id: 'introduction', title: 'Introduction', icon: '📝' },
  { id: 'acceptance', title: 'Terms Acceptance', icon: '✅' },
  { id: 'intellectual-property', title: 'Intellectual Property', icon: '⚖️' },
  { id: 'registration', title: 'Registration', icon: '🔐' },
  { id: 'features', title: 'Platform Features', icon: '⭐' },
  { id: 'copyright', title: 'Copyright & Licensing', icon: '🎵' },
  { id: 'publication', title: 'Publication', icon: '📤' },
  { id: 'content', title: 'Content Guidelines', icon: '📋' },
  { id: 'royalty', title: 'Royalties & Revenue', icon: '💰' },
  { id: 'payment', title: 'Payment', icon: '💳' },
  { id: 'marketing', title: 'Marketing Terms', icon: '📢' },
  { id: 'purchased-content', title: 'Purchased Content', icon: '🛒' },
  { id: 'third-party', title: 'Third-party Sites', icon: '🔗' }
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
            className="fixed top-[80px] left-0 w-[320px] h-[calc(100vh-80px)] bg-[#1A2338]/90 backdrop-blur-lg border-r border-[#20DDBB]/10 overflow-y-auto custom-scrollbar"
          >
            <div className="p-6">
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
                    className={`w-full text-left p-4 rounded-xl transition-all duration-200
                               ${activeSection === section.id 
                                 ? 'bg-[#20DDBB]/10 text-[#20DDBB] border border-[#20DDBB]/20' 
                                 : 'hover:bg-white/5'}`}
                    whileHover={{ x: 5 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{section.icon}</span>
                      <span className="text-sm">{section.title}</span>
                    </div>
                  </motion.button>
                ))}
              </nav>

              <div className="mt-8 p-4 rounded-xl bg-[#252742]/50 border border-[#3f2d63]/30">
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
          <div className="flex-1 ml-[320px] p-8 pt-[100px]">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-3xl mx-auto space-y-12"
            >
              {/* Introduction Section */}
              <TermsSection id="introduction" title="Introduction">
                <div className="space-y-6">
                  <div className="p-6 bg-[#1A2338]/60 backdrop-blur-md rounded-xl border border-[#3f2d63]/30">
                    <p className="text-white/80 leading-relaxed">
                      Welcome to sacraltrack.com (hereinafter referred to as the "Site").
                      The Site, all services and APIs are the property of Sacral Projects (hereinafter referred to as the "Company"), 
                      which is registered under Partnership No. OC436704 at the following address: Palliser House Second Floor - London, 
                      United Kingdom - Sacral Projects LLP.
                    </p>
                    <p className="text-white/80 leading-relaxed mt-3">
                      Sacral Projects LLP provides access to Sacral Track web application at www.sacraltrack.store, sacraltrack.com 
                      and its associated URL addresses (hereinafter referred to as the "Web App").
                    </p>
                    <div className="mt-4 p-3 bg-[#20DDBB]/5 rounded-xl">
                      <p className="text-[#20DDBB] text-sm font-medium">Sacral Projects LLP</p>
                      <p className="text-white/70 text-sm">United Kingdom, London</p>
                      <p className="text-white/70 text-sm">Palliser House Second Floor</p>
                      <p className="text-white/70 text-sm">Partnership No. OC436704</p>
                    </div>
                  </div>

                  <InfoCard icon="🎵" title="Sacral Track Web App">
                    <p className="text-sm text-white/80 mb-4">
                      Sacral Track is an interactive Web App (social media), a music store for Artists and Music Lovers.
                    </p>
                    
                    <div className="grid md:grid-cols-2 gap-5 mt-6">
                      <div className="space-y-3">
                        <h4 className="text-[#20DDBB] font-medium text-sm">When registering as Artist:</h4>
                        <CheckList items={[
                          'Upload your tracks to the Service and put them up for sale',
                          'Establish a price for your tracks',
                          'Familiarize yourself with sales statistics',
                          'Interact with other users through private messages and comments (Beta version)',
                          'Create Events (Beta version)',
                          'Create Playlists (Beta version)',
                          'Create Purchase Plans (Carts) and buy tracks from other Artists',
                          'Upload photos, videos and audio messages (Beta version)'
                        ]} />
                      </div>
                      
                      <div className="space-y-3">
                        <h4 className="text-[#20DDBB] font-medium text-sm">When registering as Music Lover:</h4>
                        <CheckList items={[
                          'Purchase your favourite music',
                          'Listen to music on the Service without restrictions (320 kbps)',
                          'Interact with other users through private messages and comments (Beta version)',
                          'Create Events (Beta version)',
                          'Create Playlists (Beta version)',
                          'Create Purchase Plans (Carts) and buy tracks from other Artists',
                          'Add Artists and other users to friends (Beta version)'
                        ]} />
                      </div>
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
                  <p className="text-white/80 leading-relaxed">
                    The right to use ST Systems is granted subject to acceptance, without modification, of all terms 
                    and conditions contained in this document (hereinafter referred to as the "Terms of Use"), which 
                    also include the Privacy Policy available at http://sacraltrack.store/terms the Copyright Policy 
                    available at http://sacraltrack.store/terms, as well as all other rules, policies and amendments 
                    that may be published from time to time on the Site by the Company.
                  </p>
                  
                  <div className="bg-white/5 rounded-xl p-5 border border-white/10">
                    <p className="text-white/80 leading-relaxed mb-4">
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
                        Full version of Privacy Policy is available at: https://sacratrack.store/terms
                      </p>
                    </InfoCard>
                  </div>
                  
                  <Notice type="info" title="Account Security">
                    Should you have any reason to believe that your account is no longer secure, immediately inform 
                    Sacral Track of this at the following address: sacraltrack@gmail.cm.
                  </Notice>
                </div>
              </TermsSection>

              {/* Platform Features Section */}
              <TermsSection id="features" title="Platform Features">
                <div className="space-y-6">
                  <p className="text-white/80 leading-relaxed">
                    Sacral Track is an interactive Web App (social media) and a music store for Artists and Music Lovers. 
                    This Web App enables you to access various features based on your account type.
                  </p>
                  
                  <InfoCard icon="🎵" title="Audio Features">
                    <CheckList items={[
                      'High-quality music streaming (320 kbps)',
                      'Music purchases and ownership',
                      'Create and share playlists (Beta version)',
                      'Audio message uploads (Beta version)'
                    ]} />
                  </InfoCard>
                  
                  <InfoCard icon="🌟" title="Social Features">
                    <CheckList items={[
                      'Artist profiles and portfolios',
                      'Private messaging system (Beta version)',
                      'Comments and interactions (Beta version)',
                      'Create and join events (Beta version)',
                      'Follow artists and other users (Beta version)'
                    ]} />
                  </InfoCard>
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
                    Once the A&R Manager accepts the track you have uploaded to the Store, ST Systems automatically becomes 
                    the copyright holder of the track. The Artist, in turn, receives a fee in the amount of 50% of the cost 
                    of each download of this track. This does not apply to the circumstances where the Artist publishes a 
                    third party track under his name.
                  </p>
                </div>
              </TermsSection>

              {/* Publication Section */}
              <TermsSection id="publication" title="Publication">
                <div className="space-y-6">
                  <p className="text-white/80 leading-relaxed">
                    Publication Terms and Conditions: An A&R Manager is a person, who approves tracks uploaded to the 
                    Store for publication on Sacral Track. Treat your creative output and our managers with respect. 
                    Before uploading a track to the Store, make sure that it is fully completed and meets all the requirements.
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
                      'Allowed sizes are 1200x1200px 150dpi',
                      'Artwork format: jpg, png, mp4 optimized for web',
                      'No copyright infringement of third parties'
                    ]} />
                    <p className="text-sm text-white/60 mt-3">Should these dimensions be exceeded, the Cover will be automatically reduced.</p>
                  </InfoCard>
                  
                  <div className="p-5 bg-[#20DDBB]/5 rounded-xl border border-[#20DDBB]/10">
                    <h3 className="text-[#20DDBB] font-medium mb-4">Publication Period</h3>
                    <p className="text-white/80 leading-relaxed">
                      Subject to the terms of this Agreement, the mandatory publication period of your track on the Site 
                      amounts to 4 years. After 4 years have passed, a notification letter will be sent to your e-mail 
                      about the expiration of this period, and you can either remove the track from publication or leave it in the Store.
                    </p>
                    <p className="text-white/80 leading-relaxed mt-3">
                      Once the track has been uploaded and approved by the A&R Manager, the author will be unable to 
                      remove the track from ST Systems. The artist has the opportunity to request the Sacral Track team 
                      through the Team Support function and ask to remove the track from publication in the Store. 
                      This is only possible in cases of copyright infringement.
                    </p>
                  </div>
                </div>
              </TermsSection>

              {/* Content Guidelines Section */}
              <TermsSection id="content" title="Content Guidelines">
                <div className="space-y-6">
                  <p className="text-white/80 leading-relaxed">
                    To maintain a high-quality platform, Sacral Track enforces specific guidelines for all uploaded content. 
                    These guidelines ensure that content meets technical requirements and respects intellectual property rights.
                  </p>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-5 bg-white/5 rounded-xl border border-white/10">
                      <h3 className="text-white font-medium mb-4">Technical Requirements</h3>
                      <ul className="space-y-3">
                        <li className="text-white/80 text-sm">
                          <span className="text-[#20DDBB] font-medium">Audio Quality:</span> WAV 44100hz (16/24 bit)
                        </li>
                        <li className="text-white/80 text-sm">
                          <span className="text-[#20DDBB] font-medium">Track Duration:</span> 3-12 minutes
                        </li>
                        <li className="text-white/80 text-sm">
                          <span className="text-[#20DDBB] font-medium">Artwork Size:</span> 1200x1200px at 150dpi
                        </li>
                        <li className="text-white/80 text-sm">
                          <span className="text-[#20DDBB] font-medium">Artwork Format:</span> jpg, png, mp4 (web-optimized)
                        </li>
                      </ul>
                    </div>
                    
                    <div className="p-5 bg-white/5 rounded-xl border border-white/10">
                      <h3 className="text-white font-medium mb-4">Content Restrictions</h3>
                      <ul className="space-y-3">
                        <li className="text-white/80 text-sm">No copyright infringement of third parties</li>
                        <li className="text-white/80 text-sm">No previously signed or released tracks</li>
                        <li className="text-white/80 text-sm">No unmastered or incomplete tracks</li>
                        <li className="text-white/80 text-sm">No offensive or illegal content</li>
                      </ul>
                    </div>
                  </div>
                  
                  <Notice type="warning" title="Content Violations">
                    In the event that you violate any content guidelines, ST Systems reserves the right to remove 
                    content without notice and may suspend or terminate your account. ST Systems renounces all 
                    liability for consequences of copyright violations.
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
                        <p className="text-white/80">The royalty for a published track amounts to 50% of track price established by the Artist, which implies the cost of each download of such track.</p>
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
                    </ul>
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
                    transactions made on the Site (https://sacraltrack.store, https://sacraltrack.com) are performed 
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
                      on www.sacraltrack.com (tracks, biography, comments, reviews and more) can be used in any of the 
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
                </div>
              </TermsSection>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Back to top button */}
      {showBackToTop && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-8 right-8 w-12 h-12 rounded-full bg-[#20DDBB] flex items-center justify-center shadow-lg hover:bg-[#018CFD] transition-colors duration-300"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <BsChevronLeft className="transform rotate-90 text-black" size={18} />
        </motion.button>
      )}
    </>
  );
}