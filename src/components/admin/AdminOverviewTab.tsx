import React from 'react';
import { Settings2, Loader2, Save, Search, User, Zap, Gift, Infinity, CheckCircle2, ChevronRight, Hash, Building2, Terminal, Code2, Play, Users, Clock, Plus, Trash2, Edit2 } from 'lucide-react';

export function AdminOverviewTab(props: any) {
  // Props will be passed via adminTabProps
  const { ...adminTabProps } = props;
  const { 
    // Destructure needed props here or just use props.propName
  } = props;

  return (
    <>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      <StatCard
                        icon={<Users className="w-6 h-6" />}
                        label="Total Users"
                        value={totalUsers}
                        color="blue"
                      />
                      <StatCard
                        icon={<FolderCode className="w-6 h-6" />}
                        label="Total Projects"
                        value={totalProjects}
                        color="green"
                      />
                      <StatCard
                        icon={<Layout className="w-6 h-6" />}
                        label="Approved Templates"
                        value={totalTemplates}
                        color="purple"
                      />
                    </div>

                    {/* Chart Section */}
                    <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 backdrop-blur-xl relative overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-50" />
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                          <BarChart3 className="w-5 h-5 text-purple-400" />
                          Platform Activity (7 Days)
                        </h2>
                      </div>
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%" minHeight={256}>
                          <AreaChart data={mockActivityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="colorProjects" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                            <RechartsTooltip
                              contentStyle={{ backgroundColor: 'rgba(15, 15, 20, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                              itemStyle={{ color: '#fff', fontSize: '14px' }}
                            />
                            <Area type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
                            <Area type="monotone" dataKey="projects" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorProjects)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* System Health */}
                      <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 backdrop-blur-xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="flex items-center justify-between mb-6 relative">
                          <h2 className="text-base font-bold text-white flex items-center gap-2">
                            <Activity className="w-5 h-5 text-green-400" />
                            System Health
                          </h2>
                          <button
                            onClick={runHealthCheck}
                            disabled={runningHealthCheck}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-bold transition-all disabled:opacity-50 border border-white/5"
                          >
                            {runningHealthCheck
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <RefreshCw className="w-3.5 h-3.5" />}
                            {runningHealthCheck ? "Checking…" : "Run Check"}
                          </button>
                        </div>

                        <div className="relative">
                        {!systemHealth && !runningHealthCheck && (
                          <div className="flex flex-col items-center justify-center py-8 text-center">
                            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                              <ShieldCheck className="w-6 h-6 text-white/30" />
                            </div>
                            <p className="text-sm text-white/40 font-medium">
                              Click "Run Check" to validate backend configuration.
                            </p>
                          </div>
                        )}

                        {runningHealthCheck && (
                          <div className="flex flex-col items-center justify-center py-8 gap-3 text-white/50 text-sm font-medium">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                            Running diagnostic health checks…
                          </div>
                        )}

                        {systemHealth && !runningHealthCheck && (
                          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                            <p className="text-[11px] text-white/30 font-medium uppercase tracking-widest">
                              Last checked at {systemHealth.checkedAt}
                            </p>

                            <div className="space-y-2">
                            {[
                              {
                                label: "Firestore Connectivity",
                                ok: systemHealth.firestoreOk,
                                desc: systemHealth.firestoreOk
                                  ? "Firestore is reachable"
                                  : "Cannot connect to Firestore — check Firebase config",
                              },
                              {
                                label: "Templates (public read)",
                                ok: systemHealth.templatesReadable,
                                desc: systemHealth.templatesReadable
                                  ? "Public template reads work correctly"
                                  : "Templates collection is unreadable",
                              },
                              {
                                label: "Feed (public read)",
                                ok: systemHealth.feedReadable,
                                desc: systemHealth.feedReadable
                                  ? "Public feed reads work correctly"
                                  : "Feed collection unreadable — check Firestore rules",
                              },
                            ].map(({ label, ok, desc }) => (
                              <div
                                key={label}
                                className={cn(
                                  "flex items-center gap-3 p-3.5 rounded-2xl border transition-colors",
                                  ok
                                    ? "bg-green-500/5 border-green-500/20 hover:bg-green-500/10"
                                    : "bg-red-500/5 border-red-500/20 hover:bg-red-500/10"
                                )}
                              >
                                <div className={cn("p-2 rounded-xl", ok ? "bg-green-500/10" : "bg-red-500/10")}>
                                  {ok ? (
                                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                                  ) : (
                                    <XCircle className="w-4 h-4 text-red-400" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className={cn("text-sm font-bold", ok ? "text-green-300" : "text-red-300")}>
                                    {label}
                                  </p>
                                  <p className="text-[11px] text-white/40 truncate mt-0.5">{desc}</p>
                                </div>
                                <span className={cn(
                                  "ml-auto flex-shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider",
                                  ok ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                                )}>
                                  {ok ? "OK" : "Fail"}
                                </span>
                              </div>
                            ))}
                            </div>

                            {systemHealth.errors.length > 0 && (
                              <div className="mt-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 backdrop-blur-sm">
                                <p className="text-xs font-black text-red-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                  <AlertTriangle className="w-4 h-4" />
                                  Detected Issues
                                </p>
                                <ul className="space-y-2">
                                  {systemHealth.errors.map((e, i) => (
                                    <li key={i} className="text-[11px] leading-relaxed text-red-300/80 font-mono bg-red-500/10 p-2 rounded-lg">{e}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {systemHealth.errors.length === 0 && (
                              <div className="flex items-center justify-center gap-2 mt-4 p-3 rounded-2xl bg-green-500/10 border border-green-500/20 text-xs font-bold text-green-400">
                                <Wifi className="w-4 h-4" />
                                All systems operational
                              </div>
                            )}
                          </div>
                        )}
                        </div>
                      </div>

                      {/* Maintenance Mode Quick Toggle */}
                      <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 backdrop-blur-xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="flex items-start justify-between gap-4 relative">
                          <div>
                            <h2 className="text-base font-bold text-white mb-1.5 flex items-center gap-2">
                              <Wrench className="w-5 h-5 text-orange-400" />
                              Maintenance Mode
                            </h2>
                            <p className="text-white/40 text-sm leading-relaxed">Blocks all non-admin users from the platform. Use when deploying major upgrades.</p>
                          </div>
                          {loadingMaintenance ? (
                            <Loader2 className="w-8 h-8 text-white/30 animate-spin flex-shrink-0 mt-1" />
                          ) : (
                            <button
                              onClick={() => { setMaintenanceMode((v) => !v); }}
                              className="flex-shrink-0 transition-transform hover:scale-105 active:scale-95"
                              aria-label="Toggle maintenance mode"
                            >
                              {maintenanceMode
                                ? <ToggleRight className="w-12 h-12 text-orange-400 drop-shadow-[0_0_15px_rgba(249,115,22,0.3)]" />
                                : <ToggleLeft className="w-12 h-12 text-white/20 hover:text-white/40 transition-colors" />}
                            </button>
                          )}
                        </div>
                        <div className={cn(
                          "relative mt-6 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold border transition-all",
                          maintenanceMode ? "bg-orange-500/10 text-orange-400 border-orange-500/20" : "bg-white/5 text-white/40 border-white/5"
                        )}>
                          {maintenanceMode ? <><WifiOff className="w-4 h-4" /> Maintenance is ON</> : <><Wifi className="w-4 h-4" /> Maintenance is OFF</>}
                        </div>
                        <button
                          onClick={handleSaveMaintenance}
                          disabled={savingMaintenance || loadingMaintenance}
                          className="relative mt-4 w-full flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-2xl text-sm font-black transition-all shadow-lg shadow-blue-500/20"
                        >
                          {savingMaintenance ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : "Save Configuration"}
                        </button>
                      </div>
                    </div>
                    
                    {pendingTemplates.length > 0 && (
                      <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-3xl p-6 backdrop-blur-xl flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-yellow-500/20 flex items-center justify-center">
                            <Layout className="w-6 h-6 text-yellow-400" />
                          </div>
                          <div>
                            <h3 className="text-yellow-400 font-black text-lg">
                              {pendingTemplates.length} Pending Review{pendingTemplates.length > 1 ? "s" : ""}
                            </h3>
                            <p className="text-yellow-500/60 text-sm font-medium mt-0.5">Templates waiting for your approval.</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setActiveTab("templates")}
                          className="px-5 py-2.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 font-bold rounded-xl transition-colors"
                        >
                          Review Now
                        </button>
                      </div>
                    )}
                    
                    {/* System Maintenance Section */}
                    <div className="bg-red-500/5 border border-red-500/20 rounded-3xl p-6 backdrop-blur-xl relative overflow-hidden mt-8">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-orange-500 opacity-50" />
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-black tracking-tight text-red-400 flex items-center gap-2">
                          <Trash2 className="w-5 h-5 text-red-400" />
                          System Maintenance Actions
                        </h2>
                      </div>
                      <div className="flex flex-col gap-4">
                        <p className="text-white/60 text-sm">
                          Warning: The actions below modify core platform data and cannot be undone.
                        </p>
                        <div className="flex items-center gap-4 flex-wrap">
                          <button
                            onClick={async () => {
                              try {
                                const snapshot = await getDocs(query(collection(db, "projects"), where("systemType", "==", "portfolio"), where("ownerUsername", "in", ["admin", "support"])));
                                if (snapshot.empty) {
                                  alert("Official portfolio not found! Please trigger a reset to recreate it.");
                                  return;
                                }
                                navigate(`/projects?open=${snapshot.docs[0].id}`);
                              } catch (e) {
                                alert(e.message);
                              }
                            }}
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-500/10 text-blue-400 rounded-xl font-bold hover:bg-blue-500/20 transition-all border border-blue-500/20 w-fit"
                          >
                            <FolderCode className="w-4 h-4" />
                            Edit Official Portfolio
                          </button>
                          
                          <button
                            onClick={async () => {
                              if (!confirm("Are you sure you want to delete ALL portfolio projects?")) return;
                              try {
                                const snapshot = await getDocs(query(collection(db, "projects"), where("systemType", "==", "portfolio")));
                                let deleted = 0;
                                for (const docSnap of snapshot.docs) {
                                  const filesSnap = await getDocs(collection(db, "projects", docSnap.id, "files"));
                                  for (const fileDoc of filesSnap.docs) {
                                    await deleteDoc(fileDoc.ref);
                                  }
                                  await deleteDoc(docSnap.ref);
                                  deleted++;
                                }
                                alert(`Deleted ${deleted} portfolios. They will automatically recreate on next login/refresh.`);
                                window.location.reload();
                              } catch (e) {
                                alert(e.message);
                              }
                            }}
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 text-red-400 rounded-xl font-bold hover:bg-red-500/20 transition-all border border-red-500/20 w-fit"
                          >
                            <Trash2 className="w-4 h-4" />
                            Reset All Portfolios
                          </button>
                        </div>
                      </div>
                    </div>

                  </div>
                
    </>
  );
}
