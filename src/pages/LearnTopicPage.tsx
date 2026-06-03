import { Link, useParams, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, CheckCircle2, ChevronRight, Clock } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import MobileBottomNav from "../components/MobileBottomNav";
import { useSEO } from "../hooks/useSEO";
import { findTopic } from "../lib/learnData";
import { useLearnProgress } from "../hooks/useLearnProgress";
import { cn } from "../lib/utils";

// Approximate reading time per lesson in minutes
const APPROX_MINUTES = 5;

export default function LearnTopicPage() {
  const { topicId = "" } = useParams<{ topicId: string }>();
  const topic = findTopic(topicId);

  useSEO({
    title: topic ? `${topic.title} — DevOS Learn` : "Topic — DevOS Learn",
    description: topic?.description,
  });

  const { completedSet } = useLearnProgress();

  if (!topic) return <Navigate to="/learn" replace />;

  const completedCount = topic.lessons.filter((l) =>
    completedSet.has(`${topic.id}/${l.id}`)
  ).length;
  const pct =
    topic.lessons.length > 0
      ? Math.round((completedCount / topic.lessons.length) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-base text-white flex flex-col">
      <Navbar />

      <div className="max-w-3xl mx-auto w-full px-6 py-10 flex-1">
        {/* Back link */}
        <Link
          to="/learn"
          className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          All Topics
        </Link>

        {/* Topic header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-10"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className={cn("p-2 rounded-xl border", topic.accent)}>
              <BookOpen className={cn("w-5 h-5", topic.color)} />
            </div>
            <span className={cn("text-sm font-bold uppercase tracking-widest", topic.color)}>
              {topic.title}
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-3">{topic.title}</h1>
          <p className="text-white/50 leading-relaxed mb-6">{topic.description}</p>

          {/* Progress bar */}
          <div className="max-w-xs">
            <div className="flex items-center justify-between text-xs text-white/30 mb-1.5">
              <span>
                {completedCount}/{topic.lessons.length} lessons complete
              </span>
              <span>{pct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
              />
            </div>
          </div>
        </motion.div>

        {/* Lesson list */}
        <div className="space-y-3">
          {topic.lessons.map((lesson, i) => {
            const done = completedSet.has(`${topic.id}/${lesson.id}`);
            return (
              <motion.div
                key={lesson.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: i * 0.06 }}
              >
                <Link
                  to={`/learn/${topic.id}/${lesson.id}`}
                  className={cn(
                    "group flex items-center gap-4 p-5 rounded-2xl border transition-all",
                    done
                      ? "bg-green-500/5 border-green-500/20 hover:bg-green-500/10"
                      : "bg-white/[0.02] border-border-base hover:bg-white/[0.05] hover:border-border-base"
                  )}
                >
                  {/* Step number / check */}
                  <div
                    className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-bold text-sm border",
                      done
                        ? "bg-green-500/15 border-green-500/30 text-green-400"
                        : "bg-white/5 border-border-base text-white/40"
                    )}
                  >
                    {done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white group-hover:text-blue-300 transition-colors truncate">
                      {lesson.title}
                    </p>
                    <p className="text-white/40 text-sm mt-0.5 line-clamp-1">
                      {lesson.description}
                    </p>
                  </div>

                  {/* Meta */}
                  <div className="shrink-0 flex items-center gap-3 text-xs text-white/30">
                    <span className="hidden sm:flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {APPROX_MINUTES} min
                    </span>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full uppercase tracking-wider font-bold",
                        lesson.language === "javascript"
                          ? "bg-yellow-500/10 text-yellow-400"
                          : lesson.language === "typescript"
                          ? "bg-blue-500/10 text-blue-400"
                          : "bg-orange-500/10 text-orange-400"
                      )}
                    >
                      {lesson.language}
                    </span>
                    <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-blue-400 transition-colors" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* All done CTA */}
        {completedCount === topic.lessons.length && topic.lessons.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-8 p-6 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center gap-4"
          >
            <CheckCircle2 className="w-8 h-8 text-green-400 shrink-0" />
            <div>
              <p className="font-bold text-green-400">Topic complete! 🎉</p>
              <p className="text-white/50 text-sm mt-0.5">
                Great work — head back to explore more topics.
              </p>
            </div>
            <Link
              to="/learn"
              className="ml-auto shrink-0 px-4 py-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-400 rounded-xl text-sm font-bold transition-colors"
            >
              All Topics
            </Link>
          </motion.div>
        )}
      </div>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
