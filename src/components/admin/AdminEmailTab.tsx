import React from 'react';
import { Settings2, Loader2, Save, Search, User, Zap, Gift, Infinity, CheckCircle2, ChevronRight, Hash, Building2, Terminal, Code2, Play, Users, Clock, Plus, Trash2, Edit2 } from 'lucide-react';

export function AdminEmailTab(props: any) {
  // Props will be passed via adminTabProps
  const { ...adminTabProps } = props;
  const { 
    // Destructure needed props here or just use props.propName
  } = props;

  return (
    <>
      <div className="space-y-6 max-w-2xl">
                    <div className="bg-surface border border-border-base rounded-2xl p-6">
                      <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                        <Send className="w-4 h-4 text-blue-400" />
                        Send Email
                      </h2>
                      <p className="text-white/40 text-sm mb-6">
                        Send a custom email via Gmail SMTP. HTML is supported in the message body.
                        Separate multiple recipients with commas.
                      </p>

                      <form onSubmit={handleSendEmail} className="space-y-4">
                        {/* To */}
                        <div>
                          <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
                            To
                          </label>
                          <input
                            type="text"
                            value={emailTo}
                            onChange={(e) => setEmailTo(e.target.value)}
                            placeholder="user@example.com, another@example.com"
                            className="w-full bg-black/40 border border-border-base rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-blue-500 transition-colors"
                            required
                          />
                          {/* Quick-fill from user list */}
                          {users.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              <span className="text-[10px] text-white/30 self-center mr-1">Quick-fill:</span>
                              {users.slice(0, 8).map((u) => (
                                u.email ? (
                                  <button
                                    key={u.uid}
                                    type="button"
                                    onClick={() => setEmailTo((prev) => {
                                      const existing = prev.split(",").map((s) => s.trim()).filter(Boolean);
                                      if (existing.includes(u.email!)) return prev;
                                      return [...existing, u.email!].join(", ");
                                    })}
                                    className="px-2 py-0.5 rounded-full bg-white/5 hover:bg-blue-600/20 border border-border-base hover:border-blue-500/30 text-[10px] text-white/50 hover:text-blue-300 transition-all"
                                  >
                                    @{u.username}
                                  </button>
                                ) : null
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Subject */}
                        <div>
                          <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
                            Subject
                          </label>
                          <input
                            type="text"
                            value={emailSubject}
                            onChange={(e) => setEmailSubject(e.target.value)}
                            placeholder="Your email subject"
                            className="w-full bg-black/40 border border-border-base rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-blue-500 transition-colors"
                            required
                          />
                        </div>

                        {/* Message */}
                        <div>
                          <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
                            Message (HTML supported)
                          </label>
                          <textarea
                            value={emailMessage}
                            onChange={(e) => setEmailMessage(e.target.value)}
                            placeholder={"<p>Hi {{name}},</p>\n<p>Your message here…</p>"}
                            rows={10}
                            className="w-full bg-black/40 border border-border-base rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-blue-500 transition-colors resize-y font-mono"
                            required
                          />
                        </div>

                        {/* Template shortcuts */}
                        <div>
                          <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2">Quick Templates</p>
                          <div className="flex flex-wrap gap-2">
                            {[
                              {
                                label: "Welcome",
                                subject: "Welcome to DevOS 🚀",
                                body: "<p>Hi there,</p>\n<p>Your DevOS account is ready. Start building at <a href=\"https://devos.zone.id/projects\">devos.zone.id/projects</a>.</p>\n<p>— The DevOS Team</p>",
                              },
                              {
                                label: "Banned",
                                subject: "Your DevOS account has been suspended",
                                body: "<p>Hi,</p>\n<p>Your DevOS account has been permanently suspended for violating our Acceptable Use Policy.</p>\n<p>To appeal: <a href=\"mailto:appeals@devos.zone.id\">appeals@devos.zone.id</a></p>\n<p>— DevOS Trust &amp; Safety</p>",
                              },
                              {
                                label: "Reinstated",
                                subject: "Your DevOS account has been reinstated ✓",
                                body: "<p>Hi,</p>\n<p>Good news — your DevOS account has been reinstated. You can sign in again at <a href=\"https://devos.zone.id\">devos.zone.id</a>.</p>\n<p>— The DevOS Team</p>",
                              },
                              {
                                label: "Announcement",
                                subject: "An important update from DevOS",
                                body: "<p>Hi DevOS community,</p>\n<p>We have an important update to share…</p>\n<p>— The DevOS Team</p>",
                              },
                            ].map((tpl) => (
                              <button
                                key={tpl.label}
                                type="button"
                                onClick={() => {
                                  setEmailSubject(tpl.subject);
                                  setEmailMessage(tpl.body);
                                }}
                                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-border-base text-xs text-white/60 hover:text-white transition-all"
                              >
                                {tpl.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={sendingEmail}
                          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all"
                        >
                          {sendingEmail
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Queueing…</>
                            : <><Send className="w-4 h-4" /> Queue Email</>}
                        </button>
                      </form>
                    </div>
                  </div>
                
    </>
  );
}
