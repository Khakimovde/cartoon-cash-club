import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initRichAds } from "./lib/richads";

// Initialize RichAds after DOM ready
setTimeout(() => initRichAds(), 1000);

createRoot(document.getElementById("root")!).render(<App />);
