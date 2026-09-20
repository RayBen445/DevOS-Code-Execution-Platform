import React, { useState } from "react";
import { ExternalLink, Code2 } from "lucide-react";
import { cn } from "../lib/utils";

interface Props {
  content: string;
}

export default function PostContentRenderer({ content }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [spoilerVisible, setSpoilerVisible] = useState<Record<number, boolean>>({});

  const MAX_LENGTH = 300;
  
  const isLong = content.length > MAX_LENGTH;
  const displayContent = isExpanded || !isLong ? content : content.slice(0, MAX_LENGTH) + "...";

  const renderText = (text: string) => {
    const codeRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const parts = [];
    let lastIdx = 0;
    
    let match;
    let codeIndex = 0;
    while ((match = codeRegex.exec(text)) !== null) {
      if (match.index > lastIdx) {
        parts.push({ type: 'text', content: text.substring(lastIdx, match.index) });
      }
      parts.push({ type: 'code', lang: match[1], content: match[2], id: codeIndex++ });
      lastIdx = match.index + match[0].length;
    }
    if (lastIdx < text.length) {
      parts.push({ type: 'text', content: text.substring(lastIdx) });
    }

    return parts.map((part, i) => {
      if (part.type === 'code') {
        return (
          <div key={`code-${i}`} className="my-3 rounded-xl overflow-hidden bg-[#0d1117] border border-white/10">
            <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5">
              <span className="text-xs font-mono text-white/50">{part.lang || 'code'}</span>
              <Code2 className="w-4 h-4 text-white/40" />
            </div>
            <pre className="p-4 overflow-x-auto text-sm font-mono text-white/80 whitespace-pre">
              {part.content}
            </pre>
          </div>
        );
      }

      const inlineRegex = /(\|\|.*?\|\|)|(https?:\/\/[^\s]+)/g;
      
      let textContent = part.content;
      const elements = [];
      let tMatch;
      let tLastIdx = 0;
      let elemIdx = 0;
      
      while ((tMatch = inlineRegex.exec(textContent)) !== null) {
        if (tMatch.index > tLastIdx) {
          elements.push(<span key={`t-${elemIdx++}`}>{textContent.substring(tLastIdx, tMatch.index)}</span>);
        }
        
        if (tMatch[1]) {
          const spoilerText = tMatch[1].slice(2, -2);
          const currentIdx = elemIdx++;
          elements.push(
            <span
              key={`sp-${currentIdx}`}
              onClick={() => setSpoilerVisible(p => ({ ...p, [currentIdx]: true }))}
              className={cn(
                "cursor-pointer rounded px-1 py-0.5 transition-all inline-block",
                spoilerVisible[currentIdx] ? "bg-white/10 text-white" : "bg-white/20 text-transparent select-none blur-sm hover:bg-white/30"
              )}
              title={spoilerVisible[currentIdx] ? "" : "Click to reveal spoiler"}
            >
              {spoilerText}
            </span>
          );
        } else if (tMatch[2]) {
          const url = tMatch[2];
          elements.push(
            <a key={`l-${elemIdx++}`} href={url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline break-all">
              {url}
            </a>
          );
        }
        
        tLastIdx = tMatch.index + tMatch[0].length;
      }
      
      if (tLastIdx < textContent.length) {
        elements.push(<span key={`t-${elemIdx++}`}>{textContent.substring(tLastIdx)}</span>);
      }

      const urls = Array.from(textContent.matchAll(/https?:\/\/[^\s]+/g)).map(m => m[0]);

      return (
        <div key={`text-${i}`} className="whitespace-pre-wrap break-words">
          {elements}
          {urls.length > 0 && (
            <div className="mt-3 space-y-2">
              {urls.map((url, uidx) => (
                <a key={uidx} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                    <ExternalLink className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{new URL(url).hostname}</div>
                    <div className="text-xs text-white/40 truncate">{url}</div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="text-white/90 text-sm">
      {renderText(displayContent)}
      {isLong && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 text-blue-400 hover:text-blue-300 text-sm font-semibold"
        >
          {isExpanded ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  );
}
