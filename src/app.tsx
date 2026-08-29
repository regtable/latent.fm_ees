import type * as ReactNamespace from "react";
import type { FlowSdk } from "./flow-sdk";

export interface LatentRuntime {
  React: typeof ReactNamespace;
  flowSdk: FlowSdk;
}

/**
 * Factory entry point consumed by the Flow Space shell.
 *
 * React and @flowmusic/sdk are injected by Flow. Keeping them out of this
 * bundle preserves one React hook dispatcher and Flow's authenticated SDK
 * bridge while leaving the application code fully user-owned.
 */
export function createApp(runtime: LatentRuntime) {
  const React = runtime.React;

  return function LatentFmApp() {
    const [sdkReady] = React.useState(() =>
      Object.keys(runtime.flowSdk).some((key) => typeof runtime.flowSdk[key] === "function"),
    );

    return (
      <main style={styles.page}>
        <section style={styles.card}>
          <div style={styles.eyebrow}>LATENT.FM / EXTERNAL EDITION</div>
          <h1 style={styles.heading}>The signal starts here.</h1>
          <p style={styles.copy}>
            This landing page was loaded from the public repository. Replace
            <code style={styles.code}> src/app.tsx </code>
            with the real application, run the build, and push the updated bundle.
          </p>

          <div style={styles.statusRow}>
            <span style={{ ...styles.dot, background: sdkReady ? "#70f7c1" : "#ffcc66" }} />
            Flow Music SDK {sdkReady ? "connected" : "loaded without callable exports"}
          </div>

          <div style={styles.grid}>
            <article style={styles.tile}>
              <strong>Code</strong>
              <span>User-owned TSX from GitHub</span>
            </article>
            <article style={styles.tile}>
              <strong>Runtime</strong>
              <span>Flow-provided React + SDK</span>
            </article>
            <article style={styles.tile}>
              <strong>Auth</strong>
              <span>Flow Space session bridge</span>
            </article>
          </div>
        </section>
      </main>
    );
  };
}

const styles: Record<string, ReactNamespace.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: 24,
    color: "#effff9",
    background:
      "radial-gradient(circle at 18% 18%, rgba(50,255,186,.17), transparent 32%), #07110f",
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
  },
  card: {
    width: "min(760px, 100%)",
    padding: "clamp(28px, 6vw, 64px)",
    border: "1px solid rgba(112,247,193,.22)",
    borderRadius: 28,
    background: "rgba(8, 25, 21, .86)",
    boxShadow: "0 30px 90px rgba(0,0,0,.38)",
  },
  eyebrow: {
    color: "#70f7c1",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: ".18em",
  },
  heading: {
    margin: "18px 0 16px",
    fontSize: "clamp(42px, 8vw, 76px)",
    lineHeight: .95,
    letterSpacing: "-.055em",
  },
  copy: {
    maxWidth: 610,
    color: "#a9c7bc",
    fontSize: 17,
    lineHeight: 1.65,
  },
  code: {
    color: "#d7fff0",
    background: "rgba(112,247,193,.09)",
    borderRadius: 6,
    padding: "2px 6px",
  },
  statusRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginTop: 28,
    color: "#d7fff0",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: 13,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 999,
    boxShadow: "0 0 20px currentColor",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 12,
    marginTop: 34,
  },
  tile: {
    display: "grid",
    gap: 8,
    minHeight: 100,
    padding: 18,
    border: "1px solid rgba(255,255,255,.08)",
    borderRadius: 16,
    color: "#8fb2a5",
    background: "rgba(255,255,255,.025)",
    fontSize: 13,
  },
};
