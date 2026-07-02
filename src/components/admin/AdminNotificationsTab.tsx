import React from 'react';
import { Settings2, Loader2, Save, Search, User, Zap, Gift, Infinity, CheckCircle2, ChevronRight, Hash, Building2, Terminal, Code2, Play, Users, Clock, Plus, Trash2, Edit2 } from 'lucide-react';

export function AdminNotificationsTab(props: any) {
  // Props will be passed via adminTabProps
  const { ...adminTabProps } = props;
  const { 
    // Destructure needed props here or just use props.propName
  } = props;

  return (
    <>
      <div className="space-y-8">
                    <div className="bg-surface border border-border-base rounded-2xl p-6">
                      <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                        <Bell className="w-4 h-4 text-blue-400" />
                        Send Notification
                      </h2>
                      <p className="text-white/40 text-sm mb-6">Send a message to all users or a specific user.</p>
                      <form onSubmit={handleSendNotification} className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Recipient (UID or "all")</label>
                          <input type="text" value={notifUserId} onChange={(e) => setNotifUserId(e.target.value)} className="w-full bg-white/5 border border-border-base rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all" placeholder="all" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Type</label>
                          <div className="grid grid-cols-3 gap-2">
                            {(["admin_message", "system_update", "credit_warning"] as NotificationType[]).map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => setNotifType(t)}
                                className={cn(
                                  "py-2 px-3 rounded-xl text-xs font-bold border transition-all",
                                  notifType === t
                                    ? "bg-blue-600/20 border-blue-500 text-blue-300"
                                    : "bg-white/5 border-border-base text-white/50 hover:border-border-base"
                                )}
                              >
                                {t.replace("_", " ")}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Title</label>
                          <input type="text" value={notifTitle} onChange={(e) => setNotifTitle(e.target.value)} className="w-full bg-white/5 border border-border-base rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all" required placeholder="Notification title" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Message</label>
                          <textarea value={notifMessage} onChange={(e) => setNotifMessage(e.target.value)} rows={3} className="w-full bg-white/5 border border-border-base rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all resize-none" required placeholder="Notification message..." />
                        </div>
                        <button type="submit" disabled={sendingNotif} className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2">
                          {sendingNotif ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          {sendingNotif ? "Sending..." : "Send Notification"}
                        </button>
                      </form>
                    </div>
                  </div>
                
    </>
  );
}
