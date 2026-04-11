import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toValidDate(value: any): Date | null {
  if (!value) return null;
  try {
    let date: Date;
    if (typeof value?.toDate === "function") {
      // Firestore Timestamp instance
      date = value.toDate();
    } else if (typeof value?.seconds === "number") {
      // Plain serialised Firestore Timestamp: { seconds, nanoseconds }
      date = new Date(value.seconds * 1000);
    } else {
      // ISO string, numeric ms, or native Date
      date = new Date(value);
    }
    return Number.isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

/**
 * Format any timestamp value as a locale date+time string.
 *
 * Handles:
 *   • Firestore Timestamp instances (have .toDate())
 *   • Plain serialised timestamps   ({ seconds, nanoseconds })
 *   • ISO strings and numeric milliseconds
 *
 * Returns `fallback` (default "—") when the value is missing or unparseable.
 */
export function formatTimestamp(value: any, fallback = "—"): string {
  const date = toValidDate(value);
  if (!date) return fallback;
  return date.toLocaleString();
}

export function formatTime(value: any): string {
  const date = toValidDate(value);
  if (!date) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatRelativeTime(date: any): string {
  if (!date) return "Just now";
  
  try {
    const now = new Date();
    const timestamp = toValidDate(date);
    if (!timestamp) return "—";
    const diffInSeconds = Math.floor((now.getTime() - timestamp.getTime()) / 1000);
    if (diffInSeconds < 0) return "just now";

    if (diffInSeconds < 60) {
      return "just now";
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes} min${diffInMinutes !== 1 ? "s" : ""} ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} hr${diffInHours !== 1 ? "s" : ""} ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) {
      return `${diffInDays} day${diffInDays !== 1 ? "s" : ""} ago`;
    }

    // Format as "MMM DD, YYYY" for older dates
    return timestamp.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: timestamp.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  } catch {
    return "—";
  }
}
