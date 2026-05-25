import type { User } from "firebase/auth";
import { signInWithCustomToken } from "firebase/auth";
import { auth } from "./firebase";

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

async function parseJson(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

export async function startTwoFactorSetup(user: User): Promise<{ secret: string; otpauthUrl: string }> {
  const res = await authedFetch("/api/auth/2fa/setup", user, { method: "POST" });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data.error || "Failed to start 2FA setup.");
  return {
    secret: data.secret,
    otpauthUrl: data.otpauthUrl,
  };
}

export async function verifyTwoFactorSetup(user: User, otp: string): Promise<void> {
  const res = await authedFetch("/api/auth/2fa/verify", user, {
    method: "POST",
    body: JSON.stringify({ otp }),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data.error || "Failed to verify 2FA.");
}

export async function disableTwoFactor(user: User): Promise<void> {
  const res = await authedFetch("/api/auth/2fa/disable", user, { method: "POST" });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data.error || "Failed to disable 2FA.");
}

export async function verifyTwoFactorChallenge(params: {
  challengeId: string;
  otp?: string;
  recoveryCode?: string;
}): Promise<void> {
  const res = await fetch("/api/auth/2fa/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data.error || "Two-factor verification failed.");
  if (data.customToken) {
    await signInWithCustomToken(auth, data.customToken);
  }
}
