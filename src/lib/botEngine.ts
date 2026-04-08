import { toast } from "sonner";
import {
  initializeBotEngine,
  registerBot as coreRegisterBot,
  emit as coreEmit,
  getRegisteredBots,
  getBotLogs,
  setBotEnabled,
  executeBotsForEvent,
} from "../../core/botEngine.js";
import { bots as builtInBots } from "../../core/bots/index.js";

export interface BotEvent<T = Record<string, any>> {
  name: string;
  payload: T;
}

export interface BotMessage {
  botId: string;
  level: "info" | "warning" | "success";
  text: string;
}

const legacyToCoreEvent: Record<string, string> = {
  system_boot: "system.boot",
  project_created: "project.created",
  deploy_triggered: "deploy.triggered",
  post_created: "post.created",
};

const coreToLegacyEvent: Record<string, string> = {
  "system.boot": "system_boot",
  "project.created": "project_created",
  "deploy.triggered": "deploy_triggered",
  "post.created": "post_created",
};

function normalizeEventName(name: string): string {
  return legacyToCoreEvent[name] || name;
}

export function registerBot(bot: any): void {
  coreRegisterBot(bot);
}

export async function emitBotEvent(event: BotEvent): Promise<BotMessage[]> {
  const eventName = normalizeEventName(event.name);
  const results = await coreEmit(eventName, event.payload);

  return results
    .flatMap((result: any) => Array.isArray(result) ? result : [result])
    .filter((entry: any) => entry && typeof entry === "object" && ("success" in entry || "bot" in entry))
    .map((entry: any) => ({
      botId: entry?.bot || coreToLegacyEvent[eventName] || eventName,
      level: entry?.success === false ? "warning" : "success",
      text: entry?.success === false
        ? `${entry.bot}: ${entry.error}`
        : `${entry.bot}: action completed for ${eventName}`,
    }));
}

export async function emitBotEventWithToast(event: BotEvent): Promise<BotMessage[]> {
  const messages = await emitBotEvent(event);
  messages.forEach((m) => {
    if (m.level === "warning") toast.warning(m.text);
    else if (m.level === "success") toast.success(m.text);
    else toast.info(m.text);
  });
  return messages;
}

let initialized = false;

export function initializeDefaultBots(): void {
  if (initialized) return;
  initialized = true;
  initializeBotEngine({ bots: builtInBots });
}

export function getBotsForUI() {
  return getRegisteredBots();
}

export function getBotLogsForUI() {
  return getBotLogs();
}

export function setBotEnabledForUI(name: string, enabled: boolean) {
  return setBotEnabled(name, enabled);
}

export async function runBotTestFlow(userId = "manual-test") {
  initializeDefaultBots();
  await executeBotsForEvent("project.created", { projectId: "demo", userId });
  await executeBotsForEvent("deploy.triggered", { projectId: "demo", userId, deployUrl: "https://example.dev" });
  await executeBotsForEvent("post.created", { postId: "post-demo", userId });
}
