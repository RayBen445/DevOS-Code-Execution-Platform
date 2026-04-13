import { deployBot } from "./deployBot.js";
import { creditBot } from "./creditBot.js";
import { feedBot } from "./feedBot.js";
import { debugBot } from "./debugBot.js";
import { notificationBot } from "./notificationBot.js";
import { welcomeBot } from "./welcomeBot.js";
import { activityBot } from "./activityBot.js";
import { milestoneBot } from "./milestoneBot.js";
import { moderationBot } from "./moderationBot.js";
import { pluginBot } from "./pluginBot.js";
import { searchIndexBot } from "./searchIndexBot.js";
import { projectHealthBot } from "./projectHealthBot.js";

export const bots = [
  // Core system bots
  deployBot,
  creditBot,
  notificationBot,
  feedBot,
  debugBot,
  // User lifecycle
  welcomeBot,
  milestoneBot,
  // Content & activity
  activityBot,
  moderationBot,
  // Project quality & discoverability
  projectHealthBot,
  searchIndexBot,
  // Plugin system
  pluginBot,
];

