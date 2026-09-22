import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles/tokens.css";

// No StrictMode: it double-invokes effects in dev, which would open two buses
// and double the reveal timers. The screens manage their own single lifecycle.
createRoot(document.getElementById("root")).render(<App />);
