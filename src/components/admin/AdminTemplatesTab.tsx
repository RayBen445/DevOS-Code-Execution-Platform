import React from 'react';
import { Settings2, Loader2, Save, Search, User, Zap, Gift, Infinity, CheckCircle2, ChevronRight, Hash, Building2, Terminal, Code2, Play, Users, Clock, Plus, Trash2, Edit2 } from 'lucide-react';

export function AdminTemplatesTab(props: any) {
  // Props will be passed via adminTabProps
  const { ...adminTabProps } = props;
  const { 
    // Destructure needed props here or just use props.propName
  } = props;

  return (
    <>
      <div className="space-y-8">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                          <Star className="w-4 h-4 text-yellow-400" />
                          Official Templates
                        </h2>
                        <button
                          onClick={() => setShowCreateTemplate(v => !v)}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all active:scale-95"
                        >
                          <Plus className="w-4 h-4" />
                          Create Template
                        </button>
                      </div>
                      <AnimatePresence>
                        {showCreateTemplate && (
                          <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/80 backdrop-blur-sm flex min-h-full items-center justify-center p-4">
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: 20 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: 20 }}
                              className="w-full max-w-2xl bg-base border border-border-base rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto flex flex-col"
                            >
                              <div className="p-8 border-b border-border-base flex items-center justify-between">
                                <h2 className="text-2xl font-bold text-white tracking-tight">Create Official Template</h2>
                                <button onClick={() => setShowCreateTemplate(false)} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                                  <X className="w-6 h-6 text-white/40" />
                                </button>
                              </div>
                              <form onSubmit={handleCreateOfficialTemplate} className="p-8 space-y-8">
                                <div className="space-y-6">
                                  <div className="space-y-2">
                                    <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Template Name</label>
                                    <input autoFocus value={newTplName} onChange={e => setNewTplName(e.target.value)} required placeholder="My Official Template" className="w-full bg-white/5 border border-border-base rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all" />
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Description</label>
                                    <textarea value={newTplDesc} onChange={e => setNewTplDesc(e.target.value)} required placeholder="What does this template do?" className="w-full bg-white/5 border border-border-base rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 h-24 resize-none transition-all" />
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Tags (comma-separated)</label>
                                    <input value={newTplTags} onChange={e => setNewTplTags(e.target.value)} placeholder="react, landing-page" className="w-full bg-white/5 border border-border-base rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all" />
                                  </div>
                                </div>
                                <div className="flex justify-end gap-4 pt-8 border-t border-border-base">
                                  <button type="button" onClick={() => setShowCreateTemplate(false)} className="px-6 py-3 rounded-xl font-bold text-white/40 hover:text-white transition-colors">Cancel</button>
                                  <button type="submit" disabled={creatingTemplate} className="px-10 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 disabled:opacity-50">
                                    {creatingTemplate && <Loader2 className="w-5 h-5 animate-spin" />}
                                    {creatingTemplate ? "Creating..." : "Create Template"}
                                  </button>
                                </div>
                              </form>
                            </motion.div>
                          </div>
                        )}
                      </AnimatePresence>
                    </div>

                    {pendingTemplates.length > 0 && (
                      <div>
                        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-bold">PENDING</span>
                          Awaiting Approval
                        </h2>
                        <div className="space-y-4">
                          {pendingTemplates.map((template) => (
                            <TemplateCard
                              key={template.id}
                              template={template}
                              moderating={moderating}
                              onApprove={() => handleApprove(template.id)}
                              onReject={() => handleReject(template.id)}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs font-bold">LIVE</span>
                        Approved Templates
                      </h2>
                      {allTemplates.filter((t) => t.isApproved).length === 0 ? (
                        <p className="text-white/30 text-sm py-8 text-center">No approved templates yet.</p>
                      ) : (
                        <div className="space-y-3">
                          {allTemplates.filter((t) => t.isApproved).map((template) => (
                            <div key={template.id} className="p-4 rounded-2xl bg-surface border border-border-base flex items-center justify-between gap-4">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <p className="font-bold text-white truncate">{template.name}</p>
                                  {template.isOfficial && (
                                    <span className="px-2 py-0.5 rounded-md bg-yellow-500/20 text-yellow-400 text-[10px] font-bold uppercase flex items-center gap-1 flex-shrink-0">
                                      <Star className="w-2.5 h-2.5" />
                                      Official
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-white/40">
                                  by {template.authorUsername || template.authorName} · {template.downloads} downloads · {template.likes} likes
                                </p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="px-2 py-1 rounded-lg bg-green-500/10 text-green-400 text-xs font-bold">Live</span>
                                <button
                                  onClick={() => handleOpenTemplateFileEditor(template)}
                                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white transition-all text-xs font-bold"
                                  title="Edit files"
                                >
                                  <FileCode className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Files ({(template.files || []).length})</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteTemplate(template.id)}
                                  disabled={deletingTemplate === template.id}
                                  className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
                                >
                                  {deletingTemplate === template.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* ── AI Template Generator ──────────────────────── */}
                    <div className="bg-surface border border-border-base rounded-2xl p-6 space-y-5">
                      <div className="flex items-center gap-2">
                        <Bot className="w-4 h-4 text-purple-400" />
                        <h2 className="text-sm font-bold text-white">Generate Template with AI</h2>
                        <span className="px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-400 text-[10px] font-bold uppercase border border-purple-500/20">Beta</span>
                      </div>
                      <p className="text-xs text-white/40">Describe the template you want. The AI will generate all the files. Review and edit before publishing.</p>

                      <form onSubmit={handleAiGenerateTemplate} className="space-y-3">
                        <textarea
                          value={aiTestPrompt}
                          onChange={(e) => setAiTestPrompt(e.target.value)}
                          placeholder="e.g. A dark-themed SaaS landing page with hero, features, and pricing sections"
                          rows={3}
                          className="w-full bg-black/40 border border-border-base rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-purple-500 transition-colors resize-none"
                          required
                        />
                        <div className="flex items-center gap-3">
                          <button type="submit" disabled={aiTesting || !aiTestPrompt.trim()} className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 transition-all active:scale-95 disabled:opacity-50">
                            {aiTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            {aiTesting ? "Generating…" : "Generate with AI"}
                          </button>
                          {aiGenReady && (
                            <button type="button" onClick={() => { setAiGenReady(false); setAiGenFiles([]); setAiTestPrompt(""); resetAiTest(); }} className="px-4 py-2.5 rounded-xl font-bold text-white/40 hover:text-white text-sm transition-colors">
                              Reset
                            </button>
                          )}
                        </div>
                      </form>

                      {aiTestError && (
                        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                          <span>{aiTestError}</span>
                        </div>
                      )}

                      {aiGenReady && (
                        <div className="space-y-4 border-t border-border-base pt-5">
                          <p className="text-xs font-bold text-white/30 uppercase tracking-widest">Review & Edit Before Publishing</p>
                          <div className="space-y-3">
                            <div>
                              <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-1.5">Template Name</label>
                              <input value={aiGenName} onChange={(e) => setAiGenName(e.target.value)} className="w-full bg-black/40 border border-border-base rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors" />
                            </div>
                            <div>
                              <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-1.5">Description</label>
                              <input value={aiGenDesc} onChange={(e) => setAiGenDesc(e.target.value)} className="w-full bg-black/40 border border-border-base rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors" />
                            </div>
                            <div>
                              <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-1.5">Tags (comma-separated)</label>
                              <input value={aiGenTags} onChange={(e) => setAiGenTags(e.target.value)} placeholder="react, landing-page" className="w-full bg-black/40 border border-border-base rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors" />
                            </div>
                          </div>

                          {/* Generated files */}
                          <div className="space-y-2">
                            <p className="text-xs font-bold text-white/30 uppercase tracking-widest">{aiGenFiles.length} file{aiGenFiles.length !== 1 ? "s" : ""} generated</p>
                            {aiGenFiles.map((f, i) => (
                              <div key={i} className="border border-border-base rounded-xl overflow-hidden">
                                <div className="flex items-center justify-between px-3 py-2 bg-white/3">
                                  <span className="text-xs font-mono text-blue-300">{f.name}</span>
                                  <span className="text-[10px] text-white/30">{f.language}</span>
                                </div>
                                <textarea
                                  value={f.content}
                                  onChange={(e) => setAiGenFiles((prev) => prev.map((file, idx) => idx === i ? { ...file, content: e.target.value } : file))}
                                  rows={6}
                                  className="w-full bg-black/60 px-3 py-2 text-xs text-white/80 font-mono focus:outline-none resize-y"
                                />
                              </div>
                            ))}
                          </div>

                          <button
                            onClick={handleSaveAiTemplate}
                            disabled={savingAiTemplate || !aiGenName.trim()}
                            className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-50"
                          >
                            {savingAiTemplate ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            {savingAiTemplate ? "Publishing…" : "Create & Approve Template"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                
    </>
  );
}
