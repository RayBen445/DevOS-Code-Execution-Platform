import React, { useState, useRef, useEffect } from "react";
import { MarkdownContent } from "./MarkdownContent";
import { cn } from "../lib/utils";
import MentionInput from "./MentionInput";

interface PremiumEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  currentUserId?: string;
  autoFocus?: boolean;
}

export default function PremiumEditor({
  value,
  onChange,
  placeholder = "Write something...",
  className,
  currentUserId,
  autoFocus
}: PremiumEditorProps) {
  const [isEditing, setIsEditing] = useState(autoFocus || false);
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Click outside to close editor if empty or stop editing
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsEditing(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // When switching to edit mode, focus textarea
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      // Move cursor to end
      textareaRef.current.setSelectionRange(value.length, value.length);
    }
  }, [isEditing, value.length]);

  return (
    <div 
      ref={containerRef}
      className={cn(
        "w-full transition-all rounded-xl",
        isEditing ? "ring-2 ring-blue-500/50 bg-white/[0.03]" : "hover:bg-white/[0.02] cursor-text",
        className
      )}
      onClick={() => {
        if (!isEditing) setIsEditing(true);
      }}
    >
      {!isEditing && value.trim() !== "" ? (
        <div className="p-3 prose prose-invert max-w-none text-sm text-white/90">
          <MarkdownContent text={value} />
        </div>
      ) : !isEditing && value.trim() === "" ? (
        <div className="p-3 text-sm text-white/30">{placeholder}</div>
      ) : (
        <MentionInput
          inputRef={textareaRef as any}
          value={value}
          onChange={onChange}
          currentUserId={currentUserId}
          placeholder={placeholder}
          multiline
          autoFocus={autoFocus}
          rows={Math.max(4, value.split('\n').length)}
          className="w-full bg-transparent p-3 text-white placeholder-white/30 text-sm leading-relaxed resize-none focus:outline-none focus:ring-0"
        />
      )}
    </div>
  );
}
