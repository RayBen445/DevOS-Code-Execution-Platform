import React from "react";
import { Settings2, Loader2, Save, Search, User, Zap, Gift, Infinity, CheckCircle2 } from "lucide-react";

// Helper function to concatenate classNames
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

export function AdminCreditsTab(props: any) {
  const {
    loadingConfig, config, saveGlobalCreditConfig, savingConfig,
    globalCost, setGlobalCost, globalCreditsEnabled, setGlobalCreditsEnabled,
    targetUid, setTargetUid, creditAmount, setCreditAmount, operation, setOperation,
    handleAddOrDeductCredits, adjusting,
    giftTarget, setGiftTarget, giftAmount, setGiftAmount, giftExpiry, setGiftExpiry,
    handleGiftCredits, gifting,
    unlimitedTarget, setUnlimitedTarget, unlimitedUntil, setUnlimitedUntil,
    handleGrantUnlimited, grantingUnlimited,
    users
  } = props;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* Left Column: Configuration and Actions */}
        <div className="space-y-6">
          
          {/* Global Credit Config */}
          <div className="bg-surface border border-border-base rounded-2xl p-6 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2 relative z-10">
              <Settings2 className="w-5 h-5 text-purple-400" />
              Global Credit Config
            </h2>
            <p className="text-white/40 text-sm mb-6 relative z-10">Control whether credits are enforced platform-wide and set a universal action cost.</p>
            {loadingConfig ? (
              <div className="flex items-center gap-2 text-white/30 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Loading config…</div>
            ) : config ? (
              <form onSubmit={saveGlobalCreditConfig} className="space-y-6 relative z-10">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Enforce Credits</label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input type="radio" checked={globalCreditsEnabled} onChange={() => setGlobalCreditsEnabled(true)} className="hidden" />
                      <div className={cn("w-4 h-4 rounded-full border flex items-center justify-center transition-all", globalCreditsEnabled ? "border-purple-500 bg-purple-500/20" : "border-border-base bg-black/20 group-hover:border-white/20")}>
                        {globalCreditsEnabled && <div className="w-2 h-2 bg-purple-400 rounded-full" />}
                      </div>
                      <span className={cn("text-sm transition-colors", globalCreditsEnabled ? "text-purple-300 font-bold" : "text-white/50 group-hover:text-white/80")}>Enabled</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input type="radio" checked={!globalCreditsEnabled} onChange={() => setGlobalCreditsEnabled(false)} className="hidden" />
                      <div className={cn("w-4 h-4 rounded-full border flex items-center justify-center transition-all", !globalCreditsEnabled ? "border-red-500 bg-red-500/20" : "border-border-base bg-black/20 group-hover:border-white/20")}>
                        {!globalCreditsEnabled && <div className="w-2 h-2 bg-red-400 rounded-full" />}
                      </div>
                      <span className={cn("text-sm transition-colors", !globalCreditsEnabled ? "text-red-300 font-bold" : "text-white/50 group-hover:text-white/80")}>Disabled (Free for all)</span>
                    </label>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Global Action Cost</label>
                  <input
                    type="number"
                    min="0"
                    value={globalCost}
                    onChange={(e) => setGlobalCost(Number(e.target.value))}
                    className="w-full bg-black/40 border border-border-base rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-all shadow-inner"
                  />
                  <p className="text-xs text-white/30 mt-1">If 0, actions are essentially free even if enabled.</p>
                </div>
                <button type="submit" disabled={savingConfig} className="flex items-center justify-center gap-2 w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50">
                  {savingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {savingConfig ? "Saving..." : "Save Global Config"}
                </button>
              </form>
            ) : (
              <p className="text-red-400 text-sm">Failed to load config.</p>
            )}
          </div>

          {/* Adjust User Credits */}
          <div className="bg-surface border border-border-base rounded-2xl p-6 shadow-lg">
            <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-400" />
              Adjust User Credits
            </h2>
            <p className="text-white/40 text-sm mb-5">Manually add or remove credits for a specific user.</p>
            <form onSubmit={handleAddOrDeductCredits} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Target UID</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type="text"
                    value={targetUid}
                    onChange={(e) => setTargetUid(e.target.value)}
                    placeholder="Paste user UID..."
                    required
                    className="w-full bg-black/40 border border-border-base rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all shadow-inner text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Amount</label>
                  <input
                    type="number"
                    min="1"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                    required
                    className="w-full bg-black/40 border border-border-base rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all shadow-inner"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Operation</label>
                  <div className="flex border border-border-base rounded-xl overflow-hidden p-1 bg-black/20">
                    {["add", "deduct"].map((op) => (
                      <button
                        key={op}
                        type="button"
                        onClick={() => setOperation(op)}
                        className={cn(
                          "flex-1 py-2 text-sm font-bold rounded-lg capitalize transition-all",
                          operation === op ? (op === "add" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400") : "text-white/40 hover:text-white"
                        )}
                      >
                        {op}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button type="submit" disabled={adjusting || !targetUid} className="w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white active:scale-95 disabled:opacity-50">
                {adjusting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {adjusting ? "Adjusting..." : "Apply Adjustment"}
              </button>
            </form>
          </div>

        </div>

        {/* Right Column: Gift, Unlimited, Overview */}
        <div className="space-y-6">
          
          {/* Gift Credits */}
          <div className="bg-surface border border-border-base rounded-2xl p-6 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2 relative z-10">
              <Gift className="w-5 h-5 text-green-400" />
              Gift Credits
            </h2>
            <p className="text-white/40 text-sm mb-5 relative z-10">Give a user bonus credits with an optional expiry date.</p>
            <form onSubmit={handleGiftCredits} className="space-y-4 relative z-10">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Target User</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type="text"
                    value={giftTarget}
                    onChange={(e) => setGiftTarget(e.target.value)}
                    placeholder="username, email, or UID"
                    required
                    className="w-full bg-black/40 border border-border-base rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-green-500 transition-all shadow-inner text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Amount</label>
                  <input
                    type="number"
                    min="1"
                    value={giftAmount}
                    onChange={(e) => setGiftAmount(e.target.value)}
                    required
                    className="w-full bg-black/40 border border-border-base rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-all shadow-inner"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Expires (optional)</label>
                  <input
                    type="date"
                    value={giftExpiry}
                    onChange={(e) => setGiftExpiry(e.target.value)}
                    className="w-full bg-black/40 border border-border-base rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-all shadow-inner text-sm"
                  />
                </div>
              </div>
              <button type="submit" disabled={gifting || !giftTarget} className="w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                {gifting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
                {gifting ? "Gifting..." : "Gift Credits"}
              </button>
            </form>
          </div>

          {/* Unlimited Credits Pass */}
          <div className="bg-surface border border-border-base rounded-2xl p-6 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2 relative z-10">
              <Infinity className="w-5 h-5 text-yellow-400" />
              Grant Unlimited Pass
            </h2>
            <p className="text-white/40 text-sm mb-5 relative z-10">Give a user unlimited credits until a specified date.</p>
            <form onSubmit={handleGrantUnlimited} className="space-y-4 relative z-10">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Target User</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type="text"
                    value={unlimitedTarget}
                    onChange={(e) => setUnlimitedTarget(e.target.value)}
                    placeholder="username, email, or UID"
                    required
                    className="w-full bg-black/40 border border-border-base rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-yellow-500 transition-all shadow-inner text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Valid Until</label>
                <input
                  type="date"
                  value={unlimitedUntil}
                  onChange={(e) => setUnlimitedUntil(e.target.value)}
                  required
                  className="w-full bg-black/40 border border-border-base rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500 transition-all shadow-inner text-sm"
                />
              </div>
              <button type="submit" disabled={grantingUnlimited || !unlimitedTarget} className="w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                {grantingUnlimited ? <Loader2 className="w-4 h-4 animate-spin" /> : <Infinity className="w-4 h-4" />}
                {grantingUnlimited ? "Granting..." : "Grant Unlimited Pass"}
              </button>
            </form>
          </div>

          {/* User Credits Overview */}
          <div className="bg-surface border border-border-base rounded-2xl p-6 shadow-lg max-h-[600px] overflow-y-auto flex flex-col">
            <h2 className="text-lg font-bold text-white mb-4 sticky top-0 bg-surface z-10 pb-2 border-b border-border-base">User Credits Overview</h2>
            <div className="space-y-2">
              {users && users.length > 0 ? users.map((u: any) => (
                <div key={u.uid} className="p-4 rounded-xl bg-black/20 border border-white/[0.03] hover:border-white/[0.08] transition-colors flex items-center justify-between">
                  <div className="overflow-hidden pr-2">
                    <p className="font-bold text-white text-sm truncate">@{u.username}</p>
                    <p className="text-xs text-white/30 truncate">{u.email}</p>
                  </div>
                  <div className="text-right text-sm shrink-0">
                    <p className="text-yellow-400 font-bold flex items-center gap-1 justify-end">
                      <Zap className="w-3 h-3" />
                      {u.credits ? `${(u.credits.daily || 0) + (u.credits.monthly || 0)}` : "0"} total
                    </p>
                    {u.credits && (
                      <p className="text-white/30 text-[10px] uppercase tracking-wider">{u.credits.daily || 0} D + {u.credits.monthly || 0} M</p>
                    )}
                  </div>
                </div>
              )) : (
                <p className="text-white/30 text-sm text-center py-4">No users found.</p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
