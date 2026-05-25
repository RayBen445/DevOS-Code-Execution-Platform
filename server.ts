import express from "express";
import type { Request } from "express";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";
import admin from "firebase-admin";
import crypto from "crypto";
import fs from "fs";
import os from "os";
import { Resend } from "resend";
import rateLimit from "express-rate-limit";
import { generateSecret, generateURI, verify, NobleCryptoPlugin, ScureBase32Plugin } from "otplib";
import type { AuthenticatorTransportFuture } from "@simplewebauthn/server";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// Firebase Admin – initialised once at module level so every serverless
// invocation (Vercel) reuses the same initialised instance.
// ---------------------------------------------------------------------------
let firebaseProjectId: string | undefined = process.env.FIREBASE_PROJECT_ID;
let firebaseApiKey: string | undefined = process.env.FIREBASE_API_KEY;
const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
if (!firebaseProjectId || !firebaseApiKey) {
  try {
    const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));
    firebaseProjectId = firebaseProjectId || firebaseConfig.projectId;
    firebaseApiKey = firebaseApiKey || firebaseConfig.apiKey;
  } catch {
    // Config file absent in production; FIREBASE_PROJECT_ID must be set
  }
}

let adminCredential: admin.credential.Credential;
if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    adminCredential = admin.credential.cert(serviceAccount);
  } catch {
    console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON; falling back to applicationDefault");
    adminCredential = admin.credential.applicationDefault();
  }
} else {
  adminCredential = admin.credential.applicationDefault();
}

// Guard against double-initialisation (warm Vercel instances reuse the module)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: adminCredential,
    projectId: firebaseProjectId,
  });
}

const db = admin.firestore();

// ---------------------------------------------------------------------------
// Express app – module-level so Vercel can import and invoke it directly.
// ---------------------------------------------------------------------------
const app = express();
app.use(express.json());

// ---------------------------------------------------------------------------
// GitHub App helpers
// ---------------------------------------------------------------------------
const generateGitHubJWT = () => {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!appId || !privateKey) throw new Error("GitHub App credentials missing");

  const now = Math.floor(Date.now() / 1000);
  const payload = { iat: now - 60, exp: now + 10 * 60, iss: appId };
  return jwt.sign(payload, privateKey, { algorithm: "RS256" });
};

const getInstallationToken = async (installationId: string) => {
  const githubJwt = generateGitHubJWT();
  const response = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${githubJwt}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );
  if (!response.ok) {
    const error = await response.json();
    console.error("GitHub Token Error:", error);
    throw new Error("Failed to get installation token");
  }
  const data = await response.json();
  return data.token;
};

// ---------------------------------------------------------------------------
// Rate-limit maps (per-instance; acceptable for serverless warm reuse)
// ---------------------------------------------------------------------------
const adminEmailRateLimit = new Map<string, { count: number; resetAt: number }>();
const ADMIN_EMAIL_RATE_MAX = 20;
const ADMIN_EMAIL_RATE_WINDOW_MS = 60 * 60_000; // 1 hour

const adminEmailIpRateLimit = new Map<string, { count: number; resetAt: number }>();
const ADMIN_EMAIL_IP_MAX = 30;
const ADMIN_EMAIL_IP_WINDOW_MS = 60_000; // 1 minute

const terminalRateLimit = new Map<string, { count: number; resetAt: number }>();
const TERMINAL_RATE_MAX = 30;
const TERMINAL_RATE_WINDOW_MS = 60_000;

const runProjectRateLimit = new Map<string, { count: number; resetAt: number }>();
const RUN_PROJECT_RATE_MAX = 5;
const RUN_PROJECT_RATE_WINDOW_MS = 60_000;

const buildJobRateLimit = new Map<string, { count: number; resetAt: number }>();
const BUILD_JOB_RATE_MAX = 10;
const BUILD_JOB_RATE_WINDOW_MS = 60_000;

const validateProjectRateLimit = new Map<string, { count: number; resetAt: number }>();
const VALIDATE_RATE_MAX = 20;
const VALIDATE_RATE_WINDOW_MS = 60_000;
const PASSKEY_CHALLENGE_TTL_MS = 5 * 60_000;
const MFA_CHALLENGE_TTL_MS = 5 * 60_000;
const PASSKEY_RP_NAME = process.env.PASSKEY_RP_NAME || "DevOS";
const passkeyRouteRateLimiter = rateLimit({
  windowMs: 60_000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many passkey requests. Please try again shortly." },
});
const recoveryCodeRouteRateLimiter = rateLimit({
  windowMs: 60_000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many recovery-code attempts. Please try again shortly." },
});

const getRequestOrigin = (req: Request): string => {
  const configured = process.env.PASSKEY_ORIGIN;
  if (configured) return configured;
  const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
  const host = req.headers.host || "";
  return `${proto}://${host}`;
};

const getPasskeyRpId = (req: Request): string => {
  const configured = process.env.PASSKEY_RP_ID;
  if (configured) return configured;
  try {
    return new URL(getRequestOrigin(req)).hostname;
  } catch {
    return "localhost";
  }
};

const normalizeEmail = (value: unknown): string =>
  String(value || "")
    .trim()
    .toLowerCase();

const resolveIdentifier = async (value: unknown): Promise<{ email: string; uid?: string }> => {
  const raw = String(value || "").trim();
  if (!raw) return { email: "" };
  const normalized = normalizeEmail(raw);
  if (normalized.includes("@")) return { email: normalized };
  const username = normalized;
  const snap = await db.collection("users").where("username", "==", username).limit(1).get();
  if (snap.empty) return { email: "" };
  const doc = snap.docs[0];
  const email = normalizeEmail(doc.get("email"));
  return { email, uid: doc.id };
};

const RECOVERY_CODE_COUNT = 10;
const RECOVERY_CODE_LEN = 10;
const recoveryCodePepper = process.env.MFA_RECOVERY_CODE_PEPPER || process.env.JWT_SECRET || "devos-recovery-fallback-pepper";
const recoveryCharset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const generateRecoveryCode = (): string => {
  const bytes = crypto.randomBytes(RECOVERY_CODE_LEN);
  let out = "";
  for (let i = 0; i < RECOVERY_CODE_LEN; i++) {
    out += recoveryCharset[bytes[i] % recoveryCharset.length];
    if (i === 4) out += "-";
  }
  return out;
};

const normalizeRecoveryCode = (value: unknown): string =>
  String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

const hashRecoveryCode = (uid: string, code: string): string =>
  crypto.createHash("sha256").update(`${uid}:${normalizeRecoveryCode(code)}:${recoveryCodePepper}`).digest("hex");

const otpCrypto = new NobleCryptoPlugin();
const otpBase32 = new ScureBase32Plugin();
const TOTP_PERIOD = 30;
const TOTP_EPOCH_TOLERANCE = 30;

const totpEncryptionKey = () => {
  const raw = process.env.MFA_TOTP_SECRET_KEY || process.env.JWT_SECRET || "devos-mfa-fallback";
  return crypto.createHash("sha256").update(raw).digest();
};

const encryptTotpSecret = (secret: string): string => {
  const iv = crypto.randomBytes(12);
  const key = totpEncryptionKey();
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    iv.toString("base64"),
    tag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(".");
};

const decryptTotpSecret = (payload: string): string => {
  const [ivB64, tagB64, dataB64] = String(payload || "").split(".");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Invalid TOTP secret payload.");
  }
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const data = Buffer.from(dataB64, "base64");
  const key = totpEncryptionKey();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(data), decipher.final()]);
  return plaintext.toString("utf8");
};

const createMfaChallenge = async (uid: string, email: string) => {
  const challengeRef = await db.collection("mfa_challenges").add({
    uid,
    email,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: Date.now() + MFA_CHALLENGE_TTL_MS,
  });
  return challengeRef.id;
};

const consumeRecoveryCode = async (uid: string, recoveryCode: string) => {
  const snap = await db.collection("mfa_recovery_codes").doc(uid).get();
  if (!snap.exists) {
    throw new Error("Invalid recovery code.");
  }
  const data = snap.data() as any;
  const codes = Array.isArray(data.codes) ? data.codes : [];
  if (!codes.length) throw new Error("Invalid recovery code.");
  const hashed = hashRecoveryCode(uid, recoveryCode);
  const idx = codes.findIndex((c: any) => c?.hash === hashed && !c?.usedAt);
  if (idx < 0) throw new Error("Invalid recovery code.");
  const updatedCodes = [...codes];
  updatedCodes[idx] = { ...updatedCodes[idx], usedAt: Date.now() };
  await snap.ref.set({
    codes: updatedCodes,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  const remaining = updatedCodes.filter((c: any) => !c?.usedAt).length;
  return { remaining };
};

const signInWithPassword = async (email: string, password: string) => {
  if (!firebaseApiKey) {
    throw new Error("Firebase API key is not configured.");
  }
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseApiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
    }
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error?.message || "Invalid credentials.";
    throw new Error(message);
  }
  return {
    uid: String(data.localId || ""),
    email: normalizeEmail(data.email || email),
  };
};

// Allowed output directories — used to prevent path traversal via user-supplied outputDir
const ALLOWED_OUTPUT_DIRS = new Set(["dist", "build", ".next", "out", "public"]);
// Max output file count and size (named constants for clarity)
const MAX_OUTPUT_FILES = 300;
const MAX_OUTPUT_FILE_SIZE = 1_048_576; // 1 MB
const MAX_STORED_OUTPUT_FILES = 50;

// Per-user persistent workspace directories for the terminal (lives for the process lifetime).
// This lets successive commands (e.g. `npm install` then `node index.js`) share state.
const userWorkspaceDirs = new Map<string, string>();

const getUserWorkspaceDir = (uid: string): string => {
  const existing = userWorkspaceDirs.get(uid);
  if (existing && fs.existsSync(existing)) return existing;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `devos-ws-${uid.slice(0, 8)}-`));
  userWorkspaceDirs.set(uid, dir);
  return dir;
};

type ProjectInputFile = { name: string; content: string };

const sanitizeRelativePath = (rawPath: string): string => {
  const normalized = path.posix.normalize(String(rawPath || "").replace(/\\/g, "/"));
  const trimmed = normalized.replace(/^\/+/, "");
  if (!trimmed || trimmed.startsWith("..") || trimmed.includes("\0")) {
    throw new Error(`Invalid file path: ${rawPath}`);
  }
  return trimmed;
};

