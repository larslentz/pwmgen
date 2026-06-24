import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerSW } from "virtual:pwa-register";

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    window.dispatchEvent(new CustomEvent("pwa-update-available", { detail: { updateSW } }));
  },
  onOfflineReady() {
    console.log("[PWA] App is ready to work offline");
  },
});

createRoot(document.getElementById("root")!).render(<App />);
