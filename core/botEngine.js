import { emit as emitEvent, on } from "./events.js";

const botRegistry = [];
const botLogs = [];

function logBot(message, level = "info") {
  const entry = { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, level, message, createdAt: new Date().toISOString() };
  botLogs.unshift(entry);
  if (botLogs.length > 300) botLogs.length = 300;
  return entry;
}

function hasPermission(bot, permission) {
  if (!permission) return true;
  const declared = bot.permissions || {};
  return Boolean(declared.read?.includes(permission) || declared.write?.includes(permission));
}

function buildSandboxContext(event, payload, bot, context = {}) {
  const safePayload = Object.freeze({ ...(payload || {}) });
  return Object.freeze({
    event,
    payload: safePayload,
    user: context.user || null,
    db: context.db || null,
    utils: context.utils || {},
    emit: (nextEvent, nextPayload) => emitEvent(nextEvent, nextPayload),
    can: (permission) => hasPermission(bot, permission),
    logger: {
      info: (msg) => logBot(`[${bot.name}] ${msg}`),
      error: (msg) => logBot(`[${bot.name}] ${msg}`, "error"),
    },
  });
}

function normalizeBot(inputBot) {
  return {
    enabled: true,
    type: "system",
    permissions: { read: [], write: [] },
    ...inputBot,
  };
}

export function registerBot(inputBot) {
  const bot = normalizeBot(inputBot);
  if (!bot?.name || !Array.isArray(bot?.events) || typeof bot?.handler !== "function") {
    throw new Error("Invalid bot registration payload");
  }

  const existing = botRegistry.find((entry) => entry.name === bot.name);
  if (existing) return existing;
  botRegistry.push(bot);
  logBot(`[${bot.name}] Registered`);
  return bot;
}

export function getRegisteredBots() {
  return botRegistry.map((bot) => ({
    name: bot.name,
    type: bot.type,
    events: bot.events,
    permissions: bot.permissions,
    enabled: bot.enabled,
  }));
}

export function setBotEnabled(name, enabled) {
  const bot = botRegistry.find((entry) => entry.name === name);
  if (!bot) return false;
  bot.enabled = enabled;
  logBot(`[${bot.name}] ${enabled ? "Enabled" : "Disabled"}`);
  return true;
}

export function getBotLogs() {
  return botLogs;
}

export async function executeBotsForEvent(event, payload = {}, context = {}) {
  const matchingBots = botRegistry.filter((bot) => bot.enabled && bot.events.includes(event));
  const results = [];

  for (const bot of matchingBots) {
    const sdkHandler = bot.on?.[event];
    const handler = typeof sdkHandler === "function" ? sdkHandler : bot.handler;

    try {
      const sandboxContext = buildSandboxContext(event, payload, bot, context);
      const result = await handler(sandboxContext);
      console.log(`[${bot.name}] Action executed`);
      logBot(`[${bot.name}] Action executed`);
      results.push({ bot: bot.name, success: true, result: result ?? null });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[${bot.name}] failed for event ${event}:`, error);
      logBot(`[${bot.name}] Failed: ${message}`, "error");
      results.push({ bot: bot.name, success: false, error: message });
    }
  }

  return results;
}

let started = false;

export function initializeBotEngine({ bots = [] } = {}) {
  if (started) return;
  started = true;

  bots.forEach(registerBot);

  on("*", async (payload, event) => {
    await executeBotsForEvent(event, payload);
  });
}

export async function emit(event, payload = {}) {
  return emitEvent(event, payload);
}
