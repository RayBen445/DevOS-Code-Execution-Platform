import React from 'react';
import { Settings2, Loader2, Save, Search, User, Zap, Gift, Infinity, CheckCircle2, ChevronRight, Hash, Building2, Terminal, Code2, Play, Users, Clock, Plus, Trash2, Edit2 } from 'lucide-react';

export function AdminRedeemTab(props: any) {
  // Props will be passed via adminTabProps
  const { ...adminTabProps } = props;
  const { 
    // Destructure needed props here or just use props.propName
  } = props;

  return (
    <>
      <div className="space-y-8">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Gift className="w-4 h-4 text-yellow-400" />
                        Redeem Codes
                      </h2>
                      <div className="flex gap-2">
                        <button onClick={loadRedeemCodes} className="p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-colors" title="Refresh">
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        <button onClick={() => setShowCreateCode((v) => !v)} className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl font-bold text-sm transition-all">
                          <Plus className="w-4 h-4" />
                          Create Code
                        </button>
                      </div>
                    </div>

                    {showCreateCode && (
                      <form onSubmit={handleCreateRedeemCode} className="bg-surface border border-border-base rounded-2xl p-6 space-y-4 max-w-xl">
                        <h3 className="text-base font-bold text-white">New Redeem Code</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5 col-span-2">
                            <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Code</label>
                            <input type="text" value={newCode} onChange={(e) => setNewCode(e.target.value.toUpperCase())} className="w-full bg-white/5 border border-border-base rounded-xl px-4 py-2.5 text-white font-mono tracking-widest focus:outline-none focus:border-yellow-500/50 transition-all uppercase" required placeholder="DEVOS2024" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Credits Value</label>
                            <input type="number" value={newCodeValue} onChange={(e) => setNewCodeValue(e.target.value)} className="w-full bg-white/5 border border-border-base rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500/50 transition-all" min="1" required />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Usage Limit (-1 = ∞)</label>
                            <input type="number" value={newCodeUsageLimit} onChange={(e) => setNewCodeUsageLimit(e.target.value)} className="w-full bg-white/5 border border-border-base rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500/50 transition-all" required />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Per User Limit</label>
                            <input type="number" value={newCodePerUser} onChange={(e) => setNewCodePerUser(e.target.value)} className="w-full bg-white/5 border border-border-base rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500/50 transition-all" min="1" required />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Expires At (optional)</label>
                            <input type="datetime-local" value={newCodeExpiry} onChange={(e) => setNewCodeExpiry(e.target.value)} className="w-full bg-white/5 border border-border-base rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500/50 transition-all" />
                          </div>
                        </div>
                        <div className="flex gap-3 pt-2">
                          <button type="button" onClick={() => setShowCreateCode(false)} className="px-5 py-2.5 rounded-xl font-bold text-white/40 hover:text-white transition-colors">Cancel</button>
                          <button type="submit" disabled={creatingCode} className="px-6 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl font-bold transition-all flex items-center gap-2 disabled:opacity-60">
                            {creatingCode && <Loader2 className="w-4 h-4 animate-spin" />}
                            {creatingCode ? "Creating..." : "Create Code"}
                          </button>
                        </div>
                      </form>
                    )}

                    {loadingCodes ? (
                      <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-white/20 animate-spin" /></div>
                    ) : redeemCodes.length === 0 ? (
                      <div className="py-12 text-center text-white/20 text-sm">No redeem codes yet.</div>
                    ) : (
                      <div className="space-y-3">
                        {redeemCodes.map((code) => (
                          <div key={code.id} className="p-4 rounded-2xl bg-surface border border-border-base flex items-center gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="font-mono font-bold text-white tracking-widest">{code.id}</span>
                                <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold uppercase", code.isActive ? "bg-green-500/10 text-green-400" : "bg-white/5 text-white/20")}>
                                  {code.isActive ? "Active" : "Disabled"}
                                </span>
                              </div>
                              <p className="text-xs text-white/40">
                                +{code.value} credits · Used {code.usedCount} / {code.usageLimit === -1 ? "∞" : code.usageLimit} · {code.perUserLimit}×/user
                                {code.expiresAt && <> · Expires {new Date(code.expiresAt.toMillis?.() ?? code.expiresAt).toLocaleDateString()}</>}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button onClick={() => handleToggleCode(code.id, code.isActive)} className={cn("p-2 rounded-lg transition-all", code.isActive ? "bg-green-500/10 text-green-400 hover:bg-green-500/20" : "bg-white/5 text-white/30 hover:bg-white/10")} title={code.isActive ? "Disable" : "Enable"}>
                                {code.isActive ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                              </button>
                              <button onClick={() => handleDeleteCode(code.id)} className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all" title="Delete">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                
    </>
  );
}
