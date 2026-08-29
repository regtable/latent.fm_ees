import type * as ReactNamespace from "react";
import type { FlowSdk, FlowSong, GenerateSongInput } from "./flow-sdk";

export interface LatentRuntime {
  React: typeof ReactNamespace;
  sdk?: FlowSdk;
  flowSdk?: FlowSdk;
}

export const SAMPLE_SONG_ID = "c214086f-70cd-4f49-95c5-d074fc39f18c";

const SDK_GROUPS = [
  {
    title: "Songs",
    note: "Lookup is read-only. Generation and editing consume credits.",
    functions: [
      { name: "getSong", signature: "getSong(clipId): Promise<Clip>", example: "const clip = await sdk.getSong(clipId);" },
      { name: "generateSong", signature: "generateSong({ soundPrompt, lyrics?, title?, seed? }): Promise<Clip>", example: "const clip = await sdk.generateSong({\n  soundPrompt: \"warm analogue electronica\",\n  title: \"Latent Signal\"\n});" },
    ],
  },
  {
    title: "Editing & analysis",
    note: "Every result is ready to play when its promise resolves.",
    functions: [
      { name: "extendSong", signature: "extendSong({ clipId, instruction, extendSeconds, ... }): Promise<Clip>", example: "await sdk.extendSong({ clipId, instruction: \"Add a guitar outro\", extendSeconds: 30 });" },
      { name: "inpaintSong", signature: "inpaintSong({ clipId, instruction, regions, ... }): Promise<Clip>", example: "await sdk.inpaintSong({ clipId, instruction: \"Jazz piano solo\", regions: [{ startTime: 15, endTime: 30 }] });" },
      { name: "coverSong", signature: "coverSong({ clipId, instruction, strength?, ... }): Promise<Clip>", example: "await sdk.coverSong({ clipId, instruction: \"Lo-fi hip hop version\", strength: 0.6 });" },
      { name: "splitStems", signature: "splitStems({ clipId }): Promise<{ vocals, drums, bass, other }>", example: "const stems = await sdk.splitStems({ clipId });" },
    ],
  },
  {
    title: "Lyrics & visual media",
    note: "Generation calls consume the corresponding Flow credits.",
    functions: [
      { name: "writeLyrics", signature: "writeLyrics({ prompt }): Promise<{ title, lyrics, soundPrompt }>", example: "const draft = await sdk.writeLyrics({ prompt: \"Indie pop about summer travel\" });" },
      { name: "generateImage", signature: "generateImage({ prompt, aspectRatio?, imageUrls? }): Promise<{ imageUrl }>", example: "const art = await sdk.generateImage({ prompt: \"Watercolor ocean\", aspectRatio: \"16:9\" });" },
      { name: "generateVideo", signature: "generateVideo({ prompt, aspectRatio?, duration? }): Promise<{ videoUrl }>", example: "const video = await sdk.generateVideo({ prompt: \"Rainy neon city\", duration: 4 });" },
    ],
  },
  {
    title: "Realtime Lyria",
    note: "The hook must run in native Flow main.tsx. Pass its returned controls—not the hook—to remote code.",
    functions: [
      { name: "useLyriaRealtime", signature: "useLyriaRealtime(): UseLyriaRealtimeResult", example: "const realtime = useLyriaRealtime();\nrealtime.setPrompts([{ text: \"ambient pulse\", weight: 1 }]);\n// call play() from a user gesture" },
      { name: "NOTE", signature: "NOTE.C … NOTE.B // chromatic values 0–11", example: "realtime.setConfig({ bpm: 110, rootNote: NOTE.C, majorScale: false });" },
    ],
  },
] as const;

