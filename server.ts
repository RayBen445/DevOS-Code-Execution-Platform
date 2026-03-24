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

        // Save repo info to project
        await db.collection("projects").doc(projectId).update({
          githubRepo: currentRepoFullName,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // 2. Push files one by one (as requested)
      // Note: In a production app, we'd use the Git Data API for a single commit
      for (const file of files) {
        const { path: filePath, content } = file;
        const base64Content = Buffer.from(content).toString("base64");

        // Try to get existing file SHA
        const getFileResponse = await fetch(`https://api.github.com/repos/${currentRepoFullName}/contents/${filePath}`, {
          headers: {
            Authorization: `token ${installationToken}`,
            Accept: "application/vnd.github.v3+json",
          },
        });

        let sha;
        if (getFileResponse.ok) {
          const fileData = await getFileResponse.json();
          sha = fileData.sha;
        }

        const putFileResponse = await fetch(`https://api.github.com/repos/${currentRepoFullName}/contents/${filePath}`, {
          method: "PUT",
          headers: {
            Authorization: `token ${installationToken}`,
            Accept: "application/vnd.github.v3+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: commitMessage,
            content: base64Content,
            sha: sha, // Include SHA if updating
            branch: "main",
          }),
        });

        if (!putFileResponse.ok) {
          const err = await putFileResponse.json();
          console.error(`Error pushing file ${filePath}:`, err);
          // Continue with other files or throw? Let's throw for now to be safe
          throw new Error(`Failed to push file ${filePath}: ${err.message}`);
        }
      }

      res.json({ success: true, repoFullName: currentRepoFullName });
    } catch (error: any) {
      console.error("Push Error:", error);
      res.status(500).json({ error: error.message || "Failed to push to GitHub" });
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
