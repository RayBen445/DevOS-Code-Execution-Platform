import React from 'react';
import { Settings2, Loader2, Save, Search, User, Zap, Gift, Infinity, CheckCircle2, ChevronRight, Hash, Building2, Terminal, Code2, Play, Users, Clock, Plus, Trash2, Edit2 } from 'lucide-react';

export function AdminProjectsTab(props: any) {
  // Props will be passed via adminTabProps
  const { ...adminTabProps } = props;
  const { 
    // Destructure needed props here or just use props.propName
  } = props;

  return (
    <>
      <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-white/40">{adminProjects.length} project{adminProjects.length !== 1 ? "s" : ""} total</p>
                      <div className="flex items-center gap-2">
                        <button onClick={loadAdminProjects} disabled={loadingAdminProjects} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors">
                          <RefreshCw className={`w-3.5 h-3.5 ${loadingAdminProjects ? "animate-spin" : ""}`} />
                          Refresh
                        </button>
                        <button onClick={() => setShowCreateProject((v) => !v)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors">
                          <Plus className="w-3.5 h-3.5" />
                          New Project
                        </button>
                      </div>
                    </div>

                    {/* Create project form */}
                    {showCreateProject && (
                      <form onSubmit={handleAdminCreateProject} className="bg-surface border border-blue-500/30 rounded-2xl p-5 space-y-3">
                        <p className="text-sm font-bold text-white mb-1 flex items-center gap-2"><FolderPlus className="w-4 h-4 text-blue-400" />Create Official DevOS Project</p>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Project Name *</label>
                          <input value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} placeholder="DevOS Starter Kit" required className="w-full bg-black/40 border border-border-base rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Description</label>
                          <textarea value={newProjectDesc} onChange={(e) => setNewProjectDesc(e.target.value)} rows={2} placeholder="Brief description of the project" className="w-full bg-black/40 border border-border-base rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500 resize-none" />
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <button type="button" onClick={() => setNewProjectPublic((v) => !v)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${newProjectPublic ? "bg-green-600/10 border-green-500/30 text-green-400" : "bg-white/5 border-border-base text-white/40"}`}>
                            {newProjectPublic ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                            {newProjectPublic ? "Public" : "Private"}
                          </button>
                          <button type="button" onClick={() => setNewProjectOfficial((v) => !v)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${newProjectOfficial ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400" : "bg-white/5 border-border-base text-white/40"}`}>
                            <BadgeCheck className="w-4 h-4" />
                            {newProjectOfficial ? "Official ✓" : "Mark Official"}
                          </button>
                          <div className="flex-1" />
                          <button type="button" onClick={() => setShowCreateProject(false)} className="px-4 py-1.5 rounded-xl text-xs font-bold bg-white/5 text-white/50 hover:bg-white/10 transition-colors">Cancel</button>
                          <button type="submit" disabled={creatingAdminProject || !newProjectName.trim()} className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
                            {creatingAdminProject ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                            Create
                          </button>
                        </div>
                      </form>
                    )}

                    {loadingAdminProjects ? (
                      <div className="flex items-center gap-2 text-white/40 py-8 justify-center">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Loading projects…
                      </div>
                    ) : adminProjects.length === 0 ? (
                      <div className="text-center py-12 text-white/30">
                        <FolderPlus className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">No projects yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {adminProjects.map((proj) => (
                          <div key={proj.id} className="bg-surface border border-border-base rounded-2xl p-4 flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-bold text-white text-sm">{proj.name}</p>
                                {proj.isOfficial && (
                                  <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 font-bold">
                                    <BadgeCheck className="w-3 h-3" /> Official
                                  </span>
                                )}
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${proj.isPublic ? "bg-green-600/10 text-green-400" : "bg-orange-600/10 text-orange-400"}`}>
                                  {proj.isPublic ? "Public" : "Private"}
                                </span>
                              </div>
                              <p className="text-xs text-white/40 mt-1 line-clamp-1">{proj.description || <span className="italic opacity-50">No description</span>}</p>
                              <p className="text-[10px] text-white/25 mt-1">
                                by @{proj.ownerUsername ?? "—"}
                                {" · "}
                                <a href={`/projects?open=${proj.id}`} target="_blank" rel="noopener noreferrer" className="text-blue-400/60 hover:text-blue-400 transition-colors">Open in IDE ↗</a>
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                
    </>
  );
}
