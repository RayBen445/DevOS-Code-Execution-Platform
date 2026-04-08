import React, { useState, useEffect } from "react";
import { db, auth, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, writeBatch, doc, getDocs, getDoc, limit } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { GitBranch, GitCommit, GitPullRequest, History, Check, X, Loader2, ArrowUp, ArrowDown, Github, Plus } from "lucide-react";
import { FileData, Commit, PullRequest } from "../types";
import { cn, toValidDate } from "../lib/utils";
import ConfirmModal from "./ConfirmModal";

interface GitPanelProps {
  projectId: string;
  files: FileData[];
}

export default function GitPanel({ projectId, files }: GitPanelProps) {
  const [user] = useAuthState(auth);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [commitMessage, setCommitMessage] = useState("");
  const [isCommitting, setIsCommitting] = useState(false);
  const [view, setView] = useState<"commits" | "prs">("commits");
  const [restoreConfirm, setRestoreConfirm] = useState<Commit | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  
  // PR Form State
  const [isCreatingPR, setIsCreatingPR] = useState(false);
  const [prTitle, setPrTitle] = useState("");
  const [prDescription, setPrDescription] = useState("");

  useEffect(() => {
    if (!projectId) return;

    const commitsQ = query(
      collection(db, "projects", projectId, "commits"),
      orderBy("timestamp", "desc")
    );

    const prsQ = query(
      collection(db, "projects", projectId, "pullRequests"),
      orderBy("timestamp", "desc")
    );

    const unsubCommits = onSnapshot(commitsQ, (snapshot) => {
      setCommits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Commit[]);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `projects/${projectId}/commits`);
    });

    const unsubPrs = onSnapshot(prsQ, (snapshot) => {
      setPullRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PullRequest[]);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `projects/${projectId}/pullRequests`);
    });

    return () => {
      unsubCommits();
      unsubPrs();
    };
  }, [projectId]);

  const handleCommit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commitMessage.trim() || !user) return;

    setIsCommitting(true);
    try {
      const filesSnapshot = files.map(f => ({
        name: f.name,
        path: f.path,
        content: f.content,
        language: f.language
      }));

      await addDoc(collection(db, "projects", projectId, "commits"), {
        projectId,
        message: commitMessage,
        authorId: user.uid,
        authorName: user.displayName || "Anonymous",
        timestamp: serverTimestamp(),
        filesSnapshot
      });

      setCommitMessage("");
    } catch (error) {
      console.error("Error committing:", error);
    } finally {
      setIsCommitting(false);
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
        headCommitId: commits[0].id
      });

      setPrTitle("");
      setPrDescription("");
      setIsCreatingPR(false);
      setView("prs");
    } catch (error) {
      console.error("Error creating PR:", error);
    }
  };

  const handleRestore = async (commit: Commit) => {
    setRestoreConfirm(commit);
  };

  const confirmRestore = async () => {
    const commit = restoreConfirm;
    if (!commit) return;
    setIsRestoring(true);
    try {
      const batch = writeBatch(db);
      for (const fileData of commit.filesSnapshot) {
        const fileRef = doc(collection(db, "projects", projectId, "files"));
        batch.set(fileRef, {
          ...fileData,
          projectId,
          updatedAt: serverTimestamp()
        });
      }
      await batch.commit();
      setRestoreConfirm(null);
    } catch (error) {
      console.error("Error restoring commit:", error);
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <>
    <div className="flex flex-col h-full bg-[#111]">
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex gap-4">
          <button 
            onClick={() => setView("commits")}
            className={cn("text-xs font-bold uppercase tracking-widest transition-colors", view === "commits" ? "text-blue-500" : "text-white/40 hover:text-white")}
          >
            Commits
          </button>
          <button 
            onClick={() => setView("prs")}
            className={cn("text-xs font-bold uppercase tracking-widest transition-colors", view === "prs" ? "text-blue-500" : "text-white/40 hover:text-white")}
          >
            Pull Requests
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {view === "commits" ? (
          <div className="p-4 space-y-4">
            <form onSubmit={handleCommit} className="space-y-3">
              <textarea
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="Commit message..."
                className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-blue-500/50 min-h-[80px] resize-none"
              />
              <button
                type="submit"
                disabled={isCommitting || !commitMessage.trim()}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2"
              >
                {isCommitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitCommit className="w-4 h-4" />}
                Commit Changes
              </button>
            </form>

            <div className="space-y-1">
              {commits.map((commit) => (
                <div key={commit.id} className="group p-3 rounded-xl bg-white/5 border border-transparent hover:border-white/10 transition-all">
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-sm font-medium text-white truncate pr-2">{commit.message}</span>
                    <button onClick={() => handleRestore(commit)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded text-blue-400 transition-all">
                      <History className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-white/30">
                    <span>{commit.authorName}</span>
                    <span>{toValidDate(commit.timestamp)?.toLocaleDateString() ?? "—"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {!isCreatingPR ? (
              <button
                onClick={() => setIsCreatingPR(true)}
                className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Pull Request
              </button>
            ) : (
              <form onSubmit={handleCreatePR} className="space-y-3 p-4 bg-white/5 rounded-xl border border-white/10">
                <input
                  value={prTitle}
                  onChange={(e) => setPrTitle(e.target.value)}
                  placeholder="PR Title"
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                />
                <textarea
                  value={prDescription}
                  onChange={(e) => setPrDescription(e.target.value)}
                  placeholder="Description..."
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-blue-500/50 min-h-[80px] resize-none"
                />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setIsCreatingPR(false)} className="flex-1 py-2 text-xs font-bold text-white/40 hover:text-white">Cancel</button>
                  <button type="submit" disabled={!prTitle.trim()} className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-bold text-xs">Create PR</button>
                </div>
              </form>
            )}

            <div className="space-y-1">
              {pullRequests.map((pr) => (
                <div key={pr.id} className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2 mb-1">
                    <GitPullRequest className="w-3.5 h-3.5 text-green-500" />
                    <span className="text-sm font-medium text-white">{pr.title}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-white/30">
                    <span>by {pr.authorName}</span>
                    <span className={cn("px-1.5 py-0.5 rounded-full", pr.status === 'open' ? "bg-green-500/10 text-green-500" : "bg-white/10 text-white/40")}>
                      {pr.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
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
