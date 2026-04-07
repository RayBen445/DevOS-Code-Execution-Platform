export const DEVOS_EMOJIS: Record<string, string> = {
  ":devos:": "⚡",
  ":deploy:": "🚀",
  ":bugfix:": "🛠️",
  ":ship:": "✅",
  ":fire:": "🔥",
  ":idea:": "💡",
};

export const DEVOS_EMOJI_LIST = Object.entries(DEVOS_EMOJIS).map(([code, value]) => ({ code, value }));

export function renderDevosEmojiText(input: string): string {
  let text = input;
  for (const [code, emoji] of Object.entries(DEVOS_EMOJIS)) {
    text = text.split(code).join(emoji);
  }
  return text;
}
