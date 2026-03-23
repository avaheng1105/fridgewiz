"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("[FridgeWiz] SW registered:", reg.scope))
        .catch((err) => console.warn("[FridgeWiz] SW registration failed:", err));
    }
  }, []);

  return null;
}
