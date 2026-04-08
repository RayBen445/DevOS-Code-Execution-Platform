export const DEVOS_EMOJIS: Record<string, string> = {
  ":devos:": "⚡",
  ":deploy:": "🚀",
  ":bugfix:": "🛠️",
  ":ship:": "✅",
  ":fire:": "🔥",
  ":idea:": "💡",
  ":devos-rocket:": "🚀",
  ":devos-star:": "⭐",
  ":devos-bug:": "🐛",
  ":devos-commit:": "📝",
  ":devos-merge:": "🔀",
  ":devos-branch:": "🌿",
  ":devos-deploy:": "🚢",
  ":devos-build:": "🏗️",
  ":devos-test:": "🧪",
  ":devos-review:": "👀",
  ":devos-heart:": "❤️",
  ":devos-thumbsup:": "👍",
  ":devos-thumbsdown:": "👎",
  ":devos-fire:": "🔥",
  ":devos-wave:": "👋",
  ":devos-coffee:": "☕",
  ":devos-lock:": "🔒",
  ":devos-key:": "🔑",
  ":devos-link:": "🔗",
  ":devos-bell:": "🔔",
  ":devos-warning:": "⚠️",
  ":devos-check:": "✅",
  ":devos-cross:": "❌",
  ":devos-idea:": "💡",
  ":devos-question:": "❓",
};

export const DEVOS_EMOJI_LIST = Object.entries(DEVOS_EMOJIS).map(([code, value]) => ({ code, value }));

export function renderDevosEmojiText(input: string): string {
  let text = input;
  for (const [code, emoji] of Object.entries(DEVOS_EMOJIS)) {
    text = text.split(code).join(emoji);
  }
  return text;
}
