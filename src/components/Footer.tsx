import React from "react";
import { Link } from "react-router-dom";
import { Twitter, Linkedin, Youtube, Github, Globe, ChevronDown } from "lucide-react";

// Kontyra Infinity Loop SVG
function KontyraLogo({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="kontyra-grad-left-footer" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        <linearGradient id="kontyra-grad-right-footer" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
      <path
        d="M12 11C8.134 11 5 14.134 5 18C5 21.866 8.134 25 12 25C15.866 25 18 20.8 18 18C18 15.2 20.134 11 24 11C27.866 11 31 14.134 31 18C31 21.866 27.866 25 24 25"
        stroke="url(#kontyra-grad-right-footer)"
        strokeWidth="3.6"
        strokeLinecap="round"
      />
      <path
        d="M24 25C27.866 25 31 21.866 31 18C31 14.134 27.866 11 24 11C20.134 11 18 15.2 18 18C18 20.8 15.866 25 12 25C8.134 25 5 21.866 5 18C5 14.134 8.134 11 12 11"
        stroke="url(#kontyra-grad-left-footer)"
        strokeWidth="3.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="pt-16 pb-12 border-t border-white/[0.06] bg-[#050609] text-left text-xs relative overflow-hidden mt-auto">
      {/* Subtle ambient glow */}
      <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[250px] bg-gradient-to-t from-blue-600/5 via-purple-600/5 to-transparent rounded-full blur-[100px]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-16">
          {/* Brand column */}
          <div className="col-span-2 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <KontyraLogo className="w-6 h-6" />
              <span className="font-black text-white text-base tracking-tight">Kontyra</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed max-w-xs">
              Building products for how people work, create, connect and build.
            </p>
          </div>

          {/* Products */}
          <div className="flex flex-col gap-2.5">
            <p className="font-bold text-white mb-1">Products</p>
            <Link to="/" className="text-slate-400 hover:text-white transition-colors">DevOS</Link>
            <a href="/#hearth" className="text-slate-400 hover:text-white transition-colors">Hearth</a>
            <a href="/#vux" className="text-slate-400 hover:text-white transition-colors">VUX</a>
            <a href="/#docs" className="text-slate-400 hover:text-white transition-colors">Docs</a>
            <a href="/#tasks" className="text-slate-400 hover:text-white transition-colors">Tasks</a>
            <a href="/#calendar" className="text-slate-400 hover:text-white transition-colors">Calendar</a>
            <a href="/#forms" className="text-slate-400 hover:text-white transition-colors">Forms</a>
            <a href="/#kora" className="text-slate-400 hover:text-white transition-colors">KORA</a>
          </div>

          {/* Company */}
          <div className="flex flex-col gap-2.5">
            <p className="font-bold text-white mb-1">Company</p>
            <Link to="/about" className="text-slate-400 hover:text-white transition-colors">About</Link>
            <a href="/#careers" className="text-slate-400 hover:text-white transition-colors">Careers</a>
            <a href="/#blog" className="text-slate-400 hover:text-white transition-colors">Blog</a>
            <a href="/#press" className="text-slate-400 hover:text-white transition-colors">Press</a>
            <Link to="/contact" className="text-slate-400 hover:text-white transition-colors">Contact</Link>
          </div>

          {/* Developers */}
          <div className="flex flex-col gap-2.5">
            <p className="font-bold text-white mb-1">Developers</p>
            <Link to="/docs" className="text-slate-400 hover:text-white transition-colors">Documentation</Link>
            <a href="/#api" className="text-slate-400 hover:text-white transition-colors">API</a>
            <Link to="/status" className="text-slate-400 hover:text-white transition-colors">Status</Link>
            <Link to="/communities" className="text-slate-400 hover:text-white transition-colors">Community</Link>
          </div>

          {/* Resources */}
          <div className="flex flex-col gap-2.5">
            <p className="font-bold text-white mb-1">Resources</p>
            <a href="/#help" className="text-slate-400 hover:text-white transition-colors">Help Center</a>
            <Link to="/privacy" className="text-slate-400 hover:text-white transition-colors">Privacy</Link>
            <Link to="/terms" className="text-slate-400 hover:text-white transition-colors">Terms</Link>
            <a href="/#brand" className="text-slate-400 hover:text-white transition-colors">Brand</a>
            <Link to="/acceptable-use" className="text-slate-400 hover:text-white transition-colors">Security</Link>
          </div>
        </div>

        {/* Socials & Language */}
        <div className="pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-slate-400">
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter" className="hover:text-white transition-colors">
              <Twitter className="w-4 h-4" />
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="hover:text-white transition-colors">
              <Linkedin className="w-4 h-4" />
            </a>
            <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="hover:text-white transition-colors">
              <Youtube className="w-4 h-4" />
            </a>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="hover:text-white transition-colors">
              <Github className="w-4 h-4" />
            </a>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-300 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg cursor-pointer hover:text-white transition-colors">
            <Globe className="w-3.5 h-3.5" />
            <span>English (US)</span>
            <ChevronDown className="w-3 h-3 text-white/40" />
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="pt-6 mt-6 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-2 text-slate-500 text-[11px]">
          <p>© {year} Kontyra. All rights reserved.</p>
          <p>Building a brighter digital tomorrow.</p>
        </div>
      </div>
    </footer>
  );
}
