# latent.fm_ees

User-owned TSX application code for a Google Flow Music Space.

## Why the small Flow loader remains

A Space is hosted in Flow's authenticated sandbox. The tiny `flow-space-loader.tsx`
file is compiled by Flow so it can import `@flowmusic/sdk`. It then preloads this
repository's browser bundle and injects Flow's own React instance and SDK object.

This means:

- the repository never contains or reads your Flow cookie;
- the short-lived Space auth context stays inside Flow's sandbox;
- the real application can be written and versioned here without using Producer;
- React hooks use Flow's React instance, avoiding duplicate-React hook errors.

## Edit and publish

```bash
npm install
npm run build
git add src dist
git commit -m "Update Latent.fm"
git push
```

The Space loads:

`https://cdn.jsdelivr.net/gh/regtable/latent.fm_ees@main/dist/latent-fm.js`

jsDelivr can briefly cache the `main` branch. The loader adds a query value for
retries; for deterministic releases, change the loader URL to a commit SHA or tag.

## Application contract

`src/app.tsx` exports:

```ts
createApp({ React, flowSdk }): React.ComponentType
```

Use `runtime.React` for hooks and JSX. Use `runtime.flowSdk` for Flow Music calls.
Keep SDK types in `src/flow-sdk.ts` structural and expand them as you use more SDK
methods.

## Space setup

Create a blank frontend-component Space and replace its `main.tsx` with the
contents of `flow-space-loader.tsx`. That one-time Flow-generated shell is the only
code that must remain inside the Space.
