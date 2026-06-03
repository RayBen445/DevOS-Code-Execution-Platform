import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Code2, Mail, Github, Twitter, Globe } from "lucide-react";
import { getSiteConfig, SiteConfig, SITE_CONFIG_DEFAULTS } from "../lib/creditsService";

export default function Footer() {
  const year = new Date().getFullYear();
  const [config, setConfig] = useState<SiteConfig>(SITE_CONFIG_DEFAULTS);

  useEffect(() => {
    getSiteConfig().then(setConfig).catch((err) => {
      console.error("Failed to load site config:", err);
    });
  }, []);

  const socials = [
    { icon: Github, href: config.githubUrl, label: "GitHub" },
    { icon: Twitter, href: config.twitterUrl, label: "Twitter" },
    { icon: Globe, href: config.websiteUrl, label: "Website" },
  ].filter(({ href }) => !!href);

  return (
    <footer className="relative border-t border-white/[0.06] bg-base mt-auto overflow-hidden">
      {/* Subtle gradient glow */}
      <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[200px] bg-blue-600/5 rounded-full blur-[80px]" />

      <div className="relative max-w-7xl mx-auto px-6 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Branding */}
          <div className="md:col-span-1 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-600/25">
                <Code2 className="w-4 h-4 text-white" />
              </div>
              <span className="font-black text-white text-lg tracking-tight">{config.platformName}</span>
            </div>
            <p className="text-xs text-white/30 leading-relaxed max-w-[200px]">
              {config.tagline}
            </p>
            {/* Social links */}
            <div className="flex items-center gap-2 pt-1">
              {socials.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-8 h-8 rounded-lg border border-border-base flex items-center justify-center text-white/40 hover:text-white hover:border-border-base hover:bg-white/5 transition-all"
                >
                  <Icon className="w-3.5 h-3.5" />
                </a>
              ))}
            </div>
          </div>

          {/* Platform */}
          <div className="flex flex-col gap-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1">Platform</p>
            <FooterLink to="/">Explore</FooterLink>
            <FooterLink to="/templates">Templates</FooterLink>
            <FooterLink to="/learn">Learn</FooterLink>
            <FooterLink to="/communities">Communities</FooterLink>
            <FooterLink to="/orgs">Organizations</FooterLink>
            <FooterLink to="/docs">Docs</FooterLink>
            <FooterLink to="/about">About</FooterLink>
            <FooterLink to="/contact">Contact</FooterLink>
          </div>

          {/* Developers */}
          <div className="flex flex-col gap-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1">Developers</p>
            <FooterLink to="/projects">Dashboard</FooterLink>
            <FooterLink to="/explore">Explore Projects</FooterLink>
            <FooterLink to="/status">Status</FooterLink>
          </div>

          {/* Contact & Legal */}
          <div className="flex flex-col gap-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1">Contact &amp; Legal</p>
            <FooterLink to="/about">About</FooterLink>
            <FooterLink to="/contact">Contact Us</FooterLink>
            <a
              href={`mailto:${config.contactEmail}`}
              className="flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors w-fit"
            >
              <Mail className="w-3.5 h-3.5 flex-shrink-0" />
              {config.contactEmail}
            </a>
            <FooterLink to="/privacy">Privacy Policy</FooterLink>
            <FooterLink to="/terms">Terms of Service</FooterLink>
            <FooterLink to="/cookies">Cookie Policy</FooterLink>
            <FooterLink to="/acceptable-use">Acceptable Use</FooterLink>
            <FooterLink to="/copyright">Copyright &amp; DMCA</FooterLink>
            <FooterLink to="/not-found">Not Found Page</FooterLink>
          </div>
        </div>

        <div className="border-t border-white/[0.05] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-white/20">
            © {year} {config.platformName}. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            {[
              { to: "/privacy",        label: "Privacy" },
              { to: "/terms",          label: "Terms" },
              { to: "/cookies",        label: "Cookies" },
              { to: "/acceptable-use", label: "Acceptable Use" },
              { to: "/copyright",      label: "Copyright" },
            ].map(({ to, label }) => (
              <Link key={to} to={to} className="text-[11px] text-white/20 hover:text-white/50 transition-colors">
                {label}
              </Link>
            ))}
          </div>
          <p className="text-[11px] text-white/20">
            {config.footerCredit}
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
