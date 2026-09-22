import Display from "./screens/Display.jsx";
import Admin from "./screens/Admin.jsx";
import Home from "./screens/Home.jsx";

// Tiny path-based router. No history navigation needed — each screen lives at a
// fixed URL the operator bookmarks (/display on the TV, /admin on the phone).
export default function App() {
  const path = window.location.pathname.replace(/\/+$/, "");
  if (path.endsWith("/admin")) return <Admin />;
  if (path.endsWith("/display")) return <Display />;
  return <Home />;
}
