import type { User } from "firebase/auth";

async function authedFetch(input: string, user: User, init: RequestInit = {}) {
  const idToken = await user.getIdToken();
  return fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
      ...(init.headers || {}),
    },
  });
}

export async function generateRecoveryCodes(user: User): Promise<string[]> {
  const res = await authedFetch("/api/mfa/recovery-codes/generate", user, {
    method: "POST",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to generate recovery codes.");
  return Array.isArray(data.codes) ? data.codes : [];
}

export async function getRecoveryCodesMeta(user: User): Promise<{ exists: boolean; total: number; remaining: number; updatedAt: any }> {
  const res = await authedFetch("/api/mfa/recovery-codes/meta", user, {
    method: "GET",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to load recovery-code status.");
  return {
    exists: !!data.exists,
    total: Number(data.total || 0),
    remaining: Number(data.remaining || 0),
    updatedAt: data.updatedAt ?? null,
  };
}

export async function verifyRecoveryCode(email: string, recoveryCode: string): Promise<{ message?: string; remaining?: number }> {
  const res = await fetch("/api/mfa/recovery-codes/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      recoveryCode,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Invalid recovery code.");
  return {
    message: data.message,
    remaining: typeof data.remaining === "number" ? data.remaining : undefined,
  };
}
