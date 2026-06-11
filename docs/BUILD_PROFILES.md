# Build Profiles

Build profiles are a development diagnostic tool. They help expose accidental dependencies and verify that major integrations can be removed while the remaining application still builds and works.

## Profile Matrix

| Profile | CodeMirror | Milkdown | Remote storage | Collaboration |
| --- | :---: | :---: | :---: | :---: |
| `full` | ✓ | ✓ | ✓ | ✓ |
| `local-writer` | ✓ | ✓ | — | — |
| `source-only` | ✓ | — | — | — |
| `visual-only` | — | ✓ | — | — |

Local browser storage, Quarto language support, preview, and the writer shell are baseline features in every profile.

## Commands

```bash
npm run build
npm run build:full
npm run build:local-writer
npm run build:source-only
npm run build:visual-only
npm run build:profiles
```

For development:

```bash
npm run dev:frontend -- --mode source-only
```

## Expected Behavior

- A disabled editor is not imported and its mode toggle is hidden.
- Remote profiles register GitHub, Google Drive, and Nextcloud; local profiles register only the local provider.
- Collaboration-disabled profiles omit the shared-session route, controls, and PartyKit/Yjs binding.
- Requesting an unavailable editor mode falls back to the editor included in the profile.
- An unknown Vite mode fails configuration with a clear error.

## How It Works

`src/config/buildFeatures.ts` defines the profiles and generates the source for `virtual:quartier-features`. Vite emits imports only for enabled capabilities.

Consumers use ordinary optional checks:

```ts
if (loadVisualEditor) {
  // The visual editor exists in this build.
}
```

The absence of a capability is represented by `undefined`. Quartier intentionally does not provide disabled adapters or runtime emulation.

## Diagnostic Checklist

When investigating coupling:

1. Build the narrowest relevant profile.
2. Run its focused tests.
3. Confirm the unavailable feature has no chunk in `dist/assets`.
4. Exercise the remaining workflow.
5. Treat an import or runtime failure as evidence of an incorrect dependency boundary.

Keep the profile list small. Add a profile only when it provides recurring diagnostic value.
