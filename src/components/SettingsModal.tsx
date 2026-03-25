import React, { useState, useEffect } from "react";
import { X, Github, Globe, Loader2, Save, Check, User, AtSign, FileText, Image as ImageIcon, Zap, Upload } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { db, auth, storage } from "../lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatar, setAvatar] = useState("");
  const [githubInstallationId, setGithubInstallationId] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && auth.currentUser) {
      fetchSettings();
    }
  }, [isOpen]);

  const fetchSettings = async () => {
    if (!auth.currentUser) return;
    setIsLoading(true);
    try {
      // Try fetching from users collection first (public profile)
      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
      const settingsDoc = await getDoc(doc(db, "user_settings", auth.currentUser.uid));
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUsername(data.username || "");
        setDisplayName(data.displayName || auth.currentUser.displayName || "");
        setFullName(data.fullName || "");
        setBio(data.bio || "");
        setAvatarUrl(data.avatarUrl || auth.currentUser.photoURL || "");
        setAvatar(data.avatar || "");
      } else if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        setUsername(data.username || "");
        setDisplayName(data.displayName || auth.currentUser.displayName || "");
        setFullName(data.fullName || "");
        setBio(data.bio || "");
        setAvatarUrl(data.avatarUrl || auth.currentUser.photoURL || "");
        setAvatar(data.avatar || "");
      } else {
        setDisplayName(auth.currentUser.displayName || "");
        setAvatarUrl(auth.currentUser.photoURL || "");
      }

      if (settingsDoc.exists()) {
        setGithubInstallationId(settingsDoc.data().githubInstallationId || null);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!auth.currentUser) return;
    setIsSaving(true);
    try {
      const publicData = {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        username,
        displayName,
        fullName,
        bio,
        avatarUrl,
        avatar,
        updatedAt: serverTimestamp()
      };

      const privateData = {
        username,
        displayName,
        fullName,
        bio,
        avatarUrl,
        avatar,
        updatedAt: serverTimestamp()
      };

      // Save to public profile
      await setDoc(doc(db, "users", auth.currentUser.uid), publicData, { merge: true });
      
      // Save to private settings
      await setDoc(doc(db, "user_settings", auth.currentUser.uid), privateData, { merge: true });

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    setIsUploading(true);
    setUploadProgress(0);
    const storageRef = ref(storage, `avatars/${auth.currentUser.uid}/${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        console.error("Upload error:", error);
        setIsUploading(false);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        setAvatarUrl(downloadURL);
        setAvatar(downloadURL);
        
        // Persist immediately to both collections
        const updateData = {
          avatarUrl: downloadURL,
          avatar: downloadURL,
          updatedAt: serverTimestamp()
        };

        await setDoc(doc(db, "users", auth.currentUser!.uid), {
          ...updateData,
          uid: auth.currentUser!.uid,
          email: auth.currentUser!.email
        }, { merge: true });

        await setDoc(doc(db, "user_settings", auth.currentUser!.uid), updateData, { merge: true });
        
        setIsUploading(false);
      }
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-[#111] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
          >
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                Profile Settings
              </h2>
              <div className="flex items-center gap-2">
                {username && (
                  <Link
                    to={`/u/${username}`}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600/10 text-blue-500 hover:bg-blue-600 hover:text-white text-xs font-bold transition-all"
                  >
                    <Globe className="w-3 h-3" />
                    View Portfolio
                  </Link>
                )}
                <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                  <X className="w-5 h-5 text-white/40" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              {isLoading ? (
                <div className="py-12 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Profile Section */}
                  <div className="flex items-center gap-6 mb-8">
                    <div className="relative group">
                      <div className="w-24 h-24 rounded-2xl bg-white/5 border border-white/10 overflow-hidden relative">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/20">
                            <User className="w-10 h-10" />
                          </div>
                        )}
                        {isUploading && (
                          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-4">
                            <Loader2 className="w-6 h-6 text-blue-500 animate-spin mb-2" />
                            <div className="w-full bg-white/10 rounded-full h-1 overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${uploadProgress}%` }}
                                className="h-full bg-blue-500"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      <label className="absolute -bottom-2 -right-2 p-2 bg-blue-600 rounded-xl cursor-pointer hover:bg-blue-700 transition-colors shadow-lg">
                        <Upload className="w-4 h-4 text-white" />
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUploading} />
                      </label>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white">{fullName || displayName || "Your Name"}</h3>
                      <p className="text-white/40 text-sm">@{username || "username"}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                        <User className="w-3 h-3" />
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                        <AtSign className="w-3 h-3" />
                        Username
                      </label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))}
                        placeholder="johndoe"
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                      <ImageIcon className="w-3 h-3" />
                      Avatar URL
                    </label>
                    <input
                      type="text"
                      value={avatar}
                      onChange={(e) => setAvatar(e.target.value)}
                      placeholder="https://example.com/avatar.jpg"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                      <FileText className="w-3 h-3" />
                      Bio
                    </label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell us about yourself..."
                      rows={3}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors resize-none"
                    />
                  </div>

                  {/* GitHub Status commented out as requested */}
                  <div className="pt-4 space-y-4">
                    {/* <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Github className="w-5 h-5 text-white" />
                          <span className="font-bold text-sm">GitHub Integration</span>
                        </div>
                        {githubInstallationId ? (
                          <span className="px-2 py-1 rounded-full bg-green-500/10 text-green-500 text-[10px] font-bold uppercase">Connected</span>
                        ) : (
                          <span className="px-2 py-1 rounded-full bg-white/5 text-white/40 text-[10px] font-bold uppercase">Not Connected</span>
                        )}
                      </div>
                      <p className="text-[11px] text-white/40">
                        {githubInstallationId 
                          ? "Your GitHub App is installed and linked to your account." 
                          : "Install the GitHub App to import your repositories directly into DevOS."}
                      </p>
                    </div> */}

                    <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/20">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Zap className="w-5 h-5 text-blue-400" />
                          <span className="font-bold text-sm text-white">DevOS Pro</span>
                        </div>
                        <span className="px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-wider">Free Plan</span>
                      </div>
                      <p className="text-[11px] text-white/60 mb-4">
                        Unlock unlimited projects, custom domains, and advanced collaboration features.
                      </p>
                      <button className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all">
                        Upgrade to Pro
                      </button>
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : showSuccess ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      {showSuccess ? "Profile Saved" : "Save Changes"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
