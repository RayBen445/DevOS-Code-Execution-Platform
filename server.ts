import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
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

// Initialize Firebase Admin
const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));

admin.initializeApp({
  credential: admin.credential.applicationDefault(), // This works in AI Studio
  projectId: firebaseConfig.projectId,
});

const db = admin.firestore();

async function startServer() {
  const app = express();
  app.use(express.json());
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  // GitHub App Helper Functions
  const generateGitHubJWT = () => {
    const appId = process.env.GITHUB_APP_ID;
    const privateKey = process.env.GITHUB_APP_PRIVATE_KEY?.replace(/\\n/g, "\n");
    if (!appId || !privateKey) throw new Error("GitHub App credentials missing");

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iat: now - 60,
      exp: now + (10 * 60),
      iss: appId,
    };

    return jwt.sign(payload, privateKey, { algorithm: "RS256" });
  };

  const getInstallationToken = async (installationId: string) => {
    const githubJwt = generateGitHubJWT();
    const response = await fetch(`https://api.github.com/app/installations/${installationId}/access_tokens`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${githubJwt}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("GitHub Token Error:", error);
      throw new Error("Failed to get installation token");
    }

    const data = await response.json();
    return data.token;
  };

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Link GitHub Installation ID to User
  app.post("/api/github/link-installation", async (req, res) => {
    const { idToken, installationId } = req.body;
    if (!idToken || !installationId) return res.status(400).json({ error: "Missing parameters" });

    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const uid = decodedToken.uid;

      await db.collection("user_settings").doc(uid).set({
        githubInstallationId: installationId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      res.json({ success: true });
    } catch (error) {
      console.error("Error linking installation:", error);
      res.status(500).json({ error: "Failed to link installation" });
    }
  });

  // Fetch Repositories for Installation
  app.get("/api/github/repositories", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });

    const idToken = authHeader.split("Bearer ")[1];

    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const uid = decodedToken.uid;

      const userSettings = await db.collection("user_settings").doc(uid).get();
      const installationId = userSettings.data()?.githubInstallationId;

      if (!installationId) return res.status(404).json({ error: "GitHub App not installed" });

      const installationToken = await getInstallationToken(installationId);
      const repoResponse = await fetch("https://api.github.com/installation/repositories", {
        headers: {
          Authorization: `token ${installationToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

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
    if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });

    const idToken = authHeader.split("Bearer ")[1];
    const { repoFullName, branch } = req.body;

    if (!repoFullName || !branch) return res.status(400).json({ error: "Missing parameters" });

    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const uid = decodedToken.uid;

      const userSettings = await db.collection("user_settings").doc(uid).get();
      const installationId = userSettings.data()?.githubInstallationId;

      if (!installationId) return res.status(404).json({ error: "GitHub App not installed" });

      const installationToken = await getInstallationToken(installationId);

      // 1. Fetch File Tree
      const treeResponse = await fetch(`https://api.github.com/repos/${repoFullName}/git/trees/${branch}?recursive=1`, {
        headers: {
          Authorization: `token ${installationToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      if (!treeResponse.ok) throw new Error("Failed to fetch repository tree");
      const treeData = await treeResponse.json();

      // Filter for files and limit
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
          fileContents.push({
            path: file.path,
            content: content,
          });
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
      if (signature !== digest) {
        return res.status(401).json({ error: "Invalid signature" });
      }
    }

    const event = req.headers["x-github-event"];
    console.log(`Received GitHub event: ${event}`);

    // Handle events (installation, push, etc.)
    if (event === "installation") {
      const { action, installation } = req.body;
      console.log(`Installation ${action}: ${installation.id}`);
    }

    res.json({ received: true });
  });

  // GitHub Push Logic
  app.post("/api/github/push", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });

    const idToken = authHeader.split("Bearer ")[1];
    const { projectId, repoFullName, files, commitMessage } = req.body;

    if (!projectId || !files || !commitMessage) {
      return res.status(400).json({ error: "Missing parameters" });
    }

    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const uid = decodedToken.uid;

      const userSettings = await db.collection("user_settings").doc(uid).get();
      const installationId = userSettings.data()?.githubInstallationId;

      if (!installationId) return res.status(404).json({ error: "GitHub App not installed" });

      const installationToken = await getInstallationToken(installationId);
      let currentRepoFullName = repoFullName;

      // Validate the caller-supplied repo name before using it in any URL.
      // GitHub repo names follow the pattern: owner/repo where each segment is
      // alphanumeric plus ., -, and _.
      const REPO_NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]*\/[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
      if (currentRepoFullName && !REPO_NAME_RE.test(currentRepoFullName)) {
        return res.status(400).json({ error: "Invalid repository name format." });
      }

      // 1. Create repo if it doesn't exist
      if (!currentRepoFullName) {
        const projectDoc = await db.collection("projects").doc(projectId).get();
        const projectName = projectDoc.data()?.name || "devos-project";
        const repoName = projectName.toLowerCase().replace(/[^a-z0-9]/g, "-") + "-" + crypto.randomBytes(4).toString("hex");

        const createRepoResponse = await fetch("https://api.github.com/user/repos", {
          method: "POST",
          headers: {
            Authorization: `token ${installationToken}`,
            Accept: "application/vnd.github.v3+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: repoName,
            private: true,
            auto_init: false,
          }),
        });

        if (!createRepoResponse.ok) {
          const err = await createRepoResponse.json();
          console.error("Create Repo Error:", err);
          throw new Error(`Failed to create repository: ${err.message}`);
        }

        const repoData = await createRepoResponse.json();
        currentRepoFullName = repoData.full_name;
        // Validate the API-returned name before using it in URLs
        if (!REPO_NAME_RE.test(currentRepoFullName)) {
          throw new Error("GitHub returned an unexpected repository name.");
        }

        // Save repo info to project
        await db.collection("projects").doc(projectId).update({
          githubRepo: currentRepoFullName,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // 2. Push all files as a single atomic commit using the Git Data API
      const ghHeaders = {
        Authorization: `token ${installationToken}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      };
      // Encode each path segment separately so no special characters can escape the path.
      const [repoOwner, repoRepo] = currentRepoFullName.split("/");
      const repoApiBase = `https://api.github.com/repos/${encodeURIComponent(repoOwner)}/${encodeURIComponent(repoRepo)}`;

      // a. Resolve current HEAD ref (may not exist for a brand-new empty repo)
      let parentCommitSha: string | null = null;
      let baseTreeSha: string | null = null;
      const headRefRes = await fetch(`${repoApiBase}/git/ref/heads/main`, { headers: ghHeaders });
      if (headRefRes.ok) {
        const headRefData = await headRefRes.json();
        parentCommitSha = headRefData.object.sha as string;
        const parentCommitRes = await fetch(`${repoApiBase}/git/commits/${parentCommitSha}`, { headers: ghHeaders });
        if (parentCommitRes.ok) {
          const parentCommitData = await parentCommitRes.json();
          baseTreeSha = parentCommitData.tree.sha as string;
        }
      }

      // b. Create a blob for every file
      const treeItems: { path: string; mode: string; type: string; sha: string }[] = [];
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
        // Git tree paths must be relative (no leading slashes).
        const normalizedPath = file.path.replace(/^\/+/, "");
        treeItems.push({ path: normalizedPath, mode: "100644", type: "blob", sha: blobData.sha });
      }

      // c. Create a new tree (optionally rooted at the existing base tree)
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

      // d. Create the commit
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

      // e. Advance (or create) the branch ref to the new commit
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
          body: JSON.stringify({ ref: "refs/heads/main", sha: newCommitData.sha }),
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

  // Admin Email — send a custom email from the admin dashboard
  app.post("/api/admin/send-email", async (req, res) => {
    // 1. Verify Firebase ID token
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const idToken = authHeader.split("Bearer ")[1];

    let uid: string;
    try {
      const decoded = await admin.auth().verifyIdToken(idToken);
      uid = decoded.uid;
    } catch {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // 2. Confirm the caller is an admin
    const userDoc = await db.collection("users").doc(uid).get();
    if (userDoc.data()?.role !== "admin") {
      return res.status(403).json({ error: "Forbidden: admin only" });
    }

    // 3. Validate payload
    const { to, subject, message } = req.body as {
      to?: string | string[];
      subject?: string;
      message?: string;
    };

    if (!to || !subject || !message) {
      return res.status(400).json({ error: "Missing required fields: to, subject, message" });
    }

    const toAddresses = Array.isArray(to) ? to : [to];
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalid = toAddresses.find((a) => !emailRe.test(a.trim()));
    if (invalid) {
      return res.status(400).json({ error: `Invalid email address: ${invalid}` });
    }

    // 4. Send via Gmail SMTP
    const gmailPass = process.env.GMAIL_APP_PASSWORD;
    if (!gmailPass) {
      return res.status(500).json({ error: "GMAIL_APP_PASSWORD is not configured on the server." });
    }

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false, // STARTTLS
      auth: {
        user: "coolshotsystemsofficial@gmail.com",
        pass: gmailPass,
      },
    });

    try {
      const info = await transporter.sendMail({
        from: '"DevOS" <coolshotsystemsofficial@gmail.com>',
        to: toAddresses.map((a) => a.trim()).join(", "),
        subject,
        html: message,
      });

      console.log(`Admin email sent: ${info.messageId} → ${toAddresses.join(", ")}`);
      res.json({ success: true, messageId: info.messageId });
    } catch (error: any) {
      console.error("Admin email send error:", error);
      res.status(500).json({ error: error.message || "Failed to send email" });
    }
  });

  // Per-user in-memory rate limit for the terminal (30 commands per minute)
  const terminalRateLimit = new Map<string, { count: number; resetAt: number }>();
  const TERMINAL_RATE_MAX = 30;
  const TERMINAL_RATE_WINDOW_MS = 60_000;

  // Terminal Command API
  // NOTE: Commands execute in the server process. Auth is required.
  // This is a development platform; full sandbox isolation requires a separate execution service.
  app.post("/api/terminal", async (req, res) => {
    // Require Firebase auth token
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const idToken = authHeader.split("Bearer ")[1];
    let uid: string;
    try {
      const decoded = await admin.auth().verifyIdToken(idToken);
      uid = decoded.uid;
    } catch {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // Rate limiting per authenticated user
    const now = Date.now();
    const entry = terminalRateLimit.get(uid);
    if (entry && now < entry.resetAt) {
      if (entry.count >= TERMINAL_RATE_MAX) {
        return res.status(429).json({ error: "Rate limit exceeded. Try again in a moment." });
      }
      entry.count++;
    } else {
      terminalRateLimit.set(uid, { count: 1, resetAt: now + TERMINAL_RATE_WINDOW_MS });
    }

    const { command } = req.body;
    if (!command || typeof command !== "string") {
      return res.status(400).json({ error: "No command provided" });
    }

    const cmd = command.trim();

    // Reject shell command-chaining operators to prevent injection
    // (semicolons, &&, ||, backtick substitution, $() substitution)
    if (/;|&&|\|\|/m.test(cmd) || /`[^`]*`/.test(cmd) || /\$\(/.test(cmd)) {
      return res.json({ stdout: "", stderr: "Command chaining and substitution are not supported.", exitCode: 1 });
    }

    // Allowlist by first command word
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
    if (!ALLOWED_COMMANDS.has(firstWord)) {
      return res.json({ stdout: "", stderr: `Command not permitted: '${firstWord}'. Allowed tools: node, npm, git, ls, pwd, echo, cat, and common dev utilities.`, exitCode: 1 });
    }

    // Block destructive patterns even for allowed commands
    const BLOCKED_PATTERNS = [
      /rm\s+-[^\s]*r/i,           // rm -r, rm -rf ...
      /:\(\)\s*\{/,               // fork bomb
      /shutdown/i,
      /reboot/i,
      /mkfs/i,
      /dd\s+if=/i,
      />\s*\/dev\/(sd|hd|nvme)/i, // overwrite block devices
    ];
    if (BLOCKED_PATTERNS.some(p => p.test(cmd))) {
      return res.json({ stdout: "", stderr: "Command blocked for safety.", exitCode: 1 });
    }

    // Build an args array from the validated command so exec is called without a shell
    const parts = cmd.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) ?? [];
    const executable = parts[0];
    const args = parts.slice(1).map(a => a.replace(/^['"]|['"]$/g, ""));

    const { execFile } = await import("child_process");
    execFile(executable, args, { timeout: 10_000, cwd: process.cwd() }, (error, stdout, stderr) => {
      res.json({
        stdout: stdout || "",
        stderr: stderr || "",
        exitCode: error?.code ?? (error ? 1 : 0),
      });
    });
  });

  // Run Code API — executes JavaScript or TypeScript in a sandboxed temp directory.
  // Requires a valid Firebase ID token; rate-limited alongside /api/terminal.
  app.post("/api/run", async (req, res) => {
    // Auth check
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const idToken = authHeader.split("Bearer ")[1];
    let uid: string;
    try {
      const decoded = await admin.auth().verifyIdToken(idToken);
      uid = decoded.uid;
    } catch {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // Rate limiting — share the same bucket as /api/terminal
    const now = Date.now();
    const entry = terminalRateLimit.get(uid);
    if (entry && now < entry.resetAt) {
      if (entry.count >= TERMINAL_RATE_MAX) {
        return res.status(429).json({ error: "Rate limit exceeded. Try again in a moment." });
      }
      entry.count++;
    } else {
      terminalRateLimit.set(uid, { count: 1, resetAt: now + TERMINAL_RATE_WINDOW_MS });
    }

    const { language, content } = req.body;
    if (!content || typeof content !== "string") {
      return res.status(400).json({ error: "No content provided" });
    }

    const supportedLanguages = ["javascript", "typescript"];
    if (!supportedLanguages.includes(language)) {
      return res.status(400).json({ error: `Language '${language}' is not supported for execution.` });
    }

    // SECURITY NOTE: This endpoint executes user-provided code on the host process.
    // Isolation is limited to a temporary directory and a 10-second timeout.
    // A future hardening step should replace this with a container/VM/worker sandbox
    // (e.g. gVisor, Firecracker, or a dedicated execution microservice) with network,
    // filesystem, and syscall restrictions before exposing to untrusted users at scale.
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `devos-run-${uid.slice(0, 8)}-`));
    const ext = language === "typescript" ? ".ts" : ".js";
    const tmpFile = path.join(tmpDir, `script${ext}`);

    try {
      fs.writeFileSync(tmpFile, content, "utf-8");

      const executable = language === "typescript" ? "tsx" : "node";
      const { execFile } = await import("child_process");

      await new Promise<void>((resolve, reject) => {
        execFile(executable, [tmpFile], { timeout: 10_000, cwd: tmpDir }, (error, stdout, stderr) => {
          try {
            const logs: string[] = [];
            if (stdout) stdout.split("\n").filter(Boolean).forEach((line) => logs.push(line));
            if (stderr) stderr.split("\n").filter(Boolean).forEach((line) => logs.push(`[stderr] ${line}`));
            // Surface a clear message when the process was killed by the timeout
            if (error?.killed || (error as any)?.code === "ETIMEDOUT") {
              logs.push("[stderr] Script execution timed out after 10 seconds.");
            }
            res.json({ logs, exitCode: error?.code ?? (error ? 1 : 0) });
            resolve();
          } catch (sendErr) {
            reject(sendErr);
          }
        });
      });
    } catch (error: any) {
      if (!res.headersSent) {
        res.status(500).json({ error: error.message || "Execution failed" });
      }
    } finally {
      try { fs.rmSync(tmpDir, { recursive: true }); } catch { /* ignore cleanup errors */ }
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
