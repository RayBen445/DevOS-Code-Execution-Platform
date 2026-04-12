/**
 * useVoiceCall — shared WebRTC voice-call hook for community and org chat.
 *
 * Key behaviours:
 * - Subscribes to Firestore `voice_rooms/{roomId}` for real-time call state
 *   so all chat viewers see the "Join Call" banner without being in the call.
 * - On join, receives existing participant list from the server
 *   (`voice-room-participants`) and initiates WebRTC offers to each of them,
 *   fixing the bug where late joiners could never hear early participants.
 * - Incoming peer offers handled as usual (answer flow).
 * - Microphone mute toggles the local audio track without closing the call.
 * - All socket listeners are cleaned up on leave / unmount.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import socket from "../lib/socket";
import { toast } from "sonner";

export interface UseVoiceCallReturn {
  /** True if THIS user is currently in the voice call */
  inVoiceCall: boolean;
  /**
   * All participants from Firestore: userId → displayName.
   * Non-empty means a call is active even if the local user hasn't joined.
   */
  callParticipants: Record<string, string>;
  /** True if the local microphone is muted */
  muted: boolean;
  /** Join an active call OR start a new one */
  joinOrStartCall: () => Promise<void>;
  /** Leave the current call and clean up all peer connections */
  endCall: () => void;
  /** Toggle local microphone mute */
  toggleMute: () => void;
}

