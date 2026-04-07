import { toast } from "sonner";

export type BotScope = "system" | "user" | "org";
export type BotEventName =
  | "system_boot"
  | "project_created"
  | "deploy_triggered"
  | "post_created"
  | "file_changed"
  | "org_member_changed";

export interface BotEvent<T = Record<string, any>> {
  name: BotEventName;
  payload: T;
}

export interface BotMessage {
  botId: string;
  level: "info" | "warning" | "success";
  text: string;
}

export interface DevOSBot {
  id: string;
  name: string;
  scope: BotScope;
  events: BotEventName[];
  handle: (event: BotEvent) => Promise<BotMessage | null> | BotMessage | null;
}

const bots: DevOSBot[] = [];

export function registerBot(bot: DevOSBot): void {
  if (!bots.find((b) => b.id === bot.id)) bots.push(bot);
}

export async function emitBotEvent(event: BotEvent): Promise<BotMessage[]> {
  const active = bots.filter((b) => b.events.includes(event.name));
  const results = await Promise.all(active.map((b) => Promise.resolve(b.handle(event))));
  return results.filter((x): x is BotMessage => !!x);
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

  // System bots
  registerBot({
    id: "core-bot",
    name: "Core Bot",
    scope: "system",
    events: ["system_boot"],
    handle: (event) => {
      const ok = !!event.payload?.firebaseReady;
      return {
        botId: "core-bot",
        level: ok ? "success" : "warning",
        text: ok ? "Core Bot: system checks passed." : "Core Bot: configuration issue detected.",
      };
    },
  });

  registerBot({
    id: "credit-bot",
    name: "Credit Bot",
    scope: "system",
    events: ["deploy_triggered"],
    handle: (event) => ({
      botId: "credit-bot",
      level: "info",
      text: `Credit Bot: deploy charge processed for ${event.payload?.projectName ?? "project"}.`,
    }),
  });

  registerBot({
    id: "deployment-bot",
    name: "Deployment Bot",
    scope: "system",
    events: ["deploy_triggered"],
    handle: (event) => ({
      botId: "deployment-bot",
      level: "success",
      text: `Deployment Bot: ${event.payload?.projectName ?? "Project"} is live.`,
    }),
  });

  registerBot({
    id: "streak-bot",
    name: "Streak Bot",
    scope: "system",
    events: ["system_boot"],
    handle: () => ({ botId: "streak-bot", level: "info", text: "Streak Bot: activity sync complete." }),
  });

  // User bots
  registerBot({
    id: "builder-bot",
    name: "Builder Bot",
    scope: "user",
    events: ["project_created", "file_changed"],
    handle: (event) => {
      if (event.name === "project_created") {
        return { botId: "builder-bot", level: "info", text: "Builder Bot: start with README.md and index.html." };
      }
      const content = String(event.payload?.content ?? "");
      if (!content.trim()) {
        return { botId: "builder-bot", level: "info", text: "Builder Bot: file is empty — scaffold starter content?" };
      }
      return null;
    },
  });

  registerBot({
    id: "debug-bot",
    name: "Debug Bot",
    scope: "user",
    events: ["file_changed"],
    handle: (event) => {
      const content = String(event.payload?.content ?? "");
      if (content.includes("console.log(")) {
        return { botId: "debug-bot", level: "info", text: "Debug Bot: remove debug logs before deployment." };
      }
      return null;
    },
  });

  registerBot({
    id: "content-bot",
    name: "Content Bot",
    scope: "user",
    events: ["post_created"],
    handle: (event) => {
      const content = String(event.payload?.content ?? "");
      if (content.length < 30) {
        return { botId: "content-bot", level: "info", text: "Content Bot: longer posts usually get better engagement." };
      }
      return null;
    },
  });

  registerBot({
    id: "search-bot",
    name: "Search Bot",
    scope: "user",
    events: ["post_created"],
    handle: () => ({ botId: "search-bot", level: "info", text: "Search Bot: add clear keywords to improve discovery." }),
  });

  // Org bots
  registerBot({
    id: "team-bot",
    name: "Team Bot",
    scope: "org",
    events: ["org_member_changed"],
    handle: () => ({ botId: "team-bot", level: "info", text: "Team Bot: membership changes synced." }),
  });

  registerBot({
    id: "security-bot",
    name: "Security Bot",
    scope: "org",
    events: ["org_member_changed", "deploy_triggered"],
    handle: (event) => ({
      botId: "security-bot",
      level: "info",
      text: event.name === "deploy_triggered"
        ? "Security Bot: deployment permission check passed."
        : "Security Bot: permission audit completed.",
    }),
  });

  registerBot({
    id: "analytics-bot",
    name: "Analytics Bot",
    scope: "org",
    events: ["deploy_triggered", "post_created"],
    handle: () => ({ botId: "analytics-bot", level: "success", text: "Analytics Bot: engagement/deploy metrics updated." }),
  });
}
