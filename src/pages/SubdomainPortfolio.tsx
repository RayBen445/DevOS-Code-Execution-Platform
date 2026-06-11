import React, { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, limit } from "firebase/firestore";
import { Project, UserSettings, PortfolioData } from "../types";
import {
  Zap, Github, Twitter, Linkedin, Check, Menu, X, AlertCircle, Code2
} from "lucide-react";
import { resolveAvatar } from "../lib/avatars";
import { useSEO } from "../hooks/useSEO";
import { cn } from "../lib/utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { buildDevosUrl, buildPortfolioUrl, PRODUCT_BRAND_NAME } from "../lib/brand";
import PremiumLoader from "../components/PremiumLoader";
import { marked } from "marked";

interface Props {
  username: string;
}

const PortfolioContactForm = ({ portfolioId }: { portfolioId: string }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) {
      toast.error("Please fill in all fields");
      return;
    }
    setSubmitting(true);
    try {
      const { collection, addDoc, serverTimestamp } = await import("firebase/firestore");
      await addDoc(collection(db, "projects", portfolioId, "messages"), {
        name,
        email,
        message,
        createdAt: serverTimestamp(),
        read: false
      });
      setSubmitted(true);
      toast.error("Message sent successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to send message. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="p-6 border border-[var(--accent)] bg-[var(--accent)]/10 rounded-2xl text-center shadow-[var(--shadow-md)]">
        <Check className="w-8 h-8 text-[var(--accent)] mx-auto mb-2" />
        <h3 className="text-xl font-bold text-[var(--accent)] mb-2">Message Sent</h3>
        <p className="opacity-70">Thank you for getting in touch! I will get back to you soon.</p>
        <button onClick={() => setSubmitted(false)} className="mt-4 text-sm text-[var(--accent)] hover:opacity-80 underline">Send another message</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg mt-8 p-6 bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-[var(--radius-md)] shadow-[var(--shadow-md)]">
      <div>
        <label className="block text-sm font-medium opacity-70 mb-1">Name</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--accent)] transition-colors" placeholder="Your name" />
      </div>
      <div>
        <label className="block text-sm font-medium opacity-70 mb-1">Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--accent)] transition-colors" placeholder="your@email.com" />
      </div>
      <div>
        <label className="block text-sm font-medium opacity-70 mb-1">Message</label>
        <textarea value={message} onChange={e => setMessage(e.target.value)} className="w-full bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--accent)] transition-colors min-h-[120px] resize-y" placeholder="How can I help you?"></textarea>
      </div>
      <button type="submit" disabled={submitting} className="w-full bg-[var(--accent)] disabled:opacity-50 text-white font-bold py-3 rounded-xl hover:brightness-110 transition-all shadow-[var(--shadow-md)]">
        {submitting ? "Sending..." : "Send Message"}
      </button>
    </form>
  );
};

