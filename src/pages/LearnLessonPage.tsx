import { useState, useRef, useEffect } from "react";
import { Link, useParams, Navigate, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Play,
  RotateCcw,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Terminal,
  BookOpen,
  Lightbulb,
  Lock,
  Eye,
} from "lucide-react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../lib/firebase";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import MobileBottomNav from "../components/MobileBottomNav";
import { useSEO } from "../hooks/useSEO";
import {
  findTopic,
  findLesson,
  nextLesson,
  prevLesson,
  type TokenType,
} from "../lib/learnData";
import { useLearnProgress } from "../hooks/useLearnProgress";
import { cn } from "../lib/utils";

// ─── Token badge colours ──────────────────────────────────────────────────────

const TOKEN_STYLES: Record<TokenType, string> = {
  keyword:  "bg-purple-500/15 text-purple-300 border-purple-500/25",
  variable: "bg-blue-500/15   text-blue-300   border-blue-500/25",
  operator: "bg-yellow-500/15 text-yellow-300  border-yellow-500/25",
  value:    "bg-green-500/15  text-green-300   border-green-500/25",
  function: "bg-orange-500/15 text-orange-300  border-orange-500/25",
  type:     "bg-cyan-500/15   text-cyan-300    border-cyan-500/25",
};

const TOKEN_LABEL: Record<TokenType, string> = {
  keyword:  "keyword",
  variable: "variable",
  operator: "operator",
  value:    "value",
  function: "function",
  type:     "type",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function LearnLessonPage() {
  const { topicId = "", lessonId = "" } = useParams<{ topicId: string; lessonId: string }>();
  const navigate = useNavigate();
  const [user] = useAuthState(auth);

  const topic  = findTopic(topicId);
  const lesson = findLesson(topicId, lessonId);

  useSEO({
    title: lesson ? `${lesson.title} — DevOS Learn` : "Lesson — DevOS Learn",
    description: lesson?.description,
  });

  const { completedSet, markComplete } = useLearnProgress();
  const done = completedSet.has(`${topicId}/${lessonId}`);

  // Code editor state (starts from lesson code, editable)
  const [code, setCode]             = useState(lesson?.code ?? "");
  const [output, setOutput]         = useState<string[]>([]);
  const [isRunning, setIsRunning]   = useState(false);
  const [runError, setRunError]     = useState<string | null>(null);
  const [hasRun, setHasRun]         = useState(false);
  const [activeTab, setActiveTab]   = useState<"code" | "explanation">("code");
  const textareaRef                 = useRef<HTMLTextAreaElement>(null);
  const outputRef                   = useRef<HTMLDivElement>(null);

  // Sync code state when lesson changes
  useEffect(() => {
    if (lesson) {
      setCode(lesson.code);
      setOutput([]);
      setRunError(null);
      setHasRun(false);
    }
  }, [topicId, lessonId, lesson]);

  // Auto-scroll output
  useEffect(() => {
    if (hasRun && outputRef.current) {
      outputRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [output, hasRun]);

  if (!topic || !lesson) return <Navigate to="/learn" replace />;

  const next = nextLesson(topicId, lessonId);
  const prev = prevLesson(topicId, lessonId);
  const isHTML = lesson.language === "html";

  // ── Reset code to original ──────────────────────────────────────────────────
  const handleReset = () => {
    setCode(lesson.code);
    setOutput([]);
    setRunError(null);
    setHasRun(false);
  };

  // ── Run code ────────────────────────────────────────────────────────────────
  const handleRun = async () => {
    if (isRunning) return;

    if (isHTML) {
      // HTML preview is handled by the inline iframe — just mark as run
      setHasRun(true);
      setOutput(["(preview rendered below)"]);
      return;
    }

    if (!user) {
      setOutput(["Sign in to run code."]);
      setHasRun(true);
      return;
    }

    setIsRunning(true);
    setRunError(null);
    setOutput([]);

    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ language: lesson.language, content: code }),
      });

      const rawText = await res.text();
      let data: { logs?: string[]; error?: string };
      try {
        data = JSON.parse(rawText);
      } catch {
        setOutput([rawText.slice(0, 500)]);
        setHasRun(true);
        setIsRunning(false);
        return;
      }

      if (!res.ok) {
        setRunError(data.error || "Execution failed.");
        setOutput([]);
      } else {
        setOutput(data.logs ?? []);
      }
    } catch (err: unknown) {
      setRunError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setIsRunning(false);
      setHasRun(true);
    }
  };

  // ── Mark complete & go next ─────────────────────────────────────────────────
  const handleComplete = () => {
    markComplete(topicId, lessonId);
    if (next) {
      navigate(`/learn/${next.topicId}/${next.lessonId}`);
    } else {
      navigate(`/learn/${topicId}`);
    }
  };

  // ── Tab handle ──────────────────────────────────────────────────────────────
  const lessonIndex = topic.lessons.findIndex((l) => l.id === lessonId);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-5xl mx-auto w-full px-4 md:px-6 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-white/30 mb-6 flex-wrap">
          <Link to="/learn" className="hover:text-white transition-colors">
            Learn
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link to={`/learn/${topicId}`} className="hover:text-white transition-colors">
            {topic.title}
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-white/60">{lesson.title}</span>
        </div>

        {/* Lesson header */}
        <motion.div
          key={lessonId}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-8"
        >
          <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-white/30">
                  Lesson {lessonIndex + 1} of {topic.lessons.length}
                </span>
                <span
                  className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border",
                    lesson.language === "javascript"
                      ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                      : lesson.language === "typescript"
                      ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      : "bg-orange-500/10 text-orange-400 border-orange-500/20"
                  )}
                >
                  {lesson.language}
                </span>
                {done && (
                  <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-green-500/10 text-green-400 border border-green-500/20">
                    <CheckCircle2 className="w-3 h-3" /> Completed
                  </span>
                )}
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">{lesson.title}</h1>
            </div>
          </div>
          <p className="text-white/50 leading-relaxed">{lesson.description}</p>
        </motion.div>

        {/* Tab switcher */}
        <div className="flex gap-1 mb-5 p-1 bg-white/5 rounded-xl w-fit">
          {(["code", "explanation"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
                activeTab === tab
                  ? "bg-white/10 text-white"
                  : "text-white/40 hover:text-white/70"
              )}
            >
              {tab === "code" ? (
                <Terminal className="w-3.5 h-3.5" />
              ) : (
                <Lightbulb className="w-3.5 h-3.5" />
              )}
              {tab === "code" ? "Code" : "Explanation"}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "code" ? (
            <motion.div
              key="code"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Code editor area */}
              <div className="rounded-2xl border border-white/10 overflow-hidden bg-[#0d0d0d]">
                {/* Toolbar */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8 bg-white/[0.02]">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-red-500/50" />
                      <span className="w-3 h-3 rounded-full bg-yellow-500/50" />
                      <span className="w-3 h-3 rounded-full bg-green-500/50" />
                    </div>
                    <span className="text-xs text-white/30 font-mono ml-1">
                      lesson.{lesson.language === "html" ? "html" : lesson.language === "typescript" ? "ts" : "js"}
                    </span>
                  </div>
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-1 text-xs text-white/30 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
                    title="Reset to original"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                </div>

                {/* Editable textarea */}
                <textarea
                  ref={textareaRef}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  spellCheck={false}
                  className="w-full bg-transparent font-mono text-sm text-white/85 px-5 py-4 focus:outline-none resize-none leading-relaxed min-h-[260px]"
                  style={{ tabSize: 2 }}
                  onKeyDown={(e) => {
                    // Insert 2-space indent on Tab
                    if (e.key === "Tab") {
                      e.preventDefault();
                      const start = e.currentTarget.selectionStart;
                      const end   = e.currentTarget.selectionEnd;
                      const updated = code.slice(0, start) + "  " + code.slice(end);
                      setCode(updated);
                      requestAnimationFrame(() => {
                        if (textareaRef.current) {
                          textareaRef.current.selectionStart = start + 2;
                          textareaRef.current.selectionEnd   = start + 2;
                        }
                      });
                    }
                  }}
                />
              </div>

              {/* Run button */}
              <div className="flex items-center gap-3">
                {user || isHTML ? (
                  <button
                    onClick={handleRun}
                    disabled={isRunning}
                    className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-60 text-white rounded-xl text-sm font-bold transition-all"
                  >
                    {isRunning ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    {isRunning ? "Running…" : isHTML ? "Preview" : "Run Code"}
                  </button>
                ) : (
                  <div className="flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 text-white/40 rounded-xl text-sm font-medium">
                    <Lock className="w-4 h-4" />
                    Sign in to run code
                  </div>
                )}

                {/* Expected output hint */}
                {!isHTML && lesson.output.length > 0 && (
                  <span className="text-xs text-white/25">
                    Expected: <code className="text-white/40">{lesson.output[0]}</code>
                    {lesson.output.length > 1 ? ` +${lesson.output.length - 1} more` : ""}
                  </span>
                )}
              </div>

              {/* HTML Preview */}
              {isHTML && hasRun && (
                <div className="rounded-2xl border border-white/10 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/8 bg-white/[0.02]">
                    <Eye className="w-3.5 h-3.5 text-white/40" />
                    <span className="text-xs text-white/40">Live Preview</span>
                  </div>
                  <iframe
                    srcDoc={code}
                    title="HTML preview"
                    className="w-full border-0 bg-white"
                    style={{ height: 300 }}
                    sandbox="allow-scripts allow-same-origin"
                  />
                </div>
              )}

              {/* Terminal output */}
              {!isHTML && hasRun && (
                <div ref={outputRef} className="rounded-2xl border border-white/10 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/8 bg-white/[0.02]">
                    <Terminal className="w-3.5 h-3.5 text-green-400" />
                    <span className="text-xs text-white/40">Output</span>
                  </div>
                  <div className="px-5 py-4 font-mono text-sm min-h-[80px]">
                    {runError ? (
                      <p className="text-red-400">{runError}</p>
                    ) : output.length === 0 ? (
                      <p className="text-white/20">(no output)</p>
                    ) : (
                      output.map((line, i) => (
                        <p key={i} className="text-green-300 leading-relaxed">
                          {line}
                        </p>
                      ))
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            /* ── Explanation tab ── */
            <motion.div
              key="explanation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="rounded-2xl border border-white/10 overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/8 bg-white/[0.02]">
                  <Lightbulb className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm font-bold text-white/70">Code Breakdown</span>
                  <span className="ml-auto text-xs text-white/25">
                    {lesson.explanation.length} annotations
                  </span>
                </div>

                <div className="divide-y divide-white/5">
                  {lesson.explanation.map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="px-5 py-4 flex items-start gap-4"
                    >
                      {/* Token badge */}
                      <div className="shrink-0 mt-0.5">
                        <span
                          className={cn(
                            "inline-block px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider border",
                            TOKEN_STYLES[item.type]
                          )}
                        >
                          {TOKEN_LABEL[item.type]}
                        </span>
                      </div>

                      {/* Code + meaning */}
                      <div className="flex-1 min-w-0">
                        <code className="block font-mono text-sm text-white/85 bg-white/5 rounded-lg px-3 py-1.5 mb-2 overflow-x-auto whitespace-pre">
                          {item.part}
                        </code>
                        <p className="text-white/50 text-sm leading-relaxed">
                          {item.meaning}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation footer */}
        <div className="mt-8 pt-6 border-t border-white/8 flex items-center justify-between gap-4 flex-wrap">
          {/* Prev */}
          {prev ? (
            <Link
              to={`/learn/${prev.topicId}/${prev.lessonId}`}
              className="flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Previous
            </Link>
          ) : (
            <div />
          )}

          {/* Complete / Next */}
          <button
            onClick={handleComplete}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all",
              done
                ? "bg-white/5 hover:bg-white/10 text-white/60 border border-white/10"
                : "bg-blue-600 hover:bg-blue-500 text-white"
            )}
          >
            {done ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                {next ? "Next lesson" : "Back to topic"}
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                {next ? "Mark complete & continue" : "Mark as complete"}
              </>
            )}
            {next && <ArrowRight className="w-4 h-4" />}
          </button>

          {/* Skip */}
          {next && (
            <Link
              to={`/learn/${next.topicId}/${next.lessonId}`}
              className="flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>

        {/* Related: back to topic */}
        <div className="mt-6 flex items-center gap-2 text-sm text-white/25">
          <BookOpen className="w-3.5 h-3.5" />
          <Link to={`/learn/${topicId}`} className="hover:text-white/50 transition-colors">
            Back to {topic.title}
          </Link>
        </div>
      </div>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
