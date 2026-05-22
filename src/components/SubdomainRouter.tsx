import React, { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import SubdomainPortfolio from "../pages/SubdomainPortfolio";
import SubdomainProject from "../pages/SubdomainProject";
import { Zap, AlertCircle } from "lucide-react";
import { RESERVED_SUBDOMAINS, buildDevosUrl } from "../lib/brand";

type SubdomainType = "loading" | "user" | "reserved" | "not-found";

// ── In-memory cache for subdomain resolution (TTL: 5 minutes) ────────────────
const CACHE_TTL_MS = 5 * 60 * 1000;
const subdomainCache = new Map<string, { type: SubdomainType; expiresAt: number }>();

function getCachedType(subdomain: string): SubdomainType | null {
  const entry = subdomainCache.get(subdomain);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    subdomainCache.delete(subdomain);
    return null;
  }
  return entry.type;
}

function setCachedType(subdomain: string, type: SubdomainType): void {
  subdomainCache.set(subdomain, { type, expiresAt: Date.now() + CACHE_TTL_MS });
}
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  username: string;
  projectSlug?: string;
}

export default function SubdomainRouter({ username, projectSlug }: Props) {
  const [resolvedType, setResolvedType] = useState<SubdomainType>("loading");

  // Extract path slug: `professor.kontyra.name.ng/devos-first-test-script`
  // → pathSlug = "devos-first-test-script"
  const pathSlug = window.location.pathname.replace(/^\/+/, "").split(/[/?#]/)[0].trim();
  const effectiveProjectSlug = projectSlug || pathSlug;

  useEffect(() => {
    const normalizedUsername = username.toLowerCase();

    if (RESERVED_SUBDOMAINS.has(normalizedUsername)) {
      setResolvedType("reserved");
      return;
    }

    // Serve from cache when available (skip DB round-trip)
    const cached = getCachedType(normalizedUsername);
    if (cached) {
      setResolvedType(cached);
      return;
    }

    const resolve = async () => {
      try {
        // 1. Check if it's a user username
        const usersRef = collection(db, "users");
        const userQ = query(usersRef, where("username", "==", normalizedUsername), limit(1));
        const userSnap = await getDocs(userQ);
        if (!userSnap.empty) {
          setCachedType(normalizedUsername, "user");
          setResolvedType("user");
          return;
        }

        setCachedType(normalizedUsername, "not-found");
        setResolvedType("not-found");
      } catch (err) {
        console.error("[SubdomainRouter] Failed to resolve username host:", username, err);
        setResolvedType("not-found");
      }
    };

    resolve();
  }, [username]);

  if (resolvedType === "loading") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Zap className="w-8 h-8 text-blue-500 animate-pulse" />
      </div>
    );
  }

  if (resolvedType === "user") {
    if (effectiveProjectSlug) {
      return <SubdomainProject slug={effectiveProjectSlug} ownerUsername={username} />;
    }
    return <SubdomainPortfolio username={username} />;
  }

  if (resolvedType === "reserved") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center gap-3">
        <AlertCircle className="w-10 h-10 text-yellow-400" />
        <p className="text-lg">This subdomain is reserved.</p>
        <a href={buildDevosUrl()} className="text-blue-400 hover:underline text-sm">Go to DevOS</a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center gap-3">
      <AlertCircle className="w-10 h-10 text-red-400" />
      <p className="text-2xl font-bold">404</p>
      <p className="text-white/60">Subdomain not found: <span className="text-white">{username}</span></p>
      <a href={buildDevosUrl()} className="text-blue-400 hover:underline text-sm mt-2">Go to DevOS</a>
    </div>
  );
}
