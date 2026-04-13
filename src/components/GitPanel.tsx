import React, { useState, useEffect } from "react";
import { db, auth, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, writeBatch, doc, getDocs, updateDoc } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { GitBranch, GitCommit, GitPullRequest, GitMerge, History, Check, X, Loader2, Plus, ChevronDown, CheckCircle2, Circle, XCircle, Trash2 } from "lucide-react";
import { FileData, Commit, PullRequest, Branch } from "../types";
import { cn, toValidDate } from "../lib/utils";
import ConfirmModal from "./ConfirmModal";

interface GitPanelProps {
  projectId: string;
  files: FileData[];
}

type GitView = "commits" | "prs" | "branches";

export default function GitPanel({ projectId, files }: GitPanelProps) {
  const [user] = useAuthState(auth);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [commitMessage, setCommitMessage] = useState("");
  const [isCommitting, setIsCommitting] = useState(false);
  const [view, setView] = useState<GitView>("commits");
  const [restoreConfirm, setRestoreConfirm] = useState<Commit | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [currentBranch, setCurrentBranch] = useState("main");

  // PR state
  const [isCreatingPR, setIsCreatingPR] = useState(false);
  const [prTitle, setPrTitle] = useState("");
  const [prDescription, setPrDescription] = useState("");
  const [prSourceBranch, setPrSourceBranch] = useState("");
  const [isMergingPR, setIsMergingPR] = useState<string | null>(null);

  // Branch state
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");

  useEffect(() => {
    if (!projectId) return;

    const commitsQ = query(collection(db, "projects", projectId, "commits"), orderBy("timestamp", "desc"));
    const prsQ = query(collection(db, "projects", projectId, "pullRequests"), orderBy("timestamp", "desc"));
    const branchesQ = query(collection(db, "projects", projectId, "branches"), orderBy("createdAt", "desc"));

    const unsubCommits = onSnapshot(commitsQ, (snap) => {
      setCommits(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Commit[]);
    }, (err) => handleFirestoreError(err, OperationType.LIST, `projects/${projectId}/commits`));

    const unsubPrs = onSnapshot(prsQ, (snap) => {
      setPullRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })) as PullRequest[]);
    }, (err) => handleFirestoreError(err, OperationType.LIST, `projects/${projectId}/pullRequests`));

    const unsubBranches = onSnapshot(branchesQ, (snap) => {
      setBranches(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Branch[]);
    }, (err) => handleFirestoreError(err, OperationType.LIST, `projects/${projectId}/branches`));

    return () => { unsubCommits(); unsubPrs(); unsubBranches(); };
  }, [projectId]);

  const handleCommit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commitMessage.trim() || !user) return;
    setIsCommitting(true);
    try {
      const filesSnapshot = files.map(f => ({ name: f.name, path: f.path, content: f.content, language: f.language }));
      await addDoc(collection(db, "projects", projectId, "commits"), {
        projectId,
        message: commitMessage,
        authorId: user.uid,
        authorName: user.displayName || "Anonymous",
        timestamp: serverTimestamp(),
        branch: currentBranch,
        filesSnapshot,
      });
      setCommitMessage("");
    } catch (err) {
      console.error("Error committing:", err);
    } finally {
      setIsCommitting(false);
    }
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newBranchName.trim().replace(/\s+/g, "-").toLowerCase();
    if (!name || !user) return;
    setIsCreatingBranch(true);
    try {
      const filesSnapshot = files.map(f => ({ name: f.name, path: f.path, content: f.content, language: f.language }));
      await addDoc(collection(db, "projects", projectId, "branches"), {
        projectId,
        name,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        baseBranch: currentBranch,
        filesSnapshot,
        merged: false,
      } as Omit<Branch, "id">);
      setNewBranchName("");
      setPrSourceBranch(name);
    } catch (err) {
      console.error("Error creating branch:", err);
    } finally {
      setIsCreatingBranch(false);
    }
  };

  const handleSwitchBranch = async (branch: Branch) => {
    // Restore files from branch snapshot
    setIsRestoring(true);
    try {
      const batch = writeBatch(db);
      // Delete existing files
      const existingFiles = await getDocs(collection(db, "projects", projectId, "files"));
      existingFiles.docs.forEach(d => batch.delete(d.ref));
      // Write branch snapshot
      for (const fd of branch.filesSnapshot) {
        const ref = doc(collection(db, "projects", projectId, "files"));
        batch.set(ref, { ...fd, projectId, updatedAt: serverTimestamp() });
      }
      await batch.commit();
      setCurrentBranch(branch.name);
    } catch (err) {
      console.error("Error switching branch:", err);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleCreatePR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prTitle.trim() || !user || commits.length === 0) return;
    try {
      await addDoc(collection(db, "projects", projectId, "pullRequests"), {
        projectId,
        title: prTitle,
        description: prDescription,
        authorId: user.uid,
        authorName: user.displayName || "Anonymous",
        status: "open",
        timestamp: serverTimestamp(),
        headCommitId: commits[0].id,
        sourceBranch: prSourceBranch || currentBranch,
        targetBranch: "main",
      });
      setPrTitle(""); setPrDescription(""); setIsCreatingPR(false); setView("prs");
    } catch (err) {
      console.error("Error creating PR:", err);
    }
  };

  const handleMergePR = async (pr: PullRequest) => {
    if (!user) return;
    setIsMergingPR(pr.id);
    try {
      await updateDoc(doc(db, "projects", projectId, "pullRequests", pr.id), {
        status: "merged",
        mergedAt: serverTimestamp(),
        mergedBy: user.uid,
      });
      // Mark source branch as merged
      const srcBranch = branches.find(b => b.name === (pr as any).sourceBranch);
      if (srcBranch) {
        await updateDoc(doc(db, "projects", projectId, "branches", srcBranch.id), {
          merged: true, mergedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      console.error("Error merging PR:", err);
    } finally {
      setIsMergingPR(null);
    }
  };

  const confirmRestore = async () => {
    const commit = restoreConfirm;
    if (!commit) return;
    setIsRestoring(true);
    try {
      const batch = writeBatch(db);
      for (const fd of commit.filesSnapshot) {
        const ref = doc(collection(db, "projects", projectId, "files"));
        batch.set(ref, { ...fd, projectId, updatedAt: serverTimestamp() });
      }
      await batch.commit();
      setRestoreConfirm(null);
    } catch (err) {
      console.error("Error restoring commit:", err);
    } finally {
      setIsRestoring(false);
    }
  };

  const activeBranches = branches.filter(b => !b.merged);
  const openPRs = pullRequests.filter(p => p.status === "open");
  const closedPRs = pullRequests.filter(p => p.status !== "open");

  return (
    <>
    <div className="flex flex-col h-full bg-[#0D1117]">
      {/* Header: current branch indicator */}
      <div className="px-4 py-3 border-b border-[#21262D] flex items-center gap-2 flex-shrink-0">
        <GitBranch className="w-3.5 h-3.5 text-white/40" />
        <span className="text-xs text-white/50 font-mono">{currentBranch}</span>
        <div className="flex-1" />
        {/* Tab switcher */}
        <div className="flex gap-1">
          {(["commits", "branches", "prs"] as GitView[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setView(tab)}
              className={cn(
                "text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded transition-colors",
                view === tab ? "bg-blue-600/20 text-blue-400" : "text-white/30 hover:text-white/60"
              )}
            >
              {tab === "prs" ? (
                <span className="flex items-center gap-1">
                  <GitPullRequest className="w-3 h-3" />
                  PRs{openPRs.length > 0 && <span className="ml-0.5 px-1 rounded-full bg-green-500/20 text-green-400">{openPRs.length}</span>}
                </span>
              ) : tab === "branches" ? (
                <span className="flex items-center gap-1">
                  <GitBranch className="w-3 h-3" />
                  {activeBranches.length + 1}
                </span>
              ) : tab}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* ── COMMITS view ── */}
        {view === "commits" && (
          <div className="p-4 space-y-4">
            <form onSubmit={handleCommit} className="space-y-2">
              <textarea
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="Commit message…"
                className="w-full bg-[#161B22] border border-[#30363D] rounded-lg p-3 text-sm text-white focus:outline-none focus:border-blue-500/50 min-h-[70px] resize-none"
              />
              <button
                type="submit"
                disabled={isCommitting || !commitMessage.trim()}
                className="w-full py-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2"
              >
                {isCommitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <GitCommit className="w-3.5 h-3.5" />}
                Commit to {currentBranch}
              </button>
            </form>

            <div className="space-y-1.5">
              {commits.length === 0 && (
                <p className="text-xs text-white/20 text-center py-4">No commits yet.</p>
              )}
              {commits.map((commit) => (
                <div key={commit.id} className="group p-3 rounded-lg bg-[#161B22] border border-[#30363D] hover:border-white/15 transition-all">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <GitCommit className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
                      <span className="text-xs font-medium text-white truncate">{commit.message}</span>
                    </div>
                    <button
                      onClick={() => setRestoreConfirm(commit)}
                      title="Restore this commit"
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded text-blue-400 transition-all flex-shrink-0"
                    >
                      <History className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-white/25 pl-5">
                    <span>{commit.authorName}</span>
                    <span>·</span>
                    {(commit as any).branch && <><span className="font-mono text-white/20">{(commit as any).branch}</span><span>·</span></>}
                    <span>{toValidDate(commit.timestamp)?.toLocaleDateString() ?? "—"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── BRANCHES view ── */}
        {view === "branches" && (
          <div className="p-4 space-y-4">
            {/* Create branch form */}
            <form onSubmit={handleCreateBranch} className="flex gap-2">
              <input
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                placeholder="new-branch-name"
                className="flex-1 bg-[#161B22] border border-[#30363D] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500/50"
              />
              <button
                type="submit"
                disabled={isCreatingBranch || !newBranchName.trim()}
                className="px-3 py-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg text-xs font-bold disabled:opacity-40 transition-all flex items-center gap-1.5"
              >
                {isCreatingBranch ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                Branch
              </button>
            </form>

            {/* main branch */}
            <div className="p-3 rounded-lg bg-[#161B22] border border-[#30363D] flex items-center gap-3">
              <GitBranch className="w-3.5 h-3.5 text-blue-400" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-white">main</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 font-bold">default</span>
                  {currentBranch === "main" && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400 font-bold">current</span>}
                </div>
              </div>
              {currentBranch !== "main" && (
                <button
                  onClick={() => setCurrentBranch("main")}
                  className="text-[10px] px-2 py-1 rounded bg-white/5 text-white/40 hover:bg-white/10 hover:text-white transition-all"
                >
                  Switch
                </button>
              )}
            </div>

            {activeBranches.length === 0 && (
              <p className="text-xs text-white/20 text-center py-2">No branches yet. Create one above.</p>
            )}
            {activeBranches.map((branch) => (
              <div key={branch.id} className="p-3 rounded-lg bg-[#161B22] border border-[#30363D] flex items-center gap-3">
                <GitBranch className="w-3.5 h-3.5 text-white/30" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-white truncate">{branch.name}</span>
                    {currentBranch === branch.name && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400 font-bold flex-shrink-0">current</span>
                    )}
                  </div>
                  <p className="text-[10px] text-white/25 mt-0.5">
                    from {branch.baseBranch} · {toValidDate(branch.createdAt)?.toLocaleDateString() ?? "—"}
                  </p>
                </div>
                {currentBranch !== branch.name && (
                  <button
                    onClick={() => handleSwitchBranch(branch)}
                    disabled={isRestoring}
                    className="text-[10px] px-2 py-1 rounded bg-white/5 text-white/40 hover:bg-white/10 hover:text-white transition-all flex-shrink-0"
                  >
                    Switch
                  </button>
                )}
              </div>
            ))}

            {/* Merged branches (collapsed) */}
            {branches.filter(b => b.merged).length > 0 && (
              <details className="group">
                <summary className="text-[10px] text-white/25 cursor-pointer hover:text-white/40 transition-colors list-none flex items-center gap-1.5 py-1">
                  <ChevronDown className="w-3 h-3 transition-transform group-open:rotate-180" />
                  {branches.filter(b => b.merged).length} merged branch{branches.filter(b => b.merged).length !== 1 ? "es" : ""}
                </summary>
                <div className="mt-2 space-y-1.5 pl-4 border-l border-white/5">
                  {branches.filter(b => b.merged).map((branch) => (
                    <div key={branch.id} className="flex items-center gap-2 py-1">
                      <GitMerge className="w-3 h-3 text-purple-400/50" />
                      <span className="text-[10px] font-mono text-white/30 line-through">{branch.name}</span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}

        {/* ── PULL REQUESTS view ── */}
        {view === "prs" && (
          <div className="p-4 space-y-4">
            {!isCreatingPR ? (
              <button
                onClick={() => setIsCreatingPR(true)}
                className="w-full py-2 bg-[#238636]/20 hover:bg-[#238636]/30 border border-[#238636]/40 text-green-400 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2"
              >
                <GitPullRequest className="w-3.5 h-3.5" />
                New Pull Request
              </button>
            ) : (
              <form onSubmit={handleCreatePR} className="space-y-2.5 p-3 bg-[#161B22] rounded-xl border border-[#30363D]">
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">New Pull Request</p>
                <input
                  value={prTitle}
                  onChange={(e) => setPrTitle(e.target.value)}
                  placeholder="Title"
                  required
                  className="w-full bg-black/30 border border-[#30363D] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                />
                {/* Source branch select */}
                <div className="flex gap-2">
                  <select
                    value={prSourceBranch || currentBranch}
                    onChange={(e) => setPrSourceBranch(e.target.value)}
                    className="flex-1 bg-black/30 border border-[#30363D] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500/50"
                  >
                    {activeBranches.map(b => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                    <option value={currentBranch}>{currentBranch}</option>
                  </select>
                  <span className="flex items-center text-white/20 text-xs">→ main</span>
                </div>
                <textarea
                  value={prDescription}
                  onChange={(e) => setPrDescription(e.target.value)}
                  placeholder="Description (optional)"
                  className="w-full bg-black/30 border border-[#30363D] rounded-lg p-3 text-sm text-white focus:outline-none focus:border-blue-500/50 min-h-[70px] resize-none"
                />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setIsCreatingPR(false)} className="flex-1 py-2 text-xs text-white/40 hover:text-white transition-colors">Cancel</button>
                  <button type="submit" disabled={!prTitle.trim()} className="flex-1 py-2 bg-green-600/20 border border-green-500/30 text-green-400 hover:bg-green-600/30 rounded-lg font-bold text-xs transition-all disabled:opacity-40">
                    Open PR
                  </button>
                </div>
              </form>
            )}

            {/* Open PRs */}
            {openPRs.length === 0 && closedPRs.length === 0 && (
              <p className="text-xs text-white/20 text-center py-4">No pull requests yet.</p>
            )}
            <div className="space-y-1.5">
              {openPRs.map((pr) => (
                <div key={pr.id} className="p-3 rounded-lg bg-[#161B22] border border-[#238636]/30 hover:border-[#238636]/50 transition-all">
                  <div className="flex items-start gap-2 mb-1">
                    <GitPullRequest className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate">{pr.title}</p>
                      {pr.description && <p className="text-[10px] text-white/30 mt-0.5 line-clamp-2">{pr.description}</p>}
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-white/25">
                        <span>by {pr.authorName}</span>
                        {(pr as any).sourceBranch && <><span>·</span><span className="font-mono">{(pr as any).sourceBranch} → main</span></>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleMergePR(pr)}
                      disabled={!!isMergingPR}
                      className="flex-shrink-0 flex items-center gap-1 px-2 py-1 bg-purple-600/15 text-purple-400 hover:bg-purple-600/25 border border-purple-500/20 rounded text-[10px] font-bold transition-all disabled:opacity-40"
                      title="Merge pull request"
                    >
                      {isMergingPR === pr.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <GitMerge className="w-3 h-3" />}
                      Merge
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Closed / merged PRs */}
            {closedPRs.length > 0 && (
              <details className="group">
                <summary className="text-[10px] text-white/25 cursor-pointer hover:text-white/40 transition-colors list-none flex items-center gap-1.5 py-1">
                  <ChevronDown className="w-3 h-3 transition-transform group-open:rotate-180" />
                  {closedPRs.length} closed / merged
                </summary>
                <div className="mt-2 space-y-1.5">
                  {closedPRs.map((pr) => (
                    <div key={pr.id} className="p-3 rounded-lg bg-[#161B22] border border-[#30363D] opacity-60">
                      <div className="flex items-center gap-2">
                        {pr.status === "merged"
                          ? <GitMerge className="w-3.5 h-3.5 text-purple-400" />
                          : <XCircle className="w-3.5 h-3.5 text-red-400" />}
                        <span className="text-xs text-white/50 truncate">{pr.title}</span>
                        <span className={cn(
                          "ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0",
                          pr.status === "merged" ? "bg-purple-500/15 text-purple-400" : "bg-red-500/15 text-red-400"
                        )}>{pr.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </div>
    </div>

    <ConfirmModal
      open={!!restoreConfirm}
      title="Restore Commit"
      description={restoreConfirm ? `Restore project to: "${restoreConfirm.message}"?` : ""}
      warning="This will overwrite all current files. This action cannot be undone."
      confirmLabel="Restore"
      loading={isRestoring}
      onConfirm={confirmRestore}
      onCancel={() => setRestoreConfirm(null)}
    />
    </>
  );
}

