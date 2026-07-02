import React from 'react';
import { Settings2, Loader2, Save, Search, User, Zap, Gift, Infinity, CheckCircle2, ChevronRight, Hash, Building2, Terminal, Code2, Play, Users, Clock, Plus, Trash2, Edit2 } from 'lucide-react';

export function AdminPollsTab(props: any) {
  // Props will be passed via adminTabProps
  const { ...adminTabProps } = props;
  const { 
    // Destructure needed props here or just use props.propName
  } = props;

  return (
    <>
      <div className="space-y-8 max-w-2xl">
                    {/* Create Poll */}
                    <div className="bg-surface border border-border-base rounded-2xl p-6">
                      <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                        <Vote className="w-4 h-4 text-blue-400" />
                        Create Poll
                      </h2>
                      <p className="text-white/40 text-sm mb-5">Published polls appear on the community feed for all users to vote on.</p>
                      <form onSubmit={handleCreatePoll} className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Question</label>
                          <input
                            type="text"
                            value={pollQuestion}
                            onChange={(e) => setPollQuestion(e.target.value)}
                            placeholder="e.g. What feature should we build next?"
                            required
                            className="w-full bg-white/5 border border-border-base rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Options</label>
                          {pollOptions.map((opt, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => { const next = [...pollOptions]; next[i] = e.target.value; setPollOptions(next); }}
                                placeholder={`Option ${i + 1}`}
                                className="flex-1 bg-white/5 border border-border-base rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                              />
                              {pollOptions.length > 2 && (
                                <button type="button" onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))} className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                          {pollOptions.length < 6 && (
                            <button type="button" onClick={() => setPollOptions([...pollOptions, ""])} className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors mt-1">
                              <Plus className="w-3.5 h-3.5" /> Add option
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Max Selections</label>
                            <input
                              type="number"
                              min="1"
                              max={pollOptions.filter(Boolean).length || 1}
                              value={pollMaxSelections}
                              onChange={(e) => setPollMaxSelections(parseInt(e.target.value, 10) || 1)}
                              className="w-full bg-white/5 border border-border-base rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Expires (optional)</label>
                            <input
                              type="datetime-local"
                              value={pollExpiry}
                              onChange={(e) => setPollExpiry(e.target.value)}
                              className="w-full bg-white/5 border border-border-base rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-border-base">
                          <input
                            id="pollAllowText"
                            type="checkbox"
                            checked={pollAllowText}
                            onChange={(e) => setPollAllowText(e.target.checked)}
                            className="w-4 h-4 accent-blue-500"
                          />
                          <label htmlFor="pollAllowText" className="text-sm text-white/70 cursor-pointer">Allow free-text answer</label>
                        </div>
                        <button
                          type="submit"
                          disabled={creatingPoll}
                          className="w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {creatingPoll ? <><Loader2 className="w-4 h-4 animate-spin" />Creating…</> : <><Vote className="w-4 h-4" />Create Poll</>}
                        </button>
                      </form>
                    </div>

                    {/* Poll list */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-bold text-white/70 uppercase tracking-widest">All Polls</h2>
                        <button onClick={loadPolls} className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white transition-all" title="Refresh">
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {loadingPolls ? (
                        <div className="flex items-center gap-2 text-white/30 text-sm py-6"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
                      ) : polls.length === 0 ? (
                        <p className="text-white/30 text-sm text-center py-8">No polls yet.</p>
                      ) : (
                        <div className="space-y-3">
                          {polls.map((p) => (
                            <div key={p.id} className="bg-surface border border-border-base rounded-2xl p-5">
                              <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="min-w-0">
                                  <p className="font-semibold text-white text-sm">{p.question}</p>
                                  <p className="text-xs text-white/30 mt-0.5">
                                    {p.options?.length ?? 0} options · {p.totalVotes ?? 0} votes
                                    {p.expiresAt && <> · expires {new Date(p.expiresAt instanceof Object && "toDate" in p.expiresAt ? (p.expiresAt as any).toDate() : p.expiresAt).toLocaleDateString()}</>}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${p.isOpen ? "bg-green-500/15 text-green-400" : "bg-white/10 text-white/30"}`}>
                                    {p.isOpen ? "Open" : "Closed"}
                                  </span>
                                  {p.isOpen && (
                                    <button
                                      onClick={() => handleClosePoll(p.id)}
                                      title="Close poll"
                                      className="p-1.5 rounded-lg text-white/30 hover:text-yellow-400 hover:bg-yellow-500/10 transition-all"
                                    >
                                      <XCircle className="w-4 h-4" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => setDeletePollConfirm(p.id)}
                                    title="Delete poll"
                                    className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                              <div className="space-y-1.5">
                                {p.options?.map((opt) => {
                                  const totalVotes = p.totalVotes ?? 0;
                                  const optVotes = opt.votes ?? 0;
                                  const pct = totalVotes > 0 ? Math.round((optVotes / totalVotes) * 100) : 0;
                                  return (
                                    <div key={opt.id} className="flex items-center gap-2 text-xs">
                                      <span className="text-white/60 w-32 truncate">{opt.text}</span>
                                      <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                                        <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                      </div>
                                      <span className="text-white/40 w-8 text-right">{pct}%</span>
                                    </div>
                                  );
                                })}
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
