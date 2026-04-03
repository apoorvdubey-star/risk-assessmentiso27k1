import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Apply saved display settings on load
try {
  const saved = localStorage.getItem("app-display-settings");
  if (saved) {
    const s = JSON.parse(saved);
    const root = document.documentElement;
    if (s.fontSize) root.style.fontSize = `${s.fontSize}px`;
    if (s.fontFamily) document.body.style.fontFamily = s.fontFamily;
    if (s.fontColor) root.style.setProperty("--foreground", s.fontColor);
    if (s.panelColors) {
      const p = s.panelColors;
      if (p.sidebar) root.style.setProperty("--sidebar-background", p.sidebar);
      if (p.background) root.style.setProperty("--background", p.background);
      if (p.card) root.style.setProperty("--card", p.card);
      if (p.primary) {
        root.style.setProperty("--primary", p.primary);
        root.style.setProperty("--ring", p.primary);
        root.style.setProperty("--sidebar-primary", p.primary);
      }
    }
  }
} catch {}

createRoot(document.getElementById("root")!).render(<App />);
