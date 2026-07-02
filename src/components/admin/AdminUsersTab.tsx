import React from "react";
import { AtSign, Loader2, Ban, Clock, ShieldCheck, Pencil, BadgeCheck, Plus } from "lucide-react";
import { SubpageWrapper } from "../../pages/AdminDashboard";

export function AdminUsersTab(props: any) {
  const {
    users,
    usernameRequests,
    showRejectInput,
    rejectReason,
    setRejectReason,
    handleRejectUsernameRequest,
    resolvingRequest,
    setShowRejectInput,
    handleResolveUsernameRequest,
    handleApproveUsernameRequest,
    userSearch,
    setUserSearch,
    handleRoleUpdate,
    updatingRole,
    setUserActionConfirm,
    moderatingUser,
    usernameEditUid,
    setUsernameEditUid,
    usernameEditValue,
    setUsernameEditValue,
    handleAdminChangeUsername,
    savingUsername,
    handleToggleOfficial,
    togglingOfficial,
    handleCreatePortfolio,
    creatingPortfolio,
    user
  } = props;

  return (
    <SubpageWrapper title="User Management" description="Manage registered users and requests">
      <div>
        <p className="text-white/40 text-sm mb-6">{users?.length || 0} registered users</p>
        
        {/* Pending Username Change Requests */}
        {usernameRequests && usernameRequests.length > 0 && (
          <div className="mb-6 bg-surface border border-yellow-500/20 rounded-2xl p-5 backdrop-blur-xl">
            <div className="flex items-center gap-2 mb-4">
              <AtSign className="w-4 h-4 text-yellow-400" />
              <h3 className="text-sm font-bold text-white">Pending Username Requests</h3>
              <span className="px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 text-[10px] font-bold border border-yellow-500/20">
                {usernameRequests.length}
              </span>
            </div>
            <div className="space-y-3">
              {usernameRequests.map((req: any) => (
                <div key={req.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm text-white flex items-center gap-2">
                      <span className="font-mono text-white/60">@{req.currentUsername}</span>
                      <span className="text-white/30">→</span>
                      <span className="font-mono font-bold text-yellow-400">@{req.requestedUsername}</span>
                    </p>
                    {req.reason && <p className="text-xs text-white/40 mt-1 truncate">{req.reason}</p>}
                  </div>
                  <div className="shrink-0 flex items-center gap-2 w-full sm:w-auto">
                    {showRejectInput === req.id ? (
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <input
                          type="text"
                          value={rejectReason}
                          onChange={(e: any) => setRejectReason(e.target.value)}
                          placeholder="Reason (optional)"
                          className="flex-1 sm:flex-none text-xs px-3 py-2 rounded-xl bg-black/20 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-red-500/40 min-w-[120px]"
                        />
                        <button
                          onClick={() => handleRejectUsernameRequest(req)}
                          disabled={resolvingRequest === req.id}
                          className="px-3 py-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5"
                        >
                          {resolvingRequest === req.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Reject"}
                        </button>
                        <button
                          onClick={() => { setShowRejectInput(null); setRejectReason(""); }}
                          disabled={resolvingRequest === req.id}
                          className="px-3 py-2 rounded-xl bg-white/5 text-white/40 hover:text-white hover:bg-white/10 text-xs font-bold transition-all disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => setShowRejectInput(req.id)}
                          disabled={resolvingRequest === req.id}
                          className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-bold transition-all disabled:opacity-50"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleApproveUsernameRequest(req)}
                          disabled={resolvingRequest === req.id}
                          className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                          {resolvingRequest === req.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Approve"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* User Search & List */}
        <div className="bg-surface border border-border-base rounded-2xl p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <AtSign className="w-4 h-4 text-blue-400" />
              </span>
              User Directory
            </h3>
            <div className="relative">
              <input
                type="text"
                placeholder="Search users..."
                value={userSearch}
                onChange={(e: any) => setUserSearch(e.target.value)}
                className="w-full sm:w-64 bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 transition-all"
              />
              <AtSign className="w-4 h-4 text-white/30 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="space-y-3">
            {users && users.length > 0 ? users.map((u: any) => (
              <div key={u.uid} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:bg-white/10 transition-colors">
                <div className="p-4 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
                  
                  {/* User Info */}
                  <div className="flex items-center gap-3 w-full xl:w-auto">
                    {u.photoURL ? (
                      <img src={u.photoURL} alt="" className="w-10 h-10 rounded-full border border-white/10 bg-black/20 shrink-0 object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                        <span className="text-blue-400 font-bold">{u.username?.[0]?.toUpperCase() || u.email?.[0]?.toUpperCase()}</span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-white truncate flex items-center gap-1.5">
                          {u.displayName || "Unknown User"}
                          {u.isOfficial && <BadgeCheck className="w-3.5 h-3.5 text-blue-400" />}
                        </p>
                        {u.status === "banned" && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400">BANNED</span>}
                        {u.status === "suspended" && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-yellow-500/20 text-yellow-400">SUSPENDED</span>}
                      </div>
                      <p className="text-xs text-white/40 truncate mt-0.5">
                        <span className="font-mono text-white/60">@{u.username}</span> • {u.email}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto shrink-0 bg-black/20 p-2 rounded-xl border border-white/5">
                    
                    {/* Role selector */}
                    <div className="flex items-center gap-2 bg-white/5 px-2 py-1.5 rounded-lg mr-2">
                      <select
                        value={u.role || "user"}
                        onChange={(e: any) => handleRoleUpdate(u.uid, e.target.value)}
                        disabled={updatingRole === u.uid || u.uid === user?.uid}
                        className="bg-transparent text-xs text-white border-none focus:outline-none focus:ring-0 cursor-pointer disabled:opacity-50 appearance-none pr-4"
                      >
                        <option value="user">User</option>
                        <option value="moderator">Moderator</option>
                        <option value="admin">Admin</option>
                        <option value="developer">Developer</option>
                      </select>
                      {updatingRole === u.uid && <Loader2 className="w-3 h-3 animate-spin text-blue-400" />}
                    </div>

                    {/* Moderation controls */}
                    {u.status === "banned" || u.status === "suspended" ? (
                      <button
                        onClick={() => setUserActionConfirm({ uid: u.uid, action: "reinstate" })}
                        disabled={moderatingUser === u.uid}
                        title="Reinstate user"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-all text-xs font-bold disabled:opacity-50"
                      >
                        {moderatingUser === u.uid ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                        <span className="hidden sm:inline">Reinstate</span>
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => setUserActionConfirm({ uid: u.uid, action: "suspend" })}
                          disabled={moderatingUser === u.uid || u.uid === user?.uid}
                          title="Suspend user"
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 transition-all text-xs font-bold disabled:opacity-50"
                        >
                          {moderatingUser === u.uid ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
                          <span className="hidden sm:inline">Suspend</span>
                        </button>
                        <button
                          onClick={() => setUserActionConfirm({ uid: u.uid, action: "ban" })}
                          disabled={moderatingUser === u.uid || u.uid === user?.uid}
                          title="Ban user"
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all text-xs font-bold disabled:opacity-50"
                        >
                          {moderatingUser === u.uid ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                          <span className="hidden sm:inline">Ban</span>
                        </button>
                      </>
                    )}

                    {/* Change Username button */}
                    <button
                      onClick={() => {
                        setUsernameEditUid(u.uid);
                        setUsernameEditValue(u.username);
                      }}
                      title="Change username"
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all text-xs font-bold"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Rename</span>
                    </button>

                    {/* Official toggle */}
                    <button
                      onClick={() => handleToggleOfficial(u.uid, !!u.isOfficial)}
                      disabled={togglingOfficial === u.uid}
                      title={u.isOfficial ? "Remove official status" : "Mark as official"}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all text-xs font-bold disabled:opacity-50 ${
                        u.isOfficial
                          ? "bg-blue-600/20 text-blue-400 hover:bg-blue-600/30"
                          : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {togglingOfficial === u.uid
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <BadgeCheck className="w-3.5 h-3.5" />}
                      <span className="hidden sm:inline">{u.isOfficial ? "Official" : "Official"}</span>
                    </button>

                    {/* Create Portfolio button */}
                    {!u.hasPortfolio && (
                      <button
                        onClick={() => handleCreatePortfolio(u.uid, u.username)}
                        disabled={creatingPortfolio === u.uid}
                        title="Create portfolio for this user"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all text-xs font-bold disabled:opacity-50"
                      >
                        {creatingPortfolio === u.uid
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Plus className="w-3.5 h-3.5" />}
                        <span className="hidden sm:inline">Portfolio</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline username editor */}
                {usernameEditUid === u.uid && (
                  <div className="px-4 pb-4 flex items-center gap-2 border-t border-white/5 pt-4 bg-black/20">
                    <input
                      autoFocus
                      type="text"
                      value={usernameEditValue}
                      onChange={(e: any) => setUsernameEditValue(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                      placeholder="new_username"
                      maxLength={20}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-blue-500/50 transition-all"
                    />
                    <button
                      onClick={() => handleAdminChangeUsername(u.uid, usernameEditValue)}
                      disabled={savingUsername || !usernameEditValue.trim()}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      {savingUsername ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save"}
                    </button>
                    <button
                      onClick={() => { setUsernameEditUid(null); setUsernameEditValue(""); }}
                      className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white text-xs font-bold transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )) : (
              <p className="text-white/30 text-sm py-8 text-center bg-white/5 border border-white/10 rounded-xl">No users found.</p>
            )}
          </div>
        </div>
      </div>
    </SubpageWrapper>
  );
}
