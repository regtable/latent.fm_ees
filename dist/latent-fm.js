function createApp(runtime) {
  const React = runtime.React;
  const styles = {
    page: { minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, color: "#effff9", background: "radial-gradient(circle at 18% 18%, rgba(50,255,186,.17), transparent 32%), #07110f", fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" },
    card: { width: "min(760px, 100%)", padding: "clamp(28px, 6vw, 64px)", border: "1px solid rgba(112,247,193,.22)", borderRadius: 28, background: "rgba(8, 25, 21, .86)", boxShadow: "0 30px 90px rgba(0,0,0,.38)" },
    eyebrow: { color: "#70f7c1", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12, fontWeight: 800, letterSpacing: ".18em" },
    heading: { margin: "18px 0 16px", fontSize: "clamp(42px, 8vw, 76px)", lineHeight: .95, letterSpacing: "-.055em" },
    copy: { maxWidth: 610, color: "#a9c7bc", fontSize: 17, lineHeight: 1.65 },
    code: { color: "#d7fff0", background: "rgba(112,247,193,.09)", borderRadius: 6, padding: "2px 6px" },
    statusRow: { display: "flex", alignItems: "center", gap: 10, marginTop: 28, color: "#d7fff0", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 13 },
    dot: { width: 9, height: 9, borderRadius: 999, boxShadow: "0 0 20px currentColor" },
    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginTop: 34 },
    tile: { display: "grid", gap: 8, minHeight: 100, padding: 18, border: "1px solid rgba(255,255,255,.08)", borderRadius: 16, color: "#8fb2a5", background: "rgba(255,255,255,.025)", fontSize: 13 }
  };
  return function LatentFmApp() {
    const [sdkReady] = React.useState(() => Object.keys(runtime.flowSdk).some((key) => typeof runtime.flowSdk[key] === "function"));
    const tile = (title, copy) => React.createElement("article", { style: styles.tile }, React.createElement("strong", null, title), React.createElement("span", null, copy));
    return React.createElement("main", { style: styles.page },
      React.createElement("section", { style: styles.card },
        React.createElement("div", { style: styles.eyebrow }, "LATENT.FM / EXTERNAL EDITION"),
        React.createElement("h1", { style: styles.heading }, "The signal starts here."),
        React.createElement("p", { style: styles.copy }, "This landing page was loaded from the public repository. Replace ", React.createElement("code", { style: styles.code }, "src/app.tsx"), " with the real application, run the build, and push the updated bundle."),
        React.createElement("div", { style: styles.statusRow }, React.createElement("span", { style: { ...styles.dot, background: sdkReady ? "#70f7c1" : "#ffcc66" } }), `Flow Music SDK ${sdkReady ? "connected" : "loaded without callable exports"}`),
        React.createElement("div", { style: styles.grid }, tile("Code", "User-owned TSX from GitHub"), tile("Runtime", "Flow-provided React + SDK"), tile("Auth", "Flow Space session bridge"))
      )
    );
  };
}

export { createApp };
