import type { User } from "firebase/auth";
import { signInWithCustomToken } from "firebase/auth";
import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { auth } from "./firebase";

export interface PasskeyDevice {
  credentialId: string;
  deviceName: string;
  deviceType?: string | null;
  backedUp?: boolean | null;
  transports?: string[];
  createdAt?: any;
  updatedAt?: any;
  lastUsedAt?: any;
}

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

export async function listPasskeyDevices(user: User): Promise<PasskeyDevice[]> {
  const res = await authedFetch("/api/passkey/list", user, { method: "GET" });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data.error || "Failed to load passkeys.");
  return data.credentials || [];
}

export async function registerCurrentDevicePasskey(user: User, deviceName?: string): Promise<string> {
  const optionsRes = await authedFetch("/api/passkey/register/options", user, {
    method: "POST",
    body: JSON.stringify({ deviceName }),
  });
  const optionsData = await parseJson(optionsRes);
  if (!optionsRes.ok) throw new Error(optionsData.error || "Failed to start passkey registration.");

  const registrationResponse = await startRegistration({ optionsJSON: optionsData.options });

  const verifyRes = await authedFetch("/api/passkey/register/verify", user, {
    method: "POST",
    body: JSON.stringify({
      challengeId: optionsData.challengeId,
      response: registrationResponse,
      deviceName,
    }),
  });
  const verifyData = await parseJson(verifyRes);
  if (!verifyRes.ok) throw new Error(verifyData.error || "Failed to verify passkey registration.");
  return verifyData.credentialId;
}

export async function removePasskeyDevice(user: User, credentialId: string): Promise<void> {
  const res = await authedFetch(`/api/passkey/${encodeURIComponent(credentialId)}`, user, {
    method: "DELETE",
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data.error || "Failed to remove passkey.");
}

export async function updatePasskeyDevice(user: User, credentialId: string, deviceName: string): Promise<void> {
  const res = await authedFetch(`/api/passkey/${encodeURIComponent(credentialId)}`, user, {
    method: "PATCH",
    body: JSON.stringify({ deviceName }),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data.error || "Failed to update passkey.");
}

export type PasskeySignInResult =
  | { status: "success" }
  | { status: "mfa"; challengeId: string };

export async function signInUsingPasskey(identifier?: string, useConditional = false): Promise<PasskeySignInResult> {
  const optionsRes = await fetch("/api/passkey/auth/options", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier }),
  });
  const optionsData = await parseJson(optionsRes);
  if (!optionsRes.ok) throw new Error(optionsData.error || "Failed to start passkey sign-in.");

  const authResponse = await startAuthentication({
    optionsJSON: optionsData.options,
    useBrowserAutofill: useConditional,
  });

  const verifyRes = await fetch("/api/passkey/auth/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      challengeId: optionsData.challengeId,
      response: authResponse,
    }),
  });
  const verifyData = await parseJson(verifyRes);
  if (!verifyRes.ok) throw new Error(verifyData.error || "Passkey sign-in failed.");
  if (verifyData.mfaRequired && verifyData.challengeId) {
    return { status: "mfa", challengeId: verifyData.challengeId };
  }
  await signInWithCustomToken(auth, verifyData.customToken);
  return { status: "success" };
}
