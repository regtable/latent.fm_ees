import type { FlowSong } from "./flow-sdk";

const API_TRACKS = "/__api/clips/auth-user";

export interface FetchTracksPageOptions {
  limit?: number;
  offset?: number;
  filter?: string;
  signal?: AbortSignal;
}

export interface TracksPage {
  tracks: FlowSong[];
  origin: string;
  limit: number;
  offset: number;
}

/**
 * Calls the library route relative to the document that is running the app.
 * No cookie or token is read by application code; the browser decides whether
 * the caller is eligible to attach its normal Flow credentials.
 */
export async function fetchTracksPage({
  limit = 10,
  offset = 0,
  filter = "",
  signal,
}: FetchTracksPageOptions = {}): Promise<TracksPage> {
  const callerOrigin = window.location.origin;
  if (!callerOrigin || callerOrigin === "null") {
    throw new Error("The Space has an opaque caller origin, so Flow credentials cannot be used here.");
  }

  const safeLimit = Math.min(30, Math.max(1, Math.trunc(limit)));
  const safeOffset = Math.max(0, Math.trunc(offset));
  const url = new URL(API_TRACKS, callerOrigin);
  url.searchParams.set("limit", String(safeLimit));
  url.searchParams.set("offset", String(safeOffset));
  if (filter) url.searchParams.set("filter", filter);

  const response = await fetch(url, {
    credentials: "include",
    method: "GET",
    headers: { Accept: "application/json, */*" },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Library request failed with HTTP ${response.status}.`);
  }

  const payload: unknown = await response.json();
  return {
    tracks: pickList(payload).slice(0, safeLimit),
    origin: callerOrigin,
    limit: safeLimit,
    offset: safeOffset,
  };
}

function pickList(payload: unknown): FlowSong[] {
  if (Array.isArray(payload)) return payload.filter(isRecord) as FlowSong[];
  if (!isRecord(payload)) throw new Error("The library endpoint returned an unsupported JSON shape.");

  for (const key of ["clips", "songs", "items", "results"]) {
    const value = payload[key];
    if (Array.isArray(value)) return value.filter(isRecord) as FlowSong[];
  }

  if (isRecord(payload.data)) return pickList(payload.data);
  if (Array.isArray(payload.data)) return payload.data.filter(isRecord) as FlowSong[];
  throw new Error("The library endpoint returned JSON, but no song array was found.");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
