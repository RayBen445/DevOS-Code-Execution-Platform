import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Rocket, FolderCode, Globe, Layout, Zap, Users, HelpCircle, ChevronRight } from "lucide-react";
import { cn } from "../lib/utils";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import MobileBottomNav from "../components/MobileBottomNav";
import { useSEO } from "../hooks/useSEO";

interface DocSection {
  id: string;
  label: string;
  icon: React.ElementType;
  content: React.ReactNode;
}

const sections: DocSection[] = [
  {
    id: "getting-started",
    label: "Getting Started",
    icon: Rocket,
    content: (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">Getting Started</h2>
        <p className="text-white/60 leading-relaxed">
          Welcome to DevOS — your cloud-based development environment. Get up and running in minutes.
        </p>
        <Step number={1} title="Create an account">
          Sign up with your email or Google account. Once logged in, you'll be taken to your personal dashboard.
        </Step>
        <Step number={2} title="Create a project">
          Click <strong>New Project</strong> on the dashboard. Choose a blank project or pick from one of the
          community templates to get a head start.
        </Step>
        <Step number={3} title="Write your code">
          The built-in editor supports syntax highlighting for all major languages with real-time preview
          on the right panel.
        </Step>
        <Step number={4} title="Deploy">
          Hit the <strong>Deploy</strong> button. DevOS generates a live, shareable URL for your project
          in seconds.
        </Step>
        <InfoBox>
          No installation required. Everything runs in your browser — no local setup, no config files.
        </InfoBox>
      </div>
    ),
  },
  {
    id: "projects",
    label: "Projects",
    icon: FolderCode,
    content: (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">Projects</h2>
        <p className="text-white/60 leading-relaxed">
          Projects are the core unit of DevOS. Each project has its own file system, environment, and URL.
        </p>
        <Section title="Creating a project">
          From your dashboard, click <strong>New Project</strong>. Give it a name and optionally choose
          a template. Each project gets a unique slug used in its live URL.
        </Section>
        <Section title="Visibility">
          Projects can be <strong>Public</strong> (visible to anyone) or <strong>Private</strong> (only
          visible to you and collaborators). Toggle visibility in Project Settings.
        </Section>
        <Section title="Forking">
          Any public project can be forked. This creates a copy under your account that you can modify
          freely.
        </Section>
        <Section title="Deleting">
          Projects can be deleted from Project Settings. This action is irreversible — all files and
          history will be removed permanently.
        </Section>
      </div>
    ),
  },
  {
    id: "deployment",
    label: "Deployment",
    icon: Globe,
    content: (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">Deployment</h2>
        <p className="text-white/60 leading-relaxed">
          Deploy your project to a live URL with a single click. No configuration needed.
        </p>
        <Section title="How it works">
          DevOS runs your project in a secure, sandboxed environment. Static assets are served over
          HTTPS from our global CDN, giving your visitors fast load times worldwide.
        </Section>
        <Section title="Live preview">
          The right panel in the editor shows a live preview that updates as you save. Use this to
          iterate quickly before deploying.
        </Section>
        <Section title="Custom domains">
          Projects deployed on DevOS receive a URL in the format{" "}
          <code className="px-1 py-0.5 bg-white/10 rounded text-blue-300 text-sm">
            projectslug.username.devos.zone.id
          </code>
          . Custom domain support is coming soon.
        </Section>
        <InfoBox>
          Each deploy consumes credits from your daily allowance. You receive free credits every day.
        </InfoBox>
      </div>
    ),
  },
  {
    id: "portfolio",
    label: "Portfolio",
    icon: Layout,
    content: (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">Portfolio</h2>
        <p className="text-white/60 leading-relaxed">
          Every DevOS account comes with a personal portfolio page at{" "}
          <code className="px-1 py-0.5 bg-white/10 rounded text-blue-300 text-sm">
            devos.zone.id/u/&lt;username&gt;
          </code>
          .
        </p>
        <Section title="Customizing your portfolio">
          Go to your dashboard and click the <strong>Portfolio</strong> card. From the Portfolio Editor
          you can update your bio, featured projects, social links, color theme, and layout sections.
        </Section>
        <Section title="Publishing changes">
          Your portfolio has a <em>draft</em> mode and a <em>live</em> mode. Use <strong>Preview</strong>{" "}
          to see changes before they go live, then click <strong>Publish</strong> to push them.
        </Section>
        <Section title="Featured projects">
          Select up to 6 projects to feature at the top of your portfolio. Featured projects appear
          sorted before other public projects.
        </Section>
      </div>
    ),
  },
  {
    id: "templates",
    label: "Templates",
    icon: BookOpen,
    content: (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">Templates</h2>
        <p className="text-white/60 leading-relaxed">
          Templates are pre-built starting points shared by the DevOS community or created by the
          DevOS team.
        </p>
        <Section title="Using a template">
          Browse templates on the <strong>Templates</strong> page. Click any template to preview it,
          then click <strong>Use Template</strong> to fork it into your account as a new project.
        </Section>
        <Section title="Publishing a template">
          From the editor, click the <strong>Publish Template</strong> option. Add a name, description,
          and tags. Templates are reviewed by the DevOS team before going live.
        </Section>
        <Section title="Official templates">
          Templates marked with the <strong>DevOS Official</strong> badge are created and maintained
          by the DevOS team. These follow best practices and are always up-to-date.
        </Section>
      </div>
    ),
  },
  {
    id: "credits",
    label: "Credits",
    icon: Zap,
    content: (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">Credits</h2>
        <p className="text-white/60 leading-relaxed">
          Credits are the currency used to run code, deploy projects, and access AI features in DevOS.
        </p>
        <Section title="Free daily credits">
          Every account receives a free daily credit allowance that resets at midnight UTC. These can
          be used for deployments and code executions.
        </Section>
        <Section title="Monthly credits">
          Monthly credits are a larger pool that accumulates and resets each calendar month. They are
          consumed after your daily credits are exhausted.
        </Section>
        <Section title="Redeem codes">
          DevOS occasionally distributes promo codes that can be redeemed for bonus credits. Use the
          <strong>Redeem Code</strong> option in your profile menu.
        </Section>
        <InfoBox>Credits are non-transferable and have no monetary value.</InfoBox>
      </div>
    ),
  },
  {
    id: "collaboration",
    label: "Collaboration",
    icon: Users,
    content: (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">Collaboration</h2>
        <p className="text-white/60 leading-relaxed">
          Work on projects together with other DevOS users in real time.
        </p>
        <Section title="Adding collaborators">
          Open Project Settings and go to the <strong>Collaborators</strong> section. Enter a username
          to grant them access to your project.
        </Section>
        <Section title="Real-time editing">
          Multiple collaborators can edit the same project simultaneously. Changes are synced live
          across all active sessions.
        </Section>
        <Section title="Forking community projects">
          Can't collaborate on a project? Fork it! Forking creates an independent copy you own
          completely.
        </Section>
      </div>
    ),
  },
  {
    id: "faq",
    label: "FAQ",
    icon: HelpCircle,
    content: (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">Frequently Asked Questions</h2>
        <FAQItem question="Is DevOS free to use?">
          Yes. DevOS is free with a generous daily credit allowance. Additional credits can be
          unlocked via promo codes or future paid plans.
        </FAQItem>
        <FAQItem question="What languages are supported?">
          DevOS supports HTML, CSS, JavaScript, TypeScript, React, and many more. Language support
          is continually expanding.
        </FAQItem>
        <FAQItem question="Can I use my own domain?">
          Custom domains are on the roadmap. Currently all projects are served under devos.zone.id.
        </FAQItem>
        <FAQItem question="Is my code private by default?">
          New projects are private by default. You must explicitly set a project to Public to make
          it visible to others.
        </FAQItem>
        <FAQItem question="How do I delete my account?">
          Contact us at{" "}
          <a href="mailto:info@devos.zone.id" className="text-blue-400 hover:underline">
            info@devos.zone.id
          </a>{" "}
          to request account deletion.
        </FAQItem>
        <FAQItem question="Where can I report a bug?">
          Use the same email address: info@devos.zone.id. We respond within 48 hours.
        </FAQItem>
      </div>
    ),
  },
];

