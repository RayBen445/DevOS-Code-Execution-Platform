import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeTime(date: any): string {
  if (!date) return "Just now";
  
  try {
    const now = new Date();
    const timestamp = date.toDate ? date.toDate() : new Date(date);
    if (isNaN(timestamp.getTime())) return "—";
    const diffInSeconds = Math.floor((now.getTime() - timestamp.getTime()) / 1000);

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
