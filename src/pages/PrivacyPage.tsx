import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Lock,
  Eye,
  Database,
  Share2,
  Cookie,
  Mail,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Trash2,
  Globe,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import MobileBottomNav from "../components/MobileBottomNav";
import { useSEO } from "../hooks/useSEO";
import { cn } from "../lib/utils";

/* ── Section definitions ──────────────────────────────────────────────────── */
const SECTIONS = [
  { id: "overview",        label: "Overview",               icon: Shield },
  { id: "data-collected",  label: "Data We Collect",        icon: Database },
  { id: "how-we-use",      label: "How We Use Data",        icon: Eye },
  { id: "data-sharing",    label: "Data Sharing",           icon: Share2 },
  { id: "data-storage",    label: "Storage & Security",     icon: Lock },
  { id: "cookies",         label: "Cookies",                icon: Cookie },
  { id: "your-rights",     label: "Your Rights",            icon: UserCheck },
  { id: "children",        label: "Children's Privacy",     icon: AlertTriangle },
  { id: "third-parties",   label: "Third-Party Services",   icon: Globe },
  { id: "changes",         label: "Policy Changes",         icon: RefreshCw },
  { id: "data-deletion",   label: "Data Deletion",          icon: Trash2 },
  { id: "contact",         label: "Contact Us",             icon: Mail },
];

const LAST_UPDATED = "April 4, 2026";
const EFFECTIVE_DATE = "April 4, 2026";

/* ── Helper components ────────────────────────────────────────────────────── */
function SectionHeading({
  icon: Icon,
  title,
  id,
}: {
  icon: React.ElementType;
  title: string;
  id: string;
}) {
  return (
    <div className="flex items-center gap-4 mb-6" id={id}>
      <div className="w-11 h-11 rounded-2xl bg-blue-600/15 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-blue-400" />
      </div>
      <h2 className="text-2xl font-bold text-white tracking-tight">{title}</h2>
    </div>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
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
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500/60 flex-shrink-0" />
          <span className="leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function InfoBox({
  icon: Icon = Shield,
  color = "blue",
  children,
}: {
  icon?: React.ElementType;
  color?: "blue" | "yellow" | "green";
  children: React.ReactNode;
}) {
  const styles = {
    blue:   "bg-blue-500/8 border-blue-500/20 text-blue-300",
    yellow: "bg-yellow-500/8 border-yellow-500/20 text-yellow-300",
    green:  "bg-green-500/8 border-green-500/20 text-green-300",
  }[color];
  const iconColor = {
    blue: "text-blue-400", yellow: "text-yellow-400", green: "text-green-400",
  }[color];

  return (
    <div className={cn("flex gap-3 px-5 py-4 rounded-2xl border mt-4", styles)}>
      <Icon className={cn("w-4 h-4 mt-0.5 flex-shrink-0", iconColor)} />
      <p className="text-sm leading-relaxed">{children}</p>
    </div>
  );
}

function DataCard({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc: string }) {
  return (
    <div className="glass border border-white/[0.07] rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-xl bg-blue-600/15 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-blue-400" />
        </div>
        <span className="text-sm font-bold text-white">{title}</span>
      </div>
      <p className="text-xs text-white/45 leading-relaxed">{desc}</p>
    </div>
  );
}

