import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";
import admin from "firebase-admin";
import crypto from "crypto";
import fs from "fs";
import os from "os";
import nodemailer from "nodemailer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// Firebase Admin – initialised once at module level so every serverless
// invocation (Vercel) reuses the same initialised instance.
// ---------------------------------------------------------------------------
let firebaseProjectId: string | undefined = process.env.FIREBASE_PROJECT_ID;
const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
if (!firebaseProjectId) {
  try {
    const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));
    firebaseProjectId = firebaseConfig.projectId;
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

// ---------------------------------------------------------------------------
// API Routes
// ---------------------------------------------------------------------------

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
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
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  // 3. Confirm caller is admin
  let userDoc: FirebaseFirestore.DocumentSnapshot;
  try {
    userDoc = await db.collection("users").doc(uid).get();
  } catch (err) {
    console.error("Firestore lookup error in send-email:", err);
    return res
      .status(500)
      .json({ error: "Server configuration error. Please try again later." });
  }
  if (userDoc.data()?.role !== "admin")
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

  // 6. Send via Gmail SMTP
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (!gmailPass)
    return res
      .status(500)
      .json({ error: "GMAIL_APP_PASSWORD is not configured on the server." });

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: { user: ADMIN_EMAIL_SENDER, pass: gmailPass },
  });

  try {
    // `message` is admin-supplied HTML for the email body.
    // This endpoint is restricted to authenticated admins only; the HTML is
    // delivered to an email client, not rendered in a browser, so it is not
    // an XSS surface for other users of the platform.
    const info = await transporter.sendMail({
      from: `"DevOS" <${ADMIN_EMAIL_SENDER}>`,
      to: toAddresses.map((a) => a.trim()).join(", "),
      subject,
      html: message,
    });
    console.log(
      `Admin email sent: ${info.messageId} to ${toAddresses.length} recipient(s).`
    );
    res.json({ success: true, messageId: info.messageId });
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

  const { command } = req.body;
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
      stderr: `Command not permitted: '${firstWord}'. Allowed tools: node, npm, git, ls, pwd, echo, cat, and common dev utilities.`,
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

  const parts =
    cmd.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) ?? [];
  const executable = parts[0];
  const args = parts.slice(1).map((a) => a.replace(/^['"]|['"]$/g, ""));

  const { execFile } = await import("child_process");
  execFile(
    executable,
    args,
    { timeout: 10_000, cwd: process.cwd() },
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
  new Server(httpServer, { cors: { origin: "*", methods: ["GET", "POST"] } });

  const PORT = Number(process.env.PORT) || 3000;
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
