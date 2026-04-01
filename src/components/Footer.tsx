import { Link } from "react-router-dom";
import { Code2, Mail } from "lucide-react";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/5 bg-[#0a0a0a] mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
          {/* Left — branding */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Code2 className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-white text-base tracking-tight">DevOS</span>
            </div>
            <p className="text-xs text-white/30 leading-relaxed max-w-[200px]">
              Code in the Cloud
            </p>
            <p className="text-[11px] text-white/20 leading-relaxed max-w-[220px] pt-1">
              Built by Cool Shot Systems&nbsp;•&nbsp;Tech Visionaries Network
            </p>
          </div>

          {/* Center — navigation */}
          <div className="flex flex-col gap-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1">
              Platform
            </p>
            <FooterLink to="/">Explore</FooterLink>
            <FooterLink to="/templates">Templates</FooterLink>
            <FooterLink to="/docs">Docs</FooterLink>
            <FooterLink to="/status">Status</FooterLink>
          </div>

          {/* Right — contact + legal */}
          <div className="flex flex-col gap-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1">
              Contact &amp; Legal
            </p>
            <a
              href="mailto:info@devos.zone.id"
              className="flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors"
            >
              <Mail className="w-3.5 h-3.5 flex-shrink-0" />
              info@devos.zone.id
            </a>
            <FooterLink to="/privacy">Privacy Policy</FooterLink>
            <FooterLink to="/terms">Terms of Service</FooterLink>
          </div>
        </div>

        <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-white/20">
            © {year} DevOS. All rights reserved.
          </p>
          <p className="text-[11px] text-white/20">
            Cool Shot Systems • Tech Visionaries Network
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="text-sm text-white/40 hover:text-white transition-colors w-fit"
    >
      {children}
    </Link>
  );
}
