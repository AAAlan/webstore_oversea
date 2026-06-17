import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const distDir = path.join(root, "demo-dist");
const port = Number(process.env.PORT || 5173);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const relative = decoded === "/" ? "/index.html" : decoded;
  const resolved = path.normalize(path.join(distDir, relative));
  if (!resolved.startsWith(distDir)) return null;
  return resolved;
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath);
  res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
  fs.createReadStream(filePath).pipe(res);
}

if (!fs.existsSync(distDir)) {
  console.error("demo-dist 不存在，请先运行: npm run build:demo");
  process.exit(1);
}

const server = http.createServer((req, res) => {
  let filePath = safePath(req.url || "/");
  if (!filePath) {
    res.writeHead(403).end("Forbidden");
    return;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    const adminIndex = path.join(distDir, "admin", "index.html");
    if ((req.url || "").startsWith("/admin") && fs.existsSync(adminIndex)) {
      sendFile(res, adminIndex);
      return;
    }
    const fallback = path.join(distDir, "index.html");
    if (fs.existsSync(fallback)) {
      sendFile(res, fallback);
      return;
    }
    res.writeHead(404).end("Not Found");
    return;
  }

  sendFile(res, filePath);
});

server.listen(port, () => {
  console.log(`Demo preview: http://localhost:${port}`);
  console.log(`Admin preview: http://localhost:${port}/admin/`);
});
