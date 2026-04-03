import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Apply saved display settings on load
try {
  const saved = localStorage.getItem("app-display-settings");
  if (saved) {
    const s = JSON.parse(saved);
    if (s.fontSize) document.documentElement.style.fontSize = `${s.fontSize}px`;
    if (s.fontFamily) document.body.style.fontFamily = s.fontFamily;
  }
} catch {}

createRoot(document.getElementById("root")!).render(<App />);
