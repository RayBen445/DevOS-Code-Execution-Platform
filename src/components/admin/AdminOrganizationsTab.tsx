import React from 'react';
import { Settings2, Loader2, Save, Search, User, Zap, Gift, Infinity, CheckCircle2, ChevronRight, Hash, Building2, Terminal, Code2, Play, Users, Clock, Plus, Trash2, Edit2 } from 'lucide-react';

export function AdminOrganizationsTab(props: any) {
  // Props will be passed via adminTabProps
  const { ...adminTabProps } = props;
  const { 
    // Destructure needed props here or just use props.propName
  } = props;

  return (
    <>
      <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-white/40">{orgs.length} organization{orgs.length !== 1 ? "s" : ""} total</p>
                      <div className="flex items-center gap-2">
                        <button onClick={loadOrgs} disabled={loadingOrgs} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors">
                          <RefreshCw className={`w-3.5 h-3.5 ${loadingOrgs ? "animate-spin" : ""}`} />
                          Refresh
                        </button>
                        <button onClick={() => setShowCreateOrg((v) => !v)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors">
                          <Plus className="w-3.5 h-3.5" />
                          New Org
                        </button>
                      </div>
                    </div>

                    {/* Create-org form */}
                    {showCreateOrg && (
                      <form onSubmit={handleAdminCreateOrg} className="bg-surface border border-blue-500/30 rounded-2xl p-5 space-y-3">
                        <p className="text-sm font-bold text-white mb-1 flex items-center gap-2"><Building2 className="w-4 h-4 text-blue-400" />Create New Organization</p>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Name *</label>
                          <input value={newOrgName} onChange={(e) => setNewOrgName(e.target.value)} placeholder="DevOS HQ" required className="w-full bg-black/40 border border-border-base rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Description</label>
                          <textarea value={newOrgDesc} onChange={(e) => setNewOrgDesc(e.target.value)} rows={2} placeholder="What does this org do?" className="w-full bg-black/40 border border-border-base rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500 resize-none" />
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <button type="button" onClick={() => setNewOrgPublic((v) => !v)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${newOrgPublic ? "bg-green-600/10 border-green-500/30 text-green-400" : "bg-white/5 border-border-base text-white/40"}`}>
                            {newOrgPublic ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                            {newOrgPublic ? "Public" : "Private"}
                          </button>
                          <button type="button" onClick={() => setNewOrgOfficial((v) => !v)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${newOrgOfficial ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400" : "bg-white/5 border-border-base text-white/40"}`}>
                            <BadgeCheck className="w-4 h-4" />
                            {newOrgOfficial ? "Official ✓ (auto-joins everyone)" : "Mark Official"}
                          </button>
                          <div className="flex-1" />
                          <button type="button" onClick={() => setShowCreateOrg(false)} className="px-4 py-1.5 rounded-xl text-xs font-bold bg-white/5 text-white/50 hover:bg-white/10 transition-colors">Cancel</button>
                          <button type="submit" disabled={creatingOrg || !newOrgName.trim()} className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
                            {creatingOrg ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                            Create
                          </button>
                        </div>
                      </form>
                    )}

                    {loadingOrgs ? (
                      <div className="flex items-center gap-2 text-white/40 py-8 justify-center">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Loading organizations…
                      </div>
                    ) : orgs.length === 0 ? (
                      <div className="text-center py-12 text-white/30">
                        <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">No organizations yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {orgs.map((org) => (
                          <div key={org.id} className="bg-surface border border-border-base rounded-2xl p-5">
                            {editingOrg?.id === org.id ? (
                              <form onSubmit={handleSaveOrg} className="space-y-3">
                                <div>
                                  <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Name</label>
                                  <input
                                    value={orgEditName}
                                    onChange={(e) => setOrgEditName(e.target.value)}
                                    className="w-full bg-black/40 border border-border-base rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500"
                                    required
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Description</label>
                                  <textarea
                                    value={orgEditDesc}
                                    onChange={(e) => setOrgEditDesc(e.target.value)}
                                    rows={2}
                                    className="w-full bg-black/40 border border-border-base rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500 resize-none"
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setOrgEditPublic(v => !v)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${orgEditPublic ? "bg-green-600/10 border-green-500/30 text-green-400" : "bg-white/5 border-border-base text-white/40"}`}
                                  >
                                    {orgEditPublic ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                                    {orgEditPublic ? "Public" : "Private"}
                                  </button>
                                  <div className="flex-1" />
                                  <button
                                    type="button"
                                    onClick={() => setEditingOrg(null)}
                                    className="px-4 py-1.5 rounded-xl text-xs font-bold bg-white/5 text-white/50 hover:bg-white/10 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="submit"
                                    disabled={savingOrg}
                                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                  >
                                    {savingOrg ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                    Save
                                  </button>
                                </div>
                              </form>
                            ) : (
                              <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-bold text-white text-sm">{org.name}</p>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/40 font-mono">/{org.slug}</span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${org.isPublic ? "bg-green-600/10 text-green-400" : "bg-orange-600/10 text-orange-400"}`}>
                                      {org.isPublic ? "Public" : "Private"}
                                    </span>
                                    {org.isOfficial && (
                                      <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 font-bold">
                                        <BadgeCheck className="w-3 h-3" /> Official
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-white/40 mt-1 line-clamp-2">{org.description || <span className="italic opacity-50">No description</span>}</p>
                                  <p className="text-[10px] text-white/25 mt-1">
                                    {org.memberCount ?? 0} member{(org.memberCount ?? 0) !== 1 ? "s" : ""}
                                    {" · "}
                                    <a href={`/org/${org.slug}`} target="_blank" rel="noopener noreferrer" className="text-blue-400/60 hover:text-blue-400 transition-colors">
                                      View page ↗
                                    </a>
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <button
                                    onClick={() => handleEditOrg(org)}
                                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                                    title="Edit"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setDeleteOrgConfirm(org.id)}
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
