import React from "react";
import { Megaphone, Loader2, Bold, Italic, Code2, Link2, List, Quote, ImageDown, X, Send, BadgeCheck } from "lucide-react";
import { SubpageWrapper } from "../../pages/AdminDashboard";
import { toast } from "react-hot-toast";

// Helper function to concatenate classNames
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

export function AdminPostsTab(props: any) {
  const {
    postContent,
    setPostContent,
    postType,
    setPostType,
    adminPostAttachments,
    setAdminPostAttachments,
    adminPostTextareaRef,
    publishingPost,
    handleAdminPost
  } = props;

  const handleAttachImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const files = Array.from(e.target.files);
    toast.loading("Uploading image(s)...", { id: "admin-upload" });
    try {
      const { uploadImage } = await import("../../lib/storageService");
      const newAttachments = await Promise.all(
        files.map(f => uploadImage(f, `feed/${Date.now()}_${f.name}`))
      );
      setAdminPostAttachments((prev: string[]) => [...prev, ...newAttachments]);
      toast.success("Image(s) attached!", { id: "admin-upload" });
    } catch (err) {
      toast.error("Failed to upload image(s)", { id: "admin-upload" });
    }
    e.target.value = "";
  };

  const insertMarkdown = (wrap: readonly [string, string], placeholder: string) => {
    const el = adminPostTextareaRef.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const selected = postContent.slice(start, end) || placeholder;
    const before = postContent.slice(0, start);
    const after = postContent.slice(end);
    setPostContent(before + wrap[0] + selected + wrap[1] + after);
    requestAnimationFrame(() => {
      el.focus();
      const cursor = start + wrap[0].length + selected.length + wrap[1].length;
      el.setSelectionRange(cursor, cursor);
    });
  };

  return (
    <SubpageWrapper title="Official Announcements" description="Create and publish official posts to the main feed">
      <div className="max-w-4xl">
        <div className="bg-surface border border-border-base rounded-2xl p-6 md:p-8 backdrop-blur-xl relative overflow-hidden">
          {/* Decorative background accent */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />

          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
              <Megaphone className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Create Official Post</h2>
              <p className="text-sm text-white/40">These posts will appear in the main feed for all users.</p>
            </div>
          </div>

          <form onSubmit={handleAdminPost} className="space-y-6 relative z-10">
            {/* Post Type Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Post Type</label>
              <div className="flex flex-wrap items-center gap-3">
                {(["announcement", "update", "feature"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setPostType(t)}
                    className={cn(
                      "px-4 py-2.5 rounded-xl text-sm font-bold border transition-all active:scale-95",
                      postType === t
                        ? "bg-blue-600/20 border-blue-500 text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                        : "bg-white/5 border-border-base text-white/50 hover:border-white/20 hover:text-white"
                    )}
                  >
                    {t === "announcement" ? "Announcement" : t === "update" ? "Update" : "Feature"}
                  </button>
                ))}
              </div>
            </div>

            {/* Markdown Editor */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Content</label>
              <div className="bg-black/40 border border-border-base rounded-xl overflow-hidden focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/50 transition-all shadow-inner">
                
                {/* Toolbar */}
                <div className="flex items-center gap-1 border-b border-border-base p-2 bg-white/[0.02]">
                  {([
                    { icon: Bold,   title: "Bold",        wrap: ["**", "**"],    placeholder: "bold text" },
                    { icon: Italic, title: "Italic",      wrap: ["*", "*"],      placeholder: "italic text" },
                    { icon: Code2,  title: "Inline code", wrap: ["`", "`"],      placeholder: "code" },
                    { icon: Link2,  title: "Link",        wrap: ["[", "](url)"], placeholder: "link text" },
                    { icon: List,   title: "List item",   wrap: ["- ", ""],      placeholder: "item" },
                    { icon: Quote,  title: "Blockquote",  wrap: ["> ", ""],      placeholder: "quote" },
                  ] as const).map(({ icon: Icon, title, wrap, placeholder }) => (
                    <button
                      key={title}
                      type="button"
                      title={title}
                      onMouseDown={(e) => { e.preventDefault(); insertMarkdown(wrap, placeholder); }}
                      className="p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  ))}
                  
                  <div className="w-px h-5 bg-white/10 mx-2" />
                  
                  <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-blue-500/10 text-blue-400 hover:text-blue-300 transition-colors cursor-pointer group" title="Attach Image">
                    <ImageDown className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold hidden sm:block">Attach Image</span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleAttachImage} />
                  </label>
                </div>

                {/* Textarea */}
                <textarea 
                  ref={adminPostTextareaRef} 
                  value={postContent} 
                  onChange={(e) => setPostContent(e.target.value)} 
                  rows={8} 
                  className="w-full bg-transparent px-4 py-3 text-white text-sm focus:outline-none resize-y min-h-[150px] placeholder:text-white/20" 
                  required 
                  placeholder="Write your official announcement here... (Markdown supported)" 
                />
                
                {/* Image Previews */}
                {adminPostAttachments && adminPostAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-3 p-4 border-t border-border-base bg-white/[0.01]">
                    {adminPostAttachments.map((url: string, i: number) => (
                      <div key={i} className="relative group rounded-xl overflow-hidden border border-border-base bg-black/50 w-24 h-24 shadow-md">
                        <img src={url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="attachment" />
                        <button
                          type="button"
                          onClick={() => setAdminPostAttachments((prev: string[]) => prev.filter((_, idx) => idx !== i))}
                          className="absolute top-1.5 right-1.5 bg-red-500/90 hover:bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 shadow-lg"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-border-base">
              <div className="flex items-center gap-3">
                <button 
                  type="submit" 
                  disabled={publishingPost || !postContent?.trim()} 
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(37,99,235,0.2)] active:scale-95"
                >
                  {publishingPost ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  {publishingPost ? "Publishing..." : "Publish to Feed"}
                </button>
                <div className="hidden sm:block">
                  <p className="text-xs text-white/40">Appears as</p>
                  <p className="text-sm font-bold text-yellow-400 flex items-center gap-1.5">
                    DevOS Official <BadgeCheck className="w-4 h-4" />
                  </p>
                </div>
              </div>
              <p className="text-xs font-mono text-white/30">{postContent?.length || 0} chars</p>
            </div>

          </form>
        </div>
      </div>
    </SubpageWrapper>
  );
}
