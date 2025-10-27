"use client"

import React, { useState } from 'react';
import Link from 'next/link';
import { FiPlay, FiMusic, FiUsers, FiTrendingUp, FiStar, FiZap, FiGlobe, FiShield, FiArrowRight, FiVolume2, FiMenu, FiX, FiImage, FiVideo, FiMessageCircle, FiCalendar, FiList, FiUserPlus } from 'react-icons/fi';

// Stats Counter Component
const StatsCounter = ({ end, label, prefix = "", suffix = "" }: { end: number; label: string; prefix?: string; suffix?: string }) => {
  return (
    <div className="text-center">
      <div className="text-3xl md:text-4xl font-bold text-[#20DDBB] mb-2">
        {prefix}{end.toLocaleString()}{suffix}
      </div>
      <div className="text-white/70">{label}</div>
    </div>
  );
};

export default function LandingPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1f1239] to-[#150c28] text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#1f1239]/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-[#20DDBB] to-[#8A2BE2] bg-clip-text text-transparent">
              Sacral Track
            </Link>
            
            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              <Link href="#features" className="text-white/70 hover:text-[#20DDBB] transition-colors">
                Features
              </Link>
              <Link href="#earn" className="text-white/70 hover:text-[#20DDBB] transition-colors">
                Earn Money
              </Link>
              <Link href="#stats" className="text-white/70 hover:text-[#20DDBB] transition-colors">
                Statistics
              </Link>
              <Link href="/" className="px-6 py-2 rounded-full bg-gradient-to-r from-[#20DDBB] to-[#8A2BE2] 
                                        hover:shadow-lg hover:shadow-[#20DDBB]/25 transition-all duration-300">
                Start Now
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2"
            >
              {isMobileMenuOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-white/10">
              <div className="space-y-4">
                <Link 
                  href="#features" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block text-white/70 hover:text-[#20DDBB] transition-colors"
                >
                  Features
                </Link>
                <Link 
                  href="#earn" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block text-white/70 hover:text-[#20DDBB] transition-colors"
                >
                  Earn Money
                </Link>
                <Link 
                  href="#stats" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block text-white/70 hover:text-[#20DDBB] transition-colors"
                >
                  Statistics
                </Link>
                <Link 
                  href="/" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block w-full text-center px-6 py-2 rounded-full bg-gradient-to-r from-[#20DDBB] to-[#8A2BE2] 
                             hover:shadow-lg hover:shadow-[#20DDBB]/25 transition-all duration-300"
                >
                  Start Now
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 min-h-screen flex items-center justify-center">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#20DDBB] to-[#8A2BE2] 
                          flex items-center justify-center mx-auto mb-8">
            <FiMusic className="w-10 h-10 text-white" />
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="bg-gradient-to-r from-[#20DDBB] to-[#8A2BE2] bg-clip-text text-transparent">
              Sacral Track
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-white/70 mb-4 max-w-3xl mx-auto">
            Music Streaming Network with Marketplace
          </p>

          <p className="text-lg md:text-xl text-white/60 mb-12 max-w-2xl mx-auto">
            Upload your track and <span className="text-[#20DDBB] font-bold">instantly it's available to the network</span>. 
            Earn <span className="text-[#FFD700] font-bold">$1 for each sale</span> with 50% royalty rate.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
            <Link 
              href="/upload"
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-gradient-to-r from-[#20DDBB] to-[#8A2BE2] 
                         font-semibold text-lg hover:shadow-lg hover:shadow-[#20DDBB]/25 
                         transition-all duration-300 flex items-center justify-center"
            >
              <FiPlay className="mr-2" />
              Upload Track
            </Link>
            
            <Link
              href="/"
              className="w-full sm:w-auto px-8 py-4 rounded-full border-2 border-[#20DDBB]/50 text-[#20DDBB] 
                         hover:bg-[#20DDBB]/10 transition-all duration-300 flex items-center justify-center"
            >
              <FiMusic className="mr-2" />
              Browse Music
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section id="stats" className="py-20 bg-gradient-to-br from-[#2A184B] to-[#1f1239]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-[#20DDBB] to-[#8A2BE2] bg-clip-text text-transparent">
                Platform Statistics
              </span>
            </h2>
            <p className="text-xl text-white/70">Join thousands of artists and music lovers</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatsCounter end={15000} label="Active Users" suffix="+" />
            <StatsCounter end={50000} label="Tracks" suffix="+" />
            <StatsCounter end={1250000} label="Earnings" prefix="$" />
            <StatsCounter end={89} label="Countries" />
          </div>
        </div>
      </section>

      {/* Earn Money Section */}
      <section id="earn" className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-[#20DDBB] to-[#FFD700] bg-clip-text text-transparent">
                Earn Money
              </span>
            </h2>
            <p className="text-xl text-white/70 max-w-3xl mx-auto">
              Simple and transparent earning system. Upload your tracks and get paid for every sale.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="p-6 rounded-2xl bg-gradient-to-br from-[#20DDBB]/10 to-[#8A2BE2]/10 border border-[#20DDBB]/20">
                <div className="flex items-start">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#20DDBB] to-[#8A2BE2] 
                                  flex items-center justify-center mr-4 flex-shrink-0">
                    <span className="text-white font-bold text-xl">$1</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[#20DDBB] mb-2">Fixed $1 Per Sale</h3>
                    <p className="text-white/70">
                      Earn exactly $1 for every track sold. 50% royalty rate with transparent 
                      revenue sharing. No complex calculations.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-gradient-to-br from-[#8A2BE2]/10 to-[#FF69B4]/10 border border-[#8A2BE2]/20">
                <div className="flex items-start">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#8A2BE2] to-[#FF69B4] 
                                  flex items-center justify-center mr-4 flex-shrink-0">
                    <FiZap className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[#8A2BE2] mb-2">Instant Publishing</h3>
                    <p className="text-white/70">
                      Upload your track and within moments it's live in the network. 
                      Automatic conversion to 320kbps streaming quality.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-gradient-to-br from-[#FF69B4]/10 to-[#20DDBB]/10 border border-[#FF69B4]/20">
                <div className="flex items-start">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FF69B4] to-[#20DDBB] 
                                  flex items-center justify-center mr-4 flex-shrink-0">
                    <FiTrendingUp className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[#FF69B4] mb-2">Multiple Payout Methods</h3>
                    <p className="text-white/70">
                      Withdraw earnings via Bank Transfer, PayPal, Visa/Mastercard. 
                      Monthly payouts with £50 minimum threshold.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="p-8 rounded-3xl bg-gradient-to-br from-[#1a0d2e] to-[#2d1b45] border border-[#20DDBB]/30">
                <div className="text-center mb-8">
                  <div className="text-6xl font-bold text-[#20DDBB] mb-2">$1</div>
                  <div className="text-white/70">Per Track Sale</div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 rounded-xl bg-black/30">
                    <span className="text-white/70">Track Price</span>
                    <span className="text-[#20DDBB] font-bold">$2.00</span>
                  </div>
                  <div className="flex justify-between items-center p-4 rounded-xl bg-black/30">
                    <span className="text-white/70">Your Earning</span>
                    <span className="text-[#FFD700] font-bold">$1.00</span>
                  </div>
                  <div className="flex justify-between items-center p-4 rounded-xl bg-black/30">
                    <span className="text-white/70">Platform Fee</span>
                    <span className="text-white/70">$1.00</span>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="text-center">
                    <div className="inline-flex px-6 py-3 rounded-full bg-gradient-to-r from-[#20DDBB] to-[#8A2BE2] 
                                    text-white font-semibold mb-4">
                      50% Revenue Share
                    </div>
                  </div>
                  
                  <div className="p-4 rounded-xl bg-black/30 border border-[#20DDBB]/20">
                    <h4 className="text-[#20DDBB] font-semibold mb-2">Payout Methods:</h4>
                    <div className="text-sm text-white/80 space-y-1">
                      <div>• Bank Transfer (GBP)</div>
                      <div>• PayPal</div>
                      <div>• Visa/Mastercard</div>
                      <div>• Minimum: £50</div>
                      <div>• Monthly payouts</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gradient-to-br from-[#0f0621] to-[#1a0d2e]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-[#8A2BE2] to-[#FF69B4] bg-clip-text text-transparent">
                Platform Features
              </span>
            </h2>
            <p className="text-xl text-white/70 max-w-3xl mx-auto">
              Everything you need to share your music and build your audience
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <FiVolume2 className="w-8 h-8" />,
                title: "320kbps Streaming",
                description: "High-quality audio streaming with instant conversion from WAV uploads",
                gradient: "from-[#20DDBB] to-[#8A2BE2]"
              },
              {
                icon: <FiImage className="w-8 h-8" />,
                title: "Photo & Video Vibes",
                description: "Share photos, videos and audio messages with your community",
                gradient: "from-[#8A2BE2] to-[#FF69B4]"
              },
              {
                icon: <FiMessageCircle className="w-8 h-8" />,
                title: "Private Messages",
                description: "Connect directly with fans and other artists through private messaging",
                gradient: "from-[#FF69B4] to-[#FFD700]"
              },
              {
                icon: <FiUserPlus className="w-8 h-8" />,
                title: "Friends Network",
                description: "Add artists and music lovers to your friends list and build your network",
                gradient: "from-[#FFD700] to-[#20DDBB]"
              },
              {
                icon: <FiCalendar className="w-8 h-8" />,
                title: "Events & Playlists",
                description: "Create events and playlists to showcase your music and engage fans",
                gradient: "from-[#20DDBB] to-[#8A2BE2]"
              },
              {
                icon: <FiStar className="w-8 h-8" />,
                title: "Ranking System",
                description: "Earn points and climb ranks from Novice to Legend based on your activity",
                gradient: "from-[#8A2BE2] to-[#FF69B4]"
              },
              {
                icon: <FiTrendingUp className="w-8 h-8" />,
                title: "Sales Statistics",
                description: "Access detailed analytics about your track sales and performance",
                gradient: "from-[#FF69B4] to-[#FFD700]"
              },
              {
                icon: <FiZap className="w-8 h-8" />,
                title: "Instant Processing",
                description: "Your tracks are processed and available in the network within moments",
                gradient: "from-[#FFD700] to-[#20DDBB]"
              },
              {
                icon: <FiShield className="w-8 h-8" />,
                title: "Secure Storage",
                description: "All files stored with Appwrite security and automatic backups",
                gradient: "from-[#20DDBB] to-[#8A2BE2]"
              }
            ].map((feature, index) => (
              <div
                key={index}
                className="p-6 rounded-2xl bg-gradient-to-br from-black/40 to-[#1a0d2e]/40 
                           border border-white/10 hover:border-[#20DDBB]/30 transition-all duration-300"
              >
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full 
                                mb-6 bg-gradient-to-br ${feature.gradient}`}>
                  <div className="text-white">
                    {feature.icon}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-white/70 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Advantages Section */}
      <section className="py-20 bg-gradient-to-br from-[#2d1b45] to-[#1a0d2e]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-[#FF69B4] to-[#20DDBB] bg-clip-text text-transparent">
                Why Choose Sacral Track?
              </span>
            </h2>
            <p className="text-xl text-white/70 max-w-3xl mx-auto">
              Better rates, better features, better experience for artists and listeners
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                title: "Instant Track Publishing",
                description: "Upload and your track is live in the network within moments. No approval delays.",
                comparison: "vs Others: Days/weeks of approval process"
              },
              {
                title: "Fixed $1 Per Sale",
                description: "Transparent earning model. Always $1 per track sale, no variable rates.",
                comparison: "vs Spotify: $0.003-0.005 per stream"
              },
              {
                title: "Multiple Payout Options",
                description: "Withdraw via Bank Transfer, PayPal, Visa/Mastercard. Your choice.",
                comparison: "vs Others: Limited payout methods"
              },
              {
                title: "Full Social Network",
                description: "Photos, videos, messages, friends, events - complete social ecosystem.",
                comparison: "vs Pure Streaming: No social features"
              },
              {
                title: "50% Revenue Share",
                description: "Higher than most platforms. Fair 50/50 split with transparent fees.",
                comparison: "vs Others: 15-35% typical rates"
              },
              {
                title: "320kbps Quality",
                description: "Premium streaming quality for all tracks. Professional sound delivery.",
                comparison: "vs Others: Lower quality or premium tiers"
              }
            ].map((advantage, index) => (
              <div
                key={index}
                className="p-6 rounded-2xl bg-gradient-to-br from-[#1a0d2e]/80 to-[#2d1b45]/80 
                           border border-[#20DDBB]/20"
              >
                <h3 className="text-xl font-bold text-[#20DDBB] mb-3">{advantage.title}</h3>
                <p className="text-white/80 mb-4">{advantage.description}</p>
                <div className="text-sm text-[#FF69B4] font-medium bg-[#FF69B4]/10 rounded-full px-4 py-2 inline-block">
                  {advantage.comparison}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-[#0f0621] to-[#1a0d2e]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-[#20DDBB] via-[#8A2BE2] to-[#FF69B4] bg-clip-text text-transparent">
              Start Earning Today
            </span>
          </h2>
          <p className="text-xl text-white/70 mb-12 max-w-2xl mx-auto">
            Upload your first track and start earning $1 for every sale. 
            Join thousands of artists already earning on Sacral Track.
          </p>

          <div className="flex flex-col md:flex-row items-center justify-center gap-6">
            <Link 
              href="/upload"
              className="px-10 py-5 rounded-full bg-gradient-to-r from-[#20DDBB] to-[#8A2BE2] 
                         font-bold text-xl hover:shadow-lg hover:shadow-[#20DDBB]/25 
                         transition-all duration-300 flex items-center"
            >
              <FiPlay className="mr-3" />
              Upload Your First Track
              <FiArrowRight className="ml-3" />
            </Link>
            
            <Link 
              href="/"
              className="px-10 py-5 rounded-full border-2 border-[#8A2BE2]/50 text-[#8A2BE2] 
                         hover:bg-[#8A2BE2]/10 transition-all duration-300 font-bold text-xl flex items-center"
            >
              <FiMusic className="mr-3" />
              Browse Platform
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-black border-t border-white/10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-2xl font-bold bg-gradient-to-r from-[#20DDBB] to-[#8A2BE2] bg-clip-text text-transparent mb-4 md:mb-0">
              Sacral Track
            </div>
            <div className="flex items-center space-x-6 text-white/60">
              <Link href="/terms" className="hover:text-[#20DDBB] transition-colors">
                Terms
              </Link>
              <Link href="/privacy" className="hover:text-[#20DDBB] transition-colors">
                Privacy
              </Link>
              <Link href="/" className="hover:text-[#20DDBB] transition-colors">
                Platform
              </Link>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-white/10 text-center text-white/40">
            <p>© 2024 Sacral Track. Music platform for artists and listeners.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}