# Environment & Runtime Recovery Guide

## 1. Node.js / npm setup (Windows)

### Required
- Node.js LTS (recommended: 18.x or 20.x)
- npm bundled with Node.js

### Verify installation
```powershell
node -v
npm -v
```

### If `node` is not recognized
Add Node to PATH manually:
```powershell
$env:Path += ";C:\Program Files\nodejs"
```

Make it permanent:
```powershell
[Environment]::SetEnvironmentVariable(
  "Path",
  [Environment]::GetEnvironmentVariable("Path", "User") + ";C:\Program Files\nodejs",
  "User"
)
```

If you use nvm-windows:
```powershell
nvm install 18.20.0
nvm use 18.20.0
```

## 2. Next.js recovery checklist

If dev server shows 500 / chunk loading errors:
```powershell
cd frontend
Remove-Item -Recurse -Force .\.next -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .\node_modules -ErrorAction SilentlyContinue
npm cache clean --force
npm install --no-audit --legacy-peer-deps
npm run dev
```

## 3. Expo Go recovery checklist

```powershell
cd expo-wrapper
Remove-Item -Recurse -Force .\node_modules -ErrorAction SilentlyContinue
npm cache clean --force
npm install --no-audit --legacy-peer-deps
npx expo install react-native-webview expo-speech --yes
npx expo start --tunnel
```

## 4. SSR-safe MediaPipe pattern

Avoid importing browser-only libraries like `@mediapipe/tasks-vision` at the top of a Next.js page/component.
Use a client-only dynamic loader instead:
```ts
export const isBrowser = typeof window !== 'undefined';

export async function loadMediaPipe() {
  if (!isBrowser) return null;
  const mp = await import('@mediapipe/tasks-vision');
  const vision = await mp.FilesetResolver.forVisionTasks('/wasm');
  return { mp, vision };
}
```

Call it inside `useEffect` or a client-only event handler.

## 5. Required local assets for MediaPipe

Ensure these exist before running the app:
- `frontend/public/wasm/vision_wasm_internal.js`
- `frontend/public/wasm/*.wasm`
- `frontend/public/models/pose_landmarker_lite.task`

## 6. Quick prevention rules for future projects
- Always install Node via a stable LTS path.
- Always verify `node -v` and `npm -v` before running any app.
- Avoid SSR execution of browser-only modules.
- Keep local assets in `public/` for web apps.
- When a project breaks after install or package changes, clear `.next`, `node_modules`, and npm cache before retrying.
