import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, ChevronRight, Zap, CheckCircle2 } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import MobileBottomNav from "../components/MobileBottomNav";
import { useSEO } from "../hooks/useSEO";
import { TOPICS, TOTAL_LESSONS } from "../lib/learnData";
import { useLearnProgress } from "../hooks/useLearnProgress";
import { cn } from "../lib/utils";

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.4 },
};

export default function LearnPage() {
  useSEO({
    title: "Learn — DevOS",
    description:
      "Learn programming interactively with DevOS — run code live, understand every token, and track your progress.",
  });

  const { completedSet } = useLearnProgress();

  const totalCompleted = TOPICS.reduce(
    (acc, t) => acc + t.lessons.filter((l) => completedSet.has(`${t.id}/${l.id}`)).length,
    0
  );
  const pct = TOTAL_LESSONS > 0 ? Math.round((totalCompleted / TOTAL_LESSONS) * 100) : 0;

  return (
    <div className="min-h-screen bg-base text-white flex flex-col">
      <Navbar />

      {/* Hero */}
      <div className="relative overflow-hidden border-b border-border-base">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/5 to-transparent pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-6 py-16 md:py-24">
          <motion.div {...fadeUp} className="flex items-center gap-3 mb-5">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <BookOpen className="w-6 h-6 text-blue-400" />
            </div>
            <span className="text-sm font-bold text-blue-400 uppercase tracking-widest">
              DevOS Learn
            </span>
          </motion.div>
          <motion.h1
            {...fadeUp}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4"
          >
            Learn to code,{" "}
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              right here.
            </span>
          </motion.h1>
          <motion.p
            {...fadeUp}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="text-white/50 text-lg max-w-2xl mb-8"
          >
            Interactive lessons, live code execution, and step-by-step explanations — powered by
            the DevOS IDE engine.
          </motion.p>

          {/* Overall progress bar */}
          {totalCompleted > 0 && (
            <motion.div
              {...fadeUp}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="max-w-sm"
            >
              <div className="flex items-center justify-between text-xs text-white/40 mb-1.5">
                <span>Overall progress</span>
                <span>
                  {totalCompleted}/{TOTAL_LESSONS} lessons · {pct}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                />
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Topics grid */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-12">
        <div className="grid md:grid-cols-3 gap-6">
          {TOPICS.map((topic, i) => {
            const topicCompleted = topic.lessons.filter((l) =>
              completedSet.has(`${topic.id}/${l.id}`)
            ).length;
            const topicPct =
              topic.lessons.length > 0
                ? Math.round((topicCompleted / topic.lessons.length) * 100)
                : 0;

            return (
              <motion.div
                key={topic.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.07 }}
              >
                <Link
                  to={`/learn/${topic.id}`}
                  className={cn(
                    "group block p-6 rounded-2xl border bg-white/[0.02] hover:bg-white/[0.05] transition-all",
                    topic.accent
                  )}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className={cn(
                        "p-2 rounded-xl border",
                        topic.accent
                      )}
                    >
                      <BookOpen className={cn("w-5 h-5", topic.color)} />
                    </div>
                    {topicCompleted === topic.lessons.length && topic.lessons.length > 0 && (
                      <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                    )}
                  </div>

                  <h2 className="font-bold text-lg text-white mb-2 group-hover:text-blue-300 transition-colors">
                    {topic.title}
                  </h2>
                  <p className="text-white/40 text-sm leading-relaxed mb-5">
                    {topic.description}
                  </p>

                  {/* Progress */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs text-white/30 mb-1">
                      <span>{topicCompleted}/{topic.lessons.length} lessons</span>
                      <span>{topicPct}%</span>
                    </div>
                    <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-700"
                        style={{ width: `${topicPct}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-xs font-bold text-white/40 group-hover:text-blue-400 transition-colors">
                    Start learning
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="mt-14 p-8 rounded-2xl bg-gradient-to-br from-blue-600/15 to-purple-600/10 border border-blue-500/20 flex flex-col md:flex-row items-center gap-6"
        >
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              <span className="font-bold text-white">Build as you learn</span>
            </div>
            <p className="text-white/50 text-sm">
              Every lesson runs in the real DevOS execution engine. Edit code, experiment, and see
              results instantly.
            </p>
          </div>
          <Link
            to="/projects"
            className="shrink-0 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-colors"
          >
            Open the IDE
          </Link>
        </motion.div>
      </div>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
