import React from 'react';
import { Settings2, Loader2, Save, Search, User, Zap, Gift, Infinity, CheckCircle2, ChevronRight, Hash, Building2, Terminal, Code2, Play, Users, Clock, Plus, Trash2, Edit2 } from 'lucide-react';

export function AdminMaintenanceTab(props: any) {
  // Props will be passed via adminTabProps
  const { ...adminTabProps } = props;
  const { 
    // Destructure needed props here or just use props.propName
  } = props;

  return (
    <>
      <div className="space-y-6 max-w-xl">
                    {loadingMaintenance ? (
                      <div className="flex items-center gap-2 text-white/30 text-sm py-8">
                        <Loader2 className="w-5 h-5 animate-spin" /> Loading…
                      </div>
                    ) : (
                      <>
                        {/* Global toggle card */}
                        <div className="bg-surface border border-border-base rounded-2xl p-6">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                                <Wrench className="w-4 h-4 text-orange-400" />
                                Global Maintenance Mode
                              </h2>
                              <p className="text-white/40 text-sm">
                                When enabled, all non-admin users see a full-screen maintenance page and cannot access the platform.
                              </p>
                            </div>
                            <button
                              onClick={() => setMaintenanceMode((v) => !v)}
                              className="flex-shrink-0 mt-1"
                              aria-label="Toggle maintenance mode"
                            >
                              {maintenanceMode
                                ? <ToggleRight className="w-10 h-10 text-orange-400" />
                                : <ToggleLeft className="w-10 h-10 text-white/30" />}
                            </button>
                          </div>

                          <div className={`mt-4 px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-2 ${
                            maintenanceMode
                              ? "bg-orange-500/10 text-orange-300 border border-orange-500/20"
                              : "bg-white/5 text-white/40 border border-border-base"
                          }`}>
                            {maintenanceMode
                              ? <><WifiOff className="w-4 h-4" /> Global maintenance is currently <strong>ON</strong></>
                              : <><Wifi className="w-4 h-4" /> Global maintenance is currently <strong>OFF</strong></>}
                          </div>
                        </div>

                        {/* Per-page maintenance */}
                        <div className="bg-surface border border-border-base rounded-2xl p-6">
                          <h2 className="text-sm font-bold text-white/70 uppercase tracking-widest mb-1">
                            Per-Page Maintenance
                          </h2>
                          <p className="text-white/40 text-xs mb-4">
                            Select individual pages to put under maintenance. Navigation still works — only the selected pages are blocked.
                          </p>
                          <div className="space-y-2">
                            {[
                              { label: "Explore", path: "/explore" },
                              { label: "Templates", path: "/templates" },
                              { label: "Communities", path: "/communities" },
                              { label: "Search", path: "/search" },
                              { label: "Docs", path: "/docs" },
                              { label: "Settings", path: "/settings" },
                              { label: "Projects / IDE", path: "/projects" },
                              { label: "User Profiles (/@...)", path: "/u" },
                              { label: "Project Pages (/project/...)", path: "/project" },
                              { label: "Orgs (/org/...)", path: "/org" },
                            ].map(({ label, path }) => {
                              const isOn = maintenancePages.includes(path);
                              return (
                                <button
                                  key={path}
                                  onClick={() => setMaintenancePages(prev =>
                                    prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
                                  )}
                                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                                    isOn
                                      ? "bg-orange-500/10 border-orange-500/30 text-orange-300"
                                      : "bg-black/20 border-border-base text-white/50 hover:text-white hover:border-border-base"
                                  }`}
                                >
                                  <span className="font-mono text-xs text-white/40 mr-3">{path}</span>
                                  <span>{label}</span>
                                  {isOn
                                    ? <ToggleRight className="w-6 h-6 text-orange-400 ml-auto flex-shrink-0" />
                                    : <ToggleLeft className="w-6 h-6 text-white/20 ml-auto flex-shrink-0" />}
                                </button>
                              );
                            })}
                          </div>
                          {maintenancePages.length > 0 && (
                            <p className="text-xs text-orange-400/70 mt-3">
                              {maintenancePages.length} page{maintenancePages.length !== 1 ? "s" : ""} under maintenance. Users can still navigate to other pages.
                            </p>
                          )}
                        </div>

                        {/* Banner message */}
                        <div className="bg-surface border border-border-base rounded-2xl p-6">
                          <h2 className="text-sm font-bold text-white/70 uppercase tracking-widest mb-1">
                            Maintenance Banner Message
                          </h2>
                          <p className="text-white/40 text-xs mb-4">
                            Optional message shown to users on both global and per-page maintenance screens.
                          </p>
                          <textarea
                            value={maintenanceBanner}
                            onChange={(e) => setMaintenanceBanner(e.target.value)}
                            placeholder="e.g. We'll be back in 30 minutes. Thanks for your patience!"
                            rows={3}
                            className="w-full bg-black/40 border border-border-base rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                          />
                        </div>

                        {/* Save */}
                        <button
                          onClick={handleSaveMaintenance}
                          disabled={savingMaintenance}
                          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all"
                        >
                          {savingMaintenance
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                            : <><Wrench className="w-4 h-4" /> Save Changes</>}
                        </button>
                      </>
                    )}
                  </div>
                
    </>
  );
}
