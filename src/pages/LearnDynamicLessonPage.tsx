import { useState, useEffect, useRef } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Play, RotateCcw, Loader2, Terminal, BookOpen, ChevronRight, Lock, Eye } from "lucide-react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../lib/firebase";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import MobileBottomNav from "../components/MobileBottomNav";
import { useSEO } from "../hooks/useSEO";
import { getLessonBySlug, type DynamicLesson } from "../lib/learnService";

export default function LearnDynamicLessonPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const [user] = useAuthState(auth);
  const [lesson, setLesson] = useState<DynamicLesson | null | undefined>(undefined);
  const [code, setCode] = useState("");
  const [output, setOutput] = useState<string[]>([]);
  const [runError, setRunError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useSEO({
    title: lesson ? `${lesson.title} — DevOS Learn` : "Lesson — DevOS Learn",
    description: lesson?.description,
  });

  useEffect(() => {
    getLessonBySlug(slug).then((l) => {
      setLesson(l);
      if (l) setCode(l.codeExample);
    });
  }, [slug]);

  if (lesson === undefined) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (lesson === null) return <Navigate to="/learn" replace />;

  const isHTML = lesson.language === "html";

  const handleReset = () => {
    setCode(lesson.codeExample);
    setOutput([]);
    setRunError(null);
    setHasRun(false);
  };

  const handleRun = async () => {
    if (isRunning) return;
    if (isHTML) { setHasRun(true); setOutput(["(preview rendered below)"]); return; }
    if (!user) { setOutput(["Sign in to run code."]); setHasRun(true); return; }

    setIsRunning(true);
    setRunError(null);
    setOutput([]);

    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ language: lesson.language, content: code }),
      });
      const rawText = await res.text();
      let data: { logs?: string[]; error?: string };
      try { data = JSON.parse(rawText); } catch { setOutput([rawText.slice(0, 500)]); setHasRun(true); setIsRunning(false); return; }
      if (!res.ok) setRunError(data.error || "Execution failed.");
      else setOutput(data.logs ?? []);
    } catch (err: unknown) {
      setRunError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setIsRunning(false);
      setHasRun(true);
    }
  };

  return (
    <div className="min-h-screen bg-base text-white flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-4xl mx-auto w-full px-4 md:px-6 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-white/30 mb-6 flex-wrap">
          <Link to="/learn" className="hover:text-white transition-colors">Learn</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-white/60">{lesson.title}</span>
        </div>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
              lesson.language === "javascript" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
              : lesson.language === "typescript" ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
              : "bg-orange-500/10 text-orange-400 border-orange-500/20"
            }`}>{lesson.language}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-3">{lesson.title}</h1>
          <p className="text-white/50 leading-relaxed">{lesson.description}</p>
        </motion.div>

        {/* Explanation */}
        {lesson.explanation && (
          <div className="mb-6 p-5 rounded-2xl bg-white/[0.02] border border-border-base">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-bold text-white/70">Explanation</span>
            </div>
            <p className="text-white/50 text-sm leading-relaxed whitespace-pre-line">{lesson.explanation}</p>
          </div>
        )}

        {/* Code editor */}
        <div className="rounded-2xl border border-border-base overflow-hidden bg-card mb-4">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-base bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500/50" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/50" />
                <span className="w-3 h-3 rounded-full bg-green-500/50" />
              </div>
              <span className="text-xs text-white/30 font-mono ml-1">
                example.{lesson.language === "html" ? "html" : lesson.language === "typescript" ? "ts" : "js"}
              </span>
            </div>
            <button onClick={handleReset} className="flex items-center gap-1 text-xs text-white/30 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/5">
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          </div>
          <textarea
            ref={textareaRef}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            className="w-full bg-transparent font-mono text-sm text-white/85 px-5 py-4 focus:outline-none resize-none leading-relaxed min-h-[220px]"
            style={{ tabSize: 2 }}
            onKeyDown={(e) => {
              if (e.key === "Tab") {
                e.preventDefault();
                const s = e.currentTarget.selectionStart;
                const updated = code.slice(0, s) + "  " + code.slice(e.currentTarget.selectionEnd);
                setCode(updated);
                requestAnimationFrame(() => { if (textareaRef.current) { textareaRef.current.selectionStart = s + 2; textareaRef.current.selectionEnd = s + 2; } });
              }
            }}
          />
        </div>

        {/* Run button */}
        <div className="flex items-center gap-3 mb-4">
          {user || isHTML ? (
            <button onClick={handleRun} disabled={isRunning}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-60 text-white rounded-xl text-sm font-bold transition-all">
              {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {isRunning ? "Running…" : isHTML ? "Preview" : "Run Code"}
            </button>
          ) : (
            <div className="flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-border-base text-white/40 rounded-xl text-sm font-medium">
              <Lock className="w-4 h-4" /> Sign in to run code
            </div>
          )}
          {lesson.expectedOutput?.length > 0 && !isHTML && (
            <span className="text-xs text-white/25">Expected: <code className="text-white/40">{lesson.expectedOutput[0]}</code></span>
          )}
        </div>

        {/* HTML Preview */}
        {isHTML && hasRun && (
          <div className="rounded-2xl border border-border-base overflow-hidden mb-4">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border-base bg-white/[0.02]">
              <Eye className="w-3.5 h-3.5 text-white/40" />
              <span className="text-xs text-white/40">Live Preview</span>
            </div>
            <iframe srcDoc={code} title="HTML preview" className="w-full border-0 bg-white" style={{ height: 280 }} sandbox="allow-scripts allow-same-origin" />
          </div>
        )}

        {/* Terminal output */}
        {!isHTML && hasRun && (
          <div className="rounded-2xl border border-border-base overflow-hidden mb-6">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border-base bg-white/[0.02]">
              <Terminal className="w-3.5 h-3.5 text-green-400" />
              <span className="text-xs text-white/40">Output</span>
            </div>
            <div className="px-5 py-4 font-mono text-sm min-h-[60px]">
              {runError ? <p className="text-red-400">{runError}</p>
                : output.length === 0 ? <p className="text-white/20">(no output)</p>
                : output.map((line, i) => <p key={i} className="text-green-300 leading-relaxed">{line}</p>)}
            </div>
          </div>
        )}

        {/* Back link */}
        <Link to="/learn" className="inline-flex items-center gap-1.5 text-sm text-white/30 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Learn
        </Link>
      </div>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
