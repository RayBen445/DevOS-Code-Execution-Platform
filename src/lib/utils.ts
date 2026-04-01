import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeTime(date: any): string {
  if (!date) return "Just now";
  
  const now = new Date();
  const timestamp = date.toDate ? date.toDate() : new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - timestamp.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "just now";
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} mins ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hrs ago`;
  }

  // Format as "MMM DD" (e.g., "Mar 28")
  return timestamp.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