const runCommand = async (
  executable: string,
  args: string[],
  cwd: string,
  timeoutMs: number
): Promise<{ stdout: string; stderr: string; exitCode: number }> => {
  const { execFile } = await import("child_process");
  return await new Promise((resolve, reject) => {
    execFile(
      executable,
      args,
      {
        cwd,
        timeout: timeoutMs,
        env: { ...process.env, NODE_OPTIONS: "--max-old-space-size=256" },
        maxBuffer: 1024 * 1024 * 10,
      },
      (error, stdout, stderr) => {
        const timedOut = Boolean((error as any)?.killed || (error as any)?.code === "ETIMEDOUT");
        const exitCode = (error as any)?.code ?? (error ? 1 : 0);
        if (timedOut) {
          reject(new Error("Execution timeout exceeded."));
          return;
        }
        resolve({ stdout: stdout || "", stderr: stderr || "", exitCode });
      }
    );
  });
};

const walkFiles = (dir: string): string[] => {
  const output: string[] = [];
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop()!;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile()) {
        output.push(full);
      }
    }
  }
  return output;
};

// ---------------------------------------------------------------------------
// API Routes
// ---------------------------------------------------------------------------

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// ---------------------------------------------------------------------------
// Passkey (WebAuthn) routes
// ---------------------------------------------------------------------------
app.post("/api/passkey/register/options", passkeyRouteRateLimiter, async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const idToken = authHeader.split("Bearer ")[1];

  let decoded: admin.auth.DecodedIdToken;
  try {
    decoded = await admin.auth().verifyIdToken(idToken);
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const userId = decoded.uid;
  const email = normalizeEmail(decoded.email);
  if (!email) return res.status(400).json({ error: "Email is required for passkey registration." });

  try {
    const rpID = getPasskeyRpId(req);
    const expectedOrigin = getRequestOrigin(req);
    const userName = decoded.name || email.split("@")[0] || "DevOS User";
    const webauthnUserId = Uint8Array.from(Buffer.from(userId, "utf8"));

    const existing = await db.collection("users").doc(userId).collection("passkeys").get();
    const excludeCredentials = existing.docs.map((d) => ({
      id: d.id,
      type: "public-key" as const,
      transports: Array.isArray(d.get("transports")) ? d.get("transports") : undefined,
    }));

    const options = await generateRegistrationOptions({
      rpName: PASSKEY_RP_NAME,
      rpID,
      userID: webauthnUserId,
      userName: email,
      userDisplayName: userName,
      timeout: 60_000,
      attestationType: "none",
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
      },
      excludeCredentials,
    });

    const challengeRef = await db.collection("passkey_challenges").add({
      type: "register",
      uid: userId,
      challenge: options.challenge,
      expectedOrigin,
      expectedRPID: rpID,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: Date.now() + PASSKEY_CHALLENGE_TTL_MS,
    });

    return res.json({ options, challengeId: challengeRef.id });
  } catch (error: any) {
    console.error("[passkey][register/options] error", error);
    return res.status(500).json({ error: error?.message || "Failed to start passkey registration." });
  }
});

app.post("/api/passkey/register/verify", passkeyRouteRateLimiter, async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const idToken = authHeader.split("Bearer ")[1];

  let decoded: admin.auth.DecodedIdToken;
  try {
    decoded = await admin.auth().verifyIdToken(idToken);
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const { challengeId, response, deviceName } = req.body as {
    challengeId?: string;
    response?: any;
    deviceName?: string;
  };

  if (!challengeId || !response) {
    return res.status(400).json({ error: "Missing challengeId or credential response." });
  }

  try {
    const challengeRef = db.collection("passkey_challenges").doc(challengeId);
    const challengeSnap = await challengeRef.get();
    if (!challengeSnap.exists) {
      return res.status(400).json({ error: "Passkey challenge not found." });
    }
    const challengeData = challengeSnap.data() as any;
    if (challengeData.type !== "register" || challengeData.uid !== decoded.uid) {
      return res.status(403).json({ error: "Invalid passkey challenge." });
    }
    if (!challengeData.expiresAt || Date.now() > Number(challengeData.expiresAt)) {
      await challengeRef.delete().catch(() => {});
      return res.status(400).json({ error: "Passkey challenge expired." });
    }

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challengeData.challenge,
      expectedOrigin: challengeData.expectedOrigin,
      expectedRPID: challengeData.expectedRPID,
      requireUserVerification: true,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return res.status(400).json({ error: "Passkey registration verification failed." });
    }

    const credential = verification.registrationInfo.credential;
    const credentialId = credential.id;
    const publicKey = Buffer.from(credential.publicKey).toString("base64url");
    const transports = credential.transports || [];
    const deviceType = verification.registrationInfo.credentialDeviceType;
    const backedUp = verification.registrationInfo.credentialBackedUp;

    await db.collection("users").doc(decoded.uid).collection("passkeys").doc(credentialId).set({
      uid: decoded.uid,
      email: normalizeEmail(decoded.email),
      credentialID: credentialId,
      publicKey,
      counter: credential.counter || 0,
      deviceType,
      backedUp,
      transports,
      deviceName: String(deviceName || "This device").slice(0, 80),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastUsedAt: null,
    }, { merge: true });

    await challengeRef.delete().catch(() => {});
    return res.json({ success: true, credentialId });
  } catch (error: any) {
    console.error("[passkey][register/verify] error", error);
    return res.status(400).json({ error: error?.message || "Failed to verify passkey registration." });
  }
});

app.get("/api/passkey/list", passkeyRouteRateLimiter, async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const idToken = authHeader.split("Bearer ")[1];

  let decoded: admin.auth.DecodedIdToken;
  try {
    decoded = await admin.auth().verifyIdToken(idToken);
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  try {
    const snap = await db.collection("users").doc(decoded.uid).collection("passkeys").get();
    const credentials = snap.docs.map((d) => ({
      credentialId: d.id,
      deviceName: d.get("deviceName") || "Passkey device",
      deviceType: d.get("deviceType") || null,
      backedUp: d.get("backedUp") ?? null,
      transports: d.get("transports") || [],
      createdAt: d.get("createdAt") || null,
      updatedAt: d.get("updatedAt") || null,
      lastUsedAt: d.get("lastUsedAt") || null,
    }));
    return res.json({ credentials });
  } catch (error: any) {
    console.error("[passkey][list] error", error);
    return res.status(500).json({ error: error?.message || "Failed to list passkeys." });
  }
});

