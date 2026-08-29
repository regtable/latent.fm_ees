import React, { useCallback, useEffect, useMemo, useState } from "react";
import * as flowSdk from "@flowmusic/sdk";

const REMOTE_SOURCE =
  "https://raw.githubusercontent.com/regtable/latent.fm_ees/main/dist/latent-fm.js";

type RemoteModule = {
  createApp(runtime: {
    React: typeof React;
    flowSdk: {
      getSong: typeof flowSdk.getSong;
      generateSong: typeof flowSdk.generateSong;
    };
  }): React.ComponentType;
};

export default function Component() {
  const [RemoteApp, setRemoteApp] = useState<React.ComponentType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // All authenticated operations remain native to the Flow Space. The remote
  // application receives only this explicit capability list—never a cookie,
  // token, or unrestricted Flow SDK object.
  const sdkBridge = useMemo(
    () => ({
      getSong: (...args: Parameters<typeof flowSdk.getSong>) =>
        flowSdk.getSong(...args),
      generateSong: (...args: Parameters<typeof flowSdk.generateSong>) =>
        flowSdk.generateSong(...args),
    }),
    [],
  );

  const retry = useCallback(() => {
    setRemoteApp(null);
    setError(null);
    setAttempt((value) => value + 1);
  }, []);

  useEffect(() => {
    let active = true;
    let blobUrl: string | null = null;

    (async () => {
      try {
        const response = await fetch(`${REMOTE_SOURCE}?attempt=${attempt}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(`GitHub returned ${response.status} while loading the app.`);
        }

        // GitHub Raw is intentionally served as plain text. Converting the
        // fetched source to a JavaScript Blob gives import() the correct MIME
        // type without introducing another CDN or exposing Flow credentials.
        const source = await response.text();
        blobUrl = URL.createObjectURL(
          new Blob([source], { type: "text/javascript" }),
        );
        const remote = (await import(/* @vite-ignore */ blobUrl)) as RemoteModule;
        if (typeof remote.createApp !== "function") {
          throw new Error("Remote module does not export createApp().");
        }
        const App = remote.createApp({ React, flowSdk: sdkBridge });
        if (active) setRemoteApp(() => App);
      } catch (cause) {
        if (active) {
          setError(cause instanceof Error ? cause.message : "Remote application failed to load.");
        }
      }
    })();

    return () => {
      active = false;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [attempt, sdkBridge]);

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
