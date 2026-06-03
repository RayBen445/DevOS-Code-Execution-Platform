import React from "react";
import { parseMarkdown, TextToken } from "../lib/markdownParser";
import { cn } from "../lib/utils";

interface MarkdownContentProps {
  text: string;
  className?: string;
}

export function MarkdownContent({ text, className }: MarkdownContentProps) {
  const tokens = parseMarkdown(text);

  return (
    <div className={cn("space-y-2 text-white/80 leading-relaxed break-words [overflow-wrap:anywhere]", className)}>
      {tokens.map((token, idx) => (
        <MarkdownToken key={idx} token={token} />
      ))}
    </div>
  );
}

function MarkdownToken({ token }: { token: TextToken }) {
  switch (token.type) {
    case "blockquote":
      return (
        <div className="border-l-4 border-blue-500/50 bg-blue-500/10 px-4 py-2 rounded-r italic text-blue-200">
          <div className="space-y-1">
            {token.children?.map((child, idx) => (
              <MarkdownToken key={idx} token={child} />
            ))}
            {!token.children && <p>{token.content}</p>}
          </div>
        </div>
      );

    case "list":
      return (
        <ul className="space-y-2 ml-4">
          {token.children?.map((item, idx) => (
            <li key={idx} className="flex gap-3">
              <span className="text-blue-400 flex-shrink-0 mt-1">•</span>
              <div className="space-y-1">
                {item.children ? (
                  item.children.map((child, childIdx) => (
                    <MarkdownToken key={childIdx} token={child} />
                  ))
                ) : (
                  <span>{item.content}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      );

    case "codeblock":
      return (
        <pre className="bg-black/40 border border-border-base rounded-lg p-4 overflow-x-auto">
          <code className="text-green-400/90 font-mono text-sm whitespace-pre-wrap break-words">
            {token.content}
          </code>
        </pre>
      );

    case "bold":
      return <strong className="font-bold text-white">{token.content}</strong>;

    case "italic":
      return <em className="italic text-white/90">{token.content}</em>;

    case "code":
      return (
        <code className="bg-white/10 px-2 py-1 rounded text-blue-300 font-mono text-sm border border-border-base break-words [overflow-wrap:anywhere]">
          {token.content}
        </code>
      );

    case "link":
      return (
        <a
          href={token.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 underline transition-colors"
        >
          {token.content}
        </a>
      );

    case "text":
      return <span className="break-words [overflow-wrap:anywhere]">{token.content}</span>;

    default:
      return <span>{token.content}</span>;
  }
}
