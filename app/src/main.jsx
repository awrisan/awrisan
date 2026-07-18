import React from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { App } from "./App.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Register the service worker ourselves. With injectRegister:false in
// vite.config, this is the ONLY registration — and importing the virtual module
// (instead of relying on the plugin's auto-injected script) is what enables the
// workbox-window "reload the tab when the new worker activates" behaviour that
// registerType:"autoUpdate" promises. Without it, a new deploy installs in the
// background but the open tab keeps serving the old precached bundle until a
// manual hard-refresh — the exact staleness this fixes.
//
// The plugin never polls, so an already-open (or reopened) tab would never
// notice a deploy on its own. checkForUpdate() re-fetches /sw.js; if the bytes
// changed, autoUpdate installs + activates + reloads the tab with no prompt.
const FORM_ROUTES = ["/app/buat-room", "/app/gabung"];

registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return;
    const checkForUpdate = () => {
      // Don't yank a reload out from under the create/join forms: they hold
      // their input in ephemeral React state, so a reload there loses what the
      // user is typing. Everywhere else a reload is free — the board is
      // read-only and the local simulation is persisted to localStorage.
      if (FORM_ROUTES.some((route) => window.location.pathname.startsWith(route))) return;
      // update() rejects when offline (the /sw.js fetch fails); that just means
      // "no new version reachable right now", so swallow it.
      registration.update().catch(() => {});
    };
    // Check when the user returns to the app (covers reopening a backgrounded
    // PWA, including iOS foreground where the timer is unreliable) plus a slow
    // heartbeat for a tab left open in the foreground.
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") checkForUpdate();
    });
    setInterval(checkForUpdate, 60 * 60 * 1000);
  },
  onRegisterError(error) {
    console.error("Service worker registration failed", error);
  },
});
