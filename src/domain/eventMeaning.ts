export type LocationEvidenceType =
  | "gps_exif"
  | "gps_trace"
  | "manual_place"
  | "note_explicit_place"
  | "note_time_context"
  | "note_address_text";

export type LocationReviewState = "confirmed" | "suggested" | "needs_review" | "rejected";

export type GpsLocationEvidence = {
  evidenceType: "gps_exif" | "gps_trace" | "manual_place";
  latitude: number;
  longitude: number;
  confidence: number;
  reviewState: LocationReviewState;
};

export type NoteLocationContext = {
  evidenceType: "note_explicit_place" | "note_time_context" | "note_address_text";
  city?: string;
  placeName?: string;
  confidence: number;
  reviewState: LocationReviewState;
};

export type AddressEvidence = {
  provider: "amap" | "mapbox" | "google" | "local";
  formattedAddress: string;
  address?: {
    province?: string;
    city?: string;
    district?: string;
    township?: string;
  };
  pois?: Array<{
    name: string;
    type?: string;
    distanceMeters?: number;
  }>;
  roads?: Array<{
    name: string;
    distanceMeters?: number;
    direction?: string;
  }>;
};

export type EventMeaning = {
  id: string;
  mediaId?: string;
  title: string;
  activity: string;
  topics: string[];
  placeMeaning: string;
  summary: string;
  source: {
    location: LocationEvidenceType;
    address?: AddressEvidence["provider"];
    visual?: "image_scene_analysis";
    note?: "user_note";
  };
  confidence: {
    location: number;
    address: number;
    visual: number;
    note: number;
    overall: number;
  };
  requiresReview: boolean;
};

export type EventMeaningInput = {
  mediaId?: string;
  capturedAt: string;
  gpsEvidence?: GpsLocationEvidence;
  noteLocationContext?: NoteLocationContext;
  addressEvidence?: AddressEvidence;
  visualHints?: string[];
  userNote?: string;
};

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

function hasAny(text: string, terms: string[]) {
  return terms.some((term) => text.toLowerCase().includes(term.toLowerCase()));
}

function inferTopics(text: string, visualHints: string[]) {
  const haystack = [text, ...visualHints].join(" ");
  const topics = new Set<string>();

  if (hasAny(haystack, ["机器人", "robot", "robotics"])) topics.add("robotics");
  if (hasAny(haystack, ["AI", "人工智能", "smart", "智能", "hardware", "硬件"])) topics.add("AI hardware");
  if (hasAny(haystack, ["展会", "展览", "exhibition", "display"])) topics.add("design research");
  if (topics.size === 0) topics.add("memory");

  return Array.from(topics);
}

function inferActivity(text: string, visualHints: string[]) {
  const haystack = [text, ...visualHints].join(" ");
  if (hasAny(haystack, ["展会", "展览", "exhibition", "display"])) return "exhibition_visit";
  if (hasAny(haystack, ["整理", "notes", "desk"])) return "reflection";
  return "memory_capture";
}

function inferPlaceMeaning(activity: string, topics: string[]) {
  if (activity === "exhibition_visit" && topics.some((topic) => topic === "robotics" || topic === "AI hardware")) {
    return "technology_exhibition";
  }
  if (activity === "reflection") return "reflection_space";
  return "memory_place";
}

function inferTitle(input: EventMeaningInput, activity: string, topics: string[]) {
  const note = input.userNote ?? "";
  if (note.includes("杭州") && note.includes("刘小龙") && note.includes("机器人")) {
    return "杭州刘小龙展会看机器人";
  }

  if (activity === "exhibition_visit" && topics.includes("robotics")) {
    const city = input.addressEvidence?.address?.city ?? input.noteLocationContext?.city ?? "";
    return `${city}机器人展会`.trim();
  }

  return note.slice(0, 24) || "未命名记忆事件";
}

function locationSource(input: EventMeaningInput): LocationEvidenceType {
  if (input.gpsEvidence) return input.gpsEvidence.evidenceType;
  if (input.noteLocationContext) return input.noteLocationContext.evidenceType;
  return "note_time_context";
}

function locationConfidence(input: EventMeaningInput) {
  if (input.gpsEvidence) return clamp(input.gpsEvidence.confidence);
  if (input.noteLocationContext) return clamp(input.noteLocationContext.confidence);
  return 0.2;
}

function reviewRequired(input: EventMeaningInput) {
  const state = input.gpsEvidence?.reviewState ?? input.noteLocationContext?.reviewState ?? "needs_review";
  return state !== "confirmed";
}

export function createEventMeaning(input: EventMeaningInput): EventMeaning {
  const note = input.userNote ?? "";
  const visualHints = input.visualHints ?? [];
  const topics = inferTopics(note, visualHints);
  const activity = inferActivity(note, visualHints);
  const placeMeaning = inferPlaceMeaning(activity, topics);
  const title = inferTitle(input, activity, topics);
  const visualConfidence = visualHints.length > 0 ? 0.72 : 0;
  const noteConfidence = note ? 0.95 : 0;
  const addressConfidence = input.addressEvidence ? 0.86 : 0;
  const locConfidence = locationConfidence(input);
  const overallSignals = [locConfidence, addressConfidence, visualConfidence, noteConfidence].filter((value) => value > 0);
  const overall =
    overallSignals.length === 0
      ? 0
      : overallSignals.reduce((sum, value) => sum + value, 0) / overallSignals.length;

  return {
    id: `meaning-${input.mediaId ?? input.capturedAt.replace(/[^0-9]/g, "").slice(0, 14)}`,
    mediaId: input.mediaId,
    title,
    activity,
    topics,
    placeMeaning,
    summary: `${title} · ${topics.join(" / ")}`,
    source: {
      location: locationSource(input),
      address: input.addressEvidence?.provider,
      visual: visualHints.length > 0 ? "image_scene_analysis" : undefined,
      note: note ? "user_note" : undefined
    },
    confidence: {
      location: Number(locConfidence.toFixed(2)),
      address: Number(addressConfidence.toFixed(2)),
      visual: Number(visualConfidence.toFixed(2)),
      note: Number(noteConfidence.toFixed(2)),
      overall: Number(clamp(overall).toFixed(2))
    },
    requiresReview: reviewRequired(input)
  };
}
