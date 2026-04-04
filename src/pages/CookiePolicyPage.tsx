import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Cookie, Settings, BarChart2, ShieldOff, RefreshCw, Mail, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import MobileBottomNav from "../components/MobileBottomNav";
import { useSEO } from "../hooks/useSEO";
import { cn } from "../lib/utils";

const LAST_UPDATED = "April 4, 2026";

const SECTIONS = [
  { id: "what-are-cookies", label: "What Are Cookies",   icon: Info },
  { id: "how-we-use",       label: "How We Use Them",    icon: Settings },
  { id: "types",            label: "Types We Use",       icon: Cookie },
  { id: "analytics",        label: "Analytics",          icon: BarChart2 },
  { id: "third-party",      label: "Third-Party",        icon: ShieldOff },
  { id: "manage",           label: "Managing Cookies",   icon: Settings },
  { id: "changes",          label: "Policy Changes",     icon: RefreshCw },
  { id: "contact",          label: "Contact",            icon: Mail },
];

function SectionHeading({ icon: Icon, title, id }: { icon: React.ElementType; title: string; id: string }) {
  return (
    <div className="flex items-center gap-4 mb-6" id={id}>
      <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-amber-400" />
      </div>
      <h2 className="text-2xl font-bold text-white tracking-tight">{title}</h2>
    </div>
  );
}

function Body({ children }: { children: React.ReactNode }) {
  return <p className="text-white/55 text-sm leading-relaxed">{children}</p>;
}

function Sub({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-bold text-white mt-6 mb-2">{children}</h3>;
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="mt-3 space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5 text-sm text-white/55">
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500/60 flex-shrink-0" />
          <span className="leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 px-5 py-4 rounded-2xl border bg-amber-500/8 border-amber-500/20 text-amber-300 mt-4">
      <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-400" />
      <p className="text-sm leading-relaxed">{children}</p>
    </div>
  );
}

