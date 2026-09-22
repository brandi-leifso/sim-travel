// Evio Airlines check-in kiosk — static file host.
// The whole activation runs client-side on one iPad; this server just serves
// the built app (and a health check for Render). No state, no relay.

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 8080;
const DIST = path.join(__dirname, "..", "web", "dist");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json",
  ".txt": "text/plain; charset=utf-8",
};

function sendFile(fp, res) {
  fs.readFile(fp, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
      return;
    }
    const ext = path.extname(fp).toLowerCase();
    const headers = { "Content-Type": MIME[ext] || "application/octet-stream" };
    if (fp.includes(`${path.sep}assets${path.sep}`)) {
      headers["Cache-Control"] = "public, max-age=31536000, immutable";
    } else if (ext === ".html") {
      headers["Cache-Control"] = "no-cache";
    }
    res.writeHead(200, headers);
    res.end(data);
  });
}

const hasDist = fs.existsSync(path.join(DIST, "index.html"));

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);

  if (urlPath === "/healthz") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
    return;
  }

  if (!hasDist) {
    res.writeHead(503, { "Content-Type": "text/plain" });
    res.end("Web app not built yet. Run `npm run build` in web/.");
    return;
  }

  const safe = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, "");
  const candidate = path.join(DIST, safe);
  if (candidate.startsWith(DIST)) {
    try {
      const st = fs.statSync(candidate);
      if (st.isFile()) return sendFile(candidate, res);
    } catch (e) {
      /* fall through to SPA index */
    }
  }
  sendFile(path.join(DIST, "index.html"), res);
});

server.listen(PORT, () => {
  console.log(`[evio-checkin] listening on :${PORT}`);
  if (!hasDist) {
    console.log("[evio-checkin] WARNING: web/dist not found — build the web app first.");
  }
});
