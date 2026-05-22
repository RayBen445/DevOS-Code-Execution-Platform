import React, { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import SubdomainPortfolio from "../pages/SubdomainPortfolio";
import SubdomainProject from "../pages/SubdomainProject";
import SubdomainOrg from "../pages/SubdomainOrg";
import { Zap, AlertCircle } from "lucide-react";

const RESERVED = new Set(["www", "admin", "api", "devos", "app", "mail", "ftp", "localhost"]);

type SubdomainType = "loading" | "user" | "project" | "org" | "reserved" | "not-found";

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

export default function SubdomainRouter({ subdomain }: { subdomain: string }) {
  const [resolvedType, setResolvedType] = useState<SubdomainType>("loading");

  // Extract path slug: `professor.devos.name.ng/devos-first-test-script`
  // → pathSlug = "devos-first-test-script"
  const pathSlug = window.location.pathname.replace(/^\/+/, "").split(/[/?#]/)[0].trim();

  useEffect(() => {
    if (RESERVED.has(subdomain.toLowerCase())) {
      setResolvedType("reserved");
      return;
    }

    // Serve from cache when available (skip DB round-trip)
    const cached = getCachedType(subdomain);
    if (cached) {
      setResolvedType(cached);
      return;
    }

    const resolve = async () => {
      try {
        // 1. Check if it's a user username
        const usersRef = collection(db, "users");
        const userQ = query(usersRef, where("username", "==", subdomain), limit(1));
        const userSnap = await getDocs(userQ);
        if (!userSnap.empty) {
          setCachedType(subdomain, "user");
          setResolvedType("user");
          return;
        }

        // 2. Check if it's an organisation slug
        const orgsRef = collection(db, "organizations");
        const orgQ = query(orgsRef, where("slug", "==", subdomain), limit(1));
        const orgSnap = await getDocs(orgQ);
        if (!orgSnap.empty) {
          setCachedType(subdomain, "org");
          setResolvedType("org");
          return;
        }

        // 3. Check if it's a project slug
        const projectsRef = collection(db, "projects");
        const projQ = query(projectsRef, where("slug", "==", subdomain), limit(1));
        const projSnap = await getDocs(projQ);
        if (!projSnap.empty) {
          setCachedType(subdomain, "project");
          setResolvedType("project");
          return;
        }

        // Also check projectSlug field
        const projQ2 = query(projectsRef, where("projectSlug", "==", subdomain), limit(1));
        const projSnap2 = await getDocs(projQ2);
        if (!projSnap2.empty) {
          setCachedType(subdomain, "project");
          setResolvedType("project");
          return;
        }

        setCachedType(subdomain, "not-found");
        setResolvedType("not-found");
      } catch (err) {
        console.error("[SubdomainRouter] Failed to resolve subdomain:", subdomain, err);
        setResolvedType("not-found");
      }
    };

    resolve();
  }, [subdomain]);

  if (resolvedType === "loading") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Zap className="w-8 h-8 text-blue-500 animate-pulse" />
      </div>
    );
  }

  if (resolvedType === "user") {
    // If there is a path segment (e.g. /devos-first-test-script), show that
    // project directly instead of the user's portfolio overview.
    if (pathSlug) {
      return <SubdomainProject slug={pathSlug} ownerUsername={subdomain} />;
    }
    return <SubdomainPortfolio username={subdomain} />;
  }

  if (resolvedType === "org") {
    return <SubdomainOrg slug={subdomain} />;
  }

  if (resolvedType === "project") {
    return <SubdomainProject slug={subdomain} />;
  }

  if (resolvedType === "reserved") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center gap-3">
        <AlertCircle className="w-10 h-10 text-yellow-400" />
        <p className="text-lg">This subdomain is reserved.</p>
        <a href="https://devos.zone.id" className="text-blue-400 hover:underline text-sm">Go to DevOS</a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center gap-3">
      <AlertCircle className="w-10 h-10 text-red-400" />
      <p className="text-2xl font-bold">404</p>
      <p className="text-white/60">Subdomain not found: <span className="text-white">{subdomain}</span></p>
      <a href="https://devos.zone.id" className="text-blue-400 hover:underline text-sm mt-2">Go to DevOS</a>
    </div>
  );
}

