import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Copyright, FileSearch, SendHorizonal, RotateCcw, ShieldOff,
  RefreshCw, Mail, ChevronLeft, AlertTriangle, Scale,
} from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import MobileBottomNav from "../components/MobileBottomNav";
import { useSEO } from "../hooks/useSEO";
import { cn } from "../lib/utils";

const LAST_UPDATED = "April 4, 2026";

const SECTIONS = [
  { id: "overview",         label: "Overview",           icon: Copyright },
  { id: "dmca-overview",    label: "DMCA Overview",      icon: Scale },
  { id: "takedown",         label: "Filing a Takedown",  icon: SendHorizonal },
  { id: "counter-notice",   label: "Counter-Notice",     icon: RotateCcw },
  { id: "repeat-infringers",label: "Repeat Infringers",  icon: ShieldOff },
  { id: "false-claims",     label: "False Claims",       icon: AlertTriangle },
  { id: "devos-ip",         label: "DevOS IP",           icon: FileSearch },
  { id: "changes",          label: "Policy Changes",     icon: RefreshCw },
  { id: "contact",          label: "Contact",            icon: Mail },
];

function SectionHeading({ icon: Icon, title, id }: { icon: React.ElementType; title: string; id: string }) {
  return (
    <div className="flex items-center gap-4 mb-6" id={id}>
      <div className="w-11 h-11 rounded-2xl bg-rose-600/15 border border-rose-500/20 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-rose-400" />
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
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-rose-500/60 flex-shrink-0" />
          <span className="leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function InfoBox({ icon: Icon = AlertTriangle, color = "rose", children }: {
  icon?: React.ElementType; color?: "rose" | "yellow" | "blue"; children: React.ReactNode;
}) {
  const s = { rose: "bg-rose-500/8 border-rose-500/20 text-rose-300", yellow: "bg-yellow-500/8 border-yellow-500/20 text-yellow-300", blue: "bg-blue-500/8 border-blue-500/20 text-blue-300" }[color];
  const ic = { rose: "text-rose-400", yellow: "text-yellow-400", blue: "text-blue-400" }[color];
  return (
    <div className={cn("flex gap-3 px-5 py-4 rounded-2xl border mt-4", s)}>
      <Icon className={cn("w-4 h-4 mt-0.5 flex-shrink-0", ic)} />
      <p className="text-sm leading-relaxed">{children}</p>
    </div>
  );
}

function NumberedStep({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="w-8 h-8 rounded-full bg-rose-600/20 text-rose-400 flex items-center justify-center text-sm font-black flex-shrink-0 mt-0.5">
        {number}
      </div>
      <div>
        <p className="font-bold text-white mb-1 text-sm">{title}</p>
        <p className="text-white/50 text-sm leading-relaxed">{children}</p>
      </div>
    </div>
  );
}

