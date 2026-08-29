import type * as ReactNamespace from "react";
import type { FlowSdk, FlowSong } from "./flow-sdk";

export interface LatentRuntime {
  React: typeof ReactNamespace;
  flowSdk: FlowSdk;
}

export const SAMPLE_SONG_ID = "c214086f-70cd-4f49-95c5-d074fc39f18c";

export function createApp(runtime: LatentRuntime) {
  const React = runtime.React;

  return function LatentFmApp() {
    const [songId, setSongId] = React.useState(SAMPLE_SONG_ID);
    const [song, setSong] = React.useState<FlowSong | null>(null);
    const [lookupState, setLookupState] = React.useState("Loading Raw Ledger…");
    const [lookupError, setLookupError] = React.useState("");
    const [sound, setSound] = React.useState("A nocturnal electronic pulse with warm analogue bass, clipped drums, and a patient cinematic build");
    const [generationState, setGenerationState] = React.useState("Ready");
    const [generationResult, setGenerationResult] = React.useState<unknown>(null);
    const [generationError, setGenerationError] = React.useState("");

    async function lookupSong(id = songId) {
      if (!runtime.flowSdk.getSong) {
        setLookupState("Unavailable");
        setLookupError("getSong is not present in this Flow runtime.");
        return;
      }
      setLookupState("Loading…");
      setLookupError("");
      try {
        const nextSong = await runtime.flowSdk.getSong(id.trim());
        setSong(nextSong);
        setLookupState("Connected");
      } catch (error) {
        setSong(null);
        setLookupState("Failed");
        setLookupError(error instanceof Error ? error.message : String(error));
      }
    }

    async function generate() {
      if (!runtime.flowSdk.generateSong) {
        setGenerationState("Unavailable");
        setGenerationError("generateSong is not present in this Flow runtime.");
        return;
      }
      setGenerationState("Generating…");
      setGenerationError("");
      setGenerationResult(null);
      try {
        const result = await runtime.flowSdk.generateSong({ sound: sound.trim() });
        setGenerationResult(result);
        setGenerationState("Complete");
      } catch (error) {
        setGenerationState("Failed");
        setGenerationError(error instanceof Error ? error.message : String(error));
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
          <p style={{ letterSpacing: ".18em", color: "#8df0a6", fontSize: 12, fontWeight: 800 }}>LATENT.FM / FLOW SDK LAB</p>
          <h1 style={{ fontSize: "clamp(42px, 8vw, 88px)", lineHeight: .94, letterSpacing: "-.06em", margin: "18px 0 22px", maxWidth: 780 }}>The signal starts here.</h1>
          <p style={{ color: "#acd1b5", fontSize: 18, lineHeight: 1.6, maxWidth: 700, marginBottom: 38 }}>This interface is loaded from your public repository while Flow supplies the signed-in session, cookies, React runtime, and music SDK.</p>

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
              <p style={{ color: "#83a98d", lineHeight: 1.5 }}>Edit the sound prompt, then invoke Flow's native generation function.</p>
              <textarea aria-label="Sound prompt" rows={6} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} value={sound} onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setSound(event.target.value)} />
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
                <button style={buttonStyle} disabled={generationState === "Generating…" || !sound.trim()} onClick={() => void generate()}>Generate song</button>
                <span style={{ color: "#6f9578", fontSize: 12 }}>This may use Flow generation credits.</span>
              </div>
              {generationError && <pre style={{ whiteSpace: "pre-wrap", color: "#ff9a9a", fontSize: 12 }}>{generationError}</pre>}
              {generationResult !== null && <pre style={{ marginTop: 18, maxHeight: 220, overflow: "auto", whiteSpace: "pre-wrap", color: "#baffc9", background: "#020705", padding: 14, borderRadius: 12, fontSize: 11 }}>{JSON.stringify(generationResult, null, 2)}</pre>}
            </article>
          </section>
        </div>
      </main>
    );
  };
}
