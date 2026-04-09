import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  Chapter,
  EventSeries,
  Event,
  EventRegistration,
  Speaker,
  EventSpeaker,
  EventStatus,
} from "../types";

// ── Chapters ─────────────────────────────────────────────────────────────────

export async function createChapter(params: Omit<Chapter, "id" | "createdAt">): Promise<string> {
  const ref = await addDoc(collection(db, "chapters"), {
    ...params,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getChaptersByOrg(orgId: string): Promise<Chapter[]> {
  const q = query(collection(db, "chapters"), where("orgId", "==", orgId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Chapter));
}

export async function getChapterBySlug(orgId: string, slug: string): Promise<Chapter | null> {
  const q = query(
    collection(db, "chapters"),
    where("orgId", "==", orgId),
    where("slug", "==", slug)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Chapter;
}

// ── Event Series ──────────────────────────────────────────────────────────────

export async function createEventSeries(params: Omit<EventSeries, "id" | "createdAt">): Promise<string> {
  const ref = await addDoc(collection(db, "event_series"), {
    ...params,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getSeriesByOrg(orgId: string): Promise<EventSeries[]> {
  const q = query(collection(db, "event_series"), where("orgId", "==", orgId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as EventSeries));
}

export async function getSeriesBySlug(slug: string): Promise<EventSeries | null> {
  const q = query(collection(db, "event_series"), where("slug", "==", slug));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as EventSeries;
}

// ── Events ────────────────────────────────────────────────────────────────────

export async function createEvent(params: Omit<Event, "id" | "createdAt" | "status">): Promise<string> {
  const ref = await addDoc(collection(db, "events"), {
    ...params,
    status: "pending" as EventStatus,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getEventBySlug(slug: string): Promise<Event | null> {
  const q = query(collection(db, "events"), where("slug", "==", slug));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Event;
}

export async function getEventById(eventId: string): Promise<Event | null> {
  const snap = await getDoc(doc(db, "events", eventId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Event;
}

/** Subscribe to a single event document. */
export function subscribeEvent(
  eventId: string,
  callback: (event: Event | null) => void
): () => void {
  return onSnapshot(doc(db, "events", eventId), (d) => {
    callback(d.exists() ? ({ id: d.id, ...d.data() } as Event) : null);
  });
}

/** Get all approved events, optionally limited. */
export async function getApprovedEvents(maxItems = 50): Promise<Event[]> {
  const q = query(
    collection(db, "events"),
    where("status", "==", "approved"),
    orderBy("startDate", "asc"),
    limit(maxItems)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Event));
}

/** Get events for a specific org (any status). */
export async function getEventsByOrg(orgId: string): Promise<Event[]> {
  const q = query(collection(db, "events"), where("orgId", "==", orgId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Event));
}

/** Get events for a series. */
export async function getEventsBySeries(seriesId: string): Promise<Event[]> {
  const q = query(
    collection(db, "events"),
    where("seriesId", "==", seriesId),
    where("status", "==", "approved"),
    orderBy("startDate", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Event));
}

/** Get pending events (admin use). */
export async function getPendingEvents(): Promise<Event[]> {
  const q = query(
    collection(db, "events"),
    where("status", "in", ["pending", "under_review"]),
    orderBy("createdAt", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Event));
}

/** Get all events (admin use). */
export async function getAllEvents(): Promise<Event[]> {
  const q = query(collection(db, "events"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Event));
}

export async function updateEvent(eventId: string, data: Partial<Event>): Promise<void> {
  await updateDoc(doc(db, "events", eventId), { ...data });
}

export async function setEventStatus(eventId: string, status: EventStatus): Promise<void> {
  await updateDoc(doc(db, "events", eventId), { status });
}

export async function deleteEvent(eventId: string): Promise<void> {
  await deleteDoc(doc(db, "events", eventId));
}

// ── Event Registrations ───────────────────────────────────────────────────────

export async function registerForEvent(params: Omit<EventRegistration, "id" | "createdAt">): Promise<string> {
  const ref = await addDoc(collection(db, "event_registrations"), {
    ...params,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/** Check if an email is already registered for an event. */
export async function isEmailRegistered(eventId: string, email: string): Promise<boolean> {
  const q = query(
    collection(db, "event_registrations"),
    where("eventId", "==", eventId),
    where("email", "==", email)
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

/** Get all registrations for an event (organiser / admin use). */
export async function getEventRegistrations(eventId: string): Promise<EventRegistration[]> {
  const q = query(
    collection(db, "event_registrations"),
    where("eventId", "==", eventId),
    orderBy("createdAt", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as EventRegistration));
}

/** Get registrations for a specific user. */
export async function getUserRegistrations(userId: string): Promise<EventRegistration[]> {
  const q = query(
    collection(db, "event_registrations"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as EventRegistration));
}

// ── Speakers ──────────────────────────────────────────────────────────────────

export async function createSpeaker(params: Omit<Speaker, "id" | "createdAt">): Promise<string> {
  const ref = await addDoc(collection(db, "speakers"), {
    ...params,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getAllSpeakers(): Promise<Speaker[]> {
  const q = query(collection(db, "speakers"), orderBy("name", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Speaker));
}

export async function getSpeakerBySlug(slug: string): Promise<Speaker | null> {
  const q = query(collection(db, "speakers"), where("slug", "==", slug));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Speaker;
}

export async function getSpeakerById(speakerId: string): Promise<Speaker | null> {
  const snap = await getDoc(doc(db, "speakers", speakerId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Speaker;
}

export async function updateSpeaker(speakerId: string, data: Partial<Speaker>): Promise<void> {
  await updateDoc(doc(db, "speakers", speakerId), { ...data });
}

export async function deleteSpeaker(speakerId: string): Promise<void> {
  await deleteDoc(doc(db, "speakers", speakerId));
}

// ── Event Speakers (join) ─────────────────────────────────────────────────────

/** Attach a speaker to an event. Doc ID = `{eventId}_{speakerId}` for idempotency. */
export async function addEventSpeaker(params: Omit<EventSpeaker, "id">): Promise<void> {
  const docId = `${params.eventId}_${params.speakerId}`;
  await setDoc(doc(db, "event_speakers", docId), params);
}

export async function removeEventSpeaker(eventId: string, speakerId: string): Promise<void> {
  await deleteDoc(doc(db, "event_speakers", `${eventId}_${speakerId}`));
}

export async function getEventSpeakers(eventId: string): Promise<EventSpeaker[]> {
  const q = query(collection(db, "event_speakers"), where("eventId", "==", eventId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as EventSpeaker));
}