function CookieTable({ rows }: { rows: { name: string; purpose: string; duration: string; type: string }[] }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-2xl border border-white/[0.07]">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-white/[0.07] bg-white/[0.03]">
            {["Cookie / Key", "Purpose", "Duration", "Type"].map((h) => (
              <th key={h} className="text-left px-4 py-3 text-white/40 font-bold uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={cn("border-b border-white/[0.04]", i % 2 === 1 && "bg-white/[0.02]")}>
              <td className="px-4 py-3 font-mono text-amber-300/80">{r.name}</td>
              <td className="px-4 py-3 text-white/50">{r.purpose}</td>
              <td className="px-4 py-3 text-white/40">{r.duration}</td>
              <td className="px-4 py-3">
                <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                  r.type === "Essential" ? "bg-green-500/15 text-green-400" :
                  r.type === "Analytics" ? "bg-blue-500/15 text-blue-400" : "bg-white/8 text-white/40")}>
                  {r.type}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SectionContent({ id }: { id: string }) {
  switch (id) {
    case "what-are-cookies":
      return (
        <div className="space-y-4">
          <SectionHeading icon={Info} title="What Are Cookies?" id="what-are-cookies" />
          <Body>
            Cookies are small text files placed on your device by a website when you visit it. They are widely used
            to make websites work efficiently, remember your preferences, and provide information to site owners.
          </Body>
          <Body>
            DevOS also uses browser storage mechanisms ({" "}
            <code className="text-amber-300 text-xs bg-white/8 px-1.5 py-0.5 rounded">localStorage</code> and{" "}
            <code className="text-amber-300 text-xs bg-white/8 px-1.5 py-0.5 rounded">sessionStorage</code>)
            in addition to traditional cookies. This policy covers all such technologies.
          </Body>
          <InfoBox>
            DevOS uses a minimal number of cookies — only what is strictly necessary to run the platform and
            understand how it is used in aggregate.
          </InfoBox>
        </div>
      );

    case "how-we-use":
      return (
        <div className="space-y-4">
          <SectionHeading icon={Settings} title="How We Use Cookies" id="how-we-use" />
          <Body>We use cookies and browser storage for the following core purposes:</Body>
          <BulletList items={[
            "Authentication — keeping you signed in securely across page loads",
            "Session management — maintaining your active workspace state",
            "Security — protecting against cross-site request forgery (CSRF) attacks",
            "Preferences — remembering your editor settings, open files, and UI layout per project",
            "Performance — detecting errors and diagnosing slow page loads",
            "Analytics — understanding aggregate, anonymised usage patterns to improve the product",
          ]} />
        </div>
      );

    case "types":
      return (
        <div className="space-y-4">
          <SectionHeading icon={Cookie} title="Types We Use" id="types" />
          <Sub>Essential Cookies</Sub>
          <Body>
            Strictly necessary to operate the Service. These cannot be disabled without breaking core functionality.
          </Body>
          <CookieTable rows={[
            { name: "firebase:authUser", purpose: "Stores your Firebase authentication session", duration: "Session / persistent", type: "Essential" },
            { name: "__session",         purpose: "Server-side session token for secure requests", duration: "Session", type: "Essential" },
            { name: "csrfToken",         purpose: "Prevents cross-site request forgery",         duration: "Session", type: "Essential" },
          ]} />

          <Sub>Preference Storage (localStorage)</Sub>
          <Body>
            Stored only in your browser. Never transmitted to our servers. Used solely to restore your
            editor state between visits.
          </Body>
          <CookieTable rows={[
            { name: "ide_file_{id}",    purpose: "Last active file for a project",     duration: "Persistent (local)", type: "Preference" },
            { name: "ide_panel_{id}",   purpose: "Last open IDE panel for a project",  duration: "Persistent (local)", type: "Preference" },
            { name: "devos_lastRoute",  purpose: "Restores last visited page on return", duration: "Persistent (local)", type: "Preference" },
          ]} />
        </div>
      );

    case "analytics":
      return (
        <div className="space-y-4">
          <SectionHeading icon={BarChart2} title="Analytics" id="analytics" />
          <Body>
            We may collect anonymised, aggregated analytics data to understand how the platform is used.
            This helps us prioritise features, fix performance issues, and improve the overall experience.
          </Body>
          <BulletList items={[
            "Page views and navigation paths — anonymised and aggregated, never linked to individuals",
            "Feature interaction events (e.g., 'Deployed project') — no code content is captured",
            "Session duration and error rates — used purely for performance monitoring",
            "IP addresses are hashed immediately and never stored in plain text",
          ]} />
          <InfoBox>
            We do not use Google Analytics or any advertising-network analytics. We do not share analytics
            data with advertisers or data brokers.
          </InfoBox>
        </div>
      );

    case "third-party":
      return (
        <div className="space-y-4">
          <SectionHeading icon={ShieldOff} title="Third-Party Cookies" id="third-party" />
          <Body>
            DevOS does not place third-party advertising or tracking cookies. The following third-party
            services may set cookies as part of their operation:
          </Body>
          <div className="space-y-3 mt-4">
            {[
              { name: "Google Firebase", purpose: "Authentication session management", link: "https://firebase.google.com/support/privacy" },
              { name: "Google Fonts (if used)", purpose: "Serving web fonts — no tracking cookies", link: "https://policies.google.com/privacy" },
            ].map(({ name, purpose, link }) => (
              <div key={name} className="glass border border-white/[0.07] rounded-2xl p-4">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <span className="text-sm font-bold text-white">{name}</span>
                  <a href={link} target="_blank" rel="noopener noreferrer"
                    className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors">
                    Privacy policy <ChevronRight className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-xs text-white/45">{purpose}</p>
              </div>
            ))}
          </div>
        </div>
      );

    case "manage":
      return (
        <div className="space-y-4">
          <SectionHeading icon={Settings} title="Managing Cookies" id="manage" />
          <Body>
            You can control and manage cookies through your browser settings. Here's how to do it in
            the most popular browsers:
          </Body>
          <div className="grid sm:grid-cols-2 gap-3 mt-4">
            {[
              { browser: "Chrome",  url: "https://support.google.com/chrome/answer/95647" },
              { browser: "Firefox", url: "https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" },
              { browser: "Safari",  url: "https://support.apple.com/guide/safari/manage-cookies-sfri11471" },
              { browser: "Edge",    url: "https://support.microsoft.com/en-us/windows/manage-cookies-in-microsoft-edge" },
            ].map(({ browser, url }) => (
              <a key={browser} href={url} target="_blank" rel="noopener noreferrer"
                className="glass border border-white/[0.07] hover:border-amber-500/20 rounded-xl px-4 py-3 flex items-center justify-between text-sm text-white/60 hover:text-white transition-all">
                {browser} cookie settings <ChevronRight className="w-3.5 h-3.5" />
              </a>
            ))}
          </div>
          <InfoBox>
            Disabling essential cookies will prevent you from signing in to DevOS. Preference storage
            can be cleared via your browser's developer tools without affecting your account.
          </InfoBox>
        </div>
      );

    case "changes":
      return (
        <div className="space-y-4">
          <SectionHeading icon={RefreshCw} title="Policy Changes" id="changes" />
          <Body>
            We may update this Cookie Policy as our practices evolve or legal requirements change.
            Material updates will be announced via an in-app notice and the "Last Updated" date will
            be revised. Continued use of the Service after changes take effect constitutes acceptance.
          </Body>
        </div>
      );

    case "contact":
      return (
        <div className="space-y-4">
          <SectionHeading icon={Mail} title="Contact" id="contact" />
          <Body>Questions about our use of cookies? Contact us at:</Body>
          <a href="mailto:privacy@devos.zone.id"
            className="glass border border-white/[0.07] hover:border-amber-500/30 rounded-2xl p-5 mt-4 card-glow block transition-all">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center">
                <Mail className="w-4 h-4 text-amber-400" />
              </div>
              <span className="text-sm font-bold text-white">Privacy & Cookie Enquiries</span>
            </div>
            <p className="text-xs text-amber-400 font-mono">privacy@devos.zone.id</p>
          </a>
        </div>
      );

    default: return null;
  }
}

export default function CookiePolicyPage() {
  useSEO({
    title: "Cookie Policy — DevOS",
    description: "DevOS Cookie Policy: how we use cookies and browser storage on the DevOS platform.",
  });

  const [activeId, setActiveId] = useState("what-are-cookies");

  useEffect(() => {
    const onScroll = () => {
      for (const s of [...SECTIONS].reverse()) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= 140) { setActiveId(s.id); return; }
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id: string) => {
    setActiveId(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col overflow-x-hidden">
      <Navbar />

      <div className="relative border-b border-white/[0.06] overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-amber-600/6 rounded-full blur-[80px]" />
        </div>
        <div className="relative max-w-7xl mx-auto px-5 md:px-6 py-12 md:py-16">
          <Link to="/" className="inline-flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-8 group text-sm">
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Back to Home
          </Link>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-600/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-widest mb-4">
              <Cookie className="w-3 h-3" /> Legal
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white mb-3">Cookie Policy</h1>
            <p className="text-white/40 max-w-xl text-base leading-relaxed">
              We use a minimal set of cookies to keep DevOS running securely. Here's exactly what we use and why.
            </p>
            <p className="text-xs text-white/25 mt-4 font-mono">Last updated: {LAST_UPDATED}</p>
          </motion.div>
        </div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto w-full px-5 md:px-6 py-10 md:py-14 flex gap-10">
        <aside className="hidden lg:flex flex-col gap-0.5 w-56 flex-shrink-0 self-start sticky top-20">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-3 px-3">Contents</p>
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => scrollTo(id)}
              className={cn("flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all text-left w-full",
                id === activeId ? "bg-amber-600/15 text-amber-300 border border-amber-500/20" : "text-white/35 hover:text-white/80 hover:bg-white/[0.05]")}>
              <Icon className="w-3.5 h-3.5 flex-shrink-0" /><span className="truncate">{label}</span>
            </button>
          ))}
        </aside>

        <div className="lg:hidden w-full flex gap-2 overflow-x-auto no-scrollbar pb-4 -mx-5 px-5 mb-2 flex-shrink-0">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => scrollTo(id)}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex-shrink-0 border",
                id === activeId ? "bg-amber-600/20 border-amber-500/40 text-amber-300" : "bg-white/5 border-white/10 text-white/50 hover:text-white")}>
              <Icon className="w-3 h-3" />{label}
            </button>
          ))}
        </div>

        <main className="flex-1 min-w-0 space-y-14">
          {SECTIONS.map(({ id }, i) => (
            <motion.div key={id}
              initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.45, delay: i * 0.03 }}
              className="glass border border-white/[0.06] rounded-3xl p-7 md:p-9">
              <SectionContent id={id} />
            </motion.div>
          ))}
          <div className="text-center py-6 border-t border-white/[0.05]">
            <p className="text-xs text-white/20">© {new Date().getFullYear()} DevOS</p>
            <div className="flex items-center justify-center gap-4 mt-3">
              <Link to="/privacy" className="text-xs text-white/30 hover:text-white/60 transition-colors">Privacy</Link>
              <span className="text-white/10">·</span>
              <Link to="/terms" className="text-xs text-white/30 hover:text-white/60 transition-colors">Terms</Link>
              <span className="text-white/10">·</span>
              <Link to="/acceptable-use" className="text-xs text-white/30 hover:text-white/60 transition-colors">Acceptable Use</Link>
            </div>
          </div>
        </main>
      </div>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
