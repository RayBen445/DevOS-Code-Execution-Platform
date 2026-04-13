/**
 * Moderation Bot — lightweight rule-based content moderation.
 *
 * NOT AI-powered. Uses a curated blocklist of known spam patterns,
 * excessive link posting, repeated phrases, and known abuse signals.
 *
 * Fires on:
 *   post.created     → scan post content
 *   comment.created  → scan comment content
 *   user.signup      → check username/email against known spam patterns
 *   project.created  → check project name/description
 *
 * Results:
 *   - PASS  → no action
 *   - WARN  → emit `moderation.flagged` (soft flag, human review)
 *   - BLOCK → emit `moderation.blocked` (content should be hidden)
 */

// ── Rule sets ────────────────────────────────────────────────────────────────

/** Hard-block patterns: content is hidden immediately */
const BLOCK_PATTERNS = [
  /\b(buy|sell|cheap|discount|order now|click here|free money|earn \$|make money fast)\b/gi,
  /https?:\/\/[^\s]+\.(tk|ml|ga|cf|gq|xyz|top|click|download|win)\b/gi, // shady TLDs
  /\b(password|credit.?card|ssn|social security|bank account)\b/gi,
  /(.)\1{8,}/g, // 8+ repeated characters (aaaaaaaaaa)
  /[\u{1F1E0}-\u{1F1FF}]{6,}/gu, // excessive flag emojis
];

/** Soft-warn patterns: flag for human review */
const WARN_PATTERNS = [
  /https?:\/\//gi,  // any URL in post (count them)
  /\b(follow me|follow back|sub4sub|like4like|f4f)\b/gi,
  /(\b\w+\b)(\s+\1){3,}/gi, // word repeated 3+ times in a row
  /[A-Z]{15,}/g, // 15+ consecutive uppercase letters (SHOUTING)
];

/** Known disposable email domains */
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "tempmail.com", "throwaway.email",
  "fakeinbox.com", "sharklasers.com", "yopmail.com", "dispostable.com",
  "trashmail.com", "maildrop.cc",
]);

/** Max links allowed per post before triggering a warn */
const MAX_LINKS_PER_POST = 3;

// ── Scoring ──────────────────────────────────────────────────────────────────

