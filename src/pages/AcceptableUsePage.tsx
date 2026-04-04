import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2, XCircle, AlertTriangle, Zap, Globe, Shield,
  UserX, RefreshCw, Mail, ChevronLeft, Gavel,
} from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import MobileBottomNav from "../components/MobileBottomNav";
import { useSEO } from "../hooks/useSEO";
import { cn } from "../lib/utils";

const LAST_UPDATED = "April 4, 2026";

const SECTIONS = [
  { id: "overview",    label: "Overview",          icon: CheckCircle2 },
  { id: "allowed",     label: "Permitted Uses",    icon: CheckCircle2 },
  { id: "prohibited",  label: "Prohibited Content",icon: XCircle },
  { id: "resources",   label: "Resource Limits",   icon: Zap },
  { id: "security",    label: "Security Rules",    icon: Shield },
  { id: "community",   label: "Community Rules",   icon: Globe },
  { id: "reporting",   label: "Reporting",         icon: AlertTriangle },
  { id: "enforcement", label: "Enforcement",       icon: Gavel },
  { id: "appeals",     label: "Appeals",           icon: UserX },
  { id: "changes",     label: "Policy Changes",    icon: RefreshCw },
  { id: "contact",     label: "Contact",           icon: Mail },
];

function SectionHeading({ icon: Icon, title, id }: { icon: React.ElementType; title: string; id: string }) {
  return (
    <div className="flex items-center gap-4 mb-6" id={id}>
      <div className="w-11 h-11 rounded-2xl bg-emerald-600/15 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-emerald-400" />
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

function BulletList({ items, color = "emerald" }: { items: string[]; color?: "emerald" | "red" }) {
  const dot = color === "red" ? "bg-red-500/60" : "bg-emerald-500/60";
  return (
    <ul className="mt-3 space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5 text-sm text-white/55">
          <span className={cn("mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0", dot)} />
          <span className="leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function InfoBox({ icon: Icon = AlertTriangle, color = "emerald", children }: {
  icon?: React.ElementType; color?: "emerald" | "yellow" | "red"; children: React.ReactNode;
}) {
  const s = {
    emerald: "bg-emerald-500/8 border-emerald-500/20 text-emerald-300",
    yellow:  "bg-yellow-500/8  border-yellow-500/20  text-yellow-300",
    red:     "bg-red-500/8     border-red-500/20     text-red-300",
  }[color];
  const ic = { emerald: "text-emerald-400", yellow: "text-yellow-400", red: "text-red-400" }[color];
  return (
    <div className={cn("flex gap-3 px-5 py-4 rounded-2xl border mt-4", s)}>
      <Icon className={cn("w-4 h-4 mt-0.5 flex-shrink-0", ic)} />
      <p className="text-sm leading-relaxed">{children}</p>
    </div>
  );
}

function TwoCol({ left, right }: { left: { title: string; items: string[] }; right: { title: string; items: string[] } }) {
  return (
    <div className="grid sm:grid-cols-2 gap-4 mt-4">
      <div className="glass border border-emerald-500/15 rounded-2xl p-5">
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-400/70 mb-3 flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5" /> {left.title}
        </p>
        <BulletList items={left.items} color="emerald" />
      </div>
      <div className="glass border border-red-500/15 rounded-2xl p-5">
        <p className="text-xs font-bold uppercase tracking-widest text-red-400/70 mb-3 flex items-center gap-2">
          <XCircle className="w-3.5 h-3.5" /> {right.title}
        </p>
        <BulletList items={right.items} color="red" />
      </div>
    </div>
  );
}

function SectionContent({ id }: { id: string }) {
  switch (id) {
    case "overview":
      return (
        <div className="space-y-4">
          <SectionHeading icon={CheckCircle2} title="Overview" id="overview" />
          <Body>
            This Acceptable Use Policy ("AUP") describes what you may and may not do on the DevOS platform.
            It applies to all users of DevOS, including free accounts, and supplements our{" "}
            <Link to="/terms" className="text-emerald-400 hover:text-emerald-300 transition-colors">Terms of Service</Link>.
          </Body>
          <Body>
            Our goal is to keep DevOS a safe, fair, and productive environment for all developers. The rules
            in this policy protect users, third parties, and the integrity of our infrastructure.
          </Body>
          <InfoBox icon={CheckCircle2} color="emerald">
            Most users will never need to think about this policy. It mainly targets malicious actors and
            clearly harmful behaviour.
          </InfoBox>
        </div>
      );

    case "allowed":
      return (
        <div className="space-y-4">
          <SectionHeading icon={CheckCircle2} title="Permitted Uses" id="allowed" />
          <Body>You are welcome to use DevOS for any of the following:</Body>
          <BulletList items={[
            "Building personal, educational, or commercial web applications",
            "Learning programming through hands-on projects and experimentation",
            "Hosting open-source projects and contributing to the community",
            "Creating portfolio projects to showcase to employers or clients",
            "Collaborating with teammates on shared private or public projects",
            "Experimenting with new frameworks, languages, and tools",
            "Building internal tools and automation scripts",
            "Deploying static sites, landing pages, and web apps",
          ]} />
        </div>
      );

    case "prohibited":
      return (
        <div className="space-y-4">
          <SectionHeading icon={XCircle} title="Prohibited Content" id="prohibited" />
          <Body>The following content and activities are strictly prohibited on DevOS:</Body>
          <TwoCol
            left={{ title: "Allowed", items: ["Open-source libraries", "Educational demos", "Game development", "Productivity tools", "Community projects"] }}
            right={{ title: "Prohibited", items: ["Malware or viruses", "Phishing pages", "Illegal file sharing", "Hate content", "CSAM"] }}
          />
          <Sub>Detailed prohibitions</Sub>
          <BulletList color="red" items={[
            "Malware, ransomware, viruses, trojans, spyware, or any malicious software",
            "Phishing pages, credential harvesting sites, or social engineering tools",
            "Content that sexually exploits minors (CSAM) — reported to authorities immediately",
            "Hate speech targeting individuals or groups based on protected characteristics",
            "Tools designed to conduct DDoS attacks, port scanning, or network intrusion",
            "Software designed to scrape, harvest, or misuse data from other services without permission",
            "Counterfeit goods, fraudulent services, or deceptive content designed to mislead users",
            "Content that violates export control laws or sanctions regulations",
            "Illegal gambling platforms, unlicensed financial services, or pyramid schemes",
          ]} />
        </div>
      );

    case "resources":
      return (
        <div className="space-y-4">
          <SectionHeading icon={Zap} title="Resource Limits" id="resources" />
          <Body>
            DevOS provides shared infrastructure to all users. Fair use of resources ensures everyone gets
            a good experience. The following activities are prohibited regardless of intent:
          </Body>
          <BulletList color="red" items={[
            "Cryptocurrency mining or proof-of-work computation of any kind",
            "Intentionally consuming excessive CPU, memory, or bandwidth to degrade service for others",
            "Running persistent background processes, bots, or scrapers that aren't part of a project",
            "Attempting to circumvent credit limits, rate limits, or execution quotas",
            "Using multiple accounts to multiply free resource allocations",
          ]} />
          <InfoBox icon={Zap} color="yellow">
            CPU-intensive projects (e.g., image processing, data analysis) are fine as part of normal development.
            The restriction is on deliberate resource abuse that impacts other users.
          </InfoBox>
        </div>
      );

    case "security":
      return (
        <div className="space-y-4">
          <SectionHeading icon={Shield} title="Security Rules" id="security" />
          <Body>
            You may not use DevOS to conduct or facilitate any of the following:
          </Body>
          <BulletList color="red" items={[
            "Attacks against DevOS infrastructure or other users' accounts",
            "Attempts to exploit vulnerabilities in the DevOS platform (report them via responsible disclosure instead)",
            "Storing or transmitting credentials, API keys, or secrets in public projects",
            "Running tools designed to test or scan third-party systems without explicit authorisation",
            "Bypassing authentication, authorisation, or access controls",
          ]} />
          <Sub>Responsible Disclosure</Sub>
          <Body>
            Found a security vulnerability in DevOS? Please report it responsibly to{" "}
            <a href="mailto:security@devos.zone.id" className="text-emerald-400 hover:text-emerald-300 transition-colors">
              security@devos.zone.id
            </a>{" "}
            rather than exploiting it. We are grateful for responsible security researchers.
          </Body>
        </div>
      );

    case "community":
      return (
        <div className="space-y-4">
          <SectionHeading icon={Globe} title="Community Rules" id="community" />
          <Body>
            DevOS has a social feed, community spaces, and public projects. When interacting with others,
            you must:
          </Body>
          <BulletList items={[
            "Be respectful — harassment, bullying, and personal attacks are not tolerated",
            "Not impersonate other users, celebrities, or DevOS staff",
            "Not post spam, unsolicited advertisements, or repetitive content",
            "Clearly attribute others' work when forking or referencing it",
            "Not share others' private information without their consent (doxxing)",
          ]} />
          <InfoBox icon={Globe} color="emerald">
            We want DevOS to be a welcoming place for developers of all backgrounds and skill levels.
            Treat others the way you'd want to be treated.
          </InfoBox>
        </div>
      );

    case "reporting":
      return (
        <div className="space-y-4">
          <SectionHeading icon={AlertTriangle} title="Reporting Violations" id="reporting" />
          <Body>
            If you encounter content or behaviour that violates this policy, please report it immediately.
          </Body>
          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            {[
              { label: "Abuse / Spam", email: "abuse@devos.zone.id" },
              { label: "Security Issues", email: "security@devos.zone.id" },
              { label: "Copyright / DMCA", email: "dmca@devos.zone.id" },
              { label: "General Violations", email: "info@devos.zone.id" },
            ].map(({ label, email }) => (
              <a key={email} href={`mailto:${email}`}
                className="glass border border-white/[0.07] hover:border-emerald-500/20 rounded-2xl p-4 transition-all block">
                <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-1">{label}</p>
                <p className="text-sm text-emerald-400 font-mono">{email}</p>
              </a>
            ))}
          </div>
          <Body>
            We aim to respond to all reports within 48 hours. For urgent safety issues we respond as quickly
            as possible around the clock.
          </Body>
        </div>
      );

    case "enforcement":
      return (
        <div className="space-y-4">
          <SectionHeading icon={Gavel} title="Enforcement" id="enforcement" />
          <Body>
            DevOS may take any of the following actions in response to policy violations, depending on
            severity:
          </Body>
          <div className="space-y-3 mt-4">
            {[
              { action: "Warning", desc: "A formal notice for first-time or minor violations." },
              { action: "Content Removal", desc: "Removal of offending projects, files, or posts." },
              { action: "Temporary Suspension", desc: "Account access suspended for a defined period." },
              { action: "Permanent Termination", desc: "Account permanently closed for serious violations." },
              { action: "Legal Action", desc: "Report to law enforcement for criminal activity or CSAM." },
            ].map(({ action, desc }, i) => (
              <div key={i} className="glass border border-white/[0.06] rounded-xl p-4 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-white/8 flex items-center justify-center text-[10px] font-black text-white/50 flex-shrink-0 mt-0.5">{i + 1}</span>
                <div>
                  <p className="text-sm font-bold text-white mb-0.5">{action}</p>
                  <p className="text-xs text-white/45">{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <InfoBox icon={AlertTriangle} color="red">
            Serious violations (malware distribution, CSAM, infrastructure attacks) will result in
            immediate permanent termination without warning.
          </InfoBox>
        </div>
      );

    case "appeals":
      return (
        <div className="space-y-4">
          <SectionHeading icon={UserX} title="Appeals" id="appeals" />
          <Body>
            If you believe your account was suspended or content removed in error, you may appeal the
            decision within 30 days of the action.
          </Body>
          <BulletList items={[
            "Email appeals@devos.zone.id with your username and a description of the situation",
            "Include any evidence you believe is relevant to the decision",
            "Appeals are reviewed by a different team member than the one who took the original action",
            "We aim to respond to appeals within 5 business days",
            "Our decision on appeal is final",
          ]} />
          <a href="mailto:appeals@devos.zone.id"
            className="glass border border-white/[0.07] hover:border-emerald-500/30 rounded-2xl p-5 mt-4 card-glow block transition-all">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600/15 flex items-center justify-center">
                <Mail className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Submit an Appeal</p>
                <p className="text-xs text-emerald-400 font-mono">appeals@devos.zone.id</p>
              </div>
            </div>
          </a>
        </div>
      );

    case "changes":
      return (
        <div className="space-y-4">
          <SectionHeading icon={RefreshCw} title="Policy Changes" id="changes" />
          <Body>
            We may update this Acceptable Use Policy as the platform evolves. Material changes will be
            announced via an in-app notice. Continued use of DevOS after changes take effect constitutes
            your acceptance of the revised policy.
          </Body>
        </div>
      );

    case "contact":
      return (
        <div className="space-y-4">
          <SectionHeading icon={Mail} title="Contact" id="contact" />
          <Body>Questions about this policy? Reach us at:</Body>
          <a href="mailto:abuse@devos.zone.id"
            className="glass border border-white/[0.07] hover:border-emerald-500/30 rounded-2xl p-5 mt-4 card-glow block transition-all">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600/15 flex items-center justify-center">
                <Mail className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Abuse & Policy Team</p>
                <p className="text-xs text-emerald-400 font-mono">abuse@devos.zone.id</p>
              </div>
            </div>
          </a>
        </div>
      );

    default: return null;
  }
}

export default function AcceptableUsePage() {
  useSEO({
    title: "Acceptable Use Policy — DevOS",
    description: "DevOS Acceptable Use Policy: what you may and may not do on the DevOS platform.",
  });

  const [activeId, setActiveId] = useState("overview");

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
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-emerald-600/6 rounded-full blur-[80px]" />
        </div>
        <div className="relative max-w-7xl mx-auto px-5 md:px-6 py-12 md:py-16">
          <Link to="/" className="inline-flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-8 group text-sm">
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Back to Home
          </Link>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-4">
              <CheckCircle2 className="w-3 h-3" /> Legal
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white mb-3">Acceptable Use Policy</h1>
            <p className="text-white/40 max-w-xl text-base leading-relaxed">
              Rules that keep DevOS safe, fair, and productive for every developer on the platform.
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
                id === activeId ? "bg-emerald-600/15 text-emerald-300 border border-emerald-500/20" : "text-white/35 hover:text-white/80 hover:bg-white/[0.05]")}>
              <Icon className="w-3.5 h-3.5 flex-shrink-0" /><span className="truncate">{label}</span>
            </button>
          ))}
        </aside>

        <div className="flex-1 min-w-0 flex flex-col">
        <div className="lg:hidden w-full flex gap-2 overflow-x-auto no-scrollbar pb-4 -mx-5 px-5 mb-2 flex-shrink-0">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => scrollTo(id)}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex-shrink-0 border",
                id === activeId ? "bg-emerald-600/20 border-emerald-500/40 text-emerald-300" : "bg-white/5 border-white/10 text-white/50 hover:text-white")}>
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
              <Link to="/cookies" className="text-xs text-white/30 hover:text-white/60 transition-colors">Cookies</Link>
            </div>
          </div>
        </main>
        </div>
      </div>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
