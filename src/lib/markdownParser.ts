/**
 * Markdown parser for DevOS posts
 * Converts markdown text to structured tokens for rendering
 */

export interface TextToken {
  type: "text" | "bold" | "italic" | "code" | "link" | "blockquote" | "list" | "codeblock";
  content: string;
  url?: string; // for links
  children?: TextToken[]; // for nested structures
}

export function parseMarkdown(text: string): TextToken[] {
  if (!text || typeof text !== "string") return [];

  const lines = text.split("\n");
  const tokens: TextToken[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Code block (triple backticks)
    if (trimmed.startsWith("```")) {
      const codeBlockLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeBlockLines.push(lines[i]);
        i++;
      }
      tokens.push({
        type: "codeblock",
        content: codeBlockLines.join("\n"),
      });
      i++; // skip closing ```
      continue;
    }

    // Blockquote (starts with >)
    if (trimmed.startsWith(">")) {
      const blockquoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        blockquoteLines.push(lines[i].trim().substring(1).trim());
        i++;
      }
      tokens.push({
        type: "blockquote",
        content: blockquoteLines.join("\n"),
        children: parseInlineMarkdown(blockquoteLines.join("\n")),
      });
      continue;
    }

    // Unordered list (starts with *)
    if (trimmed.startsWith("*") && trimmed.length > 1 && trimmed[1] === " ") {
      const listItems: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("*") && lines[i].trim()[1] === " ") {
        listItems.push(lines[i].trim().substring(2).trim());
        i++;
      }
      tokens.push({
        type: "list",
        content: "",
        children: listItems.map((item) => ({
          type: "text" as const,
          content: item,
          children: parseInlineMarkdown(item),
        })),
      });
      continue;
    }

    // Empty line - add as text if not empty
    if (!trimmed) {
      i++;
      continue;
    }

    // Regular text with inline formatting
    const inlineTokens = parseInlineMarkdown(line);
    tokens.push(...inlineTokens);
    i++;
  }

  return tokens;
}

function parseInlineMarkdown(text: string): TextToken[] {
  if (!text) return [];

  const tokens: TextToken[] = [];
  let remaining = text;
  let lastIndex = 0;

  // Process in order: links, bold, italic, code
  const processedText = processLinks(processCode(processBold(processItalic(remaining))));

  // Simple regex-based tokenization
  let match;
  const patterns = [
    { regex: /\[([^\]]+)\]\(([^)]+)\)/g, type: "link" },
    { regex: /\*\*([^*]+)\*\*/g, type: "bold" },
    { regex: /\*([^*]+)\*/g, type: "italic" },
    { regex: /_([^_]+)_/g, type: "italic" },
    { regex: /`([^`]+)`/g, type: "code" },
  ];

  let processedContent = text;
  
  // Process in priority order
  // 1. Links: [text](url)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const linkMatches = Array.from(processedContent.matchAll(linkRegex));
  if (linkMatches.length > 0) {
    let result = processedContent;
    for (const match of linkMatches.reverse()) {
      tokens.unshift({
        type: "link",
        content: match[1],
        url: match[2],
      });
      result = result.substring(0, match.index) + `__LINK_${tokens.length - 1}__` + result.substring(match.index! + match[0].length);
    }
    processedContent = result;
  }

  // 2. Bold: **text**
  const boldRegex = /\*\*([^*]+)\*\*/g;
  const boldMatches = Array.from(processedContent.matchAll(boldRegex));
  if (boldMatches.length > 0) {
    for (const match of boldMatches.reverse()) {
      tokens.unshift({
        type: "bold",
        content: match[1],
      });
      processedContent = processedContent.substring(0, match.index) + `__BOLD_${tokens.length - 1}__` + processedContent.substring(match.index! + match[0].length);
    }
  }

  // 3. Italic: *text* or _text_
  const italicRegex = /[*_]([^*_]+)[*_]/g;
  let italicMatch;
  while ((italicMatch = italicRegex.exec(processedContent)) !== null) {
    const isNotBold = !processedContent.substring(Math.max(0, italicMatch.index - 1), italicMatch.index).includes("*");
    if (isNotBold) {
      tokens.push({
        type: "italic",
        content: italicMatch[1],
      });
      processedContent =
        processedContent.substring(0, italicMatch.index) +
        `__ITALIC_${tokens.length - 1}__` +
        processedContent.substring(italicMatch.index + italicMatch[0].length);
    }
  }

  // 4. Code: `text`
  const codeRegex = /`([^`]+)`/g;
  const codeMatches = Array.from(processedContent.matchAll(codeRegex));
  if (codeMatches.length > 0) {
    for (const match of codeMatches.reverse()) {
      tokens.unshift({
        type: "code",
        content: match[1],
      });
      processedContent = processedContent.substring(0, match.index) + `__CODE_${tokens.length - 1}__` + processedContent.substring(match.index! + match[0].length);
    }
  }

  // Rebuild text with placeholders
  let finalText = processedContent;
  let textParts: TextToken[] = [];

  // Replace placeholders back
  const placeholderRegex = /__([A-Z]+)_(\d+)__/g;
  let lastPos = 0;
  let placeholderMatch;

  while ((placeholderMatch = placeholderRegex.exec(finalText)) !== null) {
    if (placeholderMatch.index > lastPos) {
      textParts.push({
        type: "text",
        content: finalText.substring(lastPos, placeholderMatch.index),
      });
    }
    const tokenIndex = parseInt(placeholderMatch[2]);
    if (tokens[tokenIndex]) {
      textParts.push(tokens[tokenIndex]);
    }
    lastPos = placeholderRegex.lastIndex;
  }

  if (lastPos < finalText.length) {
    textParts.push({
      type: "text",
      content: finalText.substring(lastPos),
    });
  }

  return textParts.length > 0 ? textParts : [{ type: "text", content: text }];
}

function processLinks(text: string): string {
  return text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "__LINK__$1__URL__$2__ENDLINK__");
}

function processBold(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, "__BOLD__$1__ENDBOLD__");
}

function processItalic(text: string): string {
  return text.replace(/[*_]([^*_]+)[*_]/g, "__ITALIC__$1__ENDITALIC__");
}

function processCode(text: string): string {
  return text.replace(/`([^`]+)`/g, "__CODE__$1__ENDCODE__");
}
