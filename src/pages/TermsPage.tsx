import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  FileText, ShieldCheck, UserX, Globe, Gavel, RefreshCw,
  AlertTriangle, Lock, CheckCircle2, XCircle, ChevronLeft,
  ChevronRight, Mail, Scale, Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import MobileBottomNav from "../components/MobileBottomNav";
import { useSEO } from "../hooks/useSEO";
import { cn } from "../lib/utils";

const LAST_UPDATED = "April 4, 2026";
const EFFECTIVE_DATE = "April 4, 2026";

const SECTIONS = [
  { id: "agreement",     label: "Agreement",            icon: FileText },
  { id: "eligibility",   label: "Eligibility",          icon: ShieldCheck },
  { id: "accounts",      label: "Accounts",             icon: UserX },
  { id: "acceptable",    label: "Acceptable Use",        icon: CheckCircle2 },
  { id: "prohibited",    label: "Prohibited Use",        icon: XCircle },
  { id: "ip",            label: "Intellectual Property", icon: Lock },
  { id: "credits",       label: "Credits & Billing",    icon: Zap },
  { id: "service",       label: "Service Availability",  icon: Globe },
  { id: "liability",     label: "Liability",             icon: Scale },
  { id: "termination",   label: "Termination",           icon: UserX },
  { id: "governing-law", label: "Governing Law",         icon: Gavel },
  { id: "changes",       label: "Changes to Terms",      icon: RefreshCw },
  { id: "contact",       label: "Contact",               icon: Mail },
];

/* ── Helper components ────────────────────────────────────────────────────── */
function SectionHeading({ icon: Icon, title, id }: { icon: React.ElementType; title: string; id: string }) {
  return (
    <div className="flex items-center gap-4 mb-6" id={id}>
      <div className="w-11 h-11 rounded-2xl bg-violet-600/15 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-violet-400" />
      </div>
      <h2 className="text-2xl font-bold text-white tracking-tight">{title}</h2>
    </div>
  );
}

function Sub({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-bold text-white mt-6 mb-2">{children}</h3>;
}

function Body({ children }: { children: React.ReactNode }) {
  return <p className="text-white/55 text-sm leading-relaxed">{children}</p>;
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="mt-3 space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5 text-sm text-white/55">
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-violet-500/60 flex-shrink-0" />
          <span className="leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function InfoBox({ icon: Icon = AlertTriangle, color = "violet", children }: {
  icon?: React.ElementType; color?: "violet" | "yellow" | "green" | "red"; children: React.ReactNode;
}) {
  const s = {
    violet: "bg-violet-500/8 border-violet-500/20 text-violet-300",
    yellow: "bg-yellow-500/8 border-yellow-500/20 text-yellow-300",
    green:  "bg-green-500/8  border-green-500/20  text-green-300",
    red:    "bg-red-500/8    border-red-500/20    text-red-300",
  }[color];
  const ic = { violet: "text-violet-400", yellow: "text-yellow-400", green: "text-green-400", red: "text-red-400" }[color];
  return (
    <div className={cn("flex gap-3 px-5 py-4 rounded-2xl border mt-4", s)}>
      <Icon className={cn("w-4 h-4 mt-0.5 flex-shrink-0", ic)} />
      <p className="text-sm leading-relaxed">{children}</p>
    </div>
  );
}