export default function SubdomainPortfolio({ username }: Props) {
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [portfolioId, setPortfolioId] = useState<string | null>(null);
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [themeData, setThemeData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const activePageSlug = urlParams.get("page") || "/";

  const portfolioUrl = buildPortfolioUrl(username);

  useSEO({
    title: userSettings ? `${userSettings.displayName || username} — ${PRODUCT_BRAND_NAME}` : `${username} — ${PRODUCT_BRAND_NAME}`,
    description: userSettings?.bio || `${username}'s portfolio on ${PRODUCT_BRAND_NAME}`,
    ogImage: userSettings?.avatarUrl,
    ogUrl: portfolioUrl,
  });

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    const fetchData = async () => {
      try {
        const usersRef = collection(db, "users");
        const userQ = query(usersRef, where("username", "==", username), limit(1));
        const userSnap = await getDocs(userQ);
        if (userSnap.empty) {
          setError("User not found");
          setLoading(false);
          return;
        }
        const foundUid = userSnap.docs[0].id;
        setUid(foundUid);
        const userData = userSnap.docs[0].data();

        let sData: any = {};
        try {
          const settingsSnap = await getDoc(doc(db, "user_settings", foundUid));
          if (settingsSnap.exists()) {
            sData = settingsSnap.data();
          }
        } catch {}
        
        setUserSettings({
          ...sData,
          username: userData.username,
          displayName: sData.displayName || userData.displayName || userData.username,
          avatarUrl: sData.avatarUrl || sData.avatar || userData.avatarUrl || undefined,
          bio: sData.bio || userData.bio,
          links: sData.links || userData.links || {},
          availableForWork: sData.availableForWork ?? userData.availableForWork ?? false,
          isVerified: sData.isVerified || userData.isVerified || false,
        } as UserSettings);

        try {
          const pRef = collection(db, "projects");
          const pQ = query(
            pRef,
            where("ownerId", "==", foundUid),
            where("isSystem", "==", true),
            where("systemType", "==", "portfolio"),
            limit(1)
          );
          const pSnap = await getDocs(pQ);
          if (!pSnap.empty) {
            setPortfolioId(pSnap.docs[0].id);
            const pDoc = pSnap.docs[0].data() as Project;
            
            // PRIORITY: Use published data over draft
            const dataToUse = pDoc.published || pDoc.draft;
            
            if (dataToUse) {
              if (dataToUse.portfolio) setPortfolioData(dataToUse.portfolio as PortfolioData);
              if (dataToUse.theme) setThemeData(dataToUse.theme);
            }
          }
        } catch (e) {
          console.error("Failed to load portfolio project:", e);
        }

      } catch {
        setError("Failed to load portfolio");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [username]);

  // Apply custom theme settings if available
  useEffect(() => {
    if (themeData && themeData.primaryColor) {
      const root = document.documentElement;
      root.style.setProperty('--accent', themeData.primaryColor);
      root.style.setProperty('--accent-hover', themeData.primaryColor);
      
      if (themeData.fontFamily) {
        root.style.setProperty('--font-sans', `"${themeData.fontFamily}", sans-serif`);
      }
      
      if (themeData.darkMode) {
        root.style.setProperty('--bg-base', '#0a0a0a');
        root.style.setProperty('--bg-surface', '#111111');
        root.style.setProperty('--text-primary', '#ffffff');
        root.style.setProperty('--border-base', 'rgba(255,255,255,0.1)');
      } else {
        root.style.setProperty('--bg-base', '#f8fafc');
        root.style.setProperty('--bg-surface', '#ffffff');
        root.style.setProperty('--text-primary', '#0f172a');
        root.style.setProperty('--border-base', 'rgba(0,0,0,0.1)');
      }
    }
    
    return () => {
      // Cleanup theme overrides when unmounting
      const root = document.documentElement;
      root.style.removeProperty('--accent');
      root.style.removeProperty('--accent-hover');
      root.style.removeProperty('--font-sans');
      root.style.removeProperty('--bg-base');
      root.style.removeProperty('--bg-surface');
      root.style.removeProperty('--text-primary');
      root.style.removeProperty('--border-base');
    };
  }, [themeData]);

  if (loading) {
    return <PremiumLoader fullScreen mode="lightweight" message="LOADING PORTFOLIO" />;
  }

  if (error || !userSettings) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] flex flex-col items-center justify-center text-[var(--text-primary)] gap-4 px-6 text-center">
        <div className="w-20 h-20 rounded-[var(--radius-md)] bg-[var(--bg-surface)] border border-[var(--border-base)] flex items-center justify-center mb-2 shadow-[var(--shadow-md)]">
          <AlertCircle className="w-10 h-10 opacity-50" />
        </div>
        <h1 className="text-3xl font-bold">{error || "Portfolio not found"}</h1>
        <p className="opacity-50 max-w-sm">The portfolio you're looking for doesn't exist or has been moved.</p>
        <a href={buildDevosUrl()} className="mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-[var(--shadow-md)]">
          Go to DevOS
        </a>
      </div>
    );
  }

  const displayName = userSettings.displayName || userSettings.username || username;
  const avatarUrl = resolveAvatar(userSettings.avatarUrl);
  const links = portfolioData?.links || userSettings.links || [];

  if (portfolioData && portfolioData.pages && portfolioData.pages.length > 0) {
    const pages = portfolioData.pages;
    const activePage = pages.find((p: any) => p.slug === activePageSlug) || pages[0];
    
    let mdContent = activePage.content || "";
    mdContent = mdContent
      .replace(/{{displayName}}/g, displayName)
      .replace(/{{username}}/g, username)
      .replace(/{{bio}}/g, portfolioData.bio || userSettings.bio || "");
      
    const markdownHtml = marked.parse(mdContent) as string;

    return (
      <div className="min-h-screen flex flex-col font-sans transition-colors duration-500" style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}>
        {/* Navbar */}
        {portfolioData.global?.navbar?.style !== 'hidden' && (
          <nav className="sticky top-0 z-50 bg-[var(--bg-base)]/80 backdrop-blur-[var(--blur-md)] border-b border-[var(--border-base)] shadow-sm">
            <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
              <a href="?page=/" className="font-bold text-xl flex items-center gap-3 hover:opacity-80 transition-opacity">
                {portfolioData.global?.navbar?.logo === 'text' ? (
                  <span className="tracking-tight">{displayName}</span>
                ) : (
                  <div className="flex items-center gap-3">
                     <img src={avatarUrl} alt={displayName} className="w-10 h-10 rounded-[var(--radius-md)] border border-[var(--border-base)] object-cover shadow-sm" />
                     <span className="tracking-tight hidden sm:block">{displayName}</span>
                  </div>
                )}
              </a>
              
              {/* Desktop Nav */}
              <div className="hidden md:flex items-center gap-8">
                {pages.map((p: any) => (
                  <a 
                    key={p.id} 
                    href={`?page=${p.slug}`}
                    className={cn(
                      "text-sm font-bold transition-all border-b-2 py-2",
                      activePageSlug === p.slug ? "border-[var(--accent)] text-[var(--text-primary)]" : "border-transparent opacity-50 hover:opacity-100 hover:border-[var(--border-base)]"
                    )}
                  >
                    {p.title}
                  </a>
                ))}
              </div>

              {/* Mobile Hamburger Toggle */}
              <button 
                className="md:hidden p-2 -mr-2 opacity-70 hover:opacity-100 transition-opacity"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>

            {/* Mobile Nav Menu */}
            <AnimatePresence>
              {isMobileMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-[var(--bg-surface)] border-b border-[var(--border-base)] overflow-hidden md:hidden shadow-xl"
                >
                  <div className="p-4 flex flex-col gap-2">
                    {pages.map((p: any) => (
                      <a 
                        key={p.id} 
                        href={`?page=${p.slug}`}
                        className={cn(
                          "text-lg font-bold px-4 py-4 rounded-[var(--radius-md)] transition-all flex items-center justify-between",
                          activePageSlug === p.slug ? "bg-[var(--accent)]/10 text-[var(--accent)]" : "opacity-70 hover:bg-[var(--border-base)]"
                        )}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {p.title}
                      </a>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </nav>
        )}

        {/* Main Content */}
        <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12 md:py-24">
          
          {/* Distinct Hero Header for the home page */}
          {activePageSlug === '/' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-16">
              <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-tight mb-6">{displayName}</h1>
              <p className="text-xl md:text-2xl opacity-60 leading-relaxed max-w-2xl">{portfolioData.bio || userSettings.bio}</p>
            </motion.div>
          )}

          {/* Render Content based on Language */}
          {activePage.language === 'html' || activePage.language === 'css' || activePage.language === 'javascript' ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="w-full min-h-[600px] mt-4">
               <iframe
                  title="portfolio-custom-code"
                  className="w-full h-[80vh] border-none rounded-xl bg-white shadow-lg"
                  sandbox="allow-scripts allow-same-origin"
                  srcDoc={`
                    <!DOCTYPE html>
                    <html>
                      <head>
                        <style>
                          body { margin: 0; font-family: system-ui, sans-serif; padding: 2rem; color: #333; }
                          ${activePage.language === 'css' ? activePage.content : ''}
                        </style>
                        ${activePage.language === 'javascript' ? `<script>${activePage.content}</script>` : ''}
                      </head>
                      <body>
                        ${activePage.language === 'html' ? activePage.content : ''}
                      </body>
                    </html>
                  `}
                />
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
              className="prose prose-lg max-w-none prose-headings:font-bold prose-a:text-[var(--accent)] prose-a:no-underline hover:prose-a:underline"
              style={{ color: 'var(--text-primary)' }}
              dangerouslySetInnerHTML={{ __html: markdownHtml }}
            />
          )}

          {activePageSlug === '/contact' && portfolioId && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <PortfolioContactForm portfolioId={portfolioId} />
            </motion.div>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-[var(--border-base)] bg-[var(--bg-surface)] mt-auto">
          <div className="max-w-5xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <img src={avatarUrl} alt="Avatar" className="w-6 h-6 rounded-full border border-[var(--border-base)] opacity-50 grayscale" />
              <p className="text-sm font-bold opacity-50">© {new Date().getFullYear()} {displayName}</p>
            </div>
            
            {portfolioData.global?.footer?.showSocials !== false && links.length > 0 && (
              <div className="flex items-center gap-4">
                {links.map((link: any, i: number) => {
                  let Icon = Zap;
                  if (link.platform === 'github') Icon = Github;
                  if (link.platform === 'twitter') Icon = Twitter;
                  if (link.platform === 'linkedin') Icon = Linkedin;
                  return (
                    <a key={i} href={link.url} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full border border-[var(--border-base)] flex items-center justify-center hover:bg-[var(--accent)]/10 hover:text-[var(--accent)] hover:border-[var(--accent)] transition-all shadow-sm">
                      <Icon className="w-4 h-4" />
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </footer>
      </div>
    );
  }

  // Fallback if no pages created yet
  return (
    <div className="min-h-screen flex items-center justify-center font-sans" style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <div className="max-w-md w-full px-6 py-12 text-center bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-3xl shadow-xl">
        <img src={avatarUrl} alt={displayName} className="w-24 h-24 rounded-2xl mx-auto mb-6 object-cover border-2 border-[var(--border-base)] shadow-lg" />
        <h1 className="text-3xl font-black mb-2 tracking-tight">{displayName}</h1>
        <p className="text-[var(--text-primary)] opacity-60 mb-8">{userSettings.bio || "Software Developer"}</p>
        
        <div className="bg-[var(--bg-base)] border border-[var(--border-base)] rounded-2xl p-6 mb-8 shadow-inner">
          <Code2 className="w-8 h-8 opacity-20 mx-auto mb-3" />
          <h2 className="text-lg font-bold mb-1">Coming Soon</h2>
          <p className="text-sm opacity-60">This portfolio is currently under construction.</p>
        </div>

        {links && links.length > 0 && (
          <div className="flex justify-center gap-4">
            {links.map((link: any, i: number) => {
              let Icon = Zap;
              if (link.platform === 'github') Icon = Github;
              if (link.platform === 'twitter') Icon = Twitter;
              if (link.platform === 'linkedin') Icon = Linkedin;
              return (
                <a key={i} href={link.url} target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full border border-[var(--border-base)] flex items-center justify-center hover:bg-[var(--accent)] hover:text-white hover:border-[var(--accent)] transition-all shadow-sm">
                  <Icon className="w-5 h-5" />
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
