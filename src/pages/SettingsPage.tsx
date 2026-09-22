import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  User, Lock, Palette, Bell, Shield, Link as LinkIcon, CreditCard, BarChart2, Code2, Accessibility, AlertTriangle, ChevronRight, ArrowLeft, Search, Camera, CheckCircle2, ChevronDown, Moon, Sun, Monitor
} from "lucide-react";
import Navbar from "../components/Navbar";
import MobileBottomNav from "../components/MobileBottomNav";
import { UserSettings } from "../types";
import { toast } from "sonner";
import { resolveAvatar } from "../lib/avatars";
import { cn } from "../lib/utils";

const SETTINGS_MENU = [
  { id: "account", label: "Account", desc: "Personal information, username, email and more.", icon: User, color: "text-blue-400", bg: "bg-blue-500/10" },
  { id: "security", label: "Security", desc: "Password, 2FA, sessions and login activity.", icon: Lock, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { id: "appearance", label: "Appearance", desc: "Theme, colors, font and interface preferences.", icon: Palette, color: "text-purple-400", bg: "bg-purple-500/10" },
  { id: "notifications", label: "Notifications", desc: "Manage what you get notified about.", icon: Bell, color: "text-yellow-400", bg: "bg-yellow-500/10" },
  { id: "privacy", label: "Privacy", desc: "Control your visibility and data.", icon: Shield, color: "text-rose-400", bg: "bg-rose-500/10" },
  { id: "connected_apps", label: "Connected Apps", desc: "Integrations with GitHub, Vercel and more.", icon: LinkIcon, color: "text-blue-400", bg: "bg-blue-500/10" },
  { id: "billing", label: "Billing", desc: "Manage your plan, payments and invoices.", icon: CreditCard, color: "text-zinc-400", bg: "bg-zinc-500/10" },
  { id: "usage", label: "Usage & Limits", desc: "Projects, storage, deployments and usage.", icon: BarChart2, color: "text-purple-400", bg: "bg-purple-500/10" },
  { id: "developer", label: "Developer Preferences", desc: "Editor, terminal, Git and more.", icon: Code2, color: "text-cyan-400", bg: "bg-cyan-500/10" },
  { id: "accessibility", label: "Accessibility", desc: "Make DevOS work better for you.", icon: Accessibility, color: "text-indigo-400", bg: "bg-indigo-500/10" },
  { id: "danger", label: "Danger Zone", desc: "Irreversible actions like deleting your account.", icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10" },
];

export default function SettingsPage() {
  const [user, loading] = useAuthState(auth);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("main");
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/login");
    if (user) {
      getDoc(doc(db, "user_settings", user.uid)).then(snap => {
        if (snap.exists()) setSettings(snap.data() as UserSettings);
      });
    }
  }, [user, loading, navigate]);

  const handleSave = async (field: string, value: string) => {
    if (!user || !settings) return;
    setSaving(true);
    try {
      await setDoc(doc(db, "user_settings", user.uid), { [field]: value }, { merge: true });
      setSettings({ ...settings, [field]: value });
      toast.success("Settings updated");
    } catch {
      toast.error("Failed to update");
    }
    setSaving(false);
  };

  if (loading || !settings) return <div className="min-h-screen bg-bg-base" />;

  const renderMain = () => (
    <div className="p-4 sm:p-6 pb-24 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-1">Settings</h1>
      <p className="text-sm text-white/50 mb-6">Manage your account, security and preferences.</p>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
        <input 
          type="text" 
          placeholder="Search settings..." 
          className="w-full bg-white/[0.03] border border-border-base rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-colors"
        />
      </div>

      <div className="space-y-2">
        {SETTINGS_MENU.map((item) => (
          <button 
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-white/[0.03] transition-colors text-left"
          >
            <div className="flex items-center gap-4">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", item.bg, item.color)}>
                <item.icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white/90">{item.label}</h3>
                <p className="text-xs text-white/40">{item.desc}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/20" />
          </button>
        ))}
      </div>
    </div>
  );

  const renderAccount = () => (
    <div className="p-4 sm:p-6 pb-24 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setActiveTab("main")} className="p-2 -ml-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-white">Account</h1>
      </div>

      <div className="bg-white/[0.02] border border-border-base rounded-3xl p-5 mb-8 flex items-center gap-4">
        <div className="relative">
          <img src={resolveAvatar(settings.avatarUrl || user?.photoURL)} className="w-16 h-16 rounded-2xl object-cover" />
          <button className="absolute -bottom-2 -right-2 w-7 h-7 bg-zinc-800 rounded-lg flex items-center justify-center border-2 border-bg-base text-white">
            <Camera className="w-3.5 h-3.5" />
          </button>
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="font-bold text-white">{settings.fullName || settings.displayName || "User"}</h2>
            <CheckCircle2 className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-sm text-white/50 mb-2">@{settings.username}</p>
          <button className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition-colors">
            Change Photo
          </button>
        </div>
      </div>

      <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4 px-1">Personal Information</h3>
      <div className="bg-white/[0.02] border border-border-base rounded-3xl overflow-hidden mb-8">
        {[
          { label: "Full Name", value: settings.fullName || settings.displayName || "", icon: User },
          { label: "Username", value: "@" + settings.username, icon: User },
          { label: "Email", value: user?.email || "", icon: LinkIcon },
          { label: "Bio", value: settings.bio || "Just a young Developer", icon: Code2 },
        ].map((field, i) => (
          <div key={i} className={cn("flex items-center justify-between p-4", i !== 0 && "border-t border-border-base")}>
            <div className="flex items-center gap-3">
              <field.icon className="w-4 h-4 text-white/40" />
              <div>
                <p className="text-xs text-white/40">{field.label}</p>
                <p className="text-sm text-white/90 font-medium">{field.value}</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-white/20" />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-bg-base">
      <Navbar />
      <div className="pt-16 min-h-screen">
        {activeTab === "main" && renderMain()}
        {activeTab === "account" && renderAccount()}
        {activeTab === "appearance" && (
           <div className="p-4 sm:p-6 pb-24 max-w-3xl mx-auto">
             <div className="flex items-center gap-3 mb-6">
               <button onClick={() => setActiveTab("main")} className="p-2 -ml-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white">
                 <ArrowLeft className="w-5 h-5" />
               </button>
               <h1 className="text-xl font-bold text-white">Appearance</h1>
             </div>
             
             <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-3xl p-5 mb-8 flex items-center gap-4">
               <div className="w-12 h-12 bg-purple-500/20 rounded-2xl flex items-center justify-center text-purple-400">
                 <Palette className="w-6 h-6" />
               </div>
               <div>
                 <h2 className="font-bold text-white">Make it yours</h2>
                 <p className="text-xs text-white/60 mt-1">Customize how DevOS looks and feels.</p>
               </div>
             </div>

             <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4 px-1">Theme</h3>
             <div className="grid grid-cols-3 gap-3 mb-8">
               <button className="flex flex-col items-center gap-3 p-4 rounded-2xl border border-border-base bg-white/[0.02] hover:bg-white/[0.04]">
                 <Sun className="w-6 h-6 text-white/40" />
                 <span className="text-sm font-medium text-white/60">Light</span>
               </button>
               <button className="flex flex-col items-center gap-3 p-4 rounded-2xl border-2 border-blue-500 bg-blue-500/5 relative overflow-hidden">
                 <Moon className="w-6 h-6 text-blue-400" />
                 <span className="text-sm font-bold text-blue-400">Dark</span>
                 <div className="absolute top-2 right-2 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center"><CheckCircle2 className="w-3 h-3 text-white" /></div>
               </button>
               <button className="flex flex-col items-center gap-3 p-4 rounded-2xl border border-border-base bg-white/[0.02] hover:bg-white/[0.04]">
                 <Monitor className="w-6 h-6 text-white/40" />
                 <span className="text-sm font-medium text-white/60">System</span>
               </button>
             </div>
           </div>
        )}
        {/* Placeholder for others */}
        {activeTab !== "main" && activeTab !== "account" && activeTab !== "appearance" && (
           <div className="p-4 sm:p-6 pb-24 max-w-3xl mx-auto text-center">
             <div className="flex items-center gap-3 mb-6">
               <button onClick={() => setActiveTab("main")} className="p-2 -ml-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white">
                 <ArrowLeft className="w-5 h-5" />
               </button>
               <h1 className="text-xl font-bold text-white capitalize">{activeTab.replace("_", " ")}</h1>
             </div>
             <p className="text-white/40 mt-12">This settings page is under construction.</p>
           </div>
        )}
      </div>
      <MobileBottomNav />
    </div>
  );
}
