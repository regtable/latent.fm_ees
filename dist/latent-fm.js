const SAMPLE_SONG_ID = "c214086f-70cd-4f49-95c5-d074fc39f18c";

function createApp(runtime) {
  const React = runtime.React;
  const h = React.createElement;
  const inputStyle = { width: "100%", boxSizing: "border-box", border: "1px solid rgba(189,255,206,.24)", borderRadius: 12, background: "rgba(3,14,9,.68)", color: "#ecfff0", padding: "12px 14px", font: "inherit", outline: "none" };
  const buttonStyle = { border: 0, borderRadius: 999, padding: "11px 17px", background: "#baffc9", color: "#08210e", fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" };
  const panelStyle = { border: "1px solid rgba(189,255,206,.18)", borderRadius: 22, padding: 22, background: "rgba(8,27,17,.72)", backdropFilter: "blur(16px)" };

  function safeJson(value) {
    const seen = new WeakSet();
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
      try { ownProperties[key] = error[key]; }
      catch { ownProperties[key] = "[unreadable]"; }
    }
    return { name: error.name, message: error.message, stack: error.stack, cause: error.cause, ownProperties };
  }

  return function LatentFmApp() {
    const [songId, setSongId] = React.useState(SAMPLE_SONG_ID);
    const [song, setSong] = React.useState(null);
    const [lookupState, setLookupState] = React.useState("Loading Raw Ledger…");
    const [lookupError, setLookupError] = React.useState("");
    const [sound, setSound] = React.useState("A nocturnal electronic pulse with warm analogue bass, clipped drums, and a patient cinematic build");
    const [title, setTitle] = React.useState("Latent Signal");
    const [lyrics, setLyrics] = React.useState("");
    const [generationState, setGenerationState] = React.useState("Ready");
    const [generationResult, setGenerationResult] = React.useState(null);
    const [generationError, setGenerationError] = React.useState("");
    const [generationLog, setGenerationLog] = React.useState("No generation request sent in this page load.");

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
      const argument = {
        soundPrompt: sound.trim(),
        ...(title.trim() ? { title: title.trim() } : {}),
        ...(lyrics.trim() ? { lyrics: lyrics.trim() } : {}),
      };
      const startedAt = new Date().toISOString();
      setGenerationLog(`${startedAt}\nCALL generateSong(${JSON.stringify(argument, null, 2)})\nWaiting for Flow…`);
      try {
        const result = await runtime.flowSdk.generateSong(argument);
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

    React.useEffect(() => { void lookupSong(SAMPLE_SONG_ID); }, []);

    const topLine = (title, state, color) => h("div", { style: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" } },
      h("h2", { style: { margin: 0, fontSize: 20 } }, title),
      h("span", { style: { color, fontSize: 13 } }, state)
    );

    const lookupPanel = h("article", { style: panelStyle },
      topLine("getSong test", lookupState, lookupState === "Connected" ? "#8df0a6" : "#f4d58d"),
      h("p", { style: { color: "#83a98d", lineHeight: 1.5 } }, "A known Flow song is fetched automatically through the SDK bridge."),
      h("div", { style: { display: "flex", gap: 9 } },
        h("input", { "aria-label": "Flow song ID", style: inputStyle, value: songId, onChange: (event) => setSongId(event.target.value) }),
        h("button", { style: buttonStyle, onClick: () => void lookupSong() }, "Load")
      ),
      lookupError && h("pre", { style: { whiteSpace: "pre-wrap", color: "#ff9a9a", fontSize: 12 } }, lookupError),
      song && h("div", { style: { marginTop: 22 } },
        h("div", { style: { color: "#8df0a6", fontSize: 12, letterSpacing: ".12em", fontWeight: 800 } }, "NOW DISPLAYING"),
        h("h3", { style: { fontSize: 28, margin: "7px 0 3px" } }, song.title || "Untitled Flow song"),
        h("code", { style: { color: "#6f9578", fontSize: 11 } }, song.id || songId),
        song.audioUrl
          ? h("audio", { controls: true, src: song.audioUrl, style: { width: "100%", marginTop: 18 } })
          : h("p", { style: { color: "#f4d58d" } }, "The SDK returned the song without an audio URL.")
      )
    );

    const generationPanel = h("article", { style: panelStyle },
      topLine("generateSong test", generationState, generationState === "Failed" ? "#ff9a9a" : "#f4d58d"),
      h("p", { style: { color: "#83a98d", lineHeight: 1.5 } }, "Uses Flow's verified native contract: ", h("code", null, "generateSong({ soundPrompt, title?, lyrics? })"), "."),
      h("label", { style: { display: "grid", gap: 7, color: "#83a98d", fontSize: 12 } }, "Title",
        h("input", { "aria-label": "Song title", style: inputStyle, value: title, onChange: (event) => setTitle(event.target.value) })
      ),
      h("label", { style: { display: "grid", gap: 7, marginTop: 12, color: "#83a98d", fontSize: 12 } }, "Sound prompt ", h("span", { style: { color: "#6f9578" } }, "required"),
        h("textarea", { "aria-label": "Sound prompt", rows: 5, style: { ...inputStyle, resize: "vertical", lineHeight: 1.5 }, value: sound, onChange: (event) => setSound(event.target.value) })
      ),
      h("label", { style: { display: "grid", gap: 7, marginTop: 12, color: "#83a98d", fontSize: 12 } }, "Lyrics ", h("span", { style: { color: "#6f9578" } }, "optional; leave blank for instrumental"),
        h("textarea", { "aria-label": "Lyrics", rows: 4, style: { ...inputStyle, resize: "vertical", lineHeight: 1.5 }, value: lyrics, onChange: (event) => setLyrics(event.target.value) })
      ),
      h("div", { style: { display: "flex", alignItems: "center", gap: 12, marginTop: 12, flexWrap: "wrap" } },
        h("button", { style: buttonStyle, disabled: generationState === "Generating…" || !sound.trim(), onClick: () => void generate() }, "Generate song"),
        h("span", { style: { color: "#6f9578", fontSize: 12 } }, "One click sends one request and may use Flow credits.")
      ),
      generationError && h("pre", { style: { whiteSpace: "pre-wrap", color: "#ff9a9a", fontSize: 12 } }, generationError),
      generationResult !== null && h("div", { style: { marginTop: 18 } },
        h("div", { style: { color: "#8df0a6", fontSize: 12, letterSpacing: ".12em", fontWeight: 800 } }, "GENERATED CLIP"),
        h("h3", { style: { fontSize: 24, margin: "7px 0 3px" } }, generationResult.title || "Untitled Flow song"),
        h("code", { style: { color: "#6f9578", fontSize: 11 } }, generationResult.id || generationResult.operationId || "No clip ID returned"),
        generationResult.audioUrl && h("audio", { controls: true, src: generationResult.audioUrl, style: { width: "100%", marginTop: 14 } }),
        h("pre", { style: { maxHeight: 220, overflow: "auto", whiteSpace: "pre-wrap", color: "#baffc9", background: "#020705", padding: 14, borderRadius: 12, fontSize: 11 } }, safeJson(generationResult))
      ),
      h("details", { open: true, style: { marginTop: 18 } },
        h("summary", { style: { cursor: "pointer", color: "#8df0a6", fontSize: 12, fontWeight: 800, letterSpacing: ".08em" } }, "DIAGNOSTIC TRACE"),
        h("pre", { style: { maxHeight: 280, overflow: "auto", whiteSpace: "pre-wrap", overflowWrap: "anywhere", color: "#baffc9", background: "#020705", padding: 14, borderRadius: 12, fontSize: 11 } }, generationLog)
      )
    );

    return h("main", { style: { minHeight: "100vh", background: "radial-gradient(circle at 75% 0%, #123722 0, #07120c 42%, #030705 100%)", color: "#ecfff0", fontFamily: "Inter, ui-sans-serif, system-ui", padding: "clamp(24px, 5vw, 72px)" } },
      h("div", { style: { maxWidth: 980, margin: "0 auto" } },
        h("p", { style: { letterSpacing: ".18em", color: "#8df0a6", fontSize: 12, fontWeight: 800 } }, "LATENT.FM / FLOW SDK LAB"),
        h("h1", { style: { fontSize: "clamp(42px, 8vw, 88px)", lineHeight: .94, letterSpacing: "-.06em", margin: "18px 0 22px", maxWidth: 780 } }, "The signal starts here."),
        h("p", { style: { color: "#acd1b5", fontSize: 18, lineHeight: 1.6, maxWidth: 700, marginBottom: 38 } }, "This interface is loaded from your public repository while Flow supplies the signed-in session, cookies, React runtime, and music SDK."),
        h("section", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 18 } }, lookupPanel, generationPanel)
      )
    );
  };
}

export { createApp };
