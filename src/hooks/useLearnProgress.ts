import { useState, useEffect, useCallback } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../lib/firebase";

const STORAGE_KEY_PREFIX = "devos_learn_progress";

function storageKey(uid: string | undefined): string {
  return uid ? `${STORAGE_KEY_PREFIX}_${uid}` : STORAGE_KEY_PREFIX;
}

function readProgress(uid: string | undefined): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey(uid));
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function writeProgress(uid: string | undefined, set: Set<string>): void {
  try {
    localStorage.setItem(storageKey(uid), JSON.stringify([...set]));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

interface LearnProgress {
  /** Set of "topicId/lessonId" strings that are complete. */
  completedSet: Set<string>;
  /** Mark a lesson as complete. */
  markComplete: (topicId: string, lessonId: string) => void;
  /** Remove a lesson's completion (for resetting). */
  markIncomplete: (topicId: string, lessonId: string) => void;
}

export function useLearnProgress(): LearnProgress {
  const [user] = useAuthState(auth);
  const uid = user?.uid;

  const [completedSet, setCompletedSet] = useState<Set<string>>(() => readProgress(uid));

  // Re-read from localStorage when the user changes (sign in / sign out)
  useEffect(() => {
    setCompletedSet(readProgress(uid));
  }, [uid]);

  const markComplete = useCallback(
    (topicId: string, lessonId: string) => {
      setCompletedSet((prev) => {
        const next = new Set(prev);
        next.add(`${topicId}/${lessonId}`);
        writeProgress(uid, next);
        return next;
      });
    },
    [uid]
  );

  const markIncomplete = useCallback(
    (topicId: string, lessonId: string) => {
      setCompletedSet((prev) => {
        const next = new Set(prev);
        next.delete(`${topicId}/${lessonId}`);
        writeProgress(uid, next);
        return next;
      });
    },
    [uid]
  );

  return { completedSet, markComplete, markIncomplete };
}
