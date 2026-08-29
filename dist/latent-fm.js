// src/flow-library.ts
var API_TRACKS = "/__api/clips/auth-user";
async function fetchTracksPage({
  limit = 10,
  offset = 0,
  filter = "",
  signal
} = {}) {
  const callerOrigin = resolveFlowOrigin();
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
    signal
  });
  if (!response.ok) {
    throw new Error(`Library request failed with HTTP ${response.status}.`);
  }
  const payload = await response.json();
  return {
    tracks: pickList(payload).slice(0, safeLimit),
    origin: callerOrigin,
    limit: safeLimit,
    offset: safeOffset
  };
}
function resolveFlowOrigin() {
  const candidates = [window.location.origin];
  if (document.referrer) {
    try {
      candidates.push(new URL(document.referrer).origin);
    } catch {
    }
  }
  const flowOrigin = candidates.find((candidate) => {
    try {
      const hostname = new URL(candidate).hostname;
      return hostname === "flowmusic.app" || hostname.endsWith(".flowmusic.app");
    } catch {
      return false;
    }
  });
  if (!flowOrigin) {
    throw new Error("The caller did not expose an approved Flow Music origin.");
  }
  return flowOrigin;
}
function pickList(payload) {
  if (Array.isArray(payload)) return payload.filter(isRecord);
  if (!isRecord(payload)) throw new Error("The library endpoint returned an unsupported JSON shape.");
  for (const key of ["clips", "songs", "items", "results"]) {
    const value = payload[key];
    if (Array.isArray(value)) return value.filter(isRecord);
  }
  if (isRecord(payload.data)) return pickList(payload.data);
  if (Array.isArray(payload.data)) return payload.data.filter(isRecord);
  throw new Error("The library endpoint returned JSON, but no song array was found.");
}
function isRecord(value) {
  return typeof value === "object" && value !== null;
}