function SectionContent({ id }: { id: string }) {
  switch (id) {
    case "overview":
      return (
        <div className="space-y-4">
          <SectionHeading icon={Copyright} title="Copyright & DMCA Policy" id="overview" />
          <Body>
            DevOS respects intellectual property rights and expects all users to do the same. This policy
            explains how we handle copyright infringement claims under the Digital Millennium Copyright Act
            ("DMCA") and equivalent international copyright laws.
          </Body>
          <Body>
            DevOS operates as an online service provider and qualifies for safe harbour protection under
            17 U.S.C. § 512 when we promptly respond to valid takedown notices.
          </Body>
          <InfoBox icon={Copyright} color="rose">
            If you believe your copyrighted work has been copied or published on DevOS without authorisation,
            please follow the takedown procedure below.
          </InfoBox>
        </div>
      );

    case "dmca-overview":
      return (
        <div className="space-y-4">
          <SectionHeading icon={Scale} title="DMCA Overview" id="dmca-overview" />
          <Body>
            The DMCA provides a process for copyright owners to request removal of infringing content from
            online platforms. To be effective, a takedown notice must meet specific legal requirements
            (17 U.S.C. § 512(c)(3)).
          </Body>
          <Sub>Key protections</Sub>
          <BulletList items={[
            "Copyright owners can request removal of infringing content via a formal notice",
            "Alleged infringers can contest removals via a counter-notice",
            "DevOS is not liable for user-uploaded content when we comply with the DMCA process",
            "Users who submit false claims may be liable for damages under 17 U.S.C. § 512(f)",
          ]} />
          <InfoBox icon={AlertTriangle} color="yellow">
            This process applies to copyright infringement only. For other legal concerns (defamation,
            trademark, privacy violations) contact us at{" "}
            <a href="mailto:legal@devos.zone.id" className="text-yellow-300 underline">legal@devos.zone.id</a>.
          </InfoBox>
        </div>
      );

    case "takedown":
      return (
        <div className="space-y-4">
          <SectionHeading icon={SendHorizonal} title="Filing a Takedown Notice" id="takedown" />
          <Body>
            To submit a valid DMCA takedown notice, email{" "}
            <a href="mailto:dmca@devos.zone.id" className="text-rose-400 hover:text-rose-300 transition-colors">dmca@devos.zone.id</a>{" "}
            with all of the following information:
          </Body>
          <div className="space-y-4 mt-4">
            <NumberedStep number={1} title="Identify the copyrighted work">
              Describe the copyrighted work you claim has been infringed, or provide a representative list
              if multiple works are involved.
            </NumberedStep>
            <NumberedStep number={2} title="Identify the infringing material">
              Provide the specific URL(s) of the content on DevOS that you claim is infringing. "All content
              on the site" is not sufficient — specific URLs are required.
            </NumberedStep>
            <NumberedStep number={3} title="Provide your contact information">
              Include your full legal name, mailing address, phone number, and email address.
            </NumberedStep>
            <NumberedStep number={4} title="Include a good-faith statement">
              State: "I have a good-faith belief that the use of the material in the manner complained of
              is not authorised by the copyright owner, its agent, or the law."
            </NumberedStep>
            <NumberedStep number={5} title="Include an accuracy statement">
              State: "I swear, under penalty of perjury, that the information in this notification is
              accurate and that I am the copyright owner or am authorised to act on behalf of the owner."
            </NumberedStep>
            <NumberedStep number={6} title="Sign the notice">
              Provide a physical or electronic signature of the copyright owner or authorised agent.
            </NumberedStep>
          </div>
          <InfoBox icon={Copyright} color="blue">
            We aim to process valid takedown notices within <strong>2 business days</strong>. We will
            notify the user who posted the content that it has been removed.
          </InfoBox>
        </div>
      );

    case "counter-notice":
      return (
        <div className="space-y-4">
          <SectionHeading icon={RotateCcw} title="Counter-Notice" id="counter-notice" />
          <Body>
            If you believe your content was removed by mistake or misidentification, you may submit a
            counter-notice to{" "}
            <a href="mailto:dmca@devos.zone.id" className="text-rose-400 hover:text-rose-300 transition-colors">dmca@devos.zone.id</a>
            {" "}containing:
          </Body>
          <div className="space-y-4 mt-4">
            <NumberedStep number={1} title="Identify the removed content">
              Identify the specific material that was removed and the URL where it appeared before removal.
            </NumberedStep>
            <NumberedStep number={2} title="State your belief">
              State under penalty of perjury that you have a good-faith belief the material was removed
              as a result of mistake or misidentification.
            </NumberedStep>
            <NumberedStep number={3} title="Provide contact information">
              Provide your name, address, phone number, and email, and consent to jurisdiction in your
              federal judicial district (or, if outside the US, any judicial district where DevOS may be found).
            </NumberedStep>
            <NumberedStep number={4} title="Sign">
              Include your physical or electronic signature.
            </NumberedStep>
          </div>
          <Body>
            Upon receipt of a valid counter-notice, we will forward it to the original complainant and
            restore the content within 10–14 business days unless the complainant files a court action.
          </Body>
        </div>
      );

    case "repeat-infringers":
      return (
        <div className="space-y-4">
          <SectionHeading icon={ShieldOff} title="Repeat Infringer Policy" id="repeat-infringers" />
          <Body>
            DevOS has a policy of terminating accounts of users who are found to be repeat infringers
            of copyright in appropriate circumstances, consistent with the safe harbour provisions of the DMCA.
          </Body>
          <BulletList items={[
            "A first valid takedown may result in a warning and content removal",
            "A second valid takedown within 12 months may result in a temporary suspension",
            "A third valid takedown, or any egregious single infringement, may result in permanent account termination",
            "Counter-notices that are later rejected by a court do not reset this count",
          ]} />
        </div>
      );

    case "false-claims":
      return (
        <div className="space-y-4">
          <SectionHeading icon={AlertTriangle} title="False Claims" id="false-claims" />
          <Body>
            Submitting a DMCA takedown notice with knowledge that the claim is false or materially
            misrepresented is a violation of 17 U.S.C. § 512(f) and may expose you to significant
            financial liability.
          </Body>
          <Body>
            DevOS reserves the right to seek damages from parties who abuse the DMCA process to remove
            content that does not infringe any copyright. We take misuse of this process seriously.
          </Body>
          <InfoBox icon={AlertTriangle} color="yellow">
            Before submitting a notice, ensure you are the copyright owner or an authorised agent and
            that the content genuinely infringes your copyright. When in doubt, consult a lawyer.
          </InfoBox>
        </div>
      );

    case "devos-ip":
      return (
        <div className="space-y-4">
          <SectionHeading icon={FileSearch} title="DevOS Intellectual Property" id="devos-ip" />
          <Body>
            All elements of the DevOS platform — including source code, design, logos, trademarks, and
            documentation — are the intellectual property of DevOS / Cool Shot Systems · Tech Visionaries
            Network, protected by copyright and other applicable laws.
          </Body>
          <Sub>What you may do</Sub>
          <BulletList items={[
            "Reference DevOS in blog posts, tutorials, or portfolios to describe your work",
            "Use DevOS screenshots in educational content with appropriate attribution",
            "Link to DevOS from external websites",
          ]} />
          <Sub>What you may not do</Sub>
          <BulletList items={[
            "Copy or redistribute the DevOS platform or its source code without written permission",
            "Use the DevOS name or logo to imply endorsement of your product or service",
            "Create derivative works of the DevOS brand or visual design",
          ]} />
          <Body>
            For licensing enquiries, contact{" "}
            <a href="mailto:legal@devos.zone.id" className="text-rose-400 hover:text-rose-300 transition-colors">legal@devos.zone.id</a>.
          </Body>
        </div>
      );

    case "changes":
      return (
        <div className="space-y-4">
          <SectionHeading icon={RefreshCw} title="Policy Changes" id="changes" />
          <Body>
            We may update this Copyright & DMCA Policy as the platform or law evolves. Material changes
            will be announced via in-app notice and the "Last Updated" date will be revised.
          </Body>
        </div>
      );

    case "contact":
      return (
        <div className="space-y-4">
          <SectionHeading icon={Mail} title="Contact" id="contact" />
          <Body>All copyright and DMCA-related correspondence should be directed to:</Body>
          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            <a href="mailto:dmca@devos.zone.id"
              className="glass border border-white/[0.07] hover:border-rose-500/30 rounded-2xl p-5 card-glow block transition-all">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-9 h-9 rounded-xl bg-rose-600/15 flex items-center justify-center">
                  <Copyright className="w-4 h-4 text-rose-400" />
                </div>
                <span className="text-sm font-bold text-white">DMCA Notices</span>
              </div>
              <p className="text-xs text-rose-400 font-mono">dmca@devos.zone.id</p>
              <p className="text-xs text-white/35 mt-1">Takedown & counter-notice submissions</p>
            </a>
            <a href="mailto:legal@devos.zone.id"
              className="glass border border-white/[0.07] hover:border-white/15 rounded-2xl p-5 block transition-all">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-9 h-9 rounded-xl bg-white/8 flex items-center justify-center">
                  <Scale className="w-4 h-4 text-white/50" />
                </div>
                <span className="text-sm font-bold text-white">Other Legal</span>
              </div>
              <p className="text-xs text-white/50 font-mono">legal@devos.zone.id</p>
              <p className="text-xs text-white/35 mt-1">Trademark, licensing, other IP matters</p>
            </a>
          </div>
        </div>
      );

    default: return null;
  }
}