function scoreContent(text) {
  if (!text || typeof text !== "string") return { verdict: "pass", score: 0, reasons: [] };

  const reasons = [];
  let score = 0;

  // Check hard-block patterns
  for (const pattern of BLOCK_PATTERNS) {
    pattern.lastIndex = 0;
    const m = text.match(pattern);
    if (m) {
      score += 100;
      reasons.push(`block_pattern: "${m[0].slice(0, 30)}"`);
    }
  }

  // Count links
  const linkCount = (text.match(/https?:\/\//gi) || []).length;
  if (linkCount > MAX_LINKS_PER_POST) {
    score += (linkCount - MAX_LINKS_PER_POST) * 10;
    reasons.push(`excessive_links: ${linkCount}`);
  }

  // Check soft-warn patterns (excluding URL count, already handled)
  for (const pattern of WARN_PATTERNS.slice(1)) {
    pattern.lastIndex = 0;
    const m = text.match(pattern);
    if (m) {
      score += 20;
      reasons.push(`warn_pattern: "${m[0].slice(0, 30)}"`);
    }
  }

  // Length-based spam signal: very short repetitive content
  const wordCount = text.trim().split(/\s+/).length;
  const uniqueWords = new Set(text.toLowerCase().match(/\b\w+\b/g) || []).size;
  if (wordCount > 5 && uniqueWords / wordCount < 0.3) {
    score += 15;
    reasons.push(`low_unique_words: ${uniqueWords}/${wordCount}`);
  }

  let verdict = "pass";
  if (score >= 100) verdict = "block";
  else if (score >= 20) verdict = "warn";

  return { verdict, score, reasons };
}

function checkEmail(email) {
  if (!email) return { verdict: "pass" };
  const domain = email.split("@")[1]?.toLowerCase();
  if (domain && DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    return { verdict: "warn", reason: `disposable_email_domain: ${domain}` };
  }
  return { verdict: "pass" };
}

// ── Rate limiting (in-memory, per userId) ────────────────────────────────────

const userPostTimes = new Map(); // userId → timestamp[]
const RATE_WINDOW_MS = 60_000; // 1 minute
const MAX_POSTS_PER_WINDOW = 5;

function checkRateLimit(userId) {
  const now = Date.now();
  if (!userPostTimes.has(userId)) userPostTimes.set(userId, []);
  const times = userPostTimes.get(userId).filter(t => now - t < RATE_WINDOW_MS);
  times.push(now);
  userPostTimes.set(userId, times);
  if (times.length > MAX_POSTS_PER_WINDOW) {
    return { limited: true, count: times.length };
  }
  return { limited: false, count: times.length };
}

// ── Bot ──────────────────────────────────────────────────────────────────────

export const moderationBot = {
  name: "Moderation Bot",
  type: "system",
  events: ["post.created", "comment.created", "user.signup", "project.created"],
  permissions: {
    read: ["feed", "user", "project"],
    write: ["moderation"],
  },
  async handler(ctx) {
    const { event, payload } = ctx;
    const userId = payload.userId || payload.authorId || "anonymous";

    // ── user.signup: check email ─────────────────────────────────────────
    if (event === "user.signup") {
      const emailCheck = checkEmail(payload.email);
      if (emailCheck.verdict === "warn") {
        ctx.logger.info(`[Moderation] Disposable email on signup: ${payload.email}`);
        await ctx.emit("moderation.flagged", {
          type: "user_signup",
          userId,
          reason: emailCheck.reason,
        });
        return { verdict: "warn", reason: emailCheck.reason };
      }
      return { verdict: "pass" };
    }

    // ── post.created / comment.created: check content + rate limit ───────
    if (event === "post.created" || event === "comment.created") {
      const content = payload.content || payload.text || "";

      // Rate limit
      const rateResult = checkRateLimit(userId);
      if (rateResult.limited) {
        ctx.logger.info(`[Moderation] Rate limit hit: ${userId} (${rateResult.count} posts in window)`);
        await ctx.emit("moderation.flagged", {
          type: "rate_limit",
          userId,
          contentType: event === "post.created" ? "post" : "comment",
          reason: `rate_limit: ${rateResult.count} posts in 1 minute`,
        });
        return { verdict: "warn", reason: "rate_limit" };
      }

      // Content scoring
      const result = scoreContent(content);
      if (result.verdict === "block") {
        ctx.logger.info(`[Moderation] BLOCKED content from ${userId}: score=${result.score}`);
        await ctx.emit("moderation.blocked", {
          type: event === "post.created" ? "post" : "comment",
          userId,
          postId: payload.postId || payload.id,
          score: result.score,
          reasons: result.reasons,
        });
        return { verdict: "block", score: result.score, reasons: result.reasons };
      }

      if (result.verdict === "warn") {
        ctx.logger.info(`[Moderation] Flagged content from ${userId}: score=${result.score}`);
        await ctx.emit("moderation.flagged", {
          type: event === "post.created" ? "post" : "comment",
          userId,
          postId: payload.postId || payload.id,
          score: result.score,
          reasons: result.reasons,
        });
        return { verdict: "warn", score: result.score, reasons: result.reasons };
      }

      return { verdict: "pass", score: result.score };
    }

    // ── project.created: check name + description ─────────────────────────
    if (event === "project.created") {
      const text = [payload.projectName, payload.description].filter(Boolean).join(" ");
      const result = scoreContent(text);
      if (result.verdict !== "pass") {
        ctx.logger.info(`[Moderation] Project flagged: ${payload.projectId} score=${result.score}`);
        await ctx.emit("moderation.flagged", {
          type: "project",
          userId,
          projectId: payload.projectId,
          score: result.score,
          reasons: result.reasons,
        });
        return { verdict: result.verdict, score: result.score };
      }
      return { verdict: "pass" };
    }

    return { verdict: "pass" };
  },
};