// src/app.tsx
var SAMPLE_SONG_ID = "c214086f-70cd-4f49-95c5-d074fc39f18c";
var SDK_GROUPS = [
  {
    title: "Songs",
    note: "Lookup is read-only. Generation and editing consume credits.",
    functions: [
      { name: "getSong", signature: "getSong(clipId): Promise<Clip>", example: "const clip = await sdk.getSong(clipId);" },
      { name: "generateSong", signature: "generateSong({ soundPrompt, lyrics?, title?, seed? }): Promise<Clip>", example: 'const clip = await sdk.generateSong({\n  soundPrompt: "warm analogue electronica",\n  title: "Latent Signal"\n});' }
    ]
  },
  {
    title: "Editing & analysis",
    note: "Every result is ready to play when its promise resolves.",
    functions: [
      { name: "extendSong", signature: "extendSong({ clipId, instruction, extendSeconds, ... }): Promise<Clip>", example: 'await sdk.extendSong({ clipId, instruction: "Add a guitar outro", extendSeconds: 30 });' },
      { name: "inpaintSong", signature: "inpaintSong({ clipId, instruction, regions, ... }): Promise<Clip>", example: 'await sdk.inpaintSong({ clipId, instruction: "Jazz piano solo", regions: [{ startTime: 15, endTime: 30 }] });' },
      { name: "coverSong", signature: "coverSong({ clipId, instruction, strength?, ... }): Promise<Clip>", example: 'await sdk.coverSong({ clipId, instruction: "Lo-fi hip hop version", strength: 0.6 });' },
      { name: "splitStems", signature: "splitStems({ clipId }): Promise<{ vocals, drums, bass, other }>", example: "const stems = await sdk.splitStems({ clipId });" }
    ]
  },
  {
    title: "Lyrics & visual media",
    note: "Generation calls consume the corresponding Flow credits.",
    functions: [
      { name: "writeLyrics", signature: "writeLyrics({ prompt }): Promise<{ title, lyrics, soundPrompt }>", example: 'const draft = await sdk.writeLyrics({ prompt: "Indie pop about summer travel" });' },
      { name: "generateImage", signature: "generateImage({ prompt, aspectRatio?, imageUrls? }): Promise<{ imageUrl }>", example: 'const art = await sdk.generateImage({ prompt: "Watercolor ocean", aspectRatio: "16:9" });' },
      { name: "generateVideo", signature: "generateVideo({ prompt, aspectRatio?, duration? }): Promise<{ videoUrl }>", example: 'const video = await sdk.generateVideo({ prompt: "Rainy neon city", duration: 4 });' }
    ]
  },
  {
    title: "Realtime Lyria",
    note: "The hook must run in native Flow main.tsx. Pass its returned controls\u2014not the hook\u2014to remote code.",
    functions: [
      { name: "useLyriaRealtime", signature: "useLyriaRealtime(): UseLyriaRealtimeResult", example: 'const realtime = useLyriaRealtime();\nrealtime.setPrompts([{ text: "ambient pulse", weight: 1 }]);\n// call play() from a user gesture' },
      { name: "NOTE", signature: "NOTE.C \u2026 NOTE.B // chromatic values 0\u201311", example: "realtime.setConfig({ bpm: 110, rootNote: NOTE.C, majorScale: false });" }
    ]
  }
];
function createApp(runtime) {
  const React = runtime.React;
  const sdk = runtime.sdk ?? runtime.flowSdk;
  if (!sdk) throw new Error("Flow SDK capabilities were not injected by the Space shell.");
  const connectedSdk = sdk;
  return function LatentFmApp() {
    const [songId, setSongId] = React.useState(SAMPLE_SONG_ID);
    const [song, setSong] = React.useState(null);
    const [lookupState, setLookupState] = React.useState("Loading Raw Ledger\u2026");
    const [lookupError, setLookupError] = React.useState("");
    const [sound, setSound] = React.useState("A nocturnal electronic pulse with warm analogue bass, clipped drums, and a patient cinematic build");
    const [title, setTitle] = React.useState("Latent Signal");
    const [lyrics, setLyrics] = React.useState("");
    const [generationState, setGenerationState] = React.useState("Ready");
    const [generationResult, setGenerationResult] = React.useState(null);
    const [generationError, setGenerationError] = React.useState("");
    const [generationLog, setGenerationLog] = React.useState("No generation request sent in this page load.");
    const [librarySongs, setLibrarySongs] = React.useState([]);
    const [libraryState, setLibraryState] = React.useState("Not requested");
    const [libraryError, setLibraryError] = React.useState("");
    const [libraryFilter, setLibraryFilter] = React.useState("");
    async function loadLibrary() {
      setLibraryState("Loading\u2026");
      setLibraryError("");
      setLibrarySongs([]);
      try {
        const page = await fetchTracksPage({ limit: 10, offset: 0, filter: libraryFilter.trim() });
        setLibrarySongs(page.tracks);
        setLibraryState(`Loaded ${page.tracks.length} from ${page.origin}`);
      } catch (error) {
        setLibraryState("Failed");
        setLibraryError(error instanceof Error ? error.message : String(error));
      }
    }
    async function lookupSong(id = songId) {
      if (!connectedSdk.getSong) {
        setLookupState("Unavailable");
        setLookupError("getSong is not present in this Flow runtime.");
        return;
      }
      setLookupState("Loading\u2026");
      setLookupError("");
      try {
        const nextSong = await connectedSdk.getSong(id.trim());
        setSong(nextSong);
        setLookupState("Connected");
      } catch (error) {
        setSong(null);
        setLookupState("Failed");
        setLookupError(error instanceof Error ? error.message : String(error));
      }
    }
    async function generate() {
      if (!connectedSdk.generateSong) {
        setGenerationState("Unavailable");
        setGenerationError("generateSong is not present in this Flow runtime.");
        return;
      }
      setGenerationState("Generating\u2026");
      setGenerationError("");
      setGenerationResult(null);
      const argument = {
        soundPrompt: sound.trim(),
        ...title.trim() ? { title: title.trim() } : {},
        ...lyrics.trim() ? { lyrics: lyrics.trim() } : {}
      };
      const startedAt = (/* @__PURE__ */ new Date()).toISOString();
      setGenerationLog(`${startedAt}
CALL generateSong(${JSON.stringify(argument, null, 2)})
Waiting for Flow\u2026`);
      try {
        const result = await connectedSdk.generateSong(argument);
        setGenerationResult(result);
        setGenerationState("Complete");
        setGenerationLog(`${startedAt}
CALL generateSong(${JSON.stringify(argument, null, 2)})

RESOLVED
${safeJson(result)}`);
      } catch (error) {
        setGenerationState("Failed");
        const detail = describeError(error);
        setGenerationError(detail.message);
        setGenerationLog(`${startedAt}
CALL generateSong(${JSON.stringify(argument, null, 2)})

REJECTED
${safeJson(detail)}`);
      }
    }
    React.useEffect(() => {
      void lookupSong(SAMPLE_SONG_ID);
    }, []);
    const inputStyle = {
      width: "100%",
      boxSizing: "border-box",
      border: "1px solid rgba(189,255,206,.24)",
      borderRadius: 12,
      background: "rgba(3,14,9,.68)",
      color: "#ecfff0",
      padding: "12px 14px",
      font: "inherit",
      outline: "none"
    };
    const buttonStyle = {
      border: 0,
      borderRadius: 999,
      padding: "11px 17px",
      background: "#baffc9",
      color: "#08210e",
      fontWeight: 800,
      cursor: "pointer",
      whiteSpace: "nowrap"
    };
    return /* @__PURE__ */ React.createElement("main", { style: { minHeight: "100vh", background: "radial-gradient(circle at 75% 0%, #123722 0, #07120c 42%, #030705 100%)", color: "#ecfff0", fontFamily: "Inter, ui-sans-serif, system-ui", padding: "clamp(24px, 5vw, 72px)" } }, /* @__PURE__ */ React.createElement("div", { style: { maxWidth: 980, margin: "0 auto" } }, /* @__PURE__ */ React.createElement("p", { style: { letterSpacing: ".18em", color: "#8df0a6", fontSize: 12, fontWeight: 800 } }, "LATENT.FM / EXTERNAL EDITION"), /* @__PURE__ */ React.createElement("h1", { style: { fontSize: "clamp(42px, 8vw, 88px)", lineHeight: 0.94, letterSpacing: "-.06em", margin: "18px 0 22px", maxWidth: 840 } }, "Welcome to your Flow-powered app."), /* @__PURE__ */ React.createElement("p", { style: { color: "#acd1b5", fontSize: 18, lineHeight: 1.6, maxWidth: 760, marginBottom: 24 } }, "The UI and product code live in your public Git repository. Flow keeps the signed-in session and imports ", /* @__PURE__ */ React.createElement("code", null, "@flowmusic/sdk"), " inside the native Space shell, then injects only the functions below."), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 42 } }, ["Git-owned TSX", "Flow-authenticated SDK", "No cookies in the repo", "Functional capability calls"].map((label) => /* @__PURE__ */ React.createElement("span", { key: label, style: { border: "1px solid rgba(141,240,166,.24)", borderRadius: 999, padding: "7px 11px", color: "#8df0a6", fontSize: 12 } }, label))), /* @__PURE__ */ React.createElement("section", { style: { marginBottom: 46 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "end", gap: 16, flexWrap: "wrap", marginBottom: 18 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { style: { color: "#8df0a6", fontSize: 12, fontWeight: 800, letterSpacing: ".12em", margin: 0 } }, "VERIFIED SDK SURFACE"), /* @__PURE__ */ React.createElement("h2", { style: { fontSize: 32, margin: "8px 0 0" } }, "These functions exist. Use them this way.")), /* @__PURE__ */ React.createElement("span", { style: { color: "#6f9578", fontSize: 12 } }, "Audited against the Space SDK declarations")), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(285px, 1fr))", gap: 14 } }, SDK_GROUPS.map((group) => /* @__PURE__ */ React.createElement("article", { key: group.title, style: { border: "1px solid rgba(189,255,206,.18)", borderRadius: 20, padding: 20, background: "rgba(8,27,17,.62)" } }, /* @__PURE__ */ React.createElement("h3", { style: { margin: 0, fontSize: 18 } }, group.title), /* @__PURE__ */ React.createElement("p", { style: { color: "#6f9578", fontSize: 12, lineHeight: 1.5 } }, group.note), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gap: 12 } }, group.functions.map((fn) => /* @__PURE__ */ React.createElement("div", { key: fn.name }, /* @__PURE__ */ React.createElement("code", { style: { color: "#baffc9", fontSize: 12 } }, fn.signature), /* @__PURE__ */ React.createElement("pre", { style: { margin: "7px 0 0", whiteSpace: "pre-wrap", color: "#83a98d", background: "#020705", borderRadius: 10, padding: 10, fontSize: 10 } }, fn.example)))))))), /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 16 } }, /* @__PURE__ */ React.createElement("p", { style: { color: "#8df0a6", fontSize: 12, fontWeight: 800, letterSpacing: ".12em", margin: 0 } }, "LIVE PROOF"), /* @__PURE__ */ React.createElement("h2", { style: { fontSize: 32, margin: "8px 0 0" } }, "Lookup and generation")), /* @__PURE__ */ React.createElement("section", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 18 } }, /* @__PURE__ */ React.createElement("article", { style: { border: "1px solid rgba(189,255,206,.18)", borderRadius: 22, padding: 22, background: "rgba(8,27,17,.72)", backdropFilter: "blur(16px)" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" } }, /* @__PURE__ */ React.createElement("h2", { style: { margin: 0, fontSize: 20 } }, "getSong test"), /* @__PURE__ */ React.createElement("span", { style: { color: lookupState === "Connected" ? "#8df0a6" : "#f4d58d", fontSize: 13 } }, lookupState)), /* @__PURE__ */ React.createElement("p", { style: { color: "#83a98d", lineHeight: 1.5 } }, "A known Flow song is fetched automatically through the SDK bridge."), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 9 } }, /* @__PURE__ */ React.createElement("input", { "aria-label": "Flow song ID", style: inputStyle, value: songId, onChange: (event) => setSongId(event.target.value) }), /* @__PURE__ */ React.createElement("button", { style: buttonStyle, onClick: () => void lookupSong() }, "Load")), lookupError && /* @__PURE__ */ React.createElement("pre", { style: { whiteSpace: "pre-wrap", color: "#ff9a9a", fontSize: 12 } }, lookupError), song && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 22 } }, /* @__PURE__ */ React.createElement("div", { style: { color: "#8df0a6", fontSize: 12, letterSpacing: ".12em", fontWeight: 800 } }, "NOW DISPLAYING"), /* @__PURE__ */ React.createElement("h3", { style: { fontSize: 28, margin: "7px 0 3px" } }, song.title || "Untitled Flow song"), /* @__PURE__ */ React.createElement("code", { style: { color: "#6f9578", fontSize: 11 } }, song.id || songId), song.audioUrl ? /* @__PURE__ */ React.createElement("audio", { controls: true, src: song.audioUrl, style: { width: "100%", marginTop: 18 } }) : /* @__PURE__ */ React.createElement("p", { style: { color: "#f4d58d" } }, "The SDK returned the song without an audio URL."))), /* @__PURE__ */ React.createElement("article", { style: { border: "1px solid rgba(189,255,206,.18)", borderRadius: 22, padding: 22, background: "rgba(8,27,17,.72)", backdropFilter: "blur(16px)" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" } }, /* @__PURE__ */ React.createElement("h2", { style: { margin: 0, fontSize: 20 } }, "generateSong test"), /* @__PURE__ */ React.createElement("span", { style: { color: generationState === "Failed" ? "#ff9a9a" : "#f4d58d", fontSize: 13 } }, generationState)), /* @__PURE__ */ React.createElement("p", { style: { color: "#83a98d", lineHeight: 1.5 } }, "Uses Flow's verified native contract: ", /* @__PURE__ */ React.createElement("code", null, "generateSong({ soundPrompt, title?, lyrics? })"), "."), /* @__PURE__ */ React.createElement("label", { style: { display: "grid", gap: 7, color: "#83a98d", fontSize: 12 } }, "Title", /* @__PURE__ */ React.createElement("input", { "aria-label": "Song title", style: inputStyle, value: title, onChange: (event) => setTitle(event.target.value) })), /* @__PURE__ */ React.createElement("label", { style: { display: "grid", gap: 7, marginTop: 12, color: "#83a98d", fontSize: 12 } }, "Sound prompt ", /* @__PURE__ */ React.createElement("span", { style: { color: "#6f9578" } }, "required"), /* @__PURE__ */ React.createElement("textarea", { "aria-label": "Sound prompt", rows: 5, style: { ...inputStyle, resize: "vertical", lineHeight: 1.5 }, value: sound, onChange: (event) => setSound(event.target.value) })), /* @__PURE__ */ React.createElement("label", { style: { display: "grid", gap: 7, marginTop: 12, color: "#83a98d", fontSize: 12 } }, "Lyrics ", /* @__PURE__ */ React.createElement("span", { style: { color: "#6f9578" } }, "optional; leave blank for instrumental"), /* @__PURE__ */ React.createElement("textarea", { "aria-label": "Lyrics", rows: 4, style: { ...inputStyle, resize: "vertical", lineHeight: 1.5 }, value: lyrics, onChange: (event) => setLyrics(event.target.value) })), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12, marginTop: 12, flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("button", { style: buttonStyle, disabled: generationState === "Generating\u2026" || !sound.trim(), onClick: () => void generate() }, "Generate song"), /* @__PURE__ */ React.createElement("span", { style: { color: "#6f9578", fontSize: 12 } }, "One click sends one request and may use Flow credits.")), generationError && /* @__PURE__ */ React.createElement("pre", { style: { whiteSpace: "pre-wrap", color: "#ff9a9a", fontSize: 12 } }, generationError), generationResult !== null && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 18 } }, /* @__PURE__ */ React.createElement("div", { style: { color: "#8df0a6", fontSize: 12, letterSpacing: ".12em", fontWeight: 800 } }, "GENERATED CLIP"), /* @__PURE__ */ React.createElement("h3", { style: { fontSize: 24, margin: "7px 0 3px" } }, generationResult.title || "Untitled Flow song"), /* @__PURE__ */ React.createElement("code", { style: { color: "#6f9578", fontSize: 11 } }, generationResult.id || generationResult.operationId || "No clip ID returned"), generationResult.audioUrl && /* @__PURE__ */ React.createElement("audio", { controls: true, src: generationResult.audioUrl, style: { width: "100%", marginTop: 14 } }), /* @__PURE__ */ React.createElement("pre", { style: { maxHeight: 220, overflow: "auto", whiteSpace: "pre-wrap", color: "#baffc9", background: "#020705", padding: 14, borderRadius: 12, fontSize: 11 } }, safeJson(generationResult))), /* @__PURE__ */ React.createElement("details", { open: true, style: { marginTop: 18 } }, /* @__PURE__ */ React.createElement("summary", { style: { cursor: "pointer", color: "#8df0a6", fontSize: 12, fontWeight: 800, letterSpacing: ".08em" } }, "DIAGNOSTIC TRACE"), /* @__PURE__ */ React.createElement("pre", { style: { maxHeight: 280, overflow: "auto", whiteSpace: "pre-wrap", overflowWrap: "anywhere", color: "#baffc9", background: "#020705", padding: 14, borderRadius: 12, fontSize: 11 } }, generationLog)))), /* @__PURE__ */ React.createElement("section", { style: { marginTop: 18 } }, /* @__PURE__ */ React.createElement("article", { style: { border: "1px solid rgba(189,255,206,.18)", borderRadius: 22, padding: 22, background: "rgba(8,27,17,.72)", backdropFilter: "blur(16px)" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { style: { color: "#8df0a6", fontSize: 12, fontWeight: 800, letterSpacing: ".12em", margin: 0 } }, "FLOW-ORIGIN EXPERIMENT"), /* @__PURE__ */ React.createElement("h2", { style: { margin: "7px 0 0", fontSize: 24 } }, "My first 10 songs")), /* @__PURE__ */ React.createElement("span", { style: { color: libraryState.startsWith("Loaded") ? "#8df0a6" : libraryState === "Failed" ? "#ff9a9a" : "#f4d58d", fontSize: 13 } }, libraryState)), /* @__PURE__ */ React.createElement("p", { style: { color: "#83a98d", lineHeight: 1.5, maxWidth: 760 } }, "Resolves ", /* @__PURE__ */ React.createElement("code", null, "/__api/clips/auth-user"), " against the approved Flow caller or parent origin. The browser handles its own Flow credentials; this code never reads or displays them."), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 9, alignItems: "end", flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("label", { style: { display: "grid", gap: 7, color: "#83a98d", fontSize: 12, flex: "1 1 280px" } }, "Filter ", /* @__PURE__ */ React.createElement("span", { style: { color: "#6f9578" } }, "optional; copied from your downloader when needed"), /* @__PURE__ */ React.createElement("input", { "aria-label": "Library filter", style: inputStyle, value: libraryFilter, onChange: (event) => setLibraryFilter(event.target.value) })), /* @__PURE__ */ React.createElement("button", { style: buttonStyle, disabled: libraryState === "Loading\u2026", onClick: () => void loadLibrary() }, "Load first 10")), libraryError && /* @__PURE__ */ React.createElement("pre", { style: { whiteSpace: "pre-wrap", color: "#ff9a9a", fontSize: 12 } }, libraryError), librarySongs.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 20 } }, librarySongs.map((track, index) => /* @__PURE__ */ React.createElement("div", { key: track.id || index, style: { border: "1px solid rgba(189,255,206,.14)", borderRadius: 14, padding: 14, background: "rgba(2,7,5,.6)" } }, /* @__PURE__ */ React.createElement("div", { style: { color: "#6f9578", fontSize: 11 } }, "#", index + 1), /* @__PURE__ */ React.createElement("h3", { style: { margin: "5px 0 3px", fontSize: 17 } }, track.title || "Untitled Flow song"), track.audioUrl && /* @__PURE__ */ React.createElement("audio", { controls: true, preload: "none", src: track.audioUrl, style: { width: "100%", marginTop: 10 } }))))))));
  };
}
function safeJson(value) {
  const seen = /* @__PURE__ */ new WeakSet();
  try {
    return JSON.stringify(value, (_key, item) => {
      if (typeof item === "object" && item !== null) {
        if (seen.has(item)) return "[Circular]";
        seen.add(item);
      }
      return item;
    }, 2);
  } catch {
    return String(value);
  }
}
function describeError(error) {
  if (!(error instanceof Error)) return { message: String(error), value: safeJson(error) };
  const ownProperties = {};
  for (const key of Object.getOwnPropertyNames(error)) {
    try {
      ownProperties[key] = error[key];
    } catch {
      ownProperties[key] = "[unreadable]";
    }
  }
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    cause: error.cause,
    ownProperties
  };
}
export {
  SAMPLE_SONG_ID,
  createApp
};
//# sourceMappingURL=latent-fm.js.map