/* ── Section content ──────────────────────────────────────────────────────── */
function SectionContent({ id }: { id: string }) {
  switch (id) {
    case "overview":
      return (
        <div className="space-y-4">
          <SectionHeading icon={Shield} title="Privacy Policy" id="overview" />
          <Body>
            DevOS ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy
            explains how we collect, use, disclose, and safeguard your information when you use our
            cloud-based code execution and development platform at{" "}
            <span className="text-blue-400 font-mono text-xs">devos.zone.id</span> and any related
            services (collectively, the "Service").
          </Body>
          <Body>
            By accessing or using DevOS you acknowledge that you have read, understood, and agree to
            be bound by this Privacy Policy. If you do not agree, please discontinue use of the
            Service immediately.
          </Body>

          <div className="grid sm:grid-cols-2 gap-4 mt-6">
            <div className="glass border border-green-500/20 rounded-2xl p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-green-400/70 mb-1">
                Effective Date
              </p>
              <p className="text-white font-bold">{EFFECTIVE_DATE}</p>
            </div>
            <div className="glass border border-blue-500/20 rounded-2xl p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-blue-400/70 mb-1">
                Last Updated
              </p>
              <p className="text-white font-bold">{LAST_UPDATED}</p>
            </div>
          </div>

          <InfoBox icon={Shield} color="blue">
            We do <strong>not</strong> sell your personal data to third parties, ever. We only collect
            information that is strictly necessary to operate and improve the DevOS platform.
          </InfoBox>
        </div>
      );

    case "data-collected":
      return (
        <div className="space-y-4">
          <SectionHeading icon={Database} title="Data We Collect" id="data-collected" />
          <Body>
            We collect several types of information in connection with the Service, depending on how
            you use DevOS.
          </Body>

          <SubHeading>Account Information</SubHeading>
          <Body>
            When you register for an account (directly or via a third-party OAuth provider such as
            Google), we collect:
          </Body>
          <BulletList items={[
            "Email address",
            "Display name and username",
            "Profile photo URL (from your OAuth provider, if applicable)",
            "Account creation date and last sign-in timestamp",
          ]} />

          <SubHeading>User-Uploaded Media</SubHeading>
          <Body>
            When you upload images through DevOS (profile avatars, community avatars, community banners, event banners, or other media), those files are stored on Supabase Storage. The public URL of uploaded media may be visible to other users as part of your profile or community.
          </Body>

          <SubHeading>Credit Transactions</SubHeading>
          <Body>
            We store a record of all credit earn and spend events (transaction history) associated with your account in order to provide the credits feature and to resolve disputes. This data is not shared with third parties.
          </Body>

          <SubHeading>Voice Call Data</SubHeading>
          <Body>
            When you participate in a voice call within a community or organization, temporary session data (such as call presence) is processed to facilitate the call. Voice calls are not recorded or stored by DevOS.
          </Body>

          <div className="grid sm:grid-cols-2 gap-4 mt-6">
            <DataCard
              icon={Database}
              title="Project Data"
              desc="Source code files, folder structures, commit messages, and version history created inside the IDE."
            />
            <DataCard
              icon={Lock}
              title="Integration Tokens"
              desc="Optional GitHub or Vercel tokens you provide to enable deployment integrations. Stored encrypted."
            />
            <DataCard
              icon={Eye}
              title="Usage Analytics"
              desc="Pages visited, features used, session duration, and interaction events — anonymised and aggregated."
            />
            <DataCard
              icon={Globe}
              title="Technical Data"
              desc="Browser type, operating system, IP address (hashed), and device type for security and debugging."
            />
          </div>

          <SubHeading>Automatically Collected Data</SubHeading>
          <Body>
            When you use the Service our servers automatically log certain information including your
            browser user-agent, referring URL, pages accessed, timestamps, and crash/error reports.
            This data is used solely for security, performance monitoring, and bug fixes.
          </Body>

          <InfoBox icon={Eye} color="blue">
            We never read the contents of your private project code for advertising, training AI
            models, or any purpose other than rendering it inside your own session.
          </InfoBox>
        </div>
      );

    case "how-we-use":
      return (
        <div className="space-y-4">
          <SectionHeading icon={Eye} title="How We Use Your Data" id="how-we-use" />
          <Body>
            We use the information we collect for the following purposes:
          </Body>

          <SubHeading>Providing the Service</SubHeading>
          <BulletList items={[
            "Creating and managing your account",
            "Storing and serving your project files and deployments",
            "Syncing your code across devices in real time",
            "Processing authentication and authorisation for each request",
          ]} />

          <SubHeading>Improving DevOS</SubHeading>
          <BulletList items={[
            "Analysing aggregated, anonymised usage patterns to guide product decisions",
            "Diagnosing bugs and performance issues through error reports",
            "A/B testing new features with opt-in user cohorts",
          ]} />

          <SubHeading>Communications</SubHeading>
          <BulletList items={[
            "Sending transactional emails (e.g., password reset, email verification)",
            "Notifying you about important changes to the Service or this policy",
            "Sending optional product updates if you have opted in",
          ]} />

          <SubHeading>Security & Compliance</SubHeading>
          <BulletList items={[
            "Detecting and preventing fraudulent or abusive activity",
            "Enforcing our Terms of Service",
            "Complying with applicable laws and regulations",
          ]} />

          <InfoBox icon={UserCheck} color="green">
            We will never use your data to train machine-learning models, sell advertising inventory,
            or profile you for commercial purposes.
          </InfoBox>
        </div>
      );

    case "data-sharing":
      return (
        <div className="space-y-4">
          <SectionHeading icon={Share2} title="Data Sharing" id="data-sharing" />
          <Body>
            We do not sell, trade, or rent your personal information. We may share data in the
            limited circumstances described below.
          </Body>

          <SubHeading>Service Providers</SubHeading>
          <Body>
            We engage trusted third-party service providers to assist in operating the platform
            (e.g., cloud hosting, email delivery, error tracking). These providers are contractually
            obligated to process data only as directed by us and to maintain appropriate security.
          </Body>

          <SubHeading>Public Projects</SubHeading>
          <Body>
            If you mark a project as <strong className="text-white">Public</strong>, the project
            name, description, code files, and your username become accessible to anyone. You control
            this setting at all times from Project Settings.
          </Body>

          <SubHeading>Legal Requirements</SubHeading>
          <Body>
            We may disclose information if required to do so by law or in good-faith belief that such
            action is necessary to comply with a legal obligation, protect the rights or safety of
            DevOS or its users, or investigate potential violations.
          </Body>

          <SubHeading>Business Transfers</SubHeading>
          <Body>
            In the event of a merger, acquisition, or asset sale, your personal data may be
            transferred. We will provide notice before your data is subject to a different privacy
            policy.
          </Body>

          <InfoBox icon={Shield} color="blue">
            We never share your private project code with third parties without your explicit
            consent, except as legally required.
          </InfoBox>
        </div>
      );

    case "data-storage":
      return (
        <div className="space-y-4">
          <SectionHeading icon={Lock} title="Storage & Security" id="data-storage" />
          <Body>
            DevOS is built on Google Firebase (Firestore, Firebase Auth, Firebase Storage). Your data
            is stored in secure, redundant cloud infrastructure.
          </Body>

          <SubHeading>Encryption</SubHeading>
          <BulletList items={[
            "All data is encrypted in transit using TLS 1.2+",
            "Data at rest is encrypted using AES-256 by Google Cloud's infrastructure",
            "Integration tokens (GitHub, Vercel) are stored using field-level encryption",
          ]} />

          <SubHeading>Access Controls</SubHeading>
          <BulletList items={[
            "Firestore security rules enforce strict per-user and per-project access",
            "DevOS engineers do not have routine access to user project data",
            "Production environment access requires multi-factor authentication",
          ]} />

          <SubHeading>Data Retention</SubHeading>
          <Body>
            We retain your account data for as long as your account is active. Project data is
            retained until you delete the project or your account. Anonymised analytics data may be
            retained indefinitely.
          </Body>

          <InfoBox icon={AlertTriangle} color="yellow">
            No method of transmission or storage is 100% secure. While we implement strong
            safeguards, we cannot guarantee absolute security. Please use a strong, unique password
            for your DevOS account.
          </InfoBox>
        </div>
      );

    case "cookies":
      return (
        <div className="space-y-4">
          <SectionHeading icon={Cookie} title="Cookies & Tracking" id="cookies" />
          <Body>
            DevOS uses a minimal set of cookies and browser storage to operate the Service.
          </Body>

          <SubHeading>Essential Cookies</SubHeading>
          <Body>
            These are required for authentication and session management. Without them the Service
            cannot function. They cannot be disabled.
          </Body>
          <BulletList items={[
            "Firebase Auth session tokens — keeps you signed in",
            "CSRF protection tokens — prevents cross-site request forgery",
          ]} />

          <SubHeading>Preference Storage</SubHeading>
          <Body>
            We use <code className="text-blue-300 text-xs bg-white/8 px-1.5 py-0.5 rounded">localStorage</code>{" "}
            and{" "}
            <code className="text-blue-300 text-xs bg-white/8 px-1.5 py-0.5 rounded">sessionStorage</code>{" "}
            to remember your editor preferences (active panel, open files, theme) per project. This
            data never leaves your device.
          </Body>

          <SubHeading>Analytics</SubHeading>
          <Body>
            We may use privacy-respecting analytics (with IP anonymisation enabled) to understand
            aggregate platform usage. We do not use Google Analytics or any advertising-network
            trackers.
          </Body>

          <InfoBox icon={Cookie} color="green">
            We do not use third-party advertising cookies or cross-site tracking pixels.
          </InfoBox>
        </div>
      );

    case "your-rights":
      return (
        <div className="space-y-4">
          <SectionHeading icon={UserCheck} title="Your Rights" id="your-rights" />
          <Body>
            Depending on your jurisdiction you may have the following rights regarding your personal
            data. We honour all valid requests within 30 days.
          </Body>

          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            {[
              { icon: Eye,      title: "Access",      desc: "Request a copy of all personal data we hold about you." },
              { icon: RefreshCw, title: "Rectification", desc: "Correct inaccurate or incomplete personal data." },
              { icon: Trash2,   title: "Erasure",     desc: "Request deletion of your account and all associated data." },
              { icon: Lock,     title: "Restriction", desc: "Ask us to pause processing of your data in certain circumstances." },
              { icon: Share2,   title: "Portability", desc: "Receive your data in a structured, machine-readable format." },
              { icon: Shield,   title: "Objection",   desc: "Object to processing based on legitimate interests or direct marketing." },
            ].map(({ icon: Icon, title, desc }) => (
              <DataCard key={title} icon={Icon} title={title} desc={desc} />
            ))}
          </div>

          <SubHeading>How to Exercise Your Rights</SubHeading>
          <Body>
            Email us at{" "}
            <a href="mailto:privacy@devos.zone.id" className="text-blue-400 hover:text-blue-300 transition-colors">
              privacy@devos.zone.id
            </a>{" "}
            with the subject line <strong className="text-white">"Privacy Request"</strong> and a
            description of your request. We may ask you to verify your identity before processing.
          </Body>

          <InfoBox icon={UserCheck} color="green">
            You can update your display name, avatar, and email preferences at any time from the
            Settings page without contacting us.
          </InfoBox>
        </div>
      );

    case "children":
      return (
        <div className="space-y-4">
          <SectionHeading icon={AlertTriangle} title="Children's Privacy" id="children" />
          <Body>
            DevOS is not directed to individuals under the age of 13 (or 16 in the European Economic
            Area). We do not knowingly collect personal data from children below these ages.
          </Body>
          <Body>
            If you believe we have inadvertently collected information from a child, please contact us
            immediately at{" "}
            <a href="mailto:privacy@devos.zone.id" className="text-blue-400 hover:text-blue-300 transition-colors">
              privacy@devos.zone.id
            </a>{" "}
            and we will delete the data as promptly as possible.
          </Body>

          <InfoBox icon={AlertTriangle} color="yellow">
            Parents or guardians who become aware that their child has provided personal information
            without consent should contact us immediately.
          </InfoBox>
        </div>
      );

    case "third-parties":
      return (
        <div className="space-y-4">
          <SectionHeading icon={Globe} title="Third-Party Services" id="third-parties" />
          <Body>
            The Service integrates with or links to the following third-party services. Each operates
            under its own privacy policy.
          </Body>

          <div className="space-y-3 mt-4">
            {[
              {
                name: "Google Firebase",
                role: "Authentication, database, file storage, and hosting infrastructure.",
                url: "https://firebase.google.com/support/privacy",
              },
              {
                name: "GitHub",
                role: "Optional OAuth sign-in and repository import. Only requested scopes are used.",
                url: "https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement",
              },
              {
                name: "Vercel",
                role: "Optional deployment target. Tokens are only used when you explicitly trigger a deploy.",
                url: "https://vercel.com/legal/privacy-policy",
              },
            ].map(({ name, role, url }) => (
              <div key={name} className="glass border border-white/[0.07] rounded-2xl p-5">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <span className="text-sm font-bold text-white">{name}</span>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                  >
                    Privacy policy <ChevronRight className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-xs text-white/45 leading-relaxed">{role}</p>
              </div>
            ))}
          </div>

          <Body>
            Third-party links within the Service are not covered by this policy. We encourage you to
            review the privacy notices of any external sites you visit.
          </Body>
        </div>
      );

    case "changes":
      return (
        <div className="space-y-4">
          <SectionHeading icon={RefreshCw} title="Policy Changes" id="changes" />
          <Body>
            We may update this Privacy Policy from time to time to reflect changes in our practices,
            technology, legal requirements, or for other operational reasons.
          </Body>
          <Body>
            When we make material changes we will:
          </Body>
          <BulletList items={[
            "Update the \"Last Updated\" date at the top of this page",
            "Display a prominent notice on the DevOS platform for at least 14 days",
            "Send an email notification to all registered users if the changes materially affect their rights",
          ]} />
          <Body>
            Your continued use of the Service after any changes take effect constitutes your
            acceptance of the revised policy. If you disagree with the changes, you should discontinue
            use of the Service and may request account deletion.
          </Body>

          <InfoBox icon={RefreshCw} color="blue">
            We recommend bookmarking this page and reviewing it periodically for the most
            up-to-date information about our privacy practices.
          </InfoBox>
        </div>
      );

    case "data-deletion":
      return (
        <div className="space-y-4">
          <SectionHeading icon={Trash2} title="Data Deletion" id="data-deletion" />
          <Body>
            You have the right to request deletion of your DevOS account and all associated personal
            data at any time.
          </Body>

          <SubHeading>What gets deleted</SubHeading>
          <BulletList items={[
            "Your account profile (name, email, avatar)",
            "All private projects and their files",
            "User settings and preferences",
            "Notification history",
            "Credit and redemption records",
            "Integration tokens (GitHub, Vercel)",
          ]} />

          <SubHeading>What may be retained</SubHeading>
          <BulletList items={[
            "Public project forks created by other users (content you made public)",
            "Anonymised, aggregated analytics that cannot be re-linked to you",
            "Records required by law (e.g., billing records where applicable)",
          ]} />

          <SubHeading>How to delete your account</SubHeading>
          <Body>
            Email{" "}
            <a href="mailto:privacy@devos.zone.id" className="text-blue-400 hover:text-blue-300 transition-colors">
              privacy@devos.zone.id
            </a>{" "}
            from the address associated with your account with the subject line{" "}
            <strong className="text-white">"Delete My Account"</strong>. We will process the request
            within 30 days and send a confirmation email when complete.
          </Body>

          <InfoBox icon={Trash2} color="yellow">
            Account deletion is permanent and irreversible. Please export any projects or data you
            wish to keep before submitting a deletion request.
          </InfoBox>
        </div>
      );

    case "contact":
      return (
        <div className="space-y-4">
          <SectionHeading icon={Mail} title="Contact Us" id="contact" />
          <Body>
            If you have questions, concerns, or requests relating to this Privacy Policy or our data
            practices, please reach out through any of the following channels.
          </Body>

          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            <a
              href="mailto:privacy@devos.zone.id"
              className="glass border border-white/[0.07] rounded-2xl p-5 hover:border-blue-500/30 transition-all card-glow block"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-xl bg-blue-600/15 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-blue-400" />
                </div>
                <span className="text-sm font-bold text-white">Privacy Requests</span>
              </div>
              <p className="text-xs text-blue-400 font-mono">privacy@devos.zone.id</p>
              <p className="text-xs text-white/40 mt-1">Access, deletion, and rights requests</p>
            </a>

            <a
              href="mailto:info@devos.zone.id"
              className="glass border border-white/[0.07] rounded-2xl p-5 hover:border-blue-500/30 transition-all card-glow block"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-xl bg-white/8 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-white/50" />
                </div>
                <span className="text-sm font-bold text-white">General Enquiries</span>
              </div>
              <p className="text-xs text-white/50 font-mono">info@devos.zone.id</p>
              <p className="text-xs text-white/40 mt-1">All other questions about DevOS</p>
            </a>
          </div>

          <Body>
            We aim to respond to all privacy-related enquiries within <strong className="text-white">5 business days</strong>.
            For requests to exercise your legal rights (access, erasure, etc.) we will respond within
            30 days as required by applicable law.
          </Body>

          <div className="mt-6 glass border border-white/[0.07] rounded-2xl p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-3">Registered entity</p>
            <p className="text-sm text-white/60 leading-relaxed">
              DevOS · Kontyra and Tech Visionary Network<br />
              <a href="mailto:info@devos.zone.id" className="text-blue-400 hover:text-blue-300 transition-colors">
                info@devos.zone.id
              </a>
            </p>
          </div>
        </div>
      );

    default:
      return null;
  }
}