app.delete("/api/passkey/:credentialId", passkeyRouteRateLimiter, async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const idToken = authHeader.split("Bearer ")[1];

  let decoded: admin.auth.DecodedIdToken;
  try {
    decoded = await admin.auth().verifyIdToken(idToken);
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const credentialId = String(req.params.credentialId || "").trim();
  if (!credentialId) return res.status(400).json({ error: "Missing credential id." });

  try {
    const ref = db.collection("users").doc(decoded.uid).collection("passkeys").doc(credentialId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Passkey not found." });
    await ref.delete();
    return res.json({ success: true });
  } catch (error: any) {
    console.error("[passkey][delete] error", error);
    return res.status(500).json({ error: error?.message || "Failed to delete passkey." });
  }
});

app.patch("/api/passkey/:credentialId", passkeyRouteRateLimiter, async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const idToken = authHeader.split("Bearer ")[1];

  let decoded: admin.auth.DecodedIdToken;
  try {
    decoded = await admin.auth().verifyIdToken(idToken);
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const credentialId = String(req.params.credentialId || "").trim();
  const deviceName = String((req.body as any)?.deviceName || "").trim();
  if (!credentialId || !deviceName) {
    return res.status(400).json({ error: "Missing credential id or device name." });
  }

  try {
    const ref = db.collection("users").doc(decoded.uid).collection("passkeys").doc(credentialId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Passkey not found." });
    await ref.set({
      deviceName: deviceName.slice(0, 80),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    return res.json({ success: true });
  } catch (error: any) {
    console.error("[passkey][update] error", error);
    return res.status(500).json({ error: error?.message || "Failed to update passkey." });
  }
});

app.post("/api/passkey/auth/options", passkeyRouteRateLimiter, async (req, res) => {
  const identifier = (req.body as any)?.identifier ?? (req.body as any)?.email;

  try {
    const { email } = await resolveIdentifier(identifier);
    const rpID = getPasskeyRpId(req);
    const expectedOrigin = getRequestOrigin(req);
    let allowCredentials: { id: string; type: "public-key"; transports?: string[] }[] | undefined;

    if (email) {
      const credsSnap = await db.collectionGroup("passkeys").where("email", "==", email).limit(25).get();
      if (credsSnap.empty) {
        return res.status(404).json({ error: "No passkey found for this account." });
      }
      allowCredentials = credsSnap.docs.map((d) => ({
        id: d.id,
        type: "public-key" as const,
        transports: Array.isArray(d.get("transports")) ? d.get("transports") : undefined,
      }));
    }

    const options = await generateAuthenticationOptions({
      rpID,
      timeout: 60_000,
      userVerification: "preferred",
      allowCredentials,
    });

    const challengeRef = await db.collection("passkey_challenges").add({
      type: "auth",
      email: email || null,
      challenge: options.challenge,
      expectedOrigin,
      expectedRPID: rpID,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: Date.now() + PASSKEY_CHALLENGE_TTL_MS,
    });

    return res.json({ options, challengeId: challengeRef.id });
  } catch (error: any) {
    console.error("[passkey][auth/options] error", error);
    return res.status(500).json({ error: error?.message || "Failed to start passkey sign-in." });
  }
});

app.post("/api/passkey/auth/verify", passkeyRouteRateLimiter, async (req, res) => {
  const { challengeId, response } = req.body as {
    challengeId?: string;
    response?: any;
  };
  if (!challengeId || !response) {
    return res.status(400).json({ error: "Missing challengeId or passkey response." });
  }

  try {
    const challengeRef = db.collection("passkey_challenges").doc(challengeId);
    const challengeSnap = await challengeRef.get();
    if (!challengeSnap.exists) return res.status(400).json({ error: "Passkey challenge not found." });

    const challengeData = challengeSnap.data() as any;
    if (challengeData.type !== "auth") return res.status(400).json({ error: "Invalid passkey challenge type." });
    if (!challengeData.expiresAt || Date.now() > Number(challengeData.expiresAt)) {
      await challengeRef.delete().catch(() => {});
      return res.status(400).json({ error: "Passkey challenge expired." });
    }

    const credentialId = String(response.id || "");
    if (!credentialId) return res.status(400).json({ error: "Missing credential id." });
    const credSnap = await db
      .collectionGroup("passkeys")
      .where(admin.firestore.FieldPath.documentId(), "==", credentialId)
      .limit(1)
      .get();
    if (credSnap.empty) return res.status(400).json({ error: "Passkey credential not found." });

    const credDoc = credSnap.docs[0];
    const credData = credDoc.data() as any;
    const credentialEmail = normalizeEmail(credData.email);
    if (challengeData.email && normalizeEmail(challengeData.email) !== credentialEmail) {
      return res.status(403).json({ error: "Passkey does not match this account." });
    }

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challengeData.challenge,
      expectedOrigin: challengeData.expectedOrigin,
      expectedRPID: challengeData.expectedRPID,
      requireUserVerification: true,
      credential: {
        id: credentialId,
        publicKey: Buffer.from(String(credData.publicKey || ""), "base64url"),
        counter: Number(credData.counter || 0),
        transports: Array.isArray(credData.transports) ? credData.transports : undefined,
      },
    });

    if (!verification.verified) {
      return res.status(401).json({ error: "Passkey verification failed." });
    }

    await credDoc.ref.set({
      counter: verification.authenticationInfo.newCounter,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastUsedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    await challengeRef.delete().catch(() => {});
    const uid = String(credData.uid || "");
    if (!uid) return res.status(400).json({ error: "Invalid passkey account." });

    const userSettingsSnap = await db.collection("user_settings").doc(uid).get();
    const twoFactorEnabled = !!userSettingsSnap.get("twoFactorEnabled");
    if (twoFactorEnabled) {
      const challengeId = await createMfaChallenge(uid, credentialEmail);
      return res.json({ mfaRequired: true, challengeId });
    }

    const customToken = await admin.auth().createCustomToken(uid);
    return res.json({ success: true, customToken });
  } catch (error: any) {
    console.error("[passkey][auth/verify] error", error);
    return res.status(401).json({ error: error?.message || "Failed to verify passkey sign-in." });
  }
});

// ---------------------------------------------------------------------------
// Password + 2FA authentication routes
// ---------------------------------------------------------------------------
app.post("/api/auth/password/login", passkeyRouteRateLimiter, async (req, res) => {
  const identifier = (req.body as any)?.identifier ?? (req.body as any)?.email ?? (req.body as any)?.username;
  const password = String((req.body as any)?.password || "");
  if (!identifier || !password) {
    return res.status(400).json({ error: "Identifier and password are required." });
  }

  try {
    const resolved = await resolveIdentifier(identifier);
    const email = resolved.email;
    if (!email) return res.status(404).json({ error: "Account not found." });

    const { uid } = await signInWithPassword(email, password);
    if (!uid) return res.status(401).json({ error: "Invalid credentials." });

    const settingsSnap = await db.collection("user_settings").doc(uid).get();
    const twoFactorEnabled = !!settingsSnap.get("twoFactorEnabled");
    if (twoFactorEnabled) {
      const challengeId = await createMfaChallenge(uid, email);
      return res.json({ mfaRequired: true, challengeId });
    }

    const customToken = await admin.auth().createCustomToken(uid);
    return res.json({ success: true, customToken });
  } catch (error: any) {
    const message = error?.message || "Invalid credentials.";
    return res.status(401).json({ error: message });
  }
});

app.post("/api/auth/2fa/setup", passkeyRouteRateLimiter, async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const idToken = authHeader.split("Bearer ")[1];

  let decoded: admin.auth.DecodedIdToken;
  try {
    decoded = await admin.auth().verifyIdToken(idToken);
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const email = normalizeEmail(decoded.email);
  if (!email) return res.status(400).json({ error: "Email is required for 2FA setup." });

  try {
    const settingsRef = db.collection("user_settings").doc(decoded.uid);
    const settingsSnap = await settingsRef.get();
    if (settingsSnap.get("twoFactorEnabled")) {
      return res.status(400).json({ error: "Two-factor authentication is already enabled." });
    }

    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(email, PASSKEY_RP_NAME, secret);
    await settingsRef.set({
      twoFactorPendingSecret: encryptTotpSecret(secret),
      twoFactorPendingAt: admin.firestore.FieldValue.serverTimestamp(),
      twoFactorEnabled: false,
    }, { merge: true });

    return res.json({ secret, otpauthUrl });
  } catch (error: any) {
    console.error("[2fa][setup] error", error);
    return res.status(500).json({ error: error?.message || "Failed to start 2FA setup." });
  }
});

app.post("/api/auth/2fa/verify", passkeyRouteRateLimiter, async (req, res) => {
  const { challengeId, otp, recoveryCode } = req.body as {
    challengeId?: string;
    otp?: string;
    recoveryCode?: string;
  };

  if (challengeId) {
    try {
      const challengeRef = db.collection("mfa_challenges").doc(challengeId);
      const challengeSnap = await challengeRef.get();
      if (!challengeSnap.exists) return res.status(400).json({ error: "MFA challenge not found." });
      const data = challengeSnap.data() as any;
      if (!data.expiresAt || Date.now() > Number(data.expiresAt)) {
        await challengeRef.delete().catch(() => {});
        return res.status(400).json({ error: "MFA challenge expired." });
      }

      const uid = String(data.uid || "");
      if (!uid) return res.status(400).json({ error: "Invalid MFA challenge." });

      if (recoveryCode) {
        await consumeRecoveryCode(uid, recoveryCode);
      } else {
        const otpValue = String(otp || "");
        if (!otpValue) return res.status(400).json({ error: "OTP code is required." });
        const settingsSnap = await db.collection("user_settings").doc(uid).get();
        const encrypted = settingsSnap.get("twoFactorSecret");
        if (!encrypted) return res.status(400).json({ error: "Two-factor authentication is not configured." });
        const secret = decryptTotpSecret(encrypted);
        if (!authenticator.check(otpValue, secret)) {
          return res.status(401).json({ error: "Invalid authentication code." });
        }
      }

      await challengeRef.delete().catch(() => {});
      const customToken = await admin.auth().createCustomToken(uid);
      return res.json({ success: true, customToken });
    } catch (error: any) {
      console.error("[2fa][verify] error", error);
      return res.status(401).json({ error: error?.message || "Two-factor verification failed." });
    }
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const idToken = authHeader.split("Bearer ")[1];

  let decoded: admin.auth.DecodedIdToken;
  try {
    decoded = await admin.auth().verifyIdToken(idToken);
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const otpValue = String(otp || "");
  if (!otpValue) return res.status(400).json({ error: "OTP code is required." });

  try {
    const settingsRef = db.collection("user_settings").doc(decoded.uid);
    const settingsSnap = await settingsRef.get();
    const pendingSecret = settingsSnap.get("twoFactorPendingSecret");
    if (!pendingSecret) {
      return res.status(400).json({ error: "Two-factor setup not started." });
    }
    const secret = decryptTotpSecret(pendingSecret);
    if (!authenticator.check(otpValue, secret)) {
      return res.status(401).json({ error: "Invalid authentication code." });
    }

    await settingsRef.set({
      twoFactorEnabled: true,
      twoFactorSecret: pendingSecret,
      twoFactorPendingSecret: admin.firestore.FieldValue.delete(),
      twoFactorPendingAt: admin.firestore.FieldValue.delete(),
      twoFactorVerifiedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    await db.collection("users").doc(decoded.uid).set({
      twoFactorEnabled: true,
    }, { merge: true });

    return res.json({ success: true });
  } catch (error: any) {
    console.error("[2fa][verify] error", error);
    return res.status(500).json({ error: error?.message || "Failed to verify 2FA." });
  }
});

app.post("/api/auth/2fa/disable", passkeyRouteRateLimiter, async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const idToken = authHeader.split("Bearer ")[1];

  let decoded: admin.auth.DecodedIdToken;
  try {
    decoded = await admin.auth().verifyIdToken(idToken);
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  try {
    await db.collection("user_settings").doc(decoded.uid).set({
      twoFactorEnabled: false,
      twoFactorSecret: admin.firestore.FieldValue.delete(),
      twoFactorPendingSecret: admin.firestore.FieldValue.delete(),
      twoFactorPendingAt: admin.firestore.FieldValue.delete(),
    }, { merge: true });

    await db.collection("users").doc(decoded.uid).set({
      twoFactorEnabled: false,
    }, { merge: true });

    return res.json({ success: true });
  } catch (error: any) {
    console.error("[2fa][disable] error", error);
    return res.status(500).json({ error: error?.message || "Failed to disable 2FA." });
  }
});

app.post("/api/mfa/recovery-codes/generate", passkeyRouteRateLimiter, async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const idToken = authHeader.split("Bearer ")[1];

  let decoded: admin.auth.DecodedIdToken;
  try {
    decoded = await admin.auth().verifyIdToken(idToken);
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const uid = decoded.uid;
  const email = normalizeEmail(decoded.email);
  if (!email) return res.status(400).json({ error: "Email is required." });

  try {
    const plainCodes = Array.from({ length: RECOVERY_CODE_COUNT }, () => generateRecoveryCode());
    const hashedCodes = plainCodes.map((code) => ({
      hash: hashRecoveryCode(uid, code),
      usedAt: null,
      createdAt: Date.now(),
    }));

    await db.collection("mfa_recovery_codes").doc(uid).set({
      uid,
      email,
      codes: hashedCodes,
      generatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return res.json({
      success: true,
      codes: plainCodes,
      total: plainCodes.length,
      remaining: plainCodes.length,
    });
  } catch (error: any) {
    console.error("[mfa][recovery/generate] error", error);
    return res.status(500).json({ error: error?.message || "Failed to generate recovery codes." });
  }
});

app.get("/api/mfa/recovery-codes/meta", passkeyRouteRateLimiter, async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const idToken = authHeader.split("Bearer ")[1];

  let decoded: admin.auth.DecodedIdToken;
  try {
    decoded = await admin.auth().verifyIdToken(idToken);
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  try {
    const snap = await db.collection("mfa_recovery_codes").doc(decoded.uid).get();
    if (!snap.exists) {
      return res.json({ exists: false, total: 0, remaining: 0, updatedAt: null });
    }
    const data = snap.data() as any;
    const codes = Array.isArray(data.codes) ? data.codes : [];
    const remaining = codes.filter((c: any) => !c?.usedAt).length;
    return res.json({
      exists: true,
      total: codes.length,
      remaining,
      updatedAt: data.updatedAt || null,
    });
  } catch (error: any) {
    console.error("[mfa][recovery/meta] error", error);
    return res.status(500).json({ error: error?.message || "Failed to load recovery code status." });
  }
});

app.post("/api/mfa/recovery-codes/verify", recoveryCodeRouteRateLimiter, async (req, res) => {
  const email = normalizeEmail((req.body as any)?.email);
  const recoveryCodeRaw = String((req.body as any)?.recoveryCode || "");
  if (!email || !recoveryCodeRaw) {
    return res.status(400).json({ error: "Email and recovery code are required." });
  }

  try {
    const snap = await db.collection("mfa_recovery_codes").where("email", "==", email).limit(1).get();
    if (snap.empty) {
      return res.status(401).json({ error: "Invalid recovery code." });
    }

    const uid = String(snap.docs[0].get("uid") || "");
    if (!uid) {
      return res.status(401).json({ error: "Invalid recovery code." });
    }

    const { remaining } = await consumeRecoveryCode(uid, recoveryCodeRaw);
    return res.json({
      success: true,
      remaining,
      message: "Recovery code accepted.",
    });
  } catch (error: any) {
    console.error("[mfa][recovery/verify] error", error);
    return res.status(401).json({ error: error?.message || "Recovery code verification failed." });
  }
});

app.post("/api/run-project", async (req, res) => {
  // Guard: untrusted project builds must be explicitly enabled in non-production environments
  const allowUntrustedProjectBuilds =
    process.env.ALLOW_UNTRUSTED_PROJECT_BUILDS === "true" &&
    process.env.NODE_ENV !== "production";
  if (!allowUntrustedProjectBuilds) {
    return res.status(403).json({
      success: false,
      error: "untrusted_build_disabled",
      stderr:
        "Building uploaded projects is disabled unless ALLOW_UNTRUSTED_PROJECT_BUILDS=true is set in a non-production environment.",
    });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer "))
    return res.status(401).json({ error: "Unauthorized" });
  const idToken = authHeader.split("Bearer ")[1];

  let uid: string;
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  // Per-user rate limit for expensive project builds
  const nowRp = Date.now();
  const rpEntry = runProjectRateLimit.get(uid);
  if (rpEntry && nowRp < rpEntry.resetAt) {
    if (rpEntry.count >= RUN_PROJECT_RATE_MAX)
      return res.status(429).json({ success: false, error: "Rate limit exceeded. Try again in a moment." });
    rpEntry.count++;
  } else {
    runProjectRateLimit.set(uid, { count: 1, resetAt: nowRp + RUN_PROJECT_RATE_WINDOW_MS });
  }

  const { files, mode } = req.body as { files?: ProjectInputFile[]; mode?: string };
  if (!Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ success: false, error: "Missing files payload." });
  }
  if (mode && mode !== "build") {
    return res.status(400).json({ success: false, error: "Unsupported mode." });
  }

  const startedAt = Date.now();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `devos-${uid.slice(0, 8)}-`));

  try {
    for (const file of files) {
      const rel = sanitizeRelativePath(file.name);
      const destination = path.join(tmpDir, rel);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.writeFileSync(destination, String(file.content ?? ""), "utf-8");
    }

    const packagePath = path.join(tmpDir, "package.json");
    if (!fs.existsSync(packagePath)) {
      return res.status(400).json({ success: false, error: "missing_package_json", stderr: "package.json is required." });
    }

    const pkg = JSON.parse(fs.readFileSync(packagePath, "utf-8"));
    const scripts = pkg?.scripts ?? {};
    if (!scripts?.build) {
      return res.status(400).json({ success: false, error: "missing_build_script", stderr: "No build script found in package.json." });
    }
    if (scripts?.dev) {
      // explicit policy: do not run dev servers in execution env
    }

    const installResult = await runCommand("npm", ["install", "--ignore-scripts"], tmpDir, 15_000);
    const buildResult = await runCommand("npm", ["run", "build"], tmpDir, 15_000);

    // Next.js static-export path
    const nextConfigPath = path.join(tmpDir, "next.config.js");
    if (fs.existsSync(nextConfigPath)) {
      const nextConfigContent = fs.readFileSync(nextConfigPath, "utf-8");
      if (nextConfigContent.includes("output: 'export'") || nextConfigContent.includes('output: "export"')) {
        try {
          await runCommand("npm", ["run", "export"], tmpDir, 15_000);
        } catch {
          // keep build logs; output detection below will decide if preview is possible
        }
      }
    }

    const outputCandidates = ["dist", "build", ".next", "out"];
    const outputDirName = outputCandidates.find((dirName) => fs.existsSync(path.join(tmpDir, dirName)));
    if (!outputDirName) {
      return res.status(400).json({
        success: false,
        error: "unsupported_preview",
        stdout: `${installResult.stdout}\n${buildResult.stdout}`.trim(),
        stderr: `${installResult.stderr}\n${buildResult.stderr}`.trim(),
        duration: Date.now() - startedAt,
      });
    }

    const outputDir = path.join(tmpDir, outputDirName);
    const outputFiles = walkFiles(outputDir)
      .filter((fullPath) => fs.statSync(fullPath).size <= 1024 * 1024)
      .slice(0, 300)
      .map((fullPath) => {
        const rel = path.relative(outputDir, fullPath).replace(/\\/g, "/");
        return {
          path: rel,
          content: fs.readFileSync(fullPath, "utf-8"),
        };
      });

    return res.json({
      success: true,
      stdout: `${installResult.stdout}\n${buildResult.stdout}`.trim(),
      stderr: `${installResult.stderr}\n${buildResult.stderr}`.trim(),
      previewPath: `/tmp/${path.basename(tmpDir)}/${outputDirName}`,
      outputDir: outputDirName,
      outputFiles,
      duration: Date.now() - startedAt,
    });
  } catch (error: any) {
    const message = String(error?.message || "Execution failed");
    const timedOut = message.toLowerCase().includes("timeout");
    return res.status(timedOut ? 408 : 500).json({
      success: false,
      error: timedOut ? "timeout_exceeded" : "execution_failed",
      stderr: message,
      duration: Date.now() - startedAt,
    });
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // noop cleanup best effort
    }
  }
});

// Link GitHub Installation ID to User
app.post("/api/github/link-installation", async (req, res) => {
  const { idToken, installationId } = req.body;
  if (!idToken || !installationId)
    return res.status(400).json({ error: "Missing parameters" });

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;
    await db.collection("user_settings").doc(uid).set(
      {
        githubInstallationId: installationId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    res.json({ success: true });
  } catch (error) {
    console.error("Error linking installation:", error);
    res.status(500).json({ error: "Failed to link installation" });
  }
});

// Fetch Repositories for Installation
app.get("/api/github/repositories", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer "))
    return res.status(401).json({ error: "Unauthorized" });

  const idToken = authHeader.split("Bearer ")[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    const userSettings = await db.collection("user_settings").doc(uid).get();
    const installationId = userSettings.data()?.githubInstallationId;
    if (!installationId)
      return res.status(404).json({ error: "GitHub App not installed" });

    const installationToken = await getInstallationToken(installationId);
    const repoResponse = await fetch(
      "https://api.github.com/installation/repositories",
      {
        headers: {
          Authorization: `token ${installationToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );
    if (!repoResponse.ok) throw new Error("Failed to fetch repositories");
    const data = await repoResponse.json();
    res.json(data.repositories);
  } catch (error) {
    console.error("Error fetching repositories:", error);
    res.status(500).json({ error: "Failed to fetch repositories" });
  }
});

// Import Repository Content
app.post("/api/github/import", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer "))
    return res.status(401).json({ error: "Unauthorized" });

  const idToken = authHeader.split("Bearer ")[1];
  const { repoFullName, branch } = req.body;
  if (!repoFullName || !branch)
    return res.status(400).json({ error: "Missing parameters" });

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    const userSettings = await db.collection("user_settings").doc(uid).get();
    const installationId = userSettings.data()?.githubInstallationId;
    if (!installationId)
      return res.status(404).json({ error: "GitHub App not installed" });

    const installationToken = await getInstallationToken(installationId);

    const treeResponse = await fetch(
      `https://api.github.com/repos/${repoFullName}/git/trees/${branch}?recursive=1`,
      {
        headers: {
          Authorization: `token ${installationToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );
    if (!treeResponse.ok) throw new Error("Failed to fetch repository tree");
    const treeData = await treeResponse.json();

    const files = treeData.tree
      .filter((item: any) => item.type === "blob")
      .slice(0, 50);

    const fileContents = [];
    for (const file of files) {
      const contentResponse = await fetch(file.url, {
        headers: {
          Authorization: `token ${installationToken}`,
          Accept: "application/vnd.github.v3.raw",
        },
      });
      if (contentResponse.ok) {
        const content = await contentResponse.text();
        fileContents.push({ path: file.path, content });
      }
    }

    res.json({ files: fileContents });
  } catch (error) {
    console.error("Error importing repository:", error);
    res.status(500).json({ error: "Failed to import repository" });
  }
});

// Webhook Support
app.post("/api/github/webhook", async (req, res) => {
  const signature = req.headers["x-hub-signature-256"];
  const webhookSecret = process.env.GITHUB_APP_WEBHOOK_SECRET;

  if (webhookSecret && signature) {
    const hmac = crypto.createHmac("sha256", webhookSecret);
    const body = JSON.stringify(req.body);
    const digest = "sha256=" + hmac.update(body).digest("hex");
    if (signature !== digest)
      return res.status(401).json({ error: "Invalid signature" });
  }

  const event = req.headers["x-github-event"];
  console.log(`Received GitHub event: ${event}`);
  if (event === "installation") {
    const { action, installation } = req.body;
    console.log(`Installation ${action}: ${installation.id}`);
  }
  res.json({ received: true });
});

// GitHub Push Logic
app.post("/api/github/push", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer "))
    return res.status(401).json({ error: "Unauthorized" });

  const idToken = authHeader.split("Bearer ")[1];
  const { projectId, repoFullName, files, commitMessage } = req.body;
  if (!projectId || !files || !commitMessage)
    return res.status(400).json({ error: "Missing parameters" });

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    const userSettings = await db.collection("user_settings").doc(uid).get();
    const installationId = userSettings.data()?.githubInstallationId;
    if (!installationId)
      return res.status(404).json({ error: "GitHub App not installed" });

    const installationToken = await getInstallationToken(installationId);
    let currentRepoFullName = repoFullName;

    const REPO_NAME_RE =
      /^[a-zA-Z0-9][a-zA-Z0-9._-]*\/[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
    if (currentRepoFullName && !REPO_NAME_RE.test(currentRepoFullName))
      return res.status(400).json({ error: "Invalid repository name format." });

    if (!currentRepoFullName) {
      const projectDoc = await db.collection("projects").doc(projectId).get();
      const projectName = projectDoc.data()?.name || "devos-project";
      const repoName =
        projectName.toLowerCase().replace(/[^a-z0-9]/g, "-") +
        "-" +
        crypto.randomBytes(4).toString("hex");

      const createRepoResponse = await fetch(
        "https://api.github.com/user/repos",
        {
          method: "POST",
          headers: {
            Authorization: `token ${installationToken}`,
            Accept: "application/vnd.github.v3+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: repoName, private: true, auto_init: false }),
        }
      );
      if (!createRepoResponse.ok) {
        const err = await createRepoResponse.json();
        throw new Error(`Failed to create repository: ${err.message}`);
      }
      const repoData = await createRepoResponse.json();
      currentRepoFullName = repoData.full_name;
      if (!REPO_NAME_RE.test(currentRepoFullName))
        throw new Error("GitHub returned an unexpected repository name.");

      await db.collection("projects").doc(projectId).update({
        githubRepo: currentRepoFullName,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    const ghHeaders = {
      Authorization: `token ${installationToken}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    };
    const [repoOwner, repoRepo] = currentRepoFullName.split("/");
    const repoApiBase = `https://api.github.com/repos/${encodeURIComponent(repoOwner)}/${encodeURIComponent(repoRepo)}`;

    let parentCommitSha: string | null = null;
    let baseTreeSha: string | null = null;
    const headRefRes = await fetch(`${repoApiBase}/git/ref/heads/main`, {
      headers: ghHeaders,
    });
    if (headRefRes.ok) {
      const headRefData = await headRefRes.json();
      parentCommitSha = headRefData.object.sha as string;
      const parentCommitRes = await fetch(
        `${repoApiBase}/git/commits/${parentCommitSha}`,
        { headers: ghHeaders }
      );
      if (parentCommitRes.ok) {
        const parentCommitData = await parentCommitRes.json();
        baseTreeSha = parentCommitData.tree.sha as string;
      }
    }

    const treeItems: {
      path: string;
      mode: string;
      type: string;
      sha: string;
    }[] = [];
    for (const file of files) {
      const blobRes = await fetch(`${repoApiBase}/git/blobs`, {
        method: "POST",
        headers: ghHeaders,
        body: JSON.stringify({ content: file.content, encoding: "utf-8" }),
      });
      if (!blobRes.ok) {
        const err = await blobRes.json();
        throw new Error(`Failed to create blob for ${file.path}: ${err.message}`);
      }
      const blobData = await blobRes.json();
      const normalizedPath = file.path.replace(/^\/+/, "");
      treeItems.push({
        path: normalizedPath,
        mode: "100644",
        type: "blob",
        sha: blobData.sha,
      });
    }

    const newTreeBody: Record<string, unknown> = { tree: treeItems };
    if (baseTreeSha) newTreeBody.base_tree = baseTreeSha;
    const newTreeRes = await fetch(`${repoApiBase}/git/trees`, {
      method: "POST",
      headers: ghHeaders,
      body: JSON.stringify(newTreeBody),
    });
    if (!newTreeRes.ok) {
      const err = await newTreeRes.json();
      throw new Error(`Failed to create tree: ${err.message}`);
    }
    const newTreeData = await newTreeRes.json();

    const newCommitBody: Record<string, unknown> = {
      message: commitMessage,
      tree: newTreeData.sha,
      ...(parentCommitSha ? { parents: [parentCommitSha] } : {}),
    };
    const newCommitRes = await fetch(`${repoApiBase}/git/commits`, {
      method: "POST",
      headers: ghHeaders,
      body: JSON.stringify(newCommitBody),
    });
    if (!newCommitRes.ok) {
      const err = await newCommitRes.json();
      throw new Error(`Failed to create commit: ${err.message}`);
    }
    const newCommitData = await newCommitRes.json();

    if (parentCommitSha) {
      const updateRefRes = await fetch(`${repoApiBase}/git/refs/heads/main`, {
        method: "PATCH",
        headers: ghHeaders,
        body: JSON.stringify({ sha: newCommitData.sha, force: false }),
      });
      if (!updateRefRes.ok) {
        const err = await updateRefRes.json();
        throw new Error(`Failed to update branch ref: ${err.message}`);
      }
    } else {
      const createRefRes = await fetch(`${repoApiBase}/git/refs`, {
        method: "POST",
        headers: ghHeaders,
        body: JSON.stringify({
          ref: "refs/heads/main",
          sha: newCommitData.sha,
        }),
      });
      if (!createRefRes.ok) {
        const err = await createRefRes.json();
        throw new Error(`Failed to create branch ref: ${err.message}`);
      }
    }

    res.json({ success: true, repoFullName: currentRepoFullName });
  } catch (error: any) {
    console.error("Push Error:", error);
    res.status(500).json({ error: error.message || "Failed to push to GitHub" });
  }
});

// ---------------------------------------------------------------------------
// Admin Email
// ---------------------------------------------------------------------------
const ADMIN_EMAIL_SENDER =
  process.env.GMAIL_SENDER_ADDRESS || "coolshotsystemsofficial@gmail.com";

/** Validate an email address without a regex prone to polynomial backtracking. */
const isValidEmailAddress = (email: string): boolean => {
  const trimmed = email.trim();
  if (trimmed.includes(" ")) return false;
  const at = trimmed.indexOf("@");
  if (at < 1 || at !== trimmed.lastIndexOf("@")) return false;
  const domain = trimmed.slice(at + 1);
  if (domain.includes(" ")) return false;
  const dot = domain.lastIndexOf(".");
  return dot > 0 && dot < domain.length - 1;
};

app.post("/api/admin/send-email", async (req, res) => {
  // 1. IP-level rate limit
  const clientIp =
    (req.headers["x-forwarded-for"] as string | undefined)
      ?.split(",")[0]
      .trim() ||
    req.socket.remoteAddress ||
    "unknown";
  const ipNow = Date.now();
  const ipEntry = adminEmailIpRateLimit.get(clientIp);
  if (ipEntry && ipNow < ipEntry.resetAt) {
    if (ipEntry.count >= ADMIN_EMAIL_IP_MAX)
      return res
        .status(429)
        .json({ error: "Too many requests. Please try again later." });
    ipEntry.count++;
  } else {
    adminEmailIpRateLimit.set(clientIp, {
      count: 1,
      resetAt: ipNow + ADMIN_EMAIL_IP_WINDOW_MS,
    });
  }

  // 2. Verify Firebase ID token
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer "))
    return res.status(401).json({ error: "Unauthorized" });
  const idToken = authHeader.split("Bearer ")[1];

  let uid: string;
  let callerEmail: string | undefined;
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    uid = decoded.uid;
    callerEmail = decoded.email;
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  // 3. Confirm caller is admin
  // Accepts either the platform-owner email or a Firestore role == 'admin'.
  const PLATFORM_ADMIN_EMAIL = "oladoyeheritage445@gmail.com";
  let userDoc: FirebaseFirestore.DocumentSnapshot | null = null;
  try {
    userDoc = await db.collection("users").doc(uid).get();
  } catch (err: any) {
    const hint = !process.env.FIREBASE_SERVICE_ACCOUNT_JSON
      ? " (FIREBASE_SERVICE_ACCOUNT_JSON is not set — server may be using applicationDefault credentials)"
      : "";
    console.error(`Firestore lookup error in send-email${hint}:`, err?.message ?? err);
    return res
      .status(500)
      .json({ error: "Server configuration error. Please try again later." });
  }
  const isAdminUser =
    callerEmail === PLATFORM_ADMIN_EMAIL ||
    userDoc?.data()?.role === "admin";
  if (!isAdminUser)
    return res.status(403).json({ error: "Forbidden: admin only" });

  // 4. Per-admin rate limit
  const now = Date.now();
  const rlEntry = adminEmailRateLimit.get(uid);
  if (rlEntry && now < rlEntry.resetAt) {
    if (rlEntry.count >= ADMIN_EMAIL_RATE_MAX)
      return res.status(429).json({
        error: "Rate limit exceeded. You can send at most 20 emails per hour.",
      });
    rlEntry.count++;
  } else {
    adminEmailRateLimit.set(uid, {
      count: 1,
      resetAt: now + ADMIN_EMAIL_RATE_WINDOW_MS,
    });
  }

  // 5. Validate payload
  const { to, subject, message } = req.body as {
    to?: string | string[];
    subject?: string;
    message?: string;
  };
  if (!to || !subject || !message)
    return res
      .status(400)
      .json({ error: "Missing required fields: to, subject, message" });

  const toAddresses = Array.isArray(to) ? to : [to];
  const invalid = toAddresses.find((a) => !isValidEmailAddress(a));
  if (invalid)
    return res
      .status(400)
      .json({ error: `Invalid email address: ${invalid}` });

  // 6. Send email — Gmail SMTP (nodemailer) is the primary transport.
  //    Falls back to Resend when GMAIL_APP_PASSWORD is absent but
  //    RESEND_API_KEY is present.  At least one must be configured.
  const gmailPassword = process.env.GMAIL_APP_PASSWORD;
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!gmailPassword && !resendApiKey)
    return res.status(500).json({
      error:
        "Email service is not configured. " +
        "Set GMAIL_APP_PASSWORD (Gmail SMTP) or RESEND_API_KEY on the server.",
    });

  try {
    if (gmailPassword) {
      // Primary: Gmail SMTP via nodemailer
      // `message` is admin-supplied HTML for the email body.
      // This endpoint is restricted to authenticated admins only; the HTML is
      // delivered to an email client, not rendered in a browser, so it is not
      // an XSS surface for other users of the platform.
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.default.createTransport({
        service: "gmail",
        auth: {
          user: ADMIN_EMAIL_SENDER,
          pass: gmailPassword,
        },
      });
      const info = await transporter.sendMail({
        from: `"DevOS" <${ADMIN_EMAIL_SENDER}>`,
        to: toAddresses.map((a) => a.trim()).join(", "),
        subject,
        html: message,
      });
      console.log(`Admin email sent via Gmail: ${info.messageId} to ${toAddresses.length} recipient(s).`);
      res.json({ success: true, messageId: info.messageId });
    } else {
      // Fallback: Resend
      const resend = new Resend(resendApiKey!);
      const { data, error: resendError } = await resend.emails.send({
        from: "DevOS <noreply@devos.name.ng>",
        to: toAddresses.map((a) => a.trim()),
        subject,
        html: message,
      });
      if (resendError) throw new Error(resendError.message);
      console.log(`Admin email sent via Resend: ${data?.id} to ${toAddresses.length} recipient(s).`);
      res.json({ success: true, messageId: data?.id });
    }
  } catch (error: any) {
    console.error("Admin email send error:", error);
    res.status(500).json({ error: error.message || "Failed to send email" });
  }
});

// ---------------------------------------------------------------------------
// Terminal Command API
// ---------------------------------------------------------------------------
app.post("/api/terminal", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer "))
    return res.status(401).json({ error: "Unauthorized" });
  const idToken = authHeader.split("Bearer ")[1];

  let uid: string;
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const now = Date.now();
  const entry = terminalRateLimit.get(uid);
  if (entry && now < entry.resetAt) {
    if (entry.count >= TERMINAL_RATE_MAX)
      return res
        .status(429)
        .json({ error: "Rate limit exceeded. Try again in a moment." });
    entry.count++;
  } else {
    terminalRateLimit.set(uid, {
      count: 1,
      resetAt: now + TERMINAL_RATE_WINDOW_MS,
    });
  }

  const { command, packageJson } = req.body;
  if (!command || typeof command !== "string")
    return res.status(400).json({ error: "No command provided" });

  const cmd = command.trim();
  if (
    /;|&&|\|\|/m.test(cmd) ||
    /`[^`]*`/.test(cmd) ||
    /\$\(/.test(cmd)
  )
    return res.json({
      stdout: "",
      stderr:
        "Command chaining and substitution are not supported.",
      exitCode: 1,
    });

  const ALLOWED_COMMANDS = new Set([
    "node", "npm", "npx", "yarn", "pnpm",
    "git", "ls", "pwd", "echo", "cat",
    "mkdir", "touch", "rm", "mv", "cp",
    "which", "date", "whoami",
    "python", "python3", "pip", "pip3",
    "java", "javac", "go", "cargo", "rustc",
    "tsc", "tsx",
  ]);
  const firstWord = cmd.split(/\s+/)[0].toLowerCase();
  if (!ALLOWED_COMMANDS.has(firstWord))
    return res.json({
      stdout: "",
      stderr: `Command not permitted: '${firstWord}'. Allowed tools: node, npm, npx, git, ls, pwd, echo, cat, and common dev utilities.`,
      exitCode: 1,
    });

  const BLOCKED_PATTERNS = [
    /rm\s+-[^\s]*r/i,
    /:\(\)\s*\{/,
    /shutdown/i,
    /reboot/i,
    /mkfs/i,
    /dd\s+if=/i,
    />\s*\/dev\/(sd|hd|nvme)/i,
  ];
  if (BLOCKED_PATTERNS.some((p) => p.test(cmd)))
    return res.json({
      stdout: "",
      stderr: "Command blocked for safety.",
      exitCode: 1,
    });

  // Use a per-user persistent workspace so state carries across commands
  // (e.g. `npm install express` then `node -e "require('express')"` both work).
  const workspaceDir = getUserWorkspaceDir(uid);

  // If the caller provided a package.json, write/refresh it in the workspace
  // before running the command so npm install uses the project's dependencies.
  if (packageJson && typeof packageJson === "string") {
    try {
      const parsed = JSON.parse(packageJson);
      fs.writeFileSync(
        path.join(workspaceDir, "package.json"),
        JSON.stringify(parsed, null, 2),
        "utf-8"
      );
    } catch {
      // Ignore malformed package.json — don't abort the command
    }
  }

  const parts =
    cmd.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) ?? [];
  const executable = parts[0];
  const args = parts.slice(1).map((a) => a.replace(/^['"]|['"]$/g, ""));

  // npm install / npx can be slow — give them up to 60 s
  const isNpmInstall = /^(npm|npx|yarn|pnpm)/.test(firstWord) &&
    /\binstall\b|\bi\b|\badd\b/.test(cmd);
  const timeoutMs = isNpmInstall ? 60_000 : 15_000;

  const { execFile } = await import("child_process");
  execFile(
    executable,
    args,
    { timeout: timeoutMs, cwd: workspaceDir },
    (error, stdout, stderr) => {
      res.json({
        stdout: stdout || "",
        stderr: stderr || "",
        exitCode: error?.code ?? (error ? 1 : 0),
      });
    }
  );
});

// ---------------------------------------------------------------------------
// Build Job API  — queue worker + live log streaming via Socket.io
// ---------------------------------------------------------------------------
// MAX concurrent builds allowed at once (can be raised via env)
const MAX_CONCURRENT_BUILDS = Number(process.env.MAX_CONCURRENT_BUILDS ?? 3);
// Simple in-process counter (good enough for single-instance; use Firestore
// transactions for multi-instance deployments)
let activeBuildCount = 0;

interface BuildJobPayload {
  jobId: string;
  projectId: string;
  files: ProjectInputFile[];
  framework?: string;
  buildCommand?: string | null;
  outputDir?: string | null;
  commitHash?: string;
  username?: string;
  projectSlug?: string;
}

/**
 * POST /api/build-job
 *
 * Processes one queued build job:
 *   1. Verify auth + load job from Firestore
 *   2. If MAX_CONCURRENT_BUILDS reached, return 429 (client should retry)
 *   3. Mark job "running", write files to tmp dir
 *   4. Run npm install + detected build command
 *   5. Stream every log line to Socket.io room (projectId)
 *   6. Mark job "success" | "failed", store previewUrl
 */
app.post("/api/build-job", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer "))
    return res.status(401).json({ error: "Unauthorized" });
  const idToken = authHeader.split("Bearer ")[1];

  let uid: string;
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  // Per-user rate limit for build jobs
  const nowBj = Date.now();
  const bjEntry = buildJobRateLimit.get(uid);
  if (bjEntry && nowBj < bjEntry.resetAt) {
    if (bjEntry.count >= BUILD_JOB_RATE_MAX)
      return res.status(429).json({ error: "Rate limit exceeded. Try again in a moment." });
    bjEntry.count++;
  } else {
    buildJobRateLimit.set(uid, { count: 1, resetAt: nowBj + BUILD_JOB_RATE_WINDOW_MS });
  }

  if (activeBuildCount >= MAX_CONCURRENT_BUILDS) {
    return res.status(429).json({ error: "Build queue full — job remains queued" });
  }

  const {
    jobId,
    projectId,
    files,
    framework,
    buildCommand,
    outputDir: requestedOutputDir,
    commitHash = "dev",
    username,
    projectSlug,
  } = req.body as BuildJobPayload;

  if (!jobId || !projectId || !Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Verify the job belongs to this user
  const jobRef = db.collection("build_jobs").doc(jobId);
  const jobSnap = await jobRef.get();
  if (!jobSnap.exists) return res.status(404).json({ error: "Job not found" });
  const jobData = jobSnap.data()!;
  if (jobData.userId !== uid) return res.status(403).json({ error: "Forbidden" });
  if (jobData.status !== "queued")
    return res.status(409).json({ error: "Job is not in queued state" });

  activeBuildCount++;
  const logs: string[] = [];
  const startedAt = Date.now();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `devos-build-${uid.slice(0, 8)}-`));

  // Helper: emit a log line to the Socket.io room AND store it
  // We defer io lookup to avoid top-level import (io is created at startup)
  const emitLog = (level: "info" | "warning" | "error" | "success", message: string) => {
    const line = `[${level.toUpperCase()}] ${message}`;
    logs.push(line);
    try {
      // io is available as a module-level variable after server start
      (globalThis as any).__devosIo?.to(projectId).emit("build-log", {
        jobId,
        projectId,
        level,
        message,
        timestamp: new Date().toISOString(),
      });
    } catch {
      // socket not available in Vercel serverless — ignore
    }
  };

  try {
    // Mark running
    await jobRef.update({ status: "running", startedAt: admin.firestore.FieldValue.serverTimestamp() });
    emitLog("info", `Build job ${jobId} started`);
    emitLog("info", `Framework: ${framework ?? "Unknown"}`);

    // Write files
    for (const file of files) {
      const rel = sanitizeRelativePath(file.name);
      const dest = path.join(tmpDir, rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, String(file.content ?? ""), "utf-8");
    }

    const pkgPath = path.join(tmpDir, "package.json");
    if (!fs.existsSync(pkgPath)) {
      throw new Error("package.json not found");
    }

    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    const scripts: Record<string, string> = pkg?.scripts ?? {};

    // Determine build command — derive from package.json scripts (do NOT execute arbitrary user input)
    // The client-provided buildCommand is only used as a hint to pick from allowed scripts.
    const hasBuildScript = !!scripts.build;
    if (!hasBuildScript) throw new Error("No build script found in package.json");
    // Always use the fixed npm invocation to prevent command injection
    const buildArgs = ["run", "build"];

    emitLog("info", "Installing dependencies…");
    const installResult = await runCommand("npm", ["install", "--ignore-scripts"], tmpDir, 60_000);
    if (installResult.stderr) emitLog("warning", installResult.stderr.slice(0, 500));
    emitLog("success", "Dependencies installed");

    emitLog("info", "Running: npm run build");
    const buildResult = await runCommand("npm", buildArgs, tmpDir, 60_000);
    if (buildResult.stdout) buildResult.stdout.split("\n").forEach((l) => emitLog("info", l));
    if (buildResult.stderr) buildResult.stderr.split("\n").forEach((l) => emitLog("warning", l));

    // Detect output dir — only check against the allowed whitelist to prevent path traversal
    const safeRequestedDir =
      requestedOutputDir && ALLOWED_OUTPUT_DIRS.has(requestedOutputDir) ? requestedOutputDir : null;
    const candidates = [safeRequestedDir, "dist", "build", ".next", "out"].filter(Boolean) as string[];
    const outputDirName = candidates.find((d) => ALLOWED_OUTPUT_DIRS.has(d) && fs.existsSync(path.join(tmpDir, d)));
    if (!outputDirName) throw new Error("Build output directory not found");

    emitLog("success", `Build complete — output: ${outputDirName}`);

    // Store output files back in Firestore under the job (capped to MAX_OUTPUT_FILES / MAX_OUTPUT_FILE_SIZE)
    const outputDir = path.join(tmpDir, outputDirName);
    const outputFiles = walkFiles(outputDir)
      .filter((f) => fs.statSync(f).size <= MAX_OUTPUT_FILE_SIZE)
      .slice(0, MAX_OUTPUT_FILES)
      .map((fullPath) => ({
        path: path.relative(outputDir, fullPath).replace(/\\/g, "/"),
        content: fs.readFileSync(fullPath, "utf-8"),
      }));

    // Build preview URL
    const short = String(commitHash).slice(0, 8);
    const previewUrl =
      username && projectSlug
        ? `${process.env.APP_ORIGIN ?? "https://devos.name.ng"}/@${username}/${projectSlug}-${short}`
        : null;

    await jobRef.update({
      status: "success",
      previewUrl,
      logs,
      outputFiles: outputFiles.slice(0, MAX_STORED_OUTPUT_FILES),
      finishedAt: admin.firestore.FieldValue.serverTimestamp(),
      error: null,
    });

    emitLog("success", previewUrl ? `Preview URL: ${previewUrl}` : "Job complete");
    (globalThis as any).__devosIo?.to(projectId).emit("build-complete", { jobId, status: "success", previewUrl });

    return res.json({
      success: true,
      jobId,
      previewUrl,
      outputDir: outputDirName,
      duration: Date.now() - startedAt,
      logs,
    });
  } catch (error: any) {
    const message = String(error?.message ?? "Build failed");
    emitLog("error", message);
    await jobRef.update({
      status: "failed",
      error: message,
      logs,
      finishedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    (globalThis as any).__devosIo?.to(projectId).emit("build-complete", { jobId, status: "failed", error: message });
    return res.status(500).json({ success: false, jobId, error: message, logs, duration: Date.now() - startedAt });
  } finally {
    activeBuildCount--;
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* cleanup best effort */ }
  }
});

// ---------------------------------------------------------------------------
// Run Code API
// ---------------------------------------------------------------------------
app.post("/api/run", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer "))
    return res.status(401).json({ error: "Unauthorized" });
  const idToken = authHeader.split("Bearer ")[1];

  let uid: string;
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const now = Date.now();
  const entry = terminalRateLimit.get(uid);
  if (entry && now < entry.resetAt) {
    if (entry.count >= TERMINAL_RATE_MAX)
      return res
        .status(429)
        .json({ error: "Rate limit exceeded. Try again in a moment." });
    entry.count++;
  } else {
    terminalRateLimit.set(uid, {
      count: 1,
      resetAt: now + TERMINAL_RATE_WINDOW_MS,
    });
  }

  const { language, content } = req.body;
  if (!content || typeof content !== "string")
    return res.status(400).json({ error: "No content provided" });

  const supportedLanguages = ["javascript", "typescript"];
  if (!supportedLanguages.includes(language))
    return res
      .status(400)
      .json({ error: `Language '${language}' is not supported for execution.` });

  // SECURITY NOTE: This endpoint executes user-provided code on the host process.
  // Isolation is limited to a temporary directory and a 10-second timeout.
  const tmpDir = fs.mkdtempSync(
    path.join(os.tmpdir(), `devos-run-${uid.slice(0, 8)}-`)
  );
  const ext = language === "typescript" ? ".ts" : ".js";
  const tmpFile = path.join(tmpDir, `script${ext}`);

  try {
    fs.writeFileSync(tmpFile, content, "utf-8");
    const executable = language === "typescript" ? "tsx" : "node";
    const { execFile } = await import("child_process");

    await new Promise<void>((resolve, reject) => {
      execFile(
        executable,
        [tmpFile],
        { timeout: 10_000, cwd: tmpDir },
        (error, stdout, stderr) => {
          try {
            const logs: string[] = [];
            if (stdout)
              stdout
                .split("\n")
                .filter(Boolean)
                .forEach((line) => logs.push(line));
            if (stderr)
              stderr
                .split("\n")
                .filter(Boolean)
                .forEach((line) => logs.push(`[stderr] ${line}`));
            if (error?.killed || (error as any)?.code === "ETIMEDOUT")
              logs.push("[stderr] Script execution timed out after 10 seconds.");
            res.json({ logs, exitCode: error?.code ?? (error ? 1 : 0) });
            resolve();
          } catch (sendErr) {
            reject(sendErr);
          }
        }
      );
    });
  } catch (error: any) {
    if (!res.headersSent)
      res.status(500).json({ error: error.message || "Execution failed" });
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true });
    } catch {
      /* ignore cleanup errors */
    }
  }
});

// ---------------------------------------------------------------------------
// Validate Project API (TypeScript + Vite pre-flight checks)
// ---------------------------------------------------------------------------
app.post("/api/validate-project", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer "))
    return res.status(401).json({ error: "Unauthorized" });
  const idToken = authHeader.split("Bearer ")[1];

  try {
    await admin.auth().verifyIdToken(idToken);
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const { files, checks } = req.body as {
    projectId?: string;
    files?: Array<{ name: string; content: string }>;
    checks?: string[];
  };

  if (!Array.isArray(files) || files.length === 0)
    return res.status(400).json({ error: "No files provided" });

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "devos-validate-"));
  const startedAt = Date.now();

  try {
    for (const file of files) {
      const rel = sanitizeRelativePath(file.name);
      const dest = path.join(tmpDir, rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, String(file.content ?? ""), "utf-8");
    }

    const errors: Array<{ file: string; line: number; col: number; message: string; severity: string }> = [];
    let rawOutput = "";
    let status = "success";

    const runCheck = (cmd: string, args: string[]): Promise<{ stdout: string; stderr: string }> =>
      new Promise((resolve) => {
        const { execFile } = require("child_process");
        execFile(cmd, args, { timeout: 30_000, cwd: tmpDir }, (_err: any, stdout: string, stderr: string) => {
          resolve({ stdout: stdout || "", stderr: stderr || "" });
        });
      });

    if (checks?.includes("typescript") && fs.existsSync(path.join(tmpDir, "tsconfig.json"))) {
      const result = await runCheck("npx", ["--yes", "typescript", "--noEmit"]).catch(() => ({ stdout: "", stderr: "" }));
      const out = result.stdout + result.stderr;
      rawOutput += out;
      for (const line of out.split("\n")) {
        const m = line.match(/^(.+?)\((\d+),(\d+)\):\s+(error|warning)\s+TS\d+:\s+(.+)$/);
        if (m) {
          errors.push({ file: m[1].replace(/\\/g, "/"), line: parseInt(m[2]), col: parseInt(m[3]), severity: m[4], message: m[5].trim() });
        }
      }
      if (errors.some((e) => e.severity === "error")) status = "error";
    }

    if (checks?.includes("vite")) {
      const pkgPath = path.join(tmpDir, "package.json");
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
        if (pkg?.scripts?.build) {
          const result = await runCheck("npm", ["run", "build", "--", "--logLevel", "error"]).catch(() => ({ stdout: "", stderr: "" }));
          const out = result.stdout + result.stderr;
          rawOutput += "\n" + out;
          for (const line of out.split("\n")) {
            const m = line.match(/^([^:]+\.(?:ts|tsx|js|jsx|css|vue)):(\d+):(\d+):/);
            if (m) {
              const msg = line.slice(m[0].length).replace(/^\s*error:\s*/i, "").trim();
              errors.push({ file: m[1].replace(/\\/g, "/"), line: parseInt(m[2]), col: parseInt(m[3]), severity: "error", message: msg || "Build error" });
            }
          }
          if (errors.some((e) => e.severity === "error")) status = "error";
        }
      }
    }

    return res.json({ status, errors, rawOutput: rawOutput.slice(0, 10_000), durationMs: Date.now() - startedAt });
  } catch (error: any) {
    return res.status(500).json({ status: "error", errors: [], error: error.message });
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true }); } catch { /* ignore */ }
  }
});

// ---------------------------------------------------------------------------
// Email Worker API — processes queued email_jobs from Firestore
// ---------------------------------------------------------------------------
app.post("/api/email-worker", async (req, res) => {
  const workerSecret = process.env.EMAIL_WORKER_SECRET;
  if (workerSecret) {
    const provided = req.headers["x-worker-secret"];
    if (provided !== workerSecret)
      return res.status(401).json({ error: "Unauthorized" });
  }

  const MAX_JOBS = 10;
  const RETRY_DELAYS_MS = [60_000, 5 * 60_000, 15 * 60_000];

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey)
    return res.status(500).json({ error: "RESEND_API_KEY not configured" });

  const { Resend: ResendClient } = await import("resend");
  const resend = new ResendClient(resendApiKey);

  const { welcomeEmail } = await import("./src/emails/welcomeEmail.js").catch(() => ({ welcomeEmail: null }));
  const { deploySuccessEmail, deployFailureEmail } = await import("./src/emails/deployEmail.js").catch(() => ({ deploySuccessEmail: null, deployFailureEmail: null }));

  const templateMap: Record<string, ((p: any) => { subject: string; html: string }) | null> = {
    welcome: welcomeEmail,
    deploy_success: deploySuccessEmail,
    deploy_failure: deployFailureEmail,
  };

  const now = admin.firestore.Timestamp.now();
  const snap = await db.collection("email_jobs")
    .where("status", "==", "queued")
    .where("scheduledAt", "<=", now)
    .orderBy("scheduledAt", "asc")
    .limit(MAX_JOBS)
    .get();

  const results: Array<{ id: string; status: string; error?: string }> = [];

  for (const jobDoc of snap.docs) {
    const job = jobDoc.data();
    const templateFn = templateMap[job.templateKey];

    let subject = job.subject ?? "DevOS notification";
    let html = job.html ?? "";

    if (templateFn) {
      try {
        const rendered = templateFn(job.payload ?? {});
        subject = rendered.subject;
        html = rendered.html;
      } catch (renderErr: any) {
        await jobDoc.ref.update({ status: "failed", lastError: `Template render failed: ${renderErr.message}`, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        results.push({ id: jobDoc.id, status: "failed", error: renderErr.message });
        continue;
      }
    }

    if (!html) {
      await jobDoc.ref.update({ status: "failed", lastError: "No HTML content", updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      results.push({ id: jobDoc.id, status: "failed", error: "No HTML content" });
      continue;
    }

    try {
      const { error: sendError } = await resend.emails.send({
        from: "DevOS <noreply@devos.name.ng>",
        to: job.to,
        subject,
        html,
      });
      if (sendError) throw new Error(sendError.message);

      await jobDoc.ref.update({ status: "sent", attempts: (job.attempts ?? 0) + 1, lastError: null, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      results.push({ id: jobDoc.id, status: "sent" });
    } catch (sendErr: any) {
      const attempts = (job.attempts ?? 0) + 1;
      if (attempts >= (job.maxAttempts ?? 3)) {
        await jobDoc.ref.update({ status: "failed", attempts, lastError: sendErr.message, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        results.push({ id: jobDoc.id, status: "failed", error: sendErr.message });
      } else {
        const delayMs = RETRY_DELAYS_MS[attempts - 1] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
        const retryAt = admin.firestore.Timestamp.fromMillis(Date.now() + delayMs);
        await jobDoc.ref.update({ attempts, lastError: sendErr.message, scheduledAt: retryAt, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        results.push({ id: jobDoc.id, status: "retrying", error: sendErr.message });
      }
    }
  }

  return res.json({ processed: results.length, results });
});

// ---------------------------------------------------------------------------
// DevOS AI — secure middleware between the frontend IDE chat and the
// Hugging Face Serverless Inference API.
//
// POST /api/devos-ai
// Authorization: Bearer <Firebase ID token>
// Body: { prompt: string, maxTokens?: number }
//
// Returns: { text: string }
// ---------------------------------------------------------------------------

/** Rate-limiter: max 20 AI requests per user per 60 seconds (keyed by IP). */
const aiRateLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests — please wait before sending another message." },
});

app.post("/api/devos-ai", aiRateLimiter, async (req, res) => {
  // ── 1. Authenticate the caller via Firebase ID token ──────────────────────
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer "))
    return res.status(401).json({ error: "Unauthorized" });

  const idToken = authHeader.slice(7);
  let uid: string;
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  // ── 2. Validate the request body ──────────────────────────────────────────
  const { prompt, maxTokens } = req.body as { prompt?: unknown; maxTokens?: unknown };
  if (typeof prompt !== "string" || prompt.trim().length === 0)
    return res.status(400).json({ error: "A non-empty 'prompt' string is required." });
  if (prompt.length > 12_000)
    return res.status(400).json({ error: "Prompt exceeds the maximum allowed length of 12 000 characters." });

  const resolvedMaxTokens =
    typeof maxTokens === "number" && maxTokens > 0 && maxTokens <= 4096
      ? maxTokens
      : 512;

  // ── 3. Ensure the API key is configured ───────────────────────────────────
  const hfApiKey = process.env.HUGGINGFACE_API_KEY;
  if (!hfApiKey)
    return res.status(500).json({ error: "AI service is not configured. Please contact support." });

  // ── 4. Call the Hugging Face Serverless Inference API ─────────────────────
  /**
   * Model preference list — we try each in order until one succeeds.
   * Primary:  mistralai/Mistral-7B-Instruct-v0.3  (open-weights, no gating)
   * Fallback: HuggingFaceH4/zephyr-7b-beta         (open, widely available)
   */
  const MODELS = [
    "mistralai/Mistral-7B-Instruct-v0.3",
    "HuggingFaceH4/zephyr-7b-beta",
  ];

  const systemPrompt =
    "You are DevOS AI, a helpful, concise coding assistant embedded inside the DevOS cloud IDE. " +
    "You specialise in TypeScript, React, Node.js, and Firebase. " +
    "Provide clear, accurate answers. Format code blocks with the appropriate language tag.";

  const { HfInference } = await import("@huggingface/inference");
  const hf = new HfInference(hfApiKey);

  let lastErr: any = null;

  for (const model of MODELS) {
    try {
      const completion = await hf.chatCompletion({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt.trim() },
        ],
        max_tokens: resolvedMaxTokens,
      });

      const text = completion.choices?.[0]?.message?.content?.trim() ?? "";
      return res.json({ text });
    } catch (err: any) {
      lastErr = err;
      const statusCode: number = err?.response?.status ?? err?.statusCode ?? 0;

      // 401 / 403 — key issue or gated model; try next model
      if (statusCode === 401 || statusCode === 403) {
        console.warn(`[devos-ai] Model ${model} returned ${statusCode} — trying next model`);
        continue;
      }

      // 404 — model not found; try next
      if (statusCode === 404) {
        console.warn(`[devos-ai] Model ${model} not found — trying next model`);
        continue;
      }

      // 503 — model cold-starting; try next model before giving up
      if (statusCode === 503 || err?.message?.includes("loading") || err?.message?.includes("currently loading")) {
        console.warn(`[devos-ai] Model ${model} is loading — trying next model`);
        continue;
      }

      // 429 — rate limited on this model; try next
      if (statusCode === 429) {
        console.warn(`[devos-ai] Model ${model} rate-limited — trying next model`);
        continue;
      }

      // Timeout — try next model
      if (err?.code === "ETIMEDOUT" || err?.name === "TimeoutError" || err?.message?.includes("timeout")) {
        console.warn(`[devos-ai] Model ${model} timed out — trying next model`);
        continue;
      }

      // Any other error — stop trying, surface immediately
      console.error(`[devos-ai] Unrecoverable error from ${model}:`, err?.message ?? err);
      return res.status(502).json({
        error: "The AI service encountered an error. Please try again shortly.",
      });
    }
  }

  // All models failed — surface the most useful message
  const lastStatus: number = lastErr?.response?.status ?? lastErr?.statusCode ?? 0;
  console.error("[devos-ai] All models failed. Last error:", lastErr?.message ?? lastErr);

  if (lastStatus === 503 || lastErr?.message?.includes("loading")) {
    return res.status(503).json({
      error: "The AI models are warming up. Please try again in about 30 seconds.",
      retryAfter: 30,
    });
  }
  if (lastErr?.code === "ETIMEDOUT" || lastErr?.name === "TimeoutError" || lastErr?.message?.includes("timeout")) {
    return res.status(504).json({ error: "The AI request timed out. Please try again." });
  }
  if (lastStatus === 429) {
    return res.status(429).json({ error: "AI rate limit reached. Please wait a moment and try again." });
  }

  return res.status(502).json({
    error: "The AI service is temporarily unavailable. Please try again shortly.",
  });
});

// ---------------------------------------------------------------------------
// In development, serve the Vite dev server; in production Vercel routes
// static assets from the build output so this block is skipped.
// ---------------------------------------------------------------------------
if (process.env.NODE_ENV !== "production") {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// ---------------------------------------------------------------------------
// Export for Vercel serverless (@vercel/node expects a default-exported handler)
// In local development this file is run directly via tsx/ts-node, so we also
// start listening when not in a serverless context.
// ---------------------------------------------------------------------------
export default app;

// Start the HTTP server when running locally (not in Vercel serverless)
if (process.env.VERCEL !== "1") {
  const { createServer } = await import("http");
  const { Server } = await import("socket.io");

  const httpServer = createServer(app);
  const io = new Server(httpServer, { cors: { origin: "*", methods: ["GET", "POST"] } });
  // Expose io globally so the /api/build-job route can stream logs
  (globalThis as any).__devosIo = io;

  // ── Per-room voice participant registry ────────────────────────────────────
  // voiceRooms: roomId → Map<userId, displayName>
  // Persists across individual socket connections within the same process.
  const voiceRooms = new Map<string, Map<string, string>>();

  /** Write current participants for a room to Firestore (fire-and-forget). */
  const syncVoiceRoom = (roomId: string) => {
    const room = voiceRooms.get(roomId);
    if (!room || room.size === 0) {
      db.collection("voice_rooms").doc(roomId).delete().catch(() => {});
    } else {
      const participants: Record<string, string> = {};
      room.forEach((name, uid) => { participants[uid] = name; });
      db.collection("voice_rooms").doc(roomId).set({
        participants,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }).catch(() => {});
    }
  };

  io.on("connection", (socket) => {
    socket.on("join-project", (projectId: string) => {
      if (!projectId) return;
      socket.join(projectId);
    });

    // Alias used by some clients/specs
    socket.on("joinProject", (projectId: string) => {
      if (!projectId) return;
      socket.join(projectId);
    });

    socket.on("code-change", (payload: { projectId: string; fileId: string; content: string; userId?: string }) => {
      if (!payload?.projectId) return;
      // Last-write-wins strategy: broadcast latest payload to room except sender
      socket.to(payload.projectId).emit("code-update", payload);
    });

    socket.on("fileChange", (payload: { projectId: string; fileName: string; content: string; userId?: string }) => {
      if (!payload?.projectId) return;
      socket.to(payload.projectId).emit("fileChange", payload);
    });

    socket.on("cursor-move", (payload: { projectId: string; userId?: string; userName?: string; cursor?: any }) => {
      if (!payload?.projectId) return;
      socket.to(payload.projectId).emit("cursor-update", payload);
    });

    // ── Voice calling signaling (WebRTC) ─────────────────────────────────────
    // Per-socket per-event rate limiter to prevent signaling abuse
    const voiceRateLimit: Record<string, { count: number; resetAt: number }> = {};
    const consumeVoiceQuota = (event: string, limit: number, windowMs: number): boolean => {
      const now = Date.now();
      const cur = voiceRateLimit[event];
      if (!cur || now >= cur.resetAt) {
        voiceRateLimit[event] = { count: 1, resetAt: now + windowMs };
        return true;
      }
      if (cur.count >= limit) return false;
      cur.count++;
      return true;
    };

    socket.on("join-voice-room", ({ roomId, userId, name }: { roomId: string; userId: string; name?: string }) => {
      if (!roomId || !userId) return;
      if (!consumeVoiceQuota("join-voice-room", 5, 60_000)) return;

      // Collect existing participants BEFORE the new user joins so we can send
      // the list back to them.  They will then initiate WebRTC offers to each.
      const existing = voiceRooms.get(roomId) ?? new Map<string, string>();
      const existingList = Array.from(existing.entries()).map(([uid, n]) => ({ userId: uid, name: n }));

      // Tell the joining socket who is already in the room
      socket.emit("voice-room-participants", { roomId, participants: existingList });

      // Add new participant to registry
      if (!voiceRooms.has(roomId)) voiceRooms.set(roomId, new Map());
      voiceRooms.get(roomId)!.set(userId, name || "User");

      // Join the socket.io room and tag the socket
      socket.join(roomId);
      socket.data.voice = { roomId, userId };

      // Notify everyone already in the room
      socket.to(roomId).emit("voice-user-joined", { userId, name: name || "User" });

      // Persist state to Firestore for real-time "call active" banner
      syncVoiceRoom(roomId);
    });

    // Non-joining query: let a user check whether a call is active without joining
    socket.on("get-voice-room-participants", ({ roomId }: { roomId: string }) => {
      if (!roomId) return;
      const room = voiceRooms.get(roomId);
      const participants = room
        ? Array.from(room.entries()).map(([uid, n]) => ({ userId: uid, name: n }))
        : [];
      socket.emit("voice-room-participants", { roomId, participants });
    });

    socket.on("voice-offer", ({ roomId, targetUserId, fromUserId, offer }: any) => {
      if (!roomId || !targetUserId || !fromUserId || !offer) return;
      if (!consumeVoiceQuota("voice-offer", 60, 60_000)) return;
      for (const [, s] of io.of("/").sockets) {
        if (s.data?.voice?.roomId === roomId && s.data?.voice?.userId === targetUserId) {
          s.emit("voice-offer", { fromUserId, offer });
          break;
        }
      }
    });

    socket.on("voice-answer", ({ roomId, targetUserId, fromUserId, answer }: any) => {
      if (!roomId || !targetUserId || !fromUserId || !answer) return;
      if (!consumeVoiceQuota("voice-answer", 60, 60_000)) return;
      for (const [, s] of io.of("/").sockets) {
        if (s.data?.voice?.roomId === roomId && s.data?.voice?.userId === targetUserId) {
          s.emit("voice-answer", { fromUserId, answer });
          break;
        }
      }
    });

    socket.on("voice-ice-candidate", ({ roomId, targetUserId, fromUserId, candidate }: any) => {
      if (!roomId || !targetUserId || !fromUserId || !candidate) return;
      if (!consumeVoiceQuota("voice-ice-candidate", 180, 60_000)) return;
      for (const [, s] of io.of("/").sockets) {
        if (s.data?.voice?.roomId === roomId && s.data?.voice?.userId === targetUserId) {
          s.emit("voice-ice-candidate", { fromUserId, candidate });
          break;
        }
      }
    });

    socket.on("leave-voice-room", ({ roomId, userId }: { roomId: string; userId: string }) => {
      if (!roomId || !userId) return;
      socket.leave(roomId);
      socket.data.voice = null;
      voiceRooms.get(roomId)?.delete(userId);
      if (voiceRooms.get(roomId)?.size === 0) voiceRooms.delete(roomId);
      socket.to(roomId).emit("voice-user-left", { userId });
      syncVoiceRoom(roomId);
    });

    socket.on("disconnect", () => {
      const voice = socket.data?.voice;
      if (voice?.roomId && voice?.userId) {
        voiceRooms.get(voice.roomId)?.delete(voice.userId);
        if (voiceRooms.get(voice.roomId)?.size === 0) voiceRooms.delete(voice.roomId);
        socket.to(voice.roomId).emit("voice-user-left", { userId: voice.userId });
        syncVoiceRoom(voice.roomId);
      }
    });
  });

  const PORT = Number(process.env.PORT) || 3000;
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
