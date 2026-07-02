import React from 'react';
import { Settings2, Loader2, Save, Search, User, Zap, Gift, Infinity, CheckCircle2, ChevronRight, Hash, Building2, Terminal, Code2, Play, Users, Clock, Plus, Trash2, Edit2 } from 'lucide-react';

export function AdminReservedTab(props: any) {
  // Props will be passed via adminTabProps
  const { ...adminTabProps } = props;
  const { 
    // Destructure needed props here or just use props.propName
  } = props;

  return (
    <>
      <div className="space-y-6 max-w-xl">
                    <div className="bg-surface border border-border-base rounded-2xl p-6">
                      <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                        <AtSign className="w-4 h-4 text-blue-400" />
                        Reserve a Username
                      </h2>
                      <p className="text-white/40 text-sm mb-5">
                        Reserved usernames cannot be registered by anyone. Use this to protect brand names.
                      </p>
                      <form onSubmit={handleReserveName} className="flex gap-2">
                        <input
                          type="text"
                          value={newReservedName}
                          onChange={(e) => setNewReservedName(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                          placeholder="e.g. devos, admin, support"
                          className="flex-1 bg-white/5 border border-border-base rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500 font-mono"
                        />
                        <button
                          type="submit"
                          disabled={savingReserved || !newReservedName.trim()}
                          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all"
                        >
                          {savingReserved ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                          Reserve
                        </button>
                      </form>
                    </div>

                    <div className="bg-surface border border-border-base rounded-2xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-bold text-white/70 uppercase tracking-widest">Reserved List</h2>
                        <button
                          onClick={loadReservedNames}
                          className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white transition-all"
                          title="Refresh"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {loadingReserved ? (
                        <div className="flex items-center gap-2 text-white/30 text-sm py-4">
                          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                        </div>
                      ) : reservedNames.length === 0 ? (
                        <p className="text-white/30 text-sm py-4 text-center">No reserved names yet.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {reservedNames.map((name) => (
                            <div key={name} className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 border border-border-base">
                              <span className="text-sm font-mono text-white/80">@{name}</span>
                              <div className="flex items-center gap-2">
                                {reservedPortfolios[name] ? (
                                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400/70 uppercase tracking-wider">
                                    <CheckCircle2 className="w-3 h-3" /> Portfolio
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleCreateReservedPortfolio(name)}
                                    disabled={creatingReservedPortfolio === name}
                                    title={`Create portfolio for @${name}`}
                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all text-xs font-bold disabled:opacity-50"
                                  >
                                    {creatingReservedPortfolio === name
                                      ? <Loader2 className="w-3 h-3 animate-spin" />
                                      : <Plus className="w-3 h-3" />}
                                    Portfolio
                                  </button>
                                )}
                                <button
                                  onClick={() => handleUnreserveName(name)}
                                  className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                  title="Remove"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                
    </>
  );
}
