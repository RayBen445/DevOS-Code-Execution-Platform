import React from 'react';
import { Settings2, Loader2, Save, Search, User, Zap, Gift, Infinity, CheckCircle2, ChevronRight, Hash, Building2, Terminal, Code2, Play, Users, Clock, Plus, Trash2, Edit2 } from 'lucide-react';

export function AdminCommunitiesTab(props: any) {
  // Props will be passed via adminTabProps
  const { ...adminTabProps } = props;
  const { 
    // Destructure needed props here or just use props.propName
  } = props;

  return (
    <>
      <div className="space-y-6">
                    {/* Header row */}
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-white/40">{communities.length} community{communities.length !== 1 ? "ies" : ""} total</p>
                      <div className="flex items-center gap-2">
                        <button onClick={loadCommunities} disabled={loadingCommunities} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors">
                          <RefreshCw className={`w-3.5 h-3.5 ${loadingCommunities ? "animate-spin" : ""}`} />
                          Refresh
                        </button>
                        <button onClick={() => setShowCreateCommunity((v) => !v)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors">
                          <Plus className="w-3.5 h-3.5" />
                          New Community
                        </button>
                      </div>
                    </div>

                    {/* Create-community form */}
                    {showCreateCommunity && (
                      <form onSubmit={handleAdminCreateCommunity} className="bg-surface border border-blue-500/30 rounded-2xl p-5 space-y-3">
                        <p className="text-sm font-bold text-white mb-1 flex items-center gap-2"><Plus className="w-4 h-4 text-blue-400" />Create New Community</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Name *</label>
                            <input value={newCommunityName} onChange={(e) => setNewCommunityName(e.target.value)} placeholder="DevOS Community" required className="w-full bg-black/40 border border-border-base rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Category</label>
                            <input value={newCommunityCategory} onChange={(e) => setNewCommunityCategory(e.target.value)} placeholder="general" className="w-full bg-black/40 border border-border-base rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Description</label>
                          <textarea value={newCommunityDesc} onChange={(e) => setNewCommunityDesc(e.target.value)} rows={2} placeholder="What is this community about?" className="w-full bg-black/40 border border-border-base rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500 resize-none" />
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <button type="button" onClick={() => setNewCommunityPublic((v) => !v)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${newCommunityPublic ? "bg-green-600/10 border-green-500/30 text-green-400" : "bg-white/5 border-border-base text-white/40"}`}>
                            {newCommunityPublic ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                            {newCommunityPublic ? "Public" : "Private"}
                          </button>
                          <button type="button" onClick={() => setNewCommunityOfficial((v) => !v)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${newCommunityOfficial ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400" : "bg-white/5 border-border-base text-white/40"}`}>
                            <BadgeCheck className="w-4 h-4" />
                            {newCommunityOfficial ? "Official ✓" : "Mark Official"}
                          </button>
                          <div className="flex-1" />
                          <button type="button" onClick={() => setShowCreateCommunity(false)} className="px-4 py-1.5 rounded-xl text-xs font-bold bg-white/5 text-white/50 hover:bg-white/10 transition-colors">Cancel</button>
                          <button type="submit" disabled={creatingCommunity || !newCommunityName.trim()} className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
                            {creatingCommunity ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                            Create
                          </button>
                        </div>
                      </form>
                    )}

                    {loadingCommunities ? (
                      <div className="flex items-center gap-2 text-white/40 py-8 justify-center">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Loading communities…
                      </div>
                    ) : communities.length === 0 ? (
                      <div className="text-center py-12 text-white/30">
                        <Users2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">No communities yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {communities.map((c) => (
                          <div key={c.id} className="bg-surface border border-border-base rounded-2xl p-5">
                            {editingCommunity?.id === c.id ? (
                              <form onSubmit={handleSaveCommunity} className="space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Name</label>
                                    <input
                                      value={communityEditName}
                                      onChange={(e) => setCommunityEditName(e.target.value)}
                                      className="w-full bg-black/40 border border-border-base rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500"
                                      required
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Category</label>
                                    <input
                                      value={communityEditCategory}
                                      onChange={(e) => setCommunityEditCategory(e.target.value)}
                                      placeholder="general"
                                      className="w-full bg-black/40 border border-border-base rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Description</label>
                                  <textarea
                                    value={communityEditDesc}
                                    onChange={(e) => setCommunityEditDesc(e.target.value)}
                                    rows={2}
                                    className="w-full bg-black/40 border border-border-base rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500 resize-none"
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setCommunityEditPublic(v => !v)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${communityEditPublic ? "bg-green-600/10 border-green-500/30 text-green-400" : "bg-white/5 border-border-base text-white/40"}`}
                                  >
                                    {communityEditPublic ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                                    {communityEditPublic ? "Public" : "Private"}
                                  </button>
                                  <div className="flex-1" />
                                  <button
                                    type="button"
                                    onClick={() => setEditingCommunity(null)}
                                    className="px-4 py-1.5 rounded-xl text-xs font-bold bg-white/5 text-white/50 hover:bg-white/10 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="submit"
                                    disabled={savingCommunity}
                                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                  >
                                    {savingCommunity ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                    Save
                                  </button>
                                </div>
                              </form>
                            ) : (
                              <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-bold text-white text-sm">{c.name}</p>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/40 font-mono">/{c.slug}</span>
                                    {c.category && (
                                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-600/10 text-blue-400 border border-blue-500/20">{c.category}</span>
                                    )}
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${c.isPublic ? "bg-green-600/10 text-green-400" : "bg-orange-600/10 text-orange-400"}`}>
                                      {c.isPublic ? "Public" : "Private"}
                                    </span>
                                    {c.isOfficial && (
                                      <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 font-bold">
                                        <BadgeCheck className="w-3 h-3" /> Official
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-white/40 mt-1 line-clamp-2">{c.description || <span className="italic opacity-50">No description</span>}</p>
                                  <p className="text-[10px] text-white/25 mt-1">
                                    {c.memberCount ?? 0} member{(c.memberCount ?? 0) !== 1 ? "s" : ""}
                                    {" · "}
                                    <a href={`/c/${c.slug}`} target="_blank" rel="noopener noreferrer" className="text-blue-400/60 hover:text-blue-400 transition-colors">View ↗</a>
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <button
                                    onClick={() => handleEditCommunity(c)}
                                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                                    title="Edit"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setDeleteCommunityConfirm(c.id)}
                                    className="p-1.5 rounded-lg bg-red-600/10 hover:bg-red-600/20 text-red-400 hover:text-red-300 transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                
    </>
  );
}