function AllowedDenied({ allowed, denied }: { allowed: string[]; denied: string[] }) {
  return (
    <div className="grid sm:grid-cols-2 gap-4 mt-4">
      <div className="glass border border-green-500/15 rounded-2xl p-5">
        <p className="text-xs font-bold uppercase tracking-widest text-green-400/70 mb-3 flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5" /> Allowed
        </p>
        <ul className="space-y-2">
          {allowed.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-white/55">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-500/60 flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>
      <div className="glass border border-red-500/15 rounded-2xl p-5">
        <p className="text-xs font-bold uppercase tracking-widest text-red-400/70 mb-3 flex items-center gap-2">
          <XCircle className="w-3.5 h-3.5" /> Not Allowed
        </p>
        <ul className="space-y-2">
          {denied.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-white/55">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500/60 flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ── Section content ──────────────────────────────────────────────────────── */
function SectionContent({ id }: { id: string }) {
  switch (id) {
    case "agreement":
      return (
        <div className="space-y-4">
          <SectionHeading icon={FileText} title="Agreement to Terms" id="agreement" />
          <Body>
            These Terms of Service ("Terms") constitute a legally binding agreement between you ("User", "you") and DevOS
            ("DevOS", "we", "us", "our") — a product of Kontyra and Tech Visionary Network — governing your
            access to and use of the DevOS cloud development platform, including the IDE, deployment infrastructure,
            social feed, and all related services available at{" "}
            <span className="text-violet-400 font-mono text-xs">devos.zone.id</span> (collectively, the "Service").
          </Body>
          <Body>
            By creating an account, clicking "Sign Up", or otherwise accessing or using the Service, you confirm that
            you have read, understood, and agree to be bound by these Terms and our{" "}
            <Link to="/privacy" className="text-violet-400 hover:text-violet-300 transition-colors">Privacy Policy</Link>,
            which is incorporated by reference.
          </Body>
          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            <div className="glass border border-green-500/20 rounded-2xl p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-green-400/70 mb-1">Effective Date</p>
              <p className="text-white font-bold">{EFFECTIVE_DATE}</p>
            </div>
            <div className="glass border border-violet-500/20 rounded-2xl p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-violet-400/70 mb-1">Last Updated</p>
              <p className="text-white font-bold">{LAST_UPDATED}</p>
            </div>
          </div>
          <Sub>Platform Features</Sub>
          <Body>
            The Service includes an in-browser IDE, project deployment infrastructure, social developer feed, community spaces with real-time chat and voice calls, organization workspaces with role-based access control (RBAC), a credit-based AI feature system, user-uploaded media storage (avatars, banners) via Supabase, and a Plugin Marketplace (coming soon). Features may be added, modified, or removed at our discretion.
          </Body>
          <InfoBox icon={AlertTriangle} color="yellow">
            If you do not agree to these Terms, you must not access or use the Service.
          </InfoBox>
        </div>
      );

    case "eligibility":
      return (
        <div className="space-y-4">
          <SectionHeading icon={ShieldCheck} title="Eligibility" id="eligibility" />
          <Body>To use DevOS you must:</Body>
          <BulletList items={[
            "Be at least 13 years of age (or 16 in the European Economic Area)",
            "Have the legal capacity to enter into a binding contract in your jurisdiction",
            "Not be prohibited from using the Service under applicable law",
            "Not have had a previous account terminated by DevOS for violations of these Terms",
          ]} />
          <Body>
            By using the Service you represent and warrant that you meet all of the eligibility requirements above.
            If you are accepting these Terms on behalf of a company or other legal entity, you represent that you have
            the authority to bind that entity.
          </Body>
          <InfoBox icon={ShieldCheck} color="green">
            Users under 18 should use DevOS only with the consent and supervision of a parent or guardian.
          </InfoBox>
        </div>
      );

    case "accounts":
      return (
        <div className="space-y-4">
          <SectionHeading icon={UserX} title="Accounts" id="accounts" />
          <Sub>Registration</Sub>
          <Body>
            You must create an account to access most features of DevOS. You agree to provide accurate, current, and
            complete information during registration and to keep your information updated.
          </Body>
          <Sub>Username</Sub>
          <Body>
            Usernames must be between 3 and 20 characters and may contain letters, numbers, underscores, and hyphens.
            Usernames cannot be changed after registration. DevOS reserves the right to reclaim usernames that violate
            our policies or impersonate others.
          </Body>
          <Sub>Account Security</Sub>
          <BulletList items={[
            "You are responsible for maintaining the confidentiality of your account credentials",
            "You must notify us immediately of any unauthorised use of your account",
            "DevOS is not liable for any loss resulting from compromised credentials",
            "You may not share, sell, or transfer your account to another party",
          ]} />
          <InfoBox icon={Lock} color="violet">
            Use a strong, unique password and enable multi-factor authentication where available to protect your account.
          </InfoBox>
        </div>
      );

    case "acceptable":
      return (
        <div className="space-y-4">
          <SectionHeading icon={CheckCircle2} title="Acceptable Use" id="acceptable" />
          <Body>
            DevOS is a platform for building, deploying, and sharing software projects. You may use the Service for:
          </Body>
          <BulletList items={[
            "Personal, educational, and commercial software development",
            "Building and deploying web applications, APIs, and static sites",
            "Learning to code and practising programming skills",
            "Collaborating with other users on open-source or private projects",
            "Sharing projects and code snippets with the community",
            "Creating portfolio projects to showcase your skills",
          ]} />
          <InfoBox icon={CheckCircle2} color="green">
            We want DevOS to be a creative, productive space for developers of all skill levels. When in doubt,
            ask yourself: "Does this add value to the community?" If yes, you're probably fine.
          </InfoBox>
        </div>
      );

    case "prohibited":
      return (
        <div className="space-y-4">
          <SectionHeading icon={XCircle} title="Prohibited Use" id="prohibited" />
          <Body>The following activities are strictly prohibited and may result in immediate account termination:</Body>
          <AllowedDenied
            allowed={[
              "Open-source software projects",
              "Educational content and tutorials",
              "Personal portfolio and hobby projects",
              "Commercial SaaS applications",
              "Internal company tools",
            ]}
            denied={[
              "Malware, viruses, or ransomware",
              "Cryptomining or resource abuse",
              "DDoS or network attack tools",
              "Spam or phishing content",
              "Illegal content or CSAM",
            ]}
          />
          <Sub>Full list of prohibited activities</Sub>
          <BulletList items={[
            "Hosting, distributing, or executing malicious code, malware, spyware, or ransomware",
            "Conducting or facilitating DDoS attacks, port scanning, or network intrusion",
            "Mining cryptocurrency or performing computationally abusive tasks",
            "Sending unsolicited spam, phishing messages, or fraudulent content",
            "Storing or distributing child sexual abuse material (CSAM) or content that exploits minors",
            "Infringing the intellectual property rights of third parties",
            "Attempting to gain unauthorised access to DevOS systems or other user accounts",
            "Circumventing rate limits, credit systems, or other technical controls",
            "Impersonating another person, entity, or DevOS staff",
            "Using the Service to violate any applicable local, national, or international law",
          ]} />
          <InfoBox icon={AlertTriangle} color="red">
            Violations will result in immediate suspension without notice. Serious violations may be reported to
            relevant law enforcement authorities.
          </InfoBox>
        </div>
      );

    case "ip":
      return (
        <div className="space-y-4">
          <SectionHeading icon={Lock} title="Intellectual Property" id="ip" />
          <Sub>Your Content</Sub>
          <Body>
            You retain full ownership of all source code, files, and content you create and upload to DevOS
            ("User Content"). By using the Service you grant DevOS a limited, non-exclusive, royalty-free licence to
            host, store, copy, and display your User Content solely as necessary to operate the Service.
          </Body>
          <Sub>Public Projects</Sub>
          <Body>
            When you mark a project as Public you grant other users a non-exclusive licence to view and fork your
            project in accordance with any open-source licence you have applied. You remain the copyright holder.
          </Body>
          <Sub>DevOS Property</Sub>
          <Body>
            All rights in the DevOS platform — including the codebase, design, logos, branding, and documentation —
            are owned by DevOS or its licensors. You may not copy, reproduce, modify, or create derivative works of
            our platform without written permission.
          </Body>
          <Sub>Copyright Infringement (DMCA)</Sub>
          <Body>
            If you believe content on DevOS infringes your copyright, please send a DMCA takedown notice to{" "}
            <a href="mailto:dmca@devos.zone.id" className="text-violet-400 hover:text-violet-300 transition-colors">
              dmca@devos.zone.id
            </a>
            . See our{" "}
            <Link to="/copyright" className="text-violet-400 hover:text-violet-300 transition-colors">
              Copyright Policy
            </Link>{" "}
            for the required notice format.
          </Body>
        </div>
      );

    case "credits":
      return (
        <div className="space-y-4">
          <SectionHeading icon={Zap} title="Credits & Billing" id="credits" />
          <Sub>Free Credits</Sub>
          <Body>
            DevOS operates on a credit-based system. Every account receives a free daily credit allowance that resets
            at midnight UTC and a monthly credit pool that resets on the first of each calendar month.
          </Body>
          <Sub>Credit Usage</Sub>
          <BulletList items={[
            "Credits are consumed by code executions, deployments, and certain AI features",
            "Daily credits are used first; monthly credits are used after daily credits are exhausted",
            "Unused credits do not carry over between daily reset cycles",
          ]} />
          <Sub>Promo Codes</Sub>
          <Body>
            DevOS may distribute promotional codes that grant bonus credits. Codes are single-use,
            non-transferable, and may have an expiry date. DevOS reserves the right to modify or revoke
            promotional credits at any time.
          </Body>
          <Sub>No Monetary Value</Sub>
          <Body>
            Credits have no monetary value, cannot be redeemed for cash, and are non-transferable between accounts.
          </Body>
          <InfoBox icon={Zap} color="violet">
            Currently DevOS is entirely free to use. Future paid plans, if introduced, will be announced with at
            least 30 days notice to existing users.
          </InfoBox>
        </div>
      );

    case "service":
      return (
        <div className="space-y-4">
          <SectionHeading icon={Globe} title="Service Availability" id="service" />
          <Body>
            DevOS strives to maintain high availability but the Service is provided "as is" and "as available"
            without warranties of any kind, express or implied.
          </Body>
          <BulletList items={[
            "We do not guarantee uninterrupted, error-free, or secure access to the Service",
            "Scheduled maintenance will be announced via the Status page at devos.zone.id/status",
            "We reserve the right to modify, suspend, or discontinue any part of the Service at any time",
            "We are not liable for any loss of data resulting from service interruptions",
          ]} />
          <InfoBox icon={Globe} color="yellow">
            Always maintain local backups of important code. While we take reliability seriously, no cloud service
            is immune to outages.
          </InfoBox>
        </div>
      );

    case "liability":
      return (
        <div className="space-y-4">
          <SectionHeading icon={Scale} title="Limitation of Liability" id="liability" />
          <Sub>Disclaimer of Warranties</Sub>
          <Body>
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, DEVOS PROVIDES THE SERVICE ON AN "AS IS" AND
            "AS AVAILABLE" BASIS WITHOUT ANY WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT
            LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
          </Body>
          <Sub>Limitation of Damages</Sub>
          <Body>
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL DEVOS BE LIABLE FOR ANY INDIRECT,
            INCIDENTAL, SPECIAL, EXEMPLARY, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA,
            GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM YOUR USE OF OR INABILITY TO USE THE SERVICE.
          </Body>
          <Sub>Indemnification</Sub>
          <Body>
            You agree to defend, indemnify, and hold harmless DevOS and its officers, directors, and employees from
            any claims, damages, or expenses (including legal fees) arising from your use of the Service or violation
            of these Terms.
          </Body>
        </div>
      );

    case "termination":
      return (
        <div className="space-y-4">
          <SectionHeading icon={UserX} title="Termination" id="termination" />
          <Sub>By You</Sub>
          <Body>
            You may stop using the Service at any time. To permanently delete your account and all associated data,
            contact{" "}
            <a href="mailto:privacy@devos.zone.id" className="text-violet-400 hover:text-violet-300 transition-colors">
              privacy@devos.zone.id
            </a>.
          </Body>
          <Sub>By DevOS</Sub>
          <Body>
            DevOS reserves the right to suspend or terminate your account at any time, with or without notice, for:
          </Body>
          <BulletList items={[
            "Violation of these Terms or our Acceptable Use Policy",
            "Conduct that we believe harms other users, third parties, or DevOS",
            "Requests from law enforcement or regulatory authorities",
            "Extended periods of inactivity (we will provide notice before inactive account deletion)",
          ]} />
          <Sub>Effect of Termination</Sub>
          <Body>
            Upon termination your right to use the Service ceases immediately. We may retain certain data as required
            by law or for legitimate business purposes. Sections of these Terms that by their nature should survive
            termination shall survive.
          </Body>
        </div>
      );

    case "governing-law":
      return (
        <div className="space-y-4">
          <SectionHeading icon={Gavel} title="Governing Law" id="governing-law" />
          <Body>
            These Terms are governed by and construed in accordance with applicable law. Any disputes arising out of
            or relating to these Terms or the Service shall be resolved through binding arbitration or, where
            arbitration is not permitted, through the courts of competent jurisdiction.
          </Body>
          <Sub>Dispute Resolution</Sub>
          <BulletList items={[
            "You agree to first attempt to resolve any dispute informally by contacting info@devos.zone.id",
            "If not resolved within 30 days, disputes may proceed to arbitration",
            "Class action lawsuits and class-wide arbitration are waived to the extent permitted by law",
          ]} />
          <InfoBox icon={Gavel} color="violet">
            Nothing in this section limits your rights under applicable consumer protection laws in your jurisdiction.
          </InfoBox>
        </div>
      );

    case "changes":
      return (
        <div className="space-y-4">
          <SectionHeading icon={RefreshCw} title="Changes to Terms" id="changes" />
          <Body>
            DevOS reserves the right to modify these Terms at any time. When we make material changes we will:
          </Body>
          <BulletList items={[
            "Update the \"Last Updated\" date at the top of this page",
            "Display a prominent in-app notice for at least 14 days",
            "Send an email notification to all registered users for significant changes",
          ]} />
          <Body>
            Your continued use of the Service after changes take effect constitutes acceptance of the revised Terms.
            If you do not agree to the updated Terms, you must stop using the Service.
          </Body>
        </div>
      );

    case "contact":
      return (
        <div className="space-y-4">
          <SectionHeading icon={Mail} title="Contact" id="contact" />
          <Body>Questions about these Terms? Contact us:</Body>
          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            <a href="mailto:legal@devos.zone.id"
              className="glass border border-white/[0.07] rounded-2xl p-5 hover:border-violet-500/30 card-glow block transition-all">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-xl bg-violet-600/15 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-violet-400" />
                </div>
                <span className="text-sm font-bold text-white">Legal Enquiries</span>
              </div>
              <p className="text-xs text-violet-400 font-mono">legal@devos.zone.id</p>
            </a>
            <a href="mailto:info@devos.zone.id"
              className="glass border border-white/[0.07] rounded-2xl p-5 hover:border-border-base card-glow block transition-all">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-xl bg-white/8 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-white/50" />
                </div>
                <span className="text-sm font-bold text-white">General</span>
              </div>
              <p className="text-xs text-white/50 font-mono">info@devos.zone.id</p>
            </a>
          </div>
          <div className="mt-4 glass border border-white/[0.06] rounded-2xl p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-white/25 mb-2">Registered entity</p>
            <p className="text-sm text-white/50 leading-relaxed">
              DevOS · Kontyra and Tech Visionary Network
            </p>
          </div>
        </div>
      );

    default: return null;
  }
}

/* ── Main page ────────────────────────────────────────────────────────────── */
export default function TermsPage() {
  useSEO({
    title: "Terms of Service — DevOS",
    description: "DevOS Terms of Service: the rules and guidelines governing your use of the DevOS cloud development platform.",
  });

  const [activeId, setActiveId] = useState("agreement");

  useEffect(() => {
    const handleScroll = () => {
      for (const s of [...SECTIONS].reverse()) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= 140) { setActiveId(s.id); return; }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    setActiveId(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-base text-white flex flex-col overflow-x-hidden">
      <Navbar />

      {/* Hero */}
      <div className="relative border-b border-white/[0.06] overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-violet-600/8 rounded-full blur-[80px]" />
        </div>
        <div className="relative max-w-7xl mx-auto px-5 md:px-6 py-12 md:py-16">
          <Link to="/" className="inline-flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-8 group text-sm">
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Back to Home
          </Link>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-600/10 border border-violet-500/20 text-violet-400 text-xs font-bold uppercase tracking-widest mb-4">
              <FileText className="w-3 h-3" /> Legal
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white mb-3">Terms of Service</h1>
            <p className="text-white/40 max-w-xl text-base leading-relaxed">
              These are the rules that keep DevOS safe, fair, and valuable for everyone. Please read them carefully.
            </p>
            <p className="text-xs text-white/25 mt-4 font-mono">
              Last updated: {LAST_UPDATED} · Effective: {EFFECTIVE_DATE}
            </p>
          </motion.div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-5 md:px-6 py-10 md:py-14 flex gap-10">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex flex-col gap-0.5 w-56 flex-shrink-0 self-start sticky top-20">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-3 px-3">Contents</p>
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => scrollTo(id)}
              className={cn("flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all text-left w-full",
                id === activeId ? "bg-violet-600/15 text-violet-300 border border-violet-500/20" : "text-white/35 hover:text-white/80 hover:bg-white/[0.05]")}>
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          ))}
          <div className="mt-6 px-3">
            <Link to="/privacy" className="flex items-center gap-2 text-xs text-white/30 hover:text-white/60 transition-colors">
              <ChevronRight className="w-3 h-3" /> Privacy Policy →
            </Link>
          </div>
        </aside>

        <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile chips */}
        <div className="lg:hidden w-full flex gap-2 overflow-x-auto no-scrollbar pb-4 -mx-5 px-5 mb-2 flex-shrink-0">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => scrollTo(id)}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex-shrink-0 border",
                id === activeId ? "bg-violet-600/20 border-violet-500/40 text-violet-300" : "bg-white/5 border-border-base text-white/50 hover:text-white")}>
              <Icon className="w-3 h-3" />{label}
            </button>
          ))}
        </div>

        {/* Content */}
        <main className="flex-1 min-w-0 space-y-14">
          {SECTIONS.map(({ id }, i) => (
            <motion.div key={id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45, delay: i * 0.03 }}
              className="glass border border-white/[0.06] rounded-3xl p-7 md:p-9">
              <SectionContent id={id} />
            </motion.div>
          ))}
          <div className="text-center py-6 border-t border-white/[0.05]">
            <p className="text-xs text-white/20">© {new Date().getFullYear()} DevOS · Kontyra and Tech Visionary Network</p>
            <p className="text-xs text-white/15 mt-1">Last Updated: {LAST_UPDATED}</p>
            <div className="flex items-center justify-center gap-4 mt-4">
              <Link to="/privacy" className="text-xs text-white/30 hover:text-white/60 transition-colors">Privacy Policy</Link>
              <span className="text-white/10">·</span>
              <Link to="/cookies" className="text-xs text-white/30 hover:text-white/60 transition-colors">Cookie Policy</Link>
              <span className="text-white/10">·</span>
              <Link to="/acceptable-use" className="text-xs text-white/30 hover:text-white/60 transition-colors">Acceptable Use</Link>
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
