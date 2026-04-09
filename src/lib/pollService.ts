import { db } from "./firebase";
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
  runTransaction,
} from "firebase/firestore";
import { Poll, PollOption, PollVote } from "../types";

/** Create a new poll (admin only — Firestore rule enforces this). */
export const createPoll = async (params: {
  createdBy: string;
  question: string;
  options: string[];          // option texts (2–6 items)
  allowTextInput: boolean;
  maxSelections?: number;     // 1 = single-choice (default), >1 = multi-select
  allowGuestVoting?: boolean; // allow unauthenticated users to vote
  allowMultipleVotes?: boolean; // allow same user to vote more than once
  expiresAt?: Date | null;
}): Promise<string> => {
  const { createdBy, question, options, allowTextInput, expiresAt, maxSelections = 1, allowGuestVoting = false, allowMultipleVotes = false } = params;

  const pollOptions: PollOption[] = options.map((text, i) => ({
    id: `opt_${i}`,
    text: text.trim(),
    votes: 0,
  }));

  const data: Omit<Poll, "id"> = {
    question: question.trim(),
    options: pollOptions,
    allowTextInput,
    maxSelections: Math.max(1, Math.min(maxSelections, pollOptions.length)),
    allowGuestVoting,
    allowMultipleVotes,
    createdBy,
    createdAt: serverTimestamp(),
    expiresAt: expiresAt ? Timestamp.fromDate(expiresAt) : null,
    isOpen: true,
    totalVotes: 0,
  };

  const ref = await addDoc(collection(db, "polls"), data);
  return ref.id;
};

/** Cast a vote on a poll. One vote per user — enforced by Firestore rule (write once to polls/{id}/votes/{uid}). */
export const voteOnPoll = async (
  pollId: string,
  userId: string,
  optionIds: string[],   // array supports both single and multi-select
  textResponse?: string
): Promise<void> => {
  const pollRef = doc(db, "polls", pollId);
  const voteRef = doc(db, "polls", pollId, "votes", userId);

  await runTransaction(db, async (tx) => {
    const pollSnap = await tx.get(pollRef);
    if (!pollSnap.exists()) throw new Error("Poll not found");

    const voteSnap = await tx.get(voteRef);
    if (voteSnap.exists() && !poll.allowMultipleVotes) throw new Error("Already voted");

    const poll = pollSnap.data() as Poll;
    if (!poll.isOpen) throw new Error("Poll is closed");
    if (poll.expiresAt && poll.expiresAt.toMillis() < Date.now()) {
      throw new Error("Poll has expired");
    }

    const maxSel = poll.maxSelections ?? 1;
    if (optionIds.length === 0) throw new Error("Select at least one option");
    if (optionIds.length > maxSel) throw new Error(`You can select at most ${maxSel} option(s)`);

    // Validate all IDs exist
    const validIds = new Set(poll.options.map((o) => o.id));
    for (const id of optionIds) {
      if (!validIds.has(id)) throw new Error(`Unknown option: ${id}`);
    }

    // Update option vote counts
    const updatedOptions = poll.options.map((opt) =>
      optionIds.includes(opt.id) ? { ...opt, votes: opt.votes + 1 } : opt
    );

    tx.update(pollRef, {
      options: updatedOptions,
      totalVotes: poll.totalVotes + 1,
    });

    const voteData: PollVote = {
      userId,
      optionIds,
      votedAt: serverTimestamp(),
    };
    if (textResponse?.trim()) {
      voteData.textResponse = textResponse.trim();
    }
    tx.set(voteRef, voteData);
  });
};

/** Fetch all polls ordered by creation date descending. */
export const getAllPolls = async (): Promise<Poll[]> => {
  const snap = await getDocs(query(collection(db, "polls"), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Poll));
};

/** Fetch only open polls (client-side filter to avoid composite index). */
export const getActivePolls = async (): Promise<Poll[]> => {
  const all = await getAllPolls();
  const now = Date.now();
  return all.filter(
    (p) => p.isOpen && (!p.expiresAt || p.expiresAt?.toMillis?.() > now)
  );
};

/** Fetch the vote doc for a specific user on a poll (to know if already voted). */
export const getUserVote = async (pollId: string, userId: string): Promise<PollVote | null> => {
  const snap = await getDoc(doc(db, "polls", pollId, "votes", userId));
  return snap.exists() ? (snap.data() as PollVote) : null;
};

/** Close a poll early (admin). */
export const closePoll = async (pollId: string): Promise<void> => {
  await updateDoc(doc(db, "polls", pollId), { isOpen: false });
};

/** Delete a poll and all its votes (admin). */
export const deletePoll = async (pollId: string): Promise<void> => {
  const votesSnap = await getDocs(collection(db, "polls", pollId, "votes"));
  const batch: Promise<void>[] = votesSnap.docs.map((v) => deleteDoc(v.ref));
  await Promise.all(batch);
  await deleteDoc(doc(db, "polls", pollId));
};
