import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Rocket, FolderCode, Globe, Layout, Zap, Users, HelpCircle, ChevronRight, GitBranch, MessageSquare, Building2, Activity, ArrowLeft, Calendar, Puzzle } from "lucide-react";
import { cn } from "../lib/utils";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import MobileBottomNav from "../components/MobileBottomNav";
import { useSEO } from "../hooks/useSEO";
import { buildPortfolioUrl, buildProjectUrl, DEVOS_PRODUCT_HOST } from "../lib/brand";

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
      <div className="space-y-8">
        <h2 className="text-4xl font-bold text-white mb-3">{sections.find(s => s.id === activeSection)?.label}</h2>
        <p className="text-lg text-white/50 mb-8 max-w-3xl">Documentation and guides for building on DevOS</p>
        <Step number={1} title="Create an account">
          Sign up with your email or Google account. Once logged in, you'll land on your personal dashboard.
        </Step>
        <Step number={2} title="Create a project">
          Click <strong>New Project</strong> on the dashboard. Choose a blank project or pick from a
          community template to get a head start.
        </Step>
        <Step number={3} title="Write your code">
          The built-in Monaco editor supports syntax highlighting for all major languages. When no
          file is open the IDE shows a <strong>project homepage</strong> — a GitHub-style overview
          with a file browser, tech-stack badges, and a live README preview.
        </Step>
        <Step number={4} title="Deploy">
          Hit <strong>Deploy</strong>. DevOS generates a live, shareable URL for your project in seconds.
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
        <Section title="Project homepage">
          When you open a project without selecting a file, the IDE shows a rich project homepage —
          similar to a GitHub repository main page. It displays the project description, tech-stack
          badges derived from your file extensions, a clickable file browser (click any file to open
          it instantly), and a rendered preview of your <code className="text-blue-300 text-xs bg-white/10 px-1 rounded">README.md</code> if one exists.
        </Section>
        <Section title="Breadcrumb navigation">
          Once a file is open the IDE header shows{" "}
          <code className="text-blue-300 text-xs bg-white/10 px-1 rounded">@username / project / filename</code>.
          Clicking the username navigates to your profile; clicking the project name opens the project
          view page.
        </Section>
        <Section title="Visibility">
          Projects can be <strong>Public</strong> (visible to anyone) or <strong>Private</strong> (only
          visible to you). Toggle visibility in Project Settings.
        </Section>
        <Section title="Forking">
          Any public project can be forked. This creates a copy under your account that you can modify
          freely without affecting the original.
        </Section>
        <Section title="Versions">
          Every manual save writes a version snapshot to Firestore. Snapshots include the content
          of all files and a timestamp so you can trace changes over time.
        </Section>
        <Section title="Deleting">
          Projects can be deleted from Project Settings. This action is irreversible — all files and
          snapshots are removed permanently.
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
          Clicking <strong>Deploy</strong> (or running <code className="text-blue-300 text-xs bg-white/10 px-1 rounded">deploy</code> in the terminal)
          publishes your project and generates a URL in the format{" "}
          <code className="text-blue-300 text-xs bg-white/10 px-1 rounded">{buildProjectUrl("&lt;username&gt;", "&lt;project-slug&gt;").replace("https://", "")}</code>.
        </Section>
        <Section title="Live preview">
          The right panel shows a live preview that re-renders on every save. Use this to iterate
          quickly before publishing.
        </Section>
        <Section title="Git Sync">
          The <strong>Git panel</strong> (source-control icon in the sidebar) lets you push your
          project files directly to a GitHub repository. File paths are normalized automatically
          so no leading slashes ever reach the GitHub API.
        </Section>
        <Section title="Terminal commands">
          Run <code className="text-blue-300 text-xs bg-white/10 px-1 rounded">deploy</code> to publish,{" "}
          <code className="text-blue-300 text-xs bg-white/10 px-1 rounded">save</code> to persist changes,{" "}
          <code className="text-blue-300 text-xs bg-white/10 px-1 rounded">run</code> to execute JavaScript
          or TypeScript files server-side, and{" "}
          <code className="text-blue-300 text-xs bg-white/10 px-1 rounded">help</code> for the full command list.
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
            {buildPortfolioUrl("&lt;username&gt;").replace("https://", "")}
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
        <Section title="Share as Image">
          Use the <strong>Share as Image</strong> button to export your portfolio card as a PNG —
          perfect for sharing on social media.
        </Section>
        <Section title="Activity streaks">
          Your portfolio shows your <strong>daily coding streak</strong> and <strong>monthly streak</strong>.
          The daily streak increments each consecutive day you are active. The monthly streak increments
          once per calendar month when you have been active on 20 or more days that month.
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
          Every account receives a free daily credit allowance that resets every 24 hours. These can
          be used for deployments and code executions.
        </Section>
        <Section title="Monthly credits">
          Monthly credits are a larger pool that resets each calendar month. They are consumed after
          your daily credits are exhausted.
        </Section>
        <Section title="Gifted credits">
          You may receive bonus credits with an optional expiry date. Gifted credits are drained
          first (oldest first) before your daily and monthly pools.
        </Section>
        <Section title="Unlimited Pass">
          A time-limited <strong>Unlimited Pass</strong> can be granted to your account. While active, all
          credit costs are bypassed and you see an <strong>∞ Unlimited</strong> badge in the navbar.
        </Section>
        <Section title="Redeem codes">
          DevOS occasionally distributes promo codes that can be redeemed for bonus credits. Use the{" "}
          <strong>Redeem Code</strong> option in your profile menu.
        </Section>
        <InfoBox>Credits are non-transferable and have no monetary value.</InfoBox>
      </div>
    ),
  },
  {
    id: "organizations",
    label: "Organizations",
    icon: Building2,
    content: (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">Organizations</h2>
        <p className="text-white/60 leading-relaxed">
          Organizations let teams collaborate under a shared identity. Every org has a public page
          at{" "}
          <code className="px-1 py-0.5 bg-white/10 rounded text-blue-300 text-sm">
            devos.zone.id/org/&lt;slug&gt;
          </code>
          .
        </p>
        <Section title="Creating an organization">
          From your dashboard open the <strong>Organizations</strong> section and click{" "}
          <strong>Create Organization</strong>. Choose a unique slug — this becomes the org URL.
        </Section>
        <Section title="Joining an organization">
          Visit an org's public page and click <strong>Join</strong>. The org owner can also invite
          members directly by username.
        </Section>
        <Section title="Roles">
          Each member has one of three roles: <strong>Admin</strong>, <strong>Moderator</strong>, or{" "}
          <strong>Member</strong>. Organization admins can manage roles and settings.
        </Section>
        <Section title="Guest visibility">
          Org pages are publicly visible. Member lists are only shown to authenticated users.
        </Section>
      </div>
    ),
  },
  {
    id: "community",
    label: "Community & Feed",
    icon: MessageSquare,
    content: (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">Community &amp; Feed</h2>
        <p className="text-white/60 leading-relaxed">
          Connect with other developers, share your work, and discover projects through the DevOS
          social layer.
        </p>
        <Section title="Feed">
          The home feed shows posts from people you follow and trending projects. Post updates,
          share links, and get feedback from the community.
        </Section>
        <Section title="Liking and commenting">
          Like any post with the heart button. Add comments to start a conversation. Post authors
          and admins can delete comments.
        </Section>
        <Section title="Following">
          Follow other users to see their posts in your feed. Unfollow at any time from their
          profile page.
        </Section>
        <Section title="Communities">
          Join topic-based communities for focused discussion. Each community has its own feed
          and member list.
        </Section>
        <Section title="Group chat, emoji, and voice">
          Communities and organizations include member-only chat, DevOS custom emoji shortcuts
          (like <code className="text-blue-300 text-xs bg-white/10 px-1 rounded">:devos:</code>), and optional voice calls.
        </Section>
        <Section title="Explore &amp; Search">
          Use the <strong>Explore</strong> page to discover public projects and trending developers.
          The <strong>Search</strong> page lets you search users by username or display name.
        </Section>
      </div>
    ),
  },
  {
    id: "git-sync",
    label: "Git Sync",
    icon: GitBranch,
    content: (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">Git Sync</h2>
        <p className="text-white/60 leading-relaxed">
          Push your DevOS project files directly to a GitHub repository without leaving the browser.
        </p>
        <Step number={1} title="Connect GitHub">
          Open the <strong>Git panel</strong> (source-control icon in the sidebar) and click{" "}
          <strong>Connect GitHub</strong>. You'll be redirected to authorize the DevOS GitHub App.
        </Step>
        <Step number={2} title="Select a repository">
          Choose an existing repository or create a new one from the panel.
        </Step>
        <Step number={3} title="Push changes">
          Enter a commit message and click <strong>Push</strong>. DevOS creates blobs, builds a
          Git tree, and commits — all via the GitHub API.
        </Step>
        <InfoBox>
          File paths are normalized automatically. Leading slashes are stripped before the push so
          Git tree objects are always valid.
        </InfoBox>
      </div>
    ),
  },
  {
    id: "activity",
    label: "Activity & Streaks",
    icon: Activity,
    content: (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">Activity &amp; Streaks</h2>
        <p className="text-white/60 leading-relaxed">
          DevOS tracks your coding consistency with daily and monthly activity streaks.
        </p>
        <Section title="Daily streak">
          Your daily streak increments each consecutive day you are active on DevOS. Missing a day
          resets it to 1 the next time you log in.
        </Section>
        <Section title="Monthly streak">
          Your monthly streak tracks how many months you have been highly active. It increments
          once per calendar month when you have logged at least 20 active days in that month.
          It can only increase once per month — no double-counting.
        </Section>
        <Section title="Active days this month">
          The <code className="text-blue-300 text-xs bg-white/10 px-1 rounded">activeDaysThisMonth</code> list
          resets at the start of each new month and accumulates unique dates as you visit the platform.
        </Section>
        <Section title="Viewing your streaks">
          Your current streaks are visible on your public portfolio page and in your profile settings.
        </Section>
        <Section title="Help pages">
          Need context? Visit <strong>About</strong>, <strong>Contact</strong>, and the built-in{" "}
          <strong>404 not found</strong> page for fast navigation when links break.
        </Section>
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
          Multiple collaborators can edit the same project simultaneously via Socket.IO. Changes are
          synced live across all active sessions.
        </Section>
        <Section title="Forking community projects">
          Can't collaborate on a project? Fork it. Forking creates an independent copy you own
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
          unlocked via promo codes or a gifted Unlimited Pass from an admin.
        </FAQItem>
        <FAQItem question="What languages are supported?">
          DevOS supports HTML, CSS, JavaScript, TypeScript, React, JSON, Markdown, and more.
          JavaScript and TypeScript files can be executed server-side via the terminal.
        </FAQItem>
        <FAQItem question="Can I use my own domain?">
          Custom domains are on the roadmap. Currently all DevOS projects are served under the KONTYRA wildcard domain.
        </FAQItem>
        <FAQItem question="Is my code private by default?">
          New projects are private by default. You must explicitly set a project to Public to make
          it visible to others.
        </FAQItem>
        <FAQItem question="What is the project homepage inside the IDE?">
          When you open a project without selecting a file, the IDE shows a GitHub-style project
          homepage — file browser, tech-stack badges, and a live README.md preview. Click any file
          to open it immediately in the editor.
        </FAQItem>
        <FAQItem question="Why does my monthly streak not increment every day after reaching 20?">
          The monthly streak milestone is awarded only once per calendar month — on the first day
          you reach 20 active days that month. This prevents it from over-counting.
        </FAQItem>
        <FAQItem question="How do I delete my account?">
          Contact us at{" "}
          <a href="mailto:info@devos.zone.id" className="text-blue-400 hover:underline">
            info@devos.zone.id
          </a>{" "}
          to request account deletion.
        </FAQItem>
        <FAQItem question="Where can I report a bug?">
          Use the same email address: info@devos.zone.id or use the feedback button in the navbar.
          We respond within 48 hours.
        </FAQItem>
      </div>
    ),
  },
  {
    id: "communities",
    label: "Communities",
    icon: Users,
    content: (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">Communities</h2>
        <p className="text-white/60 leading-relaxed">
          Communities are shared spaces where developers with similar interests collaborate, share projects, and chat in real time.
        </p>
        <Section title="Creating a community">
          Navigate to <strong>/communities</strong> and click <strong>Create Community</strong>. Give it a name, slug, description, and choose public or invite-only visibility.
        </Section>
        <Section title="Posts &amp; feed">
          Every community has its own post feed. Members can post updates, share projects, and react to posts — just like the global feed.
        </Section>
        <Section title="Real-time chat">
          Public and private group chat is built in. Enable or disable it per community in <strong>Settings → Realtime</strong>.
        </Section>
        <Section title="Voice calls">
          Start a voice call from the community page. All online members can join.
        </Section>
        <Section title="Roles">
          Members can be promoted to <strong>Moderator</strong> or <strong>Admin</strong>. Admins control community settings and membership.
        </Section>
        <InfoBox>
          Community avatars and banners can now be uploaded directly — drag and drop or click to browse.
        </InfoBox>
      </div>
    ),
  },
  {
    id: "organizations",
    label: "Organizations",
    icon: Building2,
    content: (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">Organizations</h2>
        <p className="text-white/60 leading-relaxed">
          Organizations let teams collaborate on projects with fine-grained role-based access control (RBAC).
        </p>
        <Section title="Roles">
          Four roles: <strong>Owner</strong>, <strong>Admin</strong>, <strong>Developer</strong>, <strong>Viewer</strong>. Each role controls which actions a member can perform on shared projects.
        </Section>
        <Section title="Shared projects">
          Any project created inside an org is visible to all members according to their role. Deployments require the <em>deploy_project</em> permission (Developer+).
        </Section>
        <Section title="Org chat">
          Each org has a built-in real-time group chat and optional voice call room.
        </Section>
        <Section title="Join policies">
          Orgs can be <strong>Open</strong> (anyone can join) or <strong>Request-to-join</strong> (owner/admin approves).
        </Section>
      </div>
    ),
  },
  {
    id: "learning",
    label: "Learning",
    icon: BookOpen,
    content: (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">Learning Platform</h2>
        <p className="text-white/60 leading-relaxed">
          The built-in learning platform lets you study programming concepts without leaving DevOS.
        </p>
        <Section title="Topics &amp; lessons">
          Browse topics at <strong>/learn</strong>. Each topic contains lessons with explanations, code examples, and quizzes.
        </Section>
        <Section title="Progress tracking">
          Your progress is saved automatically per lesson. A progress bar on the topic page shows how far along you are.
        </Section>
        <InfoBox>
          Progress is stored locally per account so it persists across devices.
        </InfoBox>
      </div>
    ),
  },
  {
    id: "events",
    label: "Events",
    icon: Calendar,
    content: (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">Events</h2>
        <p className="text-white/60 leading-relaxed">
          DevOS hosts developer events — hackathons, workshops, AMAs, and more.
        </p>
        <Section title="Submitting an event">
          Visit <strong>/events/create</strong> to submit an event. Provide the title, description, type (online/in-person), date, and an optional banner image. Events go live after admin approval.
        </Section>
        <Section title="Event types">
          <strong>Online</strong> events include a link (e.g., Google Meet). <strong>In-person</strong> events include a venue name and address.
        </Section>
        <Section title="Banner images">
          Upload a banner directly from the create-event form — drag and drop or click to browse. Recommended size: 1200 × 630 px.
        </Section>
      </div>
    ),
  },
  {
    id: "plugin-marketplace",
    label: "Plugin Marketplace",
    icon: Puzzle,
    content: (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">Plugin Marketplace</h2>
        <p className="text-white/60 leading-relaxed">
          The Plugin Marketplace is coming soon — a curated registry of first- and third-party plugins that extend your DevOS projects with one click.
        </p>
        <Section title="Official plugins">
          DevOS will ship official plugins for Auth, Database, Storage, and AI — drop them into any project without writing boilerplate.
        </Section>
        <Section title="Community plugins">
          Developers can publish their own plugins. Each plugin is reviewed before listing.
        </Section>
        <InfoBox>
          The Plugin Marketplace is in active development. Sign up to get notified when it launches.
        </InfoBox>
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
          Credits power AI-assisted features and deployments on DevOS.
        </p>
        <Section title="Daily &amp; monthly credits">
          Every free account receives a daily credit allowance and a monthly top-up. Credits reset automatically on schedule.
        </Section>
        <Section title="Redeeming codes">
          Use the <strong>Redeem Code</strong> button in the credits panel (top navigation) or in <strong>Settings → Account</strong> to enter a code for bonus credits.
        </Section>
        <Section title="Transaction history">
          View a full log of every credit spend and earn event in <strong>Settings → Account → Transaction History</strong>.
        </Section>
        <InfoBox>
          Admin accounts have unlimited credits — all credit costs are automatically bypassed.
        </InfoBox>
      </div>
    ),
  },
  {
    id: "plugin-marketplace-guide",
    label: "Plugin Marketplace",
    icon: Puzzle,
    content: (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">Plugin Marketplace</h2>
        <p className="text-white/60 leading-relaxed">
          Install backend plugins (Auth, Database, Storage, Email, and more) directly from the IDE. Environment variables are automatically injected into your project.
        </p>
        <Section title="Installing a plugin">
          Open the <strong>Plugin Marketplace</strong> panel in the IDE sidebar. Browse available plugins and click <strong>Install</strong>. The plugin is activated and its environment variables are immediately available in your project runtime.
        </Section>
        <Section title="Available plugins">
          DevOS ships official plugins for Auth (sign-up/sign-in), Database (Firestore-backed), Storage (file &amp; image uploads), Email (transactional), Realtime (WebSocket pub/sub), and more.
        </Section>
        <InfoBox>
          DevOS is now served from <code className="text-blue-300 text-xs bg-white/10 px-1 rounded">{DEVOS_PRODUCT_HOST}</code> with user and project hosts under the KONTYRA wildcard domain.
        </InfoBox>
      </div>
    ),
  },
  {
    id: "branching-prs",
    label: "Branching & Pull Requests",
    icon: GitBranch,
    content: (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">Branching &amp; Pull Requests</h2>
        <p className="text-white/60 leading-relaxed">
          Create branches from the Git panel, switch between them, open PRs with source→target branch, and merge with one click.
        </p>
        <Section title="Creating a branch">
          In the <strong>Git</strong> sidebar panel, click <strong>New Branch</strong>, enter a name, and confirm. The IDE switches to the new branch immediately.
        </Section>
        <Section title="Opening a pull request">
          From the Git panel select <strong>Open PR</strong>, choose source and target branches, add a title and description, then submit. The PR appears in the project's PR list.
        </Section>
        <Section title="Merging">
          Open the PR and click <strong>Merge</strong>. Changes are merged into the target branch and the PR is marked as closed. No Git CLI required.
        </Section>
      </div>
    ),
  },
  {
    id: "keyboard-shortcuts",
    label: "Keyboard Shortcuts",
    icon: BookOpen,
    content: (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">Keyboard Shortcuts</h2>
        <p className="text-white/60 leading-relaxed">
          Find the full shortcut reference in <strong>Settings → Accessibility</strong>.
        </p>
        <Section title="Opening the reference">
          Navigate to <strong>Settings</strong> (⌘, / Ctrl+,) and select the <strong>Accessibility</strong> tab to see every shortcut grouped by category: IDE, Editor, Navigation, Git, and General.
        </Section>
        <Section title="Common shortcuts">
          Save file: <code className="text-blue-300 text-xs bg-white/10 px-1 rounded">⌘S / Ctrl+S</code> · Command palette: <code className="text-blue-300 text-xs bg-white/10 px-1 rounded">⌘⇧P / Ctrl+Shift+P</code> · Toggle terminal: <code className="text-blue-300 text-xs bg-white/10 px-1 rounded">⌘` / Ctrl+`</code>.
        </Section>
        <InfoBox>
          Keyboard shortcut customisation is on the roadmap and will be available in a future update.
        </InfoBox>
      </div>
    ),
  },
  {
    id: "bot-system",
    label: "Bot System",
    icon: Zap,
    content: (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">Bot System</h2>
        <p className="text-white/60 leading-relaxed">
          DevOS runs 12 built-in automation bots: Deploy, Credit, Feed, Notification, Welcome, Activity, Milestone, Moderation, Plugin, Search Index, Project Health, and Debug.
        </p>
        <Section title="Deploy Bot">
          Triggers on every deployment, updates deployment history, posts a feed event, and awards deployment credits.
        </Section>
        <Section title="Welcome Bot">
          Fires on new sign-up — grants the onboarding credit bonus, sends a welcome notification, and creates the first feed post.
        </Section>
        <Section title="Milestone Bot">
          Watches for achievement events (first deploy, 10 projects, etc.) and awards badges displayed on the user profile.
        </Section>
        <Section title="Moderation Bot">
          Automatically filters spam and inappropriate content in posts, comments, and project descriptions.
        </Section>
        <InfoBox>
          Bots run server-side via Cloud Functions and are not configurable by end users. Admin accounts can inspect bot activity logs in the Admin Dashboard.
        </InfoBox>
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
    <div className="flex gap-6 pb-8 last:pb-0">
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600/40 to-blue-500/20 text-blue-300 flex items-center justify-center text-lg font-bold flex-shrink-0 ring-2 ring-blue-500/30 shadow-lg shadow-blue-500/10">
        {number}
      </div>
      <div className="flex-1 pt-1">
        <p className="text-lg font-bold text-white/95 mb-2">{title}</p>
        <p className="text-white/65 text-base leading-relaxed">{children}</p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="pb-8 border-b border-white/8 last:border-0 last:pb-0">
      <h4 className="font-bold text-white/95 mb-3 text-lg tracking-tight">{title}</h4>
      <p className="text-white/65 text-base leading-relaxed">{children}</p>
    </div>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-4 px-6 py-5 bg-gradient-to-br from-blue-600/20 to-blue-500/10 border-2 border-blue-500/40 rounded-xl hover:border-blue-500/60 transition-all shadow-lg shadow-blue-500/15">
      <Zap className="w-6 h-6 text-blue-300 flex-shrink-0 mt-0.5" />
      <p className="text-blue-100/90 text-base leading-relaxed font-medium">{children}</p>
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

      <div className="flex-1 flex max-w-7xl mx-auto w-full px-4 md:px-6 py-8 md:py-12 gap-8 relative">
        <button onClick={() => window.history.back()} className="absolute -top-2 left-4 md:left-6 inline-flex items-center gap-2 text-xs text-white/50 hover:text-white transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col gap-2 w-64 flex-shrink-0 sticky top-24 h-fit">
          <p className="text-[11px] font-bold uppercase tracking-widest text-white/40 mb-4 px-4">
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
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 relative text-left",
                  isActive
                    ? "bg-blue-600/25 text-blue-300 shadow-lg shadow-blue-500/15 border border-blue-500/40"
                    : "text-white/60 hover:text-white/85 hover:bg-white/8 border border-transparent"
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-400 to-blue-500 rounded-r" />
                )}
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="flex-1">{section.label}</span>
              </button>
            );
          })}
        </aside>

        {/* Mobile: horizontal scrollable chip nav */}
        <div className="md:hidden w-full flex flex-col gap-6">
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-4 -mx-4 px-4">
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = section.id === activeSection;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all flex-shrink-0 border duration-200",
                    isActive
                      ? "bg-blue-600/30 border-blue-500/60 text-blue-300 shadow-lg shadow-blue-500/20"
                      : "bg-white/6 border-white/12 text-white/60 hover:text-white/80 hover:border-white/25"
                  )}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
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
            className="bg-gradient-to-br from-[#111] to-[#0a0a0a] border border-white/10 rounded-2xl p-8 space-y-8 shadow-xl"
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
            className="bg-gradient-to-br from-[#111] to-[#0a0a0a] border border-white/10 rounded-2xl p-10 space-y-8 shadow-2xl shadow-black/50"
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