export function createApp(runtime: LatentRuntime) {
  const React = runtime.React;
  const sdk = runtime.sdk ?? runtime.flowSdk;
  if (!sdk) throw new Error("Flow SDK capabilities were not injected by the Space shell.");

  return function LatentFmApp() {
    const [songId, setSongId] = React.useState(SAMPLE_SONG_ID);
    const [song, setSong] = React.useState<FlowSong | null>(null);
    const [lookupState, setLookupState] = React.useState("Loading Raw Ledger…");
    const [lookupError, setLookupError] = React.useState("");
    const [sound, setSound] = React.useState("A nocturnal electronic pulse with warm analogue bass, clipped drums, and a patient cinematic build");
    const [title, setTitle] = React.useState("Latent Signal");
    const [lyrics, setLyrics] = React.useState("");
    const [generationState, setGenerationState] = React.useState("Ready");
    const [generationResult, setGenerationResult] = React.useState<FlowSong | null>(null);
    const [generationError, setGenerationError] = React.useState("");
    const [generationLog, setGenerationLog] = React.useState("No generation request sent in this page load.");

    async function lookupSong(id = songId) {
      if (!sdk.getSong) {
        setLookupState("Unavailable");
        setLookupError("getSong is not present in this Flow runtime.");
        return;
      }
      setLookupState("Loading…");
      setLookupError("");
      try {
        const nextSong = await sdk.getSong(id.trim());
        setSong(nextSong);
        setLookupState("Connected");
      } catch (error) {
        setSong(null);
        setLookupState("Failed");
        setLookupError(error instanceof Error ? error.message : String(error));
      }
    }

    async function generate() {
      if (!sdk.generateSong) {
        setGenerationState("Unavailable");
        setGenerationError("generateSong is not present in this Flow runtime.");
        return;
      }
      setGenerationState("Generating…");
      setGenerationError("");
      setGenerationResult(null);
      const argument: GenerateSongInput = {
        soundPrompt: sound.trim(),
        ...(title.trim() ? { title: title.trim() } : {}),
        ...(lyrics.trim() ? { lyrics: lyrics.trim() } : {}),
      };
      const startedAt = new Date().toISOString();
      setGenerationLog(`${startedAt}\nCALL generateSong(${JSON.stringify(argument, null, 2)})\nWaiting for Flow…`);
      try {
        const result = await sdk.generateSong(argument);
        setGenerationResult(result);
        setGenerationState("Complete");
        setGenerationLog(`${startedAt}\nCALL generateSong(${JSON.stringify(argument, null, 2)})\n\nRESOLVED\n${safeJson(result)}`);
      } catch (error) {
        setGenerationState("Failed");
        const detail = describeError(error);
        setGenerationError(detail.message);
        setGenerationLog(`${startedAt}\nCALL generateSong(${JSON.stringify(argument, null, 2)})\n\nREJECTED\n${safeJson(detail)}`);
      }
    }

    React.useEffect(() => {
      void lookupSong(SAMPLE_SONG_ID);
    }, []);

    const inputStyle: ReactNamespace.CSSProperties = {
      width: "100%",
      boxSizing: "border-box",
      border: "1px solid rgba(189,255,206,.24)",
      borderRadius: 12,
      background: "rgba(3,14,9,.68)",
      color: "#ecfff0",
      padding: "12px 14px",
      font: "inherit",
      outline: "none",
    };
    const buttonStyle: ReactNamespace.CSSProperties = {
      border: 0,
      borderRadius: 999,
      padding: "11px 17px",
      background: "#baffc9",
      color: "#08210e",
      fontWeight: 800,
      cursor: "pointer",
      whiteSpace: "nowrap",
    };

    return (
      <main style={{ minHeight: "100vh", background: "radial-gradient(circle at 75% 0%, #123722 0, #07120c 42%, #030705 100%)", color: "#ecfff0", fontFamily: "Inter, ui-sans-serif, system-ui", padding: "clamp(24px, 5vw, 72px)" }}>
        <div style={{ maxWidth: 980, margin: "0 auto" }}>
          <p style={{ letterSpacing: ".18em", color: "#8df0a6", fontSize: 12, fontWeight: 800 }}>LATENT.FM / EXTERNAL EDITION</p>
          <h1 style={{ fontSize: "clamp(42px, 8vw, 88px)", lineHeight: .94, letterSpacing: "-.06em", margin: "18px 0 22px", maxWidth: 840 }}>Welcome to your Flow-powered app.</h1>
          <p style={{ color: "#acd1b5", fontSize: 18, lineHeight: 1.6, maxWidth: 760, marginBottom: 24 }}>The UI and product code live in your public Git repository. Flow keeps the signed-in session and imports <code>@flowmusic/sdk</code> inside the native Space shell, then injects only the functions below.</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 42 }}>
            {["Git-owned TSX", "Flow-authenticated SDK", "No cookies in the repo", "Functional capability calls"].map((label) => <span key={label} style={{ border: "1px solid rgba(141,240,166,.24)", borderRadius: 999, padding: "7px 11px", color: "#8df0a6", fontSize: 12 }}>{label}</span>)}
          </div>

          <section style={{ marginBottom: 46 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 16, flexWrap: "wrap", marginBottom: 18 }}>
              <div><p style={{ color: "#8df0a6", fontSize: 12, fontWeight: 800, letterSpacing: ".12em", margin: 0 }}>VERIFIED SDK SURFACE</p><h2 style={{ fontSize: 32, margin: "8px 0 0" }}>These functions exist. Use them this way.</h2></div>
              <span style={{ color: "#6f9578", fontSize: 12 }}>Audited against the Space SDK declarations</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(285px, 1fr))", gap: 14 }}>
              {SDK_GROUPS.map((group) => (
                <article key={group.title} style={{ border: "1px solid rgba(189,255,206,.18)", borderRadius: 20, padding: 20, background: "rgba(8,27,17,.62)" }}>
                  <h3 style={{ margin: 0, fontSize: 18 }}>{group.title}</h3>
                  <p style={{ color: "#6f9578", fontSize: 12, lineHeight: 1.5 }}>{group.note}</p>
                  <div style={{ display: "grid", gap: 12 }}>
                    {group.functions.map((fn) => <div key={fn.name}><code style={{ color: "#baffc9", fontSize: 12 }}>{fn.signature}</code><pre style={{ margin: "7px 0 0", whiteSpace: "pre-wrap", color: "#83a98d", background: "#020705", borderRadius: 10, padding: 10, fontSize: 10 }}>{fn.example}</pre></div>)}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <div style={{ marginBottom: 16 }}><p style={{ color: "#8df0a6", fontSize: 12, fontWeight: 800, letterSpacing: ".12em", margin: 0 }}>LIVE PROOF</p><h2 style={{ fontSize: 32, margin: "8px 0 0" }}>Lookup and generation</h2></div>

          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 18 }}>
            <article style={{ border: "1px solid rgba(189,255,206,.18)", borderRadius: 22, padding: 22, background: "rgba(8,27,17,.72)", backdropFilter: "blur(16px)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <h2 style={{ margin: 0, fontSize: 20 }}>getSong test</h2>
                <span style={{ color: lookupState === "Connected" ? "#8df0a6" : "#f4d58d", fontSize: 13 }}>{lookupState}</span>
              </div>
              <p style={{ color: "#83a98d", lineHeight: 1.5 }}>A known Flow song is fetched automatically through the SDK bridge.</p>
              <div style={{ display: "flex", gap: 9 }}>
                <input aria-label="Flow song ID" style={inputStyle} value={songId} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSongId(event.target.value)} />
                <button style={buttonStyle} onClick={() => void lookupSong()}>Load</button>
              </div>
              {lookupError && <pre style={{ whiteSpace: "pre-wrap", color: "#ff9a9a", fontSize: 12 }}>{lookupError}</pre>}
              {song && (
                <div style={{ marginTop: 22 }}>
                  <div style={{ color: "#8df0a6", fontSize: 12, letterSpacing: ".12em", fontWeight: 800 }}>NOW DISPLAYING</div>
                  <h3 style={{ fontSize: 28, margin: "7px 0 3px" }}>{song.title || "Untitled Flow song"}</h3>
                  <code style={{ color: "#6f9578", fontSize: 11 }}>{song.id || songId}</code>
                  {song.audioUrl ? <audio controls src={song.audioUrl} style={{ width: "100%", marginTop: 18 }} /> : <p style={{ color: "#f4d58d" }}>The SDK returned the song without an audio URL.</p>}
                </div>
              )}
            </article>

            <article style={{ border: "1px solid rgba(189,255,206,.18)", borderRadius: 22, padding: 22, background: "rgba(8,27,17,.72)", backdropFilter: "blur(16px)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <h2 style={{ margin: 0, fontSize: 20 }}>generateSong test</h2>
                <span style={{ color: generationState === "Failed" ? "#ff9a9a" : "#f4d58d", fontSize: 13 }}>{generationState}</span>
              </div>
              <p style={{ color: "#83a98d", lineHeight: 1.5 }}>Uses Flow's verified native contract: <code>{"generateSong({ soundPrompt, title?, lyrics? })"}</code>.</p>
              <label style={{ display: "grid", gap: 7, color: "#83a98d", fontSize: 12 }}>
                Title
                <input aria-label="Song title" style={inputStyle} value={title} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setTitle(event.target.value)} />
              </label>
              <label style={{ display: "grid", gap: 7, marginTop: 12, color: "#83a98d", fontSize: 12 }}>
                Sound prompt <span style={{ color: "#6f9578" }}>required</span>
                <textarea aria-label="Sound prompt" rows={5} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} value={sound} onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setSound(event.target.value)} />
              </label>
              <label style={{ display: "grid", gap: 7, marginTop: 12, color: "#83a98d", fontSize: 12 }}>
                Lyrics <span style={{ color: "#6f9578" }}>optional; leave blank for instrumental</span>
                <textarea aria-label="Lyrics" rows={4} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} value={lyrics} onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setLyrics(event.target.value)} />
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
                <button style={buttonStyle} disabled={generationState === "Generating…" || !sound.trim()} onClick={() => void generate()}>Generate song</button>
                <span style={{ color: "#6f9578", fontSize: 12 }}>One click sends one request and may use Flow credits.</span>
              </div>
              {generationError && <pre style={{ whiteSpace: "pre-wrap", color: "#ff9a9a", fontSize: 12 }}>{generationError}</pre>}
              {generationResult !== null && (
                <div style={{ marginTop: 18 }}>
                  <div style={{ color: "#8df0a6", fontSize: 12, letterSpacing: ".12em", fontWeight: 800 }}>GENERATED CLIP</div>
                  <h3 style={{ fontSize: 24, margin: "7px 0 3px" }}>{generationResult.title || "Untitled Flow song"}</h3>
                  <code style={{ color: "#6f9578", fontSize: 11 }}>{generationResult.id || generationResult.operationId || "No clip ID returned"}</code>
                  {generationResult.audioUrl && <audio controls src={generationResult.audioUrl} style={{ width: "100%", marginTop: 14 }} />}
                  <pre style={{ maxHeight: 220, overflow: "auto", whiteSpace: "pre-wrap", color: "#baffc9", background: "#020705", padding: 14, borderRadius: 12, fontSize: 11 }}>{safeJson(generationResult)}</pre>
                </div>
              )}
              <details open style={{ marginTop: 18 }}>
                <summary style={{ cursor: "pointer", color: "#8df0a6", fontSize: 12, fontWeight: 800, letterSpacing: ".08em" }}>DIAGNOSTIC TRACE</summary>
                <pre style={{ maxHeight: 280, overflow: "auto", whiteSpace: "pre-wrap", overflowWrap: "anywhere", color: "#baffc9", background: "#020705", padding: 14, borderRadius: 12, fontSize: 11 }}>{generationLog}</pre>
              </details>
            </article>
          </section>
        </div>
      </main>
    );
  };
}

function safeJson(value: unknown) {
  const seen = new WeakSet<object>();
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

function describeError(error: unknown) {
  if (!(error instanceof Error)) return { message: String(error), value: safeJson(error) };
  const ownProperties: Record<string, unknown> = {};
  for (const key of Object.getOwnPropertyNames(error)) {
    try { ownProperties[key] = (error as unknown as Record<string, unknown>)[key]; }
    catch { ownProperties[key] = "[unreadable]"; }
  }
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    cause: error.cause,
    ownProperties,
  };
}
