import React, { useCallback, useEffect, useState } from "react";
import * as flowSdk from "@flowmusic/sdk";

const REMOTE_MODULE =
  "https://cdn.jsdelivr.net/gh/regtable/latent.fm_ees@main/dist/latent-fm.js";

type RemoteModule = {
  createApp(runtime: { React: typeof React; flowSdk: typeof flowSdk }): React.ComponentType;
};

export default function Component() {
  const [RemoteApp, setRemoteApp] = useState<React.ComponentType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    setRemoteApp(null);
    setError(null);
    setAttempt((value) => value + 1);
  }, []);

  useEffect(() => {
    let active = true;
    const preload = document.createElement("link");
    preload.rel = "modulepreload";
    preload.href = REMOTE_MODULE;
    preload.crossOrigin = "anonymous";
    document.head.appendChild(preload);

    (async () => {
      try {
        const remote = (await import(
          /* @vite-ignore */ `${REMOTE_MODULE}?attempt=${attempt}`
        )) as RemoteModule;
        if (typeof remote.createApp !== "function") {
          throw new Error("Remote module does not export createApp().");
        }
        const App = remote.createApp({ React, flowSdk });
        if (active) setRemoteApp(() => App);
      } catch (cause) {
        if (active) {
          setError(cause instanceof Error ? cause.message : "Remote application failed to load.");
        }
      }
    })();

    return () => {
      active = false;
      preload.remove();
    };
  }, [attempt]);

  if (RemoteApp) return <RemoteApp />;

  return (
    <main className="min-h-screen grid place-items-center bg-[#07110f] text-emerald-50 p-6">
      <section className="text-center max-w-md space-y-4">
        <div className="mx-auto h-8 w-8 rounded-full border-2 border-emerald-200/20 border-t-emerald-300 animate-spin" />
        <p className="font-mono text-xs tracking-[0.18em] text-emerald-200">
          {error ? "REMOTE SIGNAL ERROR" : "PRELOADING LATENT.FM"}
        </p>
        {error && (
          <>
            <p className="text-sm text-emerald-100/60">{error}</p>
            <button onClick={retry} className="rounded-full border border-emerald-300/30 px-4 py-2 text-sm">
              Retry
            </button>
          </>
        )}
      </section>
    </main>
  );
}
