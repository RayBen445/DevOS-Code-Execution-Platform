import type { User } from "firebase/auth";
import { signInWithCustomToken } from "firebase/auth";
import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { auth } from "./firebase";

export interface PasskeyDevice {
  credentialId: string;
  deviceName: string;
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

export async function listPasskeyDevices(user: User): Promise<PasskeyDevice[]> {
  const res = await authedFetch("/api/passkey/list", user, { method: "GET" });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed to load passkeys.");
  const data = await res.json();
  return data.credentials || [];
}

export async function registerCurrentDevicePasskey(user: User, deviceName?: string): Promise<string> {
  const optionsRes = await authedFetch("/api/passkey/register/options", user, {
    method: "POST",
    body: JSON.stringify({ deviceName }),
  });
  const optionsData = await optionsRes.json();
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
  const verifyData = await verifyRes.json();
  if (!verifyRes.ok) throw new Error(verifyData.error || "Failed to verify passkey registration.");
  return verifyData.credentialId;
}

export async function removePasskeyDevice(user: User, credentialId: string): Promise<void> {
  const res = await authedFetch(`/api/passkey/${encodeURIComponent(credentialId)}`, user, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed to remove passkey.");
}

export async function signInUsingPasskey(email: string): Promise<void> {
  const optionsRes = await fetch("/api/passkey/auth/options", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const optionsData = await optionsRes.json();
  if (!optionsRes.ok) throw new Error(optionsData.error || "Failed to start passkey sign-in.");

  const authResponse = await startAuthentication({ optionsJSON: optionsData.options });

  const verifyRes = await fetch("/api/passkey/auth/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      challengeId: optionsData.challengeId,
      response: authResponse,
    }),
  });
  const verifyData = await verifyRes.json();
  if (!verifyRes.ok) throw new Error(verifyData.error || "Passkey sign-in failed.");
  await signInWithCustomToken(auth, verifyData.customToken);
}