export function useVoiceCall(
  roomId: string | null,
  userId: string | null | undefined,
  displayName: string
): UseVoiceCallReturn {
  const [inVoiceCall, setInVoiceCall] = useState(false);
  const [callParticipants, setCallParticipants] = useState<Record<string, string>>({});
  const [muted, setMuted] = useState(false);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peerMapRef = useRef<Record<string, RTCPeerConnection>>({});
  const remoteAudioRef = useRef<Record<string, HTMLAudioElement>>({});
  const voiceHandlersRef = useRef<Partial<Record<string, (...args: any[]) => void>>>({});

  // ── Real-time call-state from Firestore ────────────────────────────────────
  useEffect(() => {
    if (!roomId) { setCallParticipants({}); return; }
    const unsub = onSnapshot(
      doc(db, "voice_rooms", roomId),
      (snap) => {
        setCallParticipants(
          snap.exists() ? ((snap.data().participants as Record<string, string>) ?? {}) : {}
        );
      },
      () => setCallParticipants({})
    );
    return () => unsub();
  }, [roomId]);

  // ── WebRTC peer factory ────────────────────────────────────────────────────
  const buildPeer = useCallback(
    (targetUserId: string, meId: string, initiator: boolean): RTCPeerConnection => {
      if (peerMapRef.current[targetUserId]) return peerMapRef.current[targetUserId];

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      localStreamRef.current
        ?.getTracks()
        .forEach((track) => pc.addTrack(track, localStreamRef.current!));

      pc.onicecandidate = (event) => {
        if (event.candidate && roomId) {
          socket.emit("voice-ice-candidate", {
            roomId,
            targetUserId,
            fromUserId: meId,
            candidate: event.candidate,
          });
        }
      };

      pc.ontrack = (event) => {
        let audio = remoteAudioRef.current[targetUserId];
        if (!audio) {
          audio = new Audio();
          audio.autoplay = true;
          remoteAudioRef.current[targetUserId] = audio;
        }
        audio.srcObject = event.streams[0];
      };

      peerMapRef.current[targetUserId] = pc;

      if (initiator) {
        pc.createOffer()
          .then((offer) => pc.setLocalDescription(offer).then(() => offer))
          .then((offer) => {
            if (roomId) socket.emit("voice-offer", { roomId, targetUserId, fromUserId: meId, offer });
          })
          .catch(() => {});
      }

      return pc;
    },
    [roomId]
  );

  // ── Cleanup helper ─────────────────────────────────────────────────────────
  const cleanupVoiceCall = useCallback(() => {
    Object.values(peerMapRef.current).forEach((pc) => pc.close());
    peerMapRef.current = {};

    Object.values(remoteAudioRef.current).forEach((el) => {
      el.srcObject = null;
      el.remove();
    });
    remoteAudioRef.current = {};

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    setInVoiceCall(false);
    setMuted(false);
  }, []);

  // ── Leave call ─────────────────────────────────────────────────────────────
  const endCall = useCallback(() => {
    if (userId && roomId) socket.emit("leave-voice-room", { roomId, userId });

    const handlers = voiceHandlersRef.current;
    Object.entries(handlers).forEach(([event, fn]) => {
      if (fn) socket.off(event, fn);
    });
    voiceHandlersRef.current = {};

    cleanupVoiceCall();
  }, [userId, roomId, cleanupVoiceCall]);

  // Cleanup on unmount or when roomId/userId changes
  useEffect(() => {
    return () => {
      if (userId && roomId) {
        socket.emit("leave-voice-room", { roomId, userId });
        const handlers = voiceHandlersRef.current;
        Object.entries(handlers).forEach(([event, fn]) => {
          if (fn) socket.off(event, fn);
        });
        cleanupVoiceCall();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, userId]);

  // ── Join or start call ─────────────────────────────────────────────────────
  const joinOrStartCall = useCallback(async () => {
    if (!userId || !roomId || inVoiceCall) return;

    try {
      localStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      socket.connect();

      const meId = userId;
      socket.emit("join-voice-room", { roomId, userId: meId, name: displayName });
      setInVoiceCall(true);

      // ── Handler: existing participants (sent by server to the joiner only) ──
      const onVoiceRoomParticipants = ({
        participants,
      }: {
        roomId: string;
        participants: { userId: string; name: string }[];
      }) => {
        // Initiate a WebRTC offer to each person already in the room
        participants.forEach(({ userId: uid }) => {
          if (uid !== meId) buildPeer(uid, meId, true);
        });
      };

      // ── Handler: a new peer joined after us ───────────────────────────────
      const onVoiceUserJoined = ({ userId: uid }: { userId: string }) => {
        if (!uid || uid === meId) return;
        buildPeer(uid, meId, true);
      };

      // ── Handler: incoming offer ────────────────────────────────────────────
      const onVoiceOffer = async ({
        fromUserId,
        offer,
      }: {
        fromUserId: string;
        offer: RTCSessionDescriptionInit;
      }) => {
        const pc = buildPeer(fromUserId, meId, false);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("voice-answer", { roomId, targetUserId: fromUserId, fromUserId: meId, answer });
      };

      // ── Handler: answer to our offer ──────────────────────────────────────
      const onVoiceAnswer = async ({
        fromUserId,
        answer,
      }: {
        fromUserId: string;
        answer: RTCSessionDescriptionInit;
      }) => {
        const pc = peerMapRef.current[fromUserId];
        if (!pc) return;
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      };

      // ── Handler: ICE candidate ────────────────────────────────────────────
      const onVoiceIceCandidate = async ({
        fromUserId,
        candidate,
      }: {
        fromUserId: string;
        candidate: RTCIceCandidateInit;
      }) => {
        const pc = peerMapRef.current[fromUserId];
        if (!pc) return;
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      };

      // ── Handler: peer left ────────────────────────────────────────────────
      const onVoiceUserLeft = ({ userId: uid }: { userId: string }) => {
        peerMapRef.current[uid]?.close();
        delete peerMapRef.current[uid];
        remoteAudioRef.current[uid]?.remove();
        delete remoteAudioRef.current[uid];
      };

      voiceHandlersRef.current = {
        "voice-user-joined": onVoiceUserJoined,
        "voice-offer": onVoiceOffer,
        "voice-answer": onVoiceAnswer,
        "voice-ice-candidate": onVoiceIceCandidate,
        "voice-user-left": onVoiceUserLeft,
      };

      // The server sends voice-room-participants exactly once in response to join
      socket.once("voice-room-participants", onVoiceRoomParticipants);
      socket.on("voice-user-joined", onVoiceUserJoined);
      socket.on("voice-offer", onVoiceOffer);
      socket.on("voice-answer", onVoiceAnswer);
      socket.on("voice-ice-candidate", onVoiceIceCandidate);
      socket.on("voice-user-left", onVoiceUserLeft);
    } catch (err: unknown) {
      console.error("Voice call failed:", err);
      toast.error("Could not start voice call. Microphone permission may be blocked.");
      cleanupVoiceCall();
    }
  }, [userId, roomId, inVoiceCall, displayName, buildPeer, cleanupVoiceCall]);

  // ── Toggle mute ────────────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMuted(!track.enabled);
  }, []);

  return { inVoiceCall, callParticipants, muted, joinOrStartCall, endCall, toggleMute };
}
