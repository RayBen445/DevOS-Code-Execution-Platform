import React from 'react';
import { Settings2, Loader2, Save, Search, User, Zap, Gift, Infinity, CheckCircle2, ChevronRight, Hash, Building2, Terminal, Code2, Play, Users, Clock, Plus, Trash2, Edit2 } from 'lucide-react';

export function AdminLearnTab(props: any) {
  // Props will be passed via adminTabProps
  const { ...adminTabProps } = props;
  const { 
    // Destructure needed props here or just use props.propName
  } = props;

  return (
    <>
      <div className="space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div>
                        <p className="text-sm text-white/50">
                          {TOPICS.length} built-in topics · {dynamicLessons.length} custom lesson{dynamicLessons.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setLoadingLessons(true); getAllLessons().then(setDynamicLessons).catch(() => {}).finally(() => setLoadingLessons(false)); }}
                          disabled={loadingLessons}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${loadingLessons ? "animate-spin" : ""}`} />
                          Refresh
                        </button>
                        <a href="/learn" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white transition-all text-xs font-bold">
                          <BookOpen className="w-3.5 h-3.5" />
                          Visit Learn
                        </a>
                        <button onClick={openNewLessonForm} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors">
                          <Plus className="w-3.5 h-3.5" />
                          New Lesson
                        </button>
                      </div>
                    </div>

                    {/* Lesson create/edit form */}
                    {showLessonForm && (
                      <form onSubmit={handleSaveLesson} className="bg-surface border border-blue-500/30 rounded-2xl p-5 space-y-4">
                        <p className="text-sm font-bold text-white flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-blue-400" />
                          {editingLesson ? "Edit Lesson" : "New Lesson"}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Title *</label>
                            <input
                              value={lessonForm.title}
                              onChange={(e) => setLessonForm((f) => ({ ...f, title: e.target.value, slug: slugifyTitle(e.target.value) }))}
                              placeholder="e.g. Variables & Data Types"
                              required
                              className="w-full bg-black/40 border border-border-base rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Slug</label>
                            <input
                              value={lessonForm.slug}
                              onChange={(e) => setLessonForm((f) => ({ ...f, slug: e.target.value }))}
                              placeholder="auto-generated from title"
                              className="w-full bg-black/40 border border-border-base rounded-xl px-3 py-2 text-sm text-white/70 font-mono placeholder-white/20 focus:outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Description</label>
                          <input
                            value={lessonForm.description}
                            onChange={(e) => setLessonForm((f) => ({ ...f, description: e.target.value }))}
                            placeholder="Short description of this lesson"
                            className="w-full bg-black/40 border border-border-base rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Language</label>
                          <select
                            value={lessonForm.language}
                            onChange={(e) => setLessonForm((f) => ({ ...f, language: e.target.value as DynamicLesson["language"] }))}
                            className="bg-black/40 border border-border-base rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                          >
                            <option value="javascript">JavaScript</option>
                            <option value="typescript">TypeScript</option>
                            <option value="html">HTML</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Code Example</label>
                          <textarea
                            value={lessonForm.codeExample}
                            onChange={(e) => setLessonForm((f) => ({ ...f, codeExample: e.target.value }))}
                            rows={6}
                            placeholder="// Paste the runnable code example here"
                            className="w-full bg-black/40 border border-border-base rounded-xl px-3 py-2 text-sm text-white font-mono placeholder-white/20 focus:outline-none focus:border-blue-500 resize-y"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Explanation (markdown)</label>
                          <textarea
                            value={lessonForm.explanation}
                            onChange={(e) => setLessonForm((f) => ({ ...f, explanation: e.target.value }))}
                            rows={4}
                            placeholder="Explain the key concepts in this lesson…"
                            className="w-full bg-black/40 border border-border-base rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500 resize-y"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Expected Output (one line per entry)</label>
                          <textarea
                            value={lessonForm.expectedOutput}
                            onChange={(e) => setLessonForm((f) => ({ ...f, expectedOutput: e.target.value }))}
                            rows={3}
                            placeholder={"DevOS\n42\ntrue"}
                            className="w-full bg-black/40 border border-border-base rounded-xl px-3 py-2 text-sm text-white font-mono placeholder-white/20 focus:outline-none focus:border-blue-500 resize-y"
                          />
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setLessonForm((f) => ({ ...f, published: !f.published }))}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${lessonForm.published ? "bg-green-600/10 border-green-500/30 text-green-400" : "bg-white/5 border-border-base text-white/40"}`}
                          >
                            {lessonForm.published ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                            {lessonForm.published ? "Published" : "Draft"}
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <button type="submit" disabled={savingLesson} className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all">
                            {savingLesson ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {editingLesson ? "Update" : "Create"}
                          </button>
                          <button type="button" onClick={() => { setShowLessonForm(false); setEditingLesson(null); }} className="px-4 py-2 rounded-xl text-sm text-white/50 hover:text-white bg-white/5 hover:bg-white/10 transition-all">Cancel</button>
                        </div>
                      </form>
                    )}

                    {/* Custom lessons list */}
                    {loadingLessons ? (
                      <div className="flex items-center gap-2 text-white/30 py-8 justify-center"><Loader2 className="w-5 h-5 animate-spin" /> Loading…</div>
                    ) : dynamicLessons.length === 0 ? (
                      <div className="bg-surface border border-border-base rounded-2xl p-8 text-center">
                        <BookOpen className="w-8 h-8 text-white/10 mx-auto mb-2" />
                        <p className="text-white/40 text-sm">No custom lessons yet. Click <strong>New Lesson</strong> to add one.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Custom Lessons ({dynamicLessons.length})</p>
                        {dynamicLessons.map((lesson) => (
                          <div key={lesson.id} className="flex items-center justify-between gap-3 bg-surface border border-border-base hover:border-border-base rounded-xl px-4 py-3 transition-all">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-bold text-white truncate">{lesson.title}</p>
                                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/5 text-white/30 font-mono">{lesson.language}</span>
                                {lesson.published ? (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-green-500/10 text-green-400 font-bold">published</span>
                                ) : (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/5 text-white/30 font-bold">draft</span>
                                )}
                              </div>
                              {lesson.description && <p className="text-xs text-white/30 mt-0.5 truncate">{lesson.description}</p>}
                              <p className="text-[10px] text-white/20 font-mono mt-0.5">/learn/l/{lesson.slug}</p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button onClick={() => openEditLessonForm(lesson)} className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white transition-colors">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => setDeleteLessonConfirm(lesson.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Built-in topics (read-only) */}
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Built-in Topics ({TOPICS.length})</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {TOPICS.map((topic) => (
                          <div key={topic.id} className="bg-surface border border-border-base rounded-2xl p-5">
                            <div className="flex items-start justify-between mb-2">
                              <p className="font-bold text-white">{topic.title}</p>
                              <span className="text-[10px] font-bold uppercase tracking-widest text-white/30 bg-white/5 px-2 py-0.5 rounded-md">
                                {topic.lessons.length} lessons
                              </span>
                            </div>
                            <p className="text-xs text-white/40 mb-3 line-clamp-2">{topic.description}</p>
                            <ul className="space-y-1">
                              {topic.lessons.map((lesson) => (
                                <li key={lesson.id} className="flex items-center gap-2 text-xs text-white/50">
                                  <span className="w-1.5 h-1.5 rounded-full bg-white/20 flex-shrink-0" />
                                  {lesson.title}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Delete confirmation */}
                    <ConfirmModal
                      open={!!deleteLessonConfirm}
                      title="Delete Lesson"
                      description="This will permanently delete the lesson."
                      warning="This action cannot be undone."
                      confirmLabel={deletingLesson ? "Deleting…" : "Delete"}
                      onConfirm={handleDeleteLesson}
                      onCancel={() => setDeleteLessonConfirm(null)}
                    />
                  </div>
                
    </>
  );
}