export default function CopyrightPage() {
  useSEO({
    title: "Copyright & DMCA Policy — DevOS",
    description: "DevOS Copyright & DMCA Policy: how to file a takedown notice, counter-notice, and our IP guidelines.",
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
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-rose-600/6 rounded-full blur-[80px]" />
        </div>
        <div className="relative max-w-7xl mx-auto px-5 md:px-6 py-12 md:py-16">
          <Link to="/" className="inline-flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-8 group text-sm">
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Back to Home
          </Link>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-600/10 border border-rose-500/20 text-rose-400 text-xs font-bold uppercase tracking-widest mb-4">
              <Copyright className="w-3 h-3" /> Legal
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white mb-3">Copyright & DMCA</h1>
            <p className="text-white/40 max-w-xl text-base leading-relaxed">
              How to report copyright infringement, file a counter-notice, and understand your rights.
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
                id === activeId ? "bg-rose-600/15 text-rose-300 border border-rose-500/20" : "text-white/35 hover:text-white/80 hover:bg-white/[0.05]")}>
              <Icon className="w-3.5 h-3.5 flex-shrink-0" /><span className="truncate">{label}</span>
            </button>
          ))}
        </aside>

        <div className="lg:hidden w-full flex gap-2 overflow-x-auto no-scrollbar pb-4 -mx-5 px-5 mb-2 flex-shrink-0">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => scrollTo(id)}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex-shrink-0 border",
                id === activeId ? "bg-rose-600/20 border-rose-500/40 text-rose-300" : "bg-white/5 border-white/10 text-white/50 hover:text-white")}>
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
            <p className="text-xs text-white/20">© {new Date().getFullYear()} DevOS · Cool Shot Systems · Tech Visionaries Network</p>
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
