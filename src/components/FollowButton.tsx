import { useState, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../lib/firebase";
import { followUser, unfollowUser, subscribeIsFollowing } from "../lib/followService";
import { notifyFollow } from "../lib/notificationService";
import { toast } from "sonner";
import { Loader2, UserPlus, UserCheck, UserMinus } from "lucide-react";

interface FollowButtonProps {
  targetUid: string;
  targetUsername: string;
  followerUsername?: string;
  size?: "sm" | "md";
  className?: string;
}

export default function FollowButton({
  targetUid,
  targetUsername,
  followerUsername,
  size = "md",
  className = "",
}: FollowButtonProps) {
  const [user] = useAuthState(auth);
  const [following, setFollowing] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    if (!user || user.uid === targetUid) return;
    const unsub = subscribeIsFollowing(user.uid, targetUid, setFollowing);
    return () => unsub();
  }, [user, targetUid]);

  if (!user || user.uid === targetUid) return null;
  if (following === null) {
    return (
      <button disabled className={`${baseCls(size)} opacity-40 cursor-default ${className}`}>
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      </button>
    );
  }

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    try {
      if (following) {
        await unfollowUser(user.uid, targetUid);
        toast.success(`Unfollowed @${targetUsername}`);
      } else {
        await followUser(user.uid, targetUid);
        notifyFollow({
          followerId: user.uid,
          followerUsername: followerUsername || user.displayName || user.email?.split("@")[0] || "Someone",
          followingId: targetUid,
        }).catch(() => {}); // fire-and-forget
        toast.success(`Following @${targetUsername}`);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (following) {
    return (
      <button
        onClick={handleToggle}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        disabled={loading}
        className={`${baseCls(size)} ${
          hovering
            ? "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
            : "bg-white/8 border-white/10 text-white/70 hover:border-white/20"
        } ${className}`}
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : hovering ? (
          <><UserMinus className="w-3.5 h-3.5" />Unfollow</>
        ) : (
          <><UserCheck className="w-3.5 h-3.5" />Following</>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`${baseCls(size)} bg-blue-600 hover:bg-blue-700 border-blue-600 text-white ${className}`}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <><UserPlus className="w-3.5 h-3.5" />Follow</>
      )}
    </button>
  );
}

function baseCls(size: "sm" | "md") {
  const pad = size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm";
  return `flex items-center gap-1.5 rounded-xl border font-semibold transition-all disabled:opacity-50 ${pad}`;
}
