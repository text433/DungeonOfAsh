const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = __dirname;
const port = Number(process.env.PORT || 8080);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".txt": "text/plain; charset=utf-8"
};

const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent((request.url || "/").split("?")[0]);
  const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const filename = path.resolve(root, relative);

  if (!filename.startsWith(`${root}${path.sep}`) && filename !== path.join(root, "index.html")) {
    response.writeHead(403).end("Forbidden");
    return;
  }

  fs.readFile(filename, (error, data) => {
    if (error) {
      response.writeHead(error.code === "ENOENT" ? 404 : 500).end("Not found");
      return;
    }
    response.writeHead(200, {
      "Content-Type": mime[path.extname(filename)] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    response.end(data);
  });
}).listen(port, "127.0.0.1", () => {
  console.log(`Dungeon of Ash: http://127.0.0.1:${port}`);
});

module.exports = server;
