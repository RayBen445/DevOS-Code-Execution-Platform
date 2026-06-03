import React, { useState, useEffect, useRef, useCallback } from "react";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "../lib/firebase";
import { resolveAvatar } from "../lib/avatars";
import { cn } from "../lib/utils";

interface MentionUser {
  uid: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  currentUserId?: string;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  maxLength?: number;
  className?: string;
  autoFocus?: boolean;
  inputRef?: React.RefObject<HTMLTextAreaElement | HTMLInputElement>;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => void;
}

/** Extract @usernames from text */
export function extractMentions(text: string): string[] {
  const matches = text.match(/@([a-z0-9_-]+)/gi) || [];
  return [...new Set(matches.map((m) => m.slice(1).toLowerCase()))];
}

export default function MentionInput({
  value,
  onChange,
  currentUserId,
  placeholder,
  multiline = false,
  rows = 3,
  maxLength,
  className,
  autoFocus,
  inputRef: externalRef,
  onKeyDown,
}: MentionInputProps) {
  const internalRef = useRef<HTMLTextAreaElement & HTMLInputElement>(null);
  const inputEl = (externalRef as any) || internalRef;

  const [suggestions, setSuggestions] = useState<MentionUser[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null); // null = not in mention mode
  const [mentionStart, setMentionStart] = useState(0);
  const [dropdownIndex, setDropdownIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const searchUsers = useCallback(async (q: string) => {
    if (!q) { setSuggestions([]); return; }
    try {
      const snap = await getDocs(
        query(
          collection(db, "users"),
          where("username", ">=", q.toLowerCase()),
          where("username", "<", q.toLowerCase() + "\uf8ff"),
          orderBy("username"),
          limit(10)
        )
      );
      setSuggestions(snap.docs.map((d) => {
        const data = d.data();
        return { uid: data.uid ?? d.id, username: data.username, displayName: data.displayName, avatarUrl: data.avatarUrl };
      }));
    } catch {
      setSuggestions([]);
    }
  }, []);

  const filtered = mentionQuery !== null ? suggestions.slice(0, 6) : [];

  // Detect @query as the user types
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const val = e.target.value;
    const cursor = e.target.selectionStart ?? val.length;
    onChange(val);

    // Find the @ before the cursor
    const before = val.slice(0, cursor);
    const atIdx = before.lastIndexOf("@");
    if (atIdx !== -1) {
      const fragment = before.slice(atIdx + 1);
      // Only trigger if no space in the fragment and @ is at start or preceded by space
      const charBeforeAt = atIdx > 0 ? before[atIdx - 1] : " ";
      if (!fragment.includes(" ") && (charBeforeAt === " " || charBeforeAt === "\n" || atIdx === 0)) {
        setMentionQuery(fragment);
        setMentionStart(atIdx);
        setDropdownIndex(0);
        searchUsers(fragment);
        return;
      }
    }
    setMentionQuery(null);
  };

  const insertMention = (user: MentionUser) => {
    const before = value.slice(0, mentionStart);
    const after = value.slice(mentionStart + 1 + (mentionQuery?.length ?? 0));
    const newVal = `${before}@${user.username} ${after}`;
    onChange(newVal);
    setMentionQuery(null);
    // Restore focus and cursor
    requestAnimationFrame(() => {
      const el = inputEl.current;
      if (!el) return;
      el.focus();
      const pos = mentionStart + user.username.length + 2;
      el.setSelectionRange(pos, pos);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (mentionQuery !== null && filtered.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setDropdownIndex((i) => (i + 1) % filtered.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setDropdownIndex((i) => (i - 1 + filtered.length) % filtered.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(filtered[dropdownIndex]);
        return;
      }
      if (e.key === "Escape") {
        setMentionQuery(null);
        return;
      }
    }
    onKeyDown?.(e);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMentionQuery(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const sharedProps = {
    ref: inputEl as any,
    value,
    onChange: handleChange,
    onKeyDown: handleKeyDown,
    placeholder,
    maxLength,
    autoFocus,
    className,
  };

  return (
    <div className="relative w-full">
      {multiline ? (
        <textarea {...sharedProps} rows={rows} />
      ) : (
        <input {...sharedProps} type="text" />
      )}

      {/* Mention dropdown */}
      {mentionQuery !== null && filtered.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 left-0 mt-1 w-64 bg-surface border border-border-base rounded-2xl shadow-2xl overflow-hidden"
          style={{ top: "100%" }}
        >
          {filtered.map((user, idx) => (
            <button
              key={user.uid}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                insertMention(user);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                idx === dropdownIndex ? "bg-blue-600/20 text-white" : "hover:bg-white/5 text-white/70"
              )}
            >
              <img
                src={resolveAvatar(user.avatarUrl)}
                alt={user.displayName || user.username}
                className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                referrerPolicy="no-referrer"
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate">{user.displayName || user.username}</p>
                <p className="text-[10px] text-white/40 font-mono truncate">@{user.username}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
