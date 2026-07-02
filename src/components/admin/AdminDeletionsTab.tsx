import React from 'react';
import { Settings2, Loader2, Save, Search, User, Zap, Gift, Infinity, CheckCircle2, ChevronRight, Hash, Building2, Terminal, Code2, Play, Users, Clock, Plus, Trash2, Edit2 } from 'lucide-react';

export function AdminDeletionsTab(props: any) {
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
                        <h2 className="text-lg font-bold text-white">Account Deletion Requests</h2>
                        <p className="text-white/40 text-sm mt-1">Users who have requested their account to be deleted.</p>
                      </div>
                      {pendingDeletionCount > 0 && (
                        <span className="px-3 py-1 rounded-full bg-red-500/15 text-red-400 text-xs font-bold border border-red-500/20">
                          {pendingDeletionCount} pending
                        </span>
                      )}
                    </div>

                    {loadingDeletions ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
                      </div>
                    ) : deletionRequests.length === 0 ? (
                      <div className="text-center py-12">
                        <Trash2 className="w-10 h-10 text-white/15 mx-auto mb-3" />
                        <p className="text-white/30 text-sm">No deletion requests.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {deletionRequests.map((req) => (
                          <div
                            key={req.id}
                            className={`bg-surface border rounded-2xl p-5 transition-all ${
                              req.status === "pending" ? "border-red-500/20" : "border-border-base opacity-50"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3 flex-wrap">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                    req.status === "pending"
                                      ? "bg-red-500/15 text-red-400 border-red-500/20"
                                      : "bg-green-500/10 text-green-400 border-green-500/20"
                                  }`}>
                                    {req.status}
                                  </span>
                                </div>
                                <p className="text-sm font-semibold text-white">{req.email}</p>
                                <p className="text-xs text-white/40 font-mono mt-0.5">{req.userId}</p>
                                {req.reason && (
                                  <p className="text-xs text-white/50 mt-2 italic">"{req.reason}"</p>
                                )}
                                {req.requestedAt && (
                                  <p className="text-[11px] text-white/25 mt-1">
                                    {new Date(req.requestedAt.toDate?.() ?? req.requestedAt).toLocaleString()}
                                  </p>
                                )}
                              </div>
                              {req.status === "pending" && (
                                <button
                                  onClick={() => handleMarkDeletionProcessed(req.id)}
                                  disabled={processingDeletion === req.id}
                                  className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-500/10 text-green-400 hover:bg-green-500/20 text-xs font-bold transition-all disabled:opacity-50"
                                >
                                  {processingDeletion === req.id
                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    : <Check className="w-3.5 h-3.5" />}
                                  Mark Processed
                                </button>
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
