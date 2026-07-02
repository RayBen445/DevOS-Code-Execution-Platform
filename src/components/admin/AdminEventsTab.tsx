import React from 'react';
import { Settings2, Loader2, Save, Search, User, Zap, Gift, Infinity, CheckCircle2, ChevronRight, Hash, Building2, Terminal, Code2, Play, Users, Clock, Plus, Trash2, Edit2 } from 'lucide-react';

export function AdminEventsTab(props: any) {
  // Props will be passed via adminTabProps
  const { ...adminTabProps } = props;
  const { 
    // Destructure needed props here or just use props.propName
  } = props;

  return (
    <>
      <div className="space-y-6">
                    {/* Create Event */}
                    <div className="bg-surface border border-border-base rounded-2xl overflow-hidden">
                      <button
                        onClick={() => setShowCreateEvent((v) => !v)}
                        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/3 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Plus className="w-4 h-4 text-green-400" />
                          <span className="text-sm font-bold text-white">Create Event</span>
                          <span className="text-xs text-white/30">(auto-approved)</span>
                        </div>
                        {showCreateEvent ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
                      </button>

                      {showCreateEvent && (
                        <form onSubmit={handleCreateAdminEvent} className="border-t border-border-base px-5 pb-5 pt-4 space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2">
                              <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-1.5">Title *</label>
                              <input value={newEvTitle} onChange={(e) => setNewEvTitle(e.target.value)} required placeholder="e.g. DevOS Hackathon 2025" className="w-full bg-white/5 border border-border-base rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors" />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-1.5">Description *</label>
                              <textarea value={newEvDesc} onChange={(e) => setNewEvDesc(e.target.value)} required rows={3} placeholder="What's this event about?" className="w-full bg-white/5 border border-border-base rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors resize-none" />
                            </div>
                            <div>
                              <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-1.5">Type</label>
                              <select value={newEvType} onChange={(e) => setNewEvType(e.target.value as EventType)} className="w-full bg-white/5 border border-border-base rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors">
                                <option value="online">Online</option>
                                <option value="physical">Physical</option>
                                <option value="hybrid">Hybrid</option>
                              </select>
                            </div>
                            <div className="flex items-center gap-3 pt-5">
                              <button type="button" onClick={() => setNewEvPremium((v) => !v)} className={cn("relative w-10 h-5 rounded-full transition-all shrink-0", newEvPremium ? "bg-yellow-500" : "bg-white/10")}>
                                <span className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all", newEvPremium ? "left-5" : "left-0.5")} />
                              </button>
                              <span className="text-sm text-white/60">Premium event</span>
                            </div>
                            <div>
                              <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-1.5">Start Date *</label>
                              <input type="datetime-local" value={newEvStart} onChange={(e) => setNewEvStart(e.target.value)} required className="w-full bg-white/5 border border-border-base rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors" />
                            </div>
                            <div>
                              <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-1.5">End Date *</label>
                              <input type="datetime-local" value={newEvEnd} onChange={(e) => setNewEvEnd(e.target.value)} required className="w-full bg-white/5 border border-border-base rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors" />
                            </div>
                            {newEvType === "online" && (
                              <div className="sm:col-span-2">
                                <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-1.5">Event Link</label>
                                <input type="url" value={newEvLink} onChange={(e) => setNewEvLink(e.target.value)} placeholder="https://meet.google.com/..." className="w-full bg-white/5 border border-border-base rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors" />
                              </div>
                            )}
                            {newEvType === "physical" && (
                              <>
                                <div>
                                  <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-1.5">Venue Name</label>
                                  <input value={newEvVenue} onChange={(e) => setNewEvVenue(e.target.value)} placeholder="Tech Hub Lagos" className="w-full bg-white/5 border border-border-base rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors" />
                                </div>
                                <div>
                                  <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-1.5">Address</label>
                                  <input value={newEvAddress} onChange={(e) => setNewEvAddress(e.target.value)} placeholder="123 Tech Street" className="w-full bg-white/5 border border-border-base rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors" />
                                </div>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-3 pt-1">
                            <button type="button" onClick={() => setShowCreateEvent(false)} className="px-5 py-2.5 rounded-xl font-bold text-white/40 hover:text-white transition-colors text-sm">Cancel</button>
                            <button type="submit" disabled={creatingAdminEvent} className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-60">
                              {creatingAdminEvent ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                              {creatingAdminEvent ? "Creating…" : "Create & Approve"}
                            </button>
                          </div>
                        </form>
                      )}
                    </div>

                    {/* Filters */}
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-2">
                        {(["all", "pending", "under_review", "approved", "rejected"] as const).map((s) => (
                          <button
                            key={s}
                            onClick={() => setEventStatusFilter(s)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all",
                              eventStatusFilter === s
                                ? "bg-blue-600 text-white"
                                : "bg-white/5 text-white/50 hover:bg-white/10"
                            )}
                          >
                            {s.replace("_", " ")}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={loadAdminEvents}
                        disabled={loadingAdminEvents}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${loadingAdminEvents ? "animate-spin" : ""}`} />
                        Refresh
                      </button>
                    </div>

                    {loadingAdminEvents ? (
                      <div className="flex items-center justify-center py-12 text-white/40 gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Loading events…
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {adminEvents
                          .filter((e) => eventStatusFilter === "all" || e.status === eventStatusFilter)
                          .map((ev) => (
                            <div
                              key={ev.id}
                              className="bg-surface border border-border-base rounded-2xl p-5"
                            >
                              <div className="flex items-start justify-between gap-4 flex-wrap">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <span className={cn(
                                      "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border",
                                      ev.status === "approved" && "bg-green-600/10 text-green-400 border-green-500/20",
                                      ev.status === "rejected" && "bg-red-600/10 text-red-400 border-red-500/20",
                                      ev.status === "pending" && "bg-yellow-600/10 text-yellow-400 border-yellow-500/20",
                                      ev.status === "under_review" && "bg-blue-600/10 text-blue-400 border-blue-500/20",
                                    )}>
                                      {ev.status.replace("_", " ")}
                                    </span>
                                    <span className={cn(
                                      "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border",
                                      ev.type === "online" ? "bg-green-600/10 text-green-400 border-green-500/20" : "bg-orange-600/10 text-orange-400 border-orange-500/20"
                                    )}>
                                      {ev.type}
                                    </span>
                                    {ev.isPremium && (
                                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border bg-yellow-600/10 text-yellow-400 border-yellow-500/20">
                                        Premium
                                      </span>
                                    )}
                                  </div>
                                  <h3 className="font-semibold text-white">{ev.title}</h3>
                                  <p className="text-white/40 text-xs mt-1 line-clamp-2">{ev.description}</p>
                                  <div className="flex items-center gap-3 mt-2 text-xs text-white/30">
                                    {ev.createdByUsername && (
                                      <span>By @{ev.createdByUsername}</span>
                                    )}
                                    {ev.type === "physical" && ev.venueName && (
                                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {ev.venueName}</span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap shrink-0">
                                  {ev.status !== "approved" && (
                                    <button
                                      onClick={() => handleSetEventStatus(ev.id, "approved")}
                                      disabled={updatingEventId === ev.id}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-green-600/20 text-green-400 hover:bg-green-600 hover:text-white transition-colors disabled:opacity-50"
                                    >
                                      {updatingEventId === ev.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                                      Approve
                                    </button>
                                  )}
                                  {ev.status !== "rejected" && (
                                    <button
                                      onClick={() => handleSetEventStatus(ev.id, "rejected")}
                                      disabled={updatingEventId === ev.id}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white transition-colors disabled:opacity-50"
                                    >
                                      <XCircle className="w-3 h-3" />
                                      Reject
                                    </button>
                                  )}
                                  {ev.status === "pending" && (
                                    <button
                                      onClick={() => handleSetEventStatus(ev.id, "under_review")}
                                      disabled={updatingEventId === ev.id}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white transition-colors disabled:opacity-50"
                                    >
                                      <Clock className="w-3 h-3" />
                                      Mark Under Review
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleToggleRsvps(ev.id)}
                                    className={cn(
                                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors",
                                      expandedRsvpEventId === ev.id
                                        ? "bg-purple-600/30 text-purple-300"
                                        : "bg-white/5 text-white/40 hover:bg-purple-600/20 hover:text-purple-300"
                                    )}
                                  >
                                    {loadingRsvpEventId === ev.id
                                      ? <Loader2 className="w-3 h-3 animate-spin" />
                                      : <Users className="w-3 h-3" />}
                                    RSVPs {eventRsvps[ev.id] ? `(${eventRsvps[ev.id].length})` : ""}
                                  </button>
                                  <button
                                    onClick={() => setDeleteEventConfirm(ev.id)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 text-white/40 hover:bg-red-600/20 hover:text-red-400 transition-colors"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    Delete
                                  </button>
                                </div>
                              </div>

                              {/* RSVP panel */}
                              {expandedRsvpEventId === ev.id && (
                                <div className="mt-4 border-t border-border-base pt-4">
                                  {loadingRsvpEventId === ev.id ? (
                                    <div className="flex items-center gap-2 text-white/40 text-xs py-2">
                                      <Loader2 className="w-4 h-4 animate-spin" /> Loading RSVPs…
                                    </div>
                                  ) : (eventRsvps[ev.id] ?? []).length === 0 ? (
                                    <p className="text-xs text-white/30 py-2">No RSVPs yet.</p>
                                  ) : (
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-xs">
                                        <thead>
                                          <tr className="text-white/30 uppercase text-[10px] tracking-widest">
                                            <th className="text-left pb-2 pr-4">Name</th>
                                            <th className="text-left pb-2 pr-4">Email</th>
                                            <th className="text-left pb-2 pr-4">Phone</th>
                                            <th className="text-left pb-2">Source</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {(eventRsvps[ev.id] ?? []).map((reg) => (
                                            <tr key={reg.id} className="border-t border-border-base">
                                              <td className="py-2 pr-4 text-white/80">{reg.name}</td>
                                              <td className="py-2 pr-4 text-white/60">{reg.email}</td>
                                              <td className="py-2 pr-4 text-white/40">{reg.phone ?? "—"}</td>
                                              <td className="py-2">
                                                <span className={cn(
                                                  "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase",
                                                  reg.source === "user"
                                                    ? "bg-blue-600/20 text-blue-400"
                                                    : "bg-white/10 text-white/40"
                                                )}>
                                                  {reg.source}
                                                </span>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        {adminEvents.filter((e) => eventStatusFilter === "all" || e.status === eventStatusFilter).length === 0 && (
                          <div className="text-center py-12 text-white/30">
                            <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p>No events found</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                
    </>
  );
}
