import React, { useEffect, useState } from "react";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { Mail, MailOpen, Trash2, Clock, Inbox, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  id: string;
  name: string;
  email: string;
  message: string;
  read: boolean;
  createdAt: any;
}

function formatTimeAgo(timestamp: number) {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(timestamp).toLocaleDateString();
}

export default function PortfolioMessages({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "projects", projectId, "messages"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `projects/${projectId}/messages`);
      setLoading(false);
    });

    return unsub;
  }, [projectId]);

  const toggleRead = async (msg: Message) => {
    try {
      await updateDoc(doc(db, "projects", projectId, "messages", msg.id), {
        read: !msg.read
      });
    } catch (e) {
      toast.error("Failed to update message status.");
    }
  };

  const deleteMessage = async (msgId: string) => {
    try {
      await deleteDoc(doc(db, "projects", projectId, "messages", msgId));
      toast.success("Message deleted.");
    } catch (e) {
      toast.error("Failed to delete message.");
    }
  };

  return (
    <div className="flex flex-col h-full bg-base border-r border-[#21262D] w-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#21262D]">
        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded text-white/70 hover:text-white transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <Inbox className="w-5 h-5 text-blue-400" />
        <h2 className="text-sm font-semibold text-white">Contact Submissions</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-40 text-white/40">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-xs">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-white/40 text-center">
            <Mail className="w-10 h-10 mb-3 opacity-20" />
            <p className="text-sm font-medium">No messages yet</p>
            <p className="text-xs opacity-70 mt-1 max-w-[200px]">When visitors use the contact form on your portfolio, their messages will appear here.</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`relative p-3 rounded-xl border transition-colors ${msg.read ? 'bg-white/5 border-white/5' : 'bg-blue-500/10 border-blue-500/20'}`}
              >
                {!msg.read && <div className="absolute top-3 right-3 w-2 h-2 bg-blue-500 rounded-full" />}
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className={`text-sm font-medium ${msg.read ? 'text-white/80' : 'text-white'}`}>{msg.name}</h3>
                    <a href={`mailto:${msg.email}`} className="text-xs text-blue-400 hover:underline">{msg.email}</a>
                  </div>
                </div>
                <p className="text-xs text-white/70 whitespace-pre-wrap mt-2">{msg.message}</p>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
                  <div className="flex items-center gap-1 text-[10px] text-white/40">
                    <Clock className="w-3 h-3" />
                    <span>
                      {msg.createdAt?.toMillis ? formatTimeAgo(msg.createdAt.toMillis()) : 'Just now'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleRead(msg)}
                      className="p-1.5 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition-colors"
                      title={msg.read ? "Mark as unread" : "Mark as read"}
                    >
                      {msg.read ? <Mail className="w-3.5 h-3.5" /> : <MailOpen className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => deleteMessage(msg.id)}
                      className="p-1.5 hover:bg-red-500/20 rounded-lg text-red-400/50 hover:text-red-400 transition-colors"
                      title="Delete message"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
