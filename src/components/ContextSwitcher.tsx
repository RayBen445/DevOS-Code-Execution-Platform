import React, { useState, useEffect } from "react";
import { auth } from "../lib/firebase";
import { subscribeUserOrgs } from "../lib/orgService";
import { Organization } from "../types";
import { useActiveContext } from "../hooks/useActiveContext";
import { ChevronDown, Building2, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ContextSwitcher() {
  const { context, setUserContext, setOrgContext } = useActiveContext();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) return;
    return subscribeUserOrgs(auth.currentUser.uid, (fetchedOrgs) => {
      setOrgs(fetchedOrgs);
    });
  }, []);

  const handleSelectUser = () => {
    if (auth.currentUser) {
      setUserContext(auth.currentUser.uid);
    }
    setIsOpen(false);
  };

  const handleSelectOrg = (org: Organization) => {
    setOrgContext(org.id, org.slug, org.name);
    setIsOpen(false);
  };

  const isUserContext = !context || context.type === "user";

  return (
    <div className="relative mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 rounded-xl bg-[#0d1117] border border-[#21262D] hover:border-blue-500/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
            {isUserContext ? <User className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-0.5">Active Context</p>
            <p className="text-sm font-medium text-white truncate max-w-[120px]">
              {isUserContext ? "Personal Account" : (context as any).name}
            </p>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-[#0d1117] border border-[#21262D] rounded-xl overflow-hidden shadow-2xl z-50"
          >
            <div className="p-2 space-y-1">
              <button
                onClick={handleSelectUser}
                className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                  isUserContext ? "bg-blue-500/10 text-blue-400" : "hover:bg-white/5 text-white/70"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isUserContext ? "bg-blue-500/20" : "bg-black/40 border border-white/10"}`}>
                  <User className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium">Personal Account</span>
              </button>
              
              {orgs.length > 0 && <div className="h-px bg-white/10 my-2 mx-2" />}
              
              {orgs.map((org) => {
                const isSelected = context?.type === "org" && context.id === org.id;
                return (
                  <button
                    key={org.id}
                    onClick={() => handleSelectOrg(org)}
                    className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                      isSelected ? "bg-blue-500/10 text-blue-400" : "hover:bg-white/5 text-white/70"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 overflow-hidden ${isSelected ? "bg-blue-500/20" : "bg-black/40 border border-white/10"}`}>
                      {org.avatar ? (
                        <img src={org.avatar} alt={org.name} className="w-full h-full object-cover" />
                      ) : (
                        <Building2 className="w-4 h-4" />
                      )}
                    </div>
                    <span className="text-sm font-medium truncate">{org.name}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