/* ── Main page ────────────────────────────────────────────────────────────── */
export default function PrivacyPage() {
  useSEO({
    title: "Privacy Policy — DevOS",
    description:
      "DevOS Privacy Policy: how we collect, use, and protect your data on the DevOS cloud development platform.",
  });

  const [activeId, setActiveId] = useState("overview");

  /* Sync active section with scroll position */
  useEffect(() => {
    const handleScroll = () => {
      for (const s of [...SECTIONS].reverse()) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= 140) {
          setActiveId(s.id);
          return;
        }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    setActiveId(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-base text-white flex flex-col overflow-x-hidden">
      <Navbar />

      {/* ── Hero banner ──────────────────────────────────────────────── */}
      <div className="relative border-b border-white/[0.06] overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-blue-600/8 rounded-full blur-[80px]" />
        </div>
        <div className="relative max-w-7xl mx-auto px-5 md:px-6 py-12 md:py-16">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-8 group text-sm"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to Home
          </Link>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest mb-4">
              <Shield className="w-3 h-3" />
              Legal
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white mb-3">
              Privacy Policy
            </h1>
            <p className="text-white/40 max-w-xl text-base leading-relaxed">
              We believe privacy is a right, not a privilege. This document explains exactly what
              data we collect, why, and how you stay in control.
            </p>
            <p className="text-xs text-white/25 mt-4 font-mono">
              Last updated: {LAST_UPDATED} · Effective: {EFFECTIVE_DATE}
            </p>
          </motion.div>
        </div>
      </div>

      {/* ── Body: sidebar + content ───────────────────────────────────── */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-5 md:px-6 py-10 md:py-14 flex gap-10">

        {/* Desktop sticky sidebar */}
        <aside className="hidden lg:flex flex-col gap-0.5 w-56 flex-shrink-0 self-start sticky top-20">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-3 px-3">
            Contents
          </p>
          {SECTIONS.map(({ id, label, icon: Icon }) => {
            const isActive = id === activeId;
            return (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all text-left w-full",
                  isActive
                    ? "bg-blue-600/15 text-blue-300 border border-blue-500/20"
                    : "text-white/35 hover:text-white/80 hover:bg-white/[0.05]"
                )}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            );
          })}

          <div className="mt-6 px-3">
            <Link
              to="/terms"
              className="flex items-center gap-2 text-xs text-white/30 hover:text-white/60 transition-colors"
            >
              <ChevronRight className="w-3 h-3" />
              Terms of Service →
            </Link>
          </div>
        </aside>

        <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile horizontal chip nav */}
        <div className="lg:hidden w-full flex gap-2 overflow-x-auto no-scrollbar pb-4 -mx-5 px-5 mb-2 flex-shrink-0">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex-shrink-0 border",
                id === activeId
                  ? "bg-blue-600/20 border-blue-500/40 text-blue-300"
                  : "bg-white/5 border-border-base text-white/50 hover:text-white"
              )}
            >
              <Icon className="w-3 h-3" />
              {label}
            </button>
          ))}
        </div>

        {/* Main content — scrollable list of all sections */}
        <main className="flex-1 min-w-0 space-y-14">
          {SECTIONS.map(({ id }, i) => (
            <motion.div
              key={id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45, delay: i * 0.03 }}
              className="glass border border-white/[0.06] rounded-3xl p-7 md:p-9"
            >
              <SectionContent id={id} />
            </motion.div>
          ))}

          {/* Footer note */}
          <div className="text-center py-6 border-t border-white/[0.05]">
            <p className="text-xs text-white/20">
              © {new Date().getFullYear()} DevOS · Kontyra and Tech Visionary Network
            </p>
            <p className="text-xs text-white/15 mt-1">
              Last Updated: {LAST_UPDATED}
            </p>
            <div className="flex items-center justify-center gap-4 mt-4">
              <Link to="/terms" className="text-xs text-white/30 hover:text-white/60 transition-colors">
                Terms of Service
              </Link>
              <span className="text-white/10">·</span>
              <a href="mailto:privacy@devos.zone.id" className="text-xs text-white/30 hover:text-white/60 transition-colors">
                privacy@devos.zone.id
              </a>
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