function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <div className="w-8 h-8 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
        {number}
      </div>
      <div>
        <p className="font-bold text-white mb-1">{title}</p>
        <p className="text-white/50 text-sm leading-relaxed">{children}</p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-bold text-white mb-2">{title}</h3>
      <p className="text-white/50 text-sm leading-relaxed">{children}</p>
    </div>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 px-5 py-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
      <Zap className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
      <p className="text-blue-300 text-sm leading-relaxed">{children}</p>
    </div>
  );
}

function FAQItem({ question, children }: { question: string; children: React.ReactNode }) {
  return (
    <div className="border border-white/5 rounded-xl p-5 bg-[#111]">
      <p className="font-bold text-white mb-2 flex items-center gap-2">
        <ChevronRight className="w-4 h-4 text-blue-400 flex-shrink-0" />
        {question}
      </p>
      <p className="text-white/50 text-sm leading-relaxed pl-6">{children}</p>
    </div>
  );
}

export default function DocsPage() {
  useSEO({
    title: "Docs — DevOS",
    description:
      "DevOS documentation. Learn how to create projects, deploy, manage your portfolio, and more.",
  });

  const [activeSection, setActiveSection] = useState("getting-started");
  const current = sections.find((s) => s.id === activeSection) ?? sections[0];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      <Navbar />

      <div className="flex-1 flex max-w-7xl mx-auto w-full px-4 md:px-6 py-8 md:py-12 gap-8">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col gap-1 w-52 flex-shrink-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-3 px-3">
            Documentation
          </p>
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = section.id === activeSection;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left",
                  isActive
                    ? "bg-blue-600/20 text-blue-300"
                    : "text-white/40 hover:text-white hover:bg-white/5"
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {section.label}
              </button>
            );
          })}
        </aside>

        {/* Mobile: horizontal scrollable chip nav */}
        <div className="md:hidden w-full flex flex-col">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-4 -mx-4 px-4">
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = section.id === activeSection;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold transition-all flex-shrink-0 border",
                    isActive
                      ? "bg-blue-600/20 border-blue-500/50 text-blue-300"
                      : "bg-white/5 border-white/10 text-white/50 hover:text-white hover:border-white/20"
                  )}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  {section.label}
                </button>
              );
            })}
          </div>

          {/* Mobile Content */}
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-[#111] border border-white/5 rounded-2xl p-6"
          >
            {current.content}
          </motion.div>
        </div>

        {/* Desktop Content */}
        <main className="hidden md:block flex-1 min-w-0">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25 }}
            className="bg-[#111] border border-white/5 rounded-2xl p-8"
          >
            {current.content}
          </motion.div>
        </main>
      </div>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
