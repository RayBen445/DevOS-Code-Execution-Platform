import React from 'react';
import { Settings2, Loader2, Save, Search, User, Zap, Gift, Infinity, CheckCircle2, ChevronRight, Hash, Building2, Terminal, Code2, Play, Users, Clock, Plus, Trash2, Edit2 } from 'lucide-react';

export function AdminFeedbackTab(props: any) {
  // Props will be passed via adminTabProps
  const { ...adminTabProps } = props;
  const { 
    // Destructure needed props here or just use props.propName
  } = props;

  return (
    <>
      <>
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="text-lg font-bold text-white">User Feedback</h2>
                        <p className="text-white/40 text-sm mt-1">Bug reports, feature requests, and general feedback.</p>
                      </div>
                      {openFeedbackCount > 0 && (
                        <span className="px-3 py-1 rounded-full bg-yellow-500/15 text-yellow-400 text-xs font-bold border border-yellow-500/20">
                          {openFeedbackCount} open
                        </span>
                      )}
                    </div>

                    {loadingFeedback ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
                      </div>
                    ) : feedbackItems.length === 0 ? (
                      <div className="text-center py-12">
                        <MessageSquare className="w-10 h-10 text-white/15 mx-auto mb-3" />
                        <p className="text-white/30 text-sm">No feedback yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {feedbackItems.map((item) => (
                          <div
                            key={item.id}
                            className={`bg-surface border rounded-2xl p-5 transition-all ${
                              item.status === "open" ? "border-border-base" : "border-border-base opacity-60"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  item.type === "bug"
                                    ? "bg-red-500/15 text-red-400 border-red-500/20"
                                    : item.type === "feature"
                                    ? "bg-purple-500/15 text-purple-400 border-purple-500/20"
                                    : "bg-blue-500/15 text-blue-400 border-blue-500/20"
                                }`}>
                                  {item.type === "bug" ? "🐛 Bug" : item.type === "feature" ? "✨ Feature" : "💬 Feedback"}
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  item.status === "open"
                                    ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                                    : item.status === "resolved"
                                    ? "bg-green-500/10 text-green-400 border-green-500/20"
                                    : "bg-white/5 text-white/30 border-border-base"
                                }`}>
                                  {item.status}
                                </span>
                              </div>
                              {item.status === "open" && (
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    onClick={() => handleResolveFeedback(item.id, "resolved")}
                                    disabled={resolvingFeedback === item.id}
                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-green-500/10 text-green-400 hover:bg-green-500/20 text-xs font-bold transition-all disabled:opacity-50"
                                  >
                                    {resolvingFeedback === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                    Resolve
                                  </button>
                                  <button
                                    onClick={() => handleResolveFeedback(item.id, "dismissed")}
                                    disabled={resolvingFeedback === item.id}
                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/5 text-white/30 hover:bg-white/10 hover:text-white text-xs font-bold transition-all disabled:opacity-50"
                                  >
                                    <X className="w-3 h-3" />
                                    Dismiss
                                  </button>
                                </div>
                              )}
                            </div>
                            <p className="text-sm text-white/80 mt-3 leading-relaxed">{item.message}</p>
                            <div className="flex items-center gap-3 mt-3 text-[11px] text-white/30">
                              {item.userEmail && <span>From: {item.userEmail}</span>}
                              {item.createdAt && (
                                <span>{new Date(item.createdAt.toDate?.() ?? item.createdAt).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                
    </>
  );
}
