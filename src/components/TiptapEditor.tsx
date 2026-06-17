import React, { useCallback, useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useEditor, EditorContent, ReactRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Mention from '@tiptap/extension-mention';
import Image from '@tiptap/extension-image';
import { Markdown } from 'tiptap-markdown';
import tippy, { Instance as TippyInstance } from 'tippy.js';
import { Bold, Italic, List, Quote, Code, Image as ImageIcon } from 'lucide-react';
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "../lib/firebase";
import { resolveAvatar } from "../lib/avatars";
import { cn } from "../lib/utils";

// ----------------------------------------------------
// MentionList Component (Rendered inside Tippy popup)
// ----------------------------------------------------
const MentionList = forwardRef((props: any, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command({ id: item.username, label: item.username });
    }
  };

  const upHandler = () => {
    setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
  };

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useEffect(() => setSelectedIndex(0), [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: any) => {
      if (event.key === 'ArrowUp') {
        upHandler();
        return true;
      }
      if (event.key === 'ArrowDown') {
        downHandler();
        return true;
      }
      if (event.key === 'Enter') {
        enterHandler();
        return true;
      }
      return false;
    },
  }));

  if (!props.items.length) {
    return null;
  }

  return (
    <div className="bg-[#1e1e2e] border border-white/10 rounded-xl shadow-2xl overflow-hidden min-w-[200px]">
      {props.items.map((item: any, index: number) => (
        <button
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
            index === selectedIndex ? "bg-blue-600/20 text-white" : "hover:bg-white/5 text-white/70"
          )}
          key={index}
          onClick={() => selectItem(index)}
        >
          <img
            src={resolveAvatar(item.avatarUrl)}
            alt={item.displayName || item.username}
            className="w-7 h-7 rounded-full object-cover flex-shrink-0"
            referrerPolicy="no-referrer"
          />
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate">{item.displayName || item.username}</p>
            <p className="text-[10px] text-white/40 font-mono truncate">@{item.username}</p>
          </div>
        </button>
      ))}
    </div>
  );
});

// ----------------------------------------------------
// TiptapEditor Component
// ----------------------------------------------------
interface TiptapEditorProps {
  currentUserId?: string;
  onKeyDown?: (e: any) => void;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export default function TiptapEditor({ value, onChange, placeholder = "What's on your mind?", className, autoFocus }: TiptapEditorProps) {
  
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
      Image.configure({
        inline: true,
      }),
      Markdown,
      Mention.configure({
        HTMLAttributes: {
          class: 'mention text-blue-400 font-semibold bg-blue-500/10 px-1 rounded',
        },
        suggestion: {
          items: async ({ query: q }) => {
            if (!q) return [];
            try {
              const snap = await getDocs(
                query(
                  collection(db, "users"),
                  where("username", ">=", q.toLowerCase()),
                  where("username", "<", q.toLowerCase() + "\uf8ff"),
                  orderBy("username"),
                  limit(10)
                )
              );
              return snap.docs.map(d => {
                const data = d.data();
                return { uid: data.uid || d.id, username: data.username, displayName: data.displayName, avatarUrl: data.avatarUrl };
              });
            } catch (err) {
              console.error(err);
              return [];
            }
          },
          render: () => {
            let component: ReactRenderer;
            let popup: TippyInstance[];

            return {
              onStart: props => {
                component = new ReactRenderer(MentionList, {
                  props,
                  editor: props.editor,
                });

                if (!props.clientRect) return;

                popup = tippy('body', {
                  getReferenceClientRect: props.clientRect as any,
                  appendTo: () => document.body,
                  content: component.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: 'manual',
                  placement: 'bottom-start',
                });
              },
              onUpdate(props) {
                component.updateProps(props);

                if (!props.clientRect) return;

                popup[0].setProps({
                  getReferenceClientRect: props.clientRect as any,
                });
              },
              onKeyDown(props) {
                if (props.event.key === 'Escape') {
                  popup[0].hide();
                  return true;
                }
                return (component.ref as any)?.onKeyDown(props) || false;
              },
              onExit() {
                popup[0].destroy();
                component.destroy();
              },
            };
          },
        },
      }),
    ],
    content: value,
    autofocus: autoFocus ? 'end' : false,
    onUpdate: ({ editor }) => {
      // The markdown extension allows us to get markdown directly
      const markdown = ((editor as any).storage?.markdown?.getMarkdown?.() ?? editor.getText());
      onChange(markdown);
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-invert max-w-none focus:outline-none min-h-[100px] px-4 py-3 text-sm text-white/90',
          className
        ),
      },
    },
  });

  // Watch for external value changes (e.g. if cleared)
  useEffect(() => {
    if (editor && value === '') {
      const currentContent = ((editor as any).storage?.markdown?.getMarkdown?.() ?? editor.getText());
      if (currentContent !== '') {
        editor.commands.setContent('');
      }
    }
  }, [value, editor]);

  if (!editor) {
    return null;
  }

  const addImage = () => {
    const url = window.prompt('URL of the image:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  return (
    <div className={cn("w-full transition-all rounded-xl border border-white/10 bg-black/20 focus-within:ring-2 focus-within:ring-blue-500/50", className)}>
      <div className="flex items-center gap-1 p-2 border-b border-white/10 bg-white/5 rounded-t-xl overflow-x-auto">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn("p-1.5 rounded hover:bg-white/10 transition-colors", editor.isActive('bold') ? 'bg-white/20 text-white' : 'text-white/60')}
          title="Bold"
        >
          <Bold size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn("p-1.5 rounded hover:bg-white/10 transition-colors", editor.isActive('italic') ? 'bg-white/20 text-white' : 'text-white/60')}
          title="Italic"
        >
          <Italic size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={cn("p-1.5 rounded hover:bg-white/10 transition-colors", editor.isActive('blockquote') ? 'bg-white/20 text-white' : 'text-white/60')}
          title="Quote"
        >
          <Quote size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={cn("p-1.5 rounded hover:bg-white/10 transition-colors", editor.isActive('codeBlock') ? 'bg-white/20 text-white' : 'text-white/60')}
          title="Code Block"
        >
          <Code size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={cn("p-1.5 rounded hover:bg-white/10 transition-colors", editor.isActive('bulletList') ? 'bg-white/20 text-white' : 'text-white/60')}
          title="Bullet List"
        >
          <List size={16} />
        </button>
        <button
          type="button"
          onClick={addImage}
          className="p-1.5 rounded hover:bg-white/10 transition-colors text-white/60"
          title="Add Image"
        >
          <ImageIcon size={16} />
        </button>
      </div>
      
      <EditorContent editor={editor} className="cursor-text" />
      
      <style dangerouslySetInnerHTML={{__html: `
        .is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: rgba(255, 255, 255, 0.3);
          pointer-events: none;
          height: 0;
        }
        .ProseMirror p {
          margin-top: 0;
          margin-bottom: 0.5rem;
        }
        .ProseMirror p:last-child {
          margin-bottom: 0;
        }
      `}} />
    </div>
  );
}
