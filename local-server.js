const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const {
  createDemoReport,
  getXApiMode,
  hasXApiCredentials,
  scanWithXApi,
} = require("./services/xApiService");

const ROOT_DIR = __dirname;

loadEnvFile(path.join(ROOT_DIR, ".env"));

const PORT = Number(process.env.PORT || 4174);
const PUBLIC_FILES = new Set(["/", "/index.html", "/style.css", "/script.js", "/screen.png"]);

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".txt": "text/plain; charset=utf-8",
};

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const contents = fs.readFileSync(filePath, "utf8");
  contents.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) return;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) return;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, "");

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  });
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload, null, 2));
}

function sendHtml(response, statusCode, html) {
  response.writeHead(statusCode, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(html);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getRequestOrigin(requestUrl, headers = {}) {
  const host = headers.host || requestUrl.host;
  const forwardedProto = String(headers["x-forwarded-proto"] || "").split(",")[0].trim();
  const isLocalHost = host.startsWith("127.") || host.startsWith("localhost");
  const protocol = forwardedProto === "https" || !isLocalHost ? "https" : "http";

  return `${protocol}://${host}`;
}

function getPublicConfig(requestUrl, headers = {}) {
  const origin = getRequestOrigin(requestUrl, headers);
  const apiConnected = hasXApiCredentials();

  return {
    apiConnected,
    authRoutes: {
      callback: `${origin}/auth/x/callback`,
      start: `${origin}/auth/x`,
    },
    mode: getXApiMode(),
    notice: "Real scan requires official X API access or user authorization.",
  };
}

function validateUsername(username) {
  const normalized = String(username || "").trim().replace(/^@+/, "");

  if (!/^[A-Za-z0-9_]{1,15}$/.test(normalized)) {
    return null;
  }

  return normalized;
}

function serveStatic(requestUrl, response) {
  const pathname = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;

  if (!PUBLIC_FILES.has(pathname)) {
    sendJson(response, 404, { error: "Not found" });
    return;
  }

  const resolvedPath = path.resolve(ROOT_DIR, `.${pathname}`);

  if (!resolvedPath.startsWith(ROOT_DIR) || !fs.existsSync(resolvedPath)) {
    sendJson(response, 404, { error: "Not found" });
    return;
  }

  const extension = path.extname(resolvedPath);
  response.writeHead(200, {
    "Content-Type": MIME_TYPES[extension] || "application/octet-stream",
  });
  fs.createReadStream(resolvedPath).pipe(response);
}

function renderOAuthStartPage(requestUrl, headers = {}) {
  const config = getPublicConfig(requestUrl, headers);
  const hasClient = Boolean(process.env.X_CLIENT_ID && process.env.X_CLIENT_SECRET);
  const callbackUrl = config.authRoutes.callback;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Connect X Account - ShadowCheck.ai</title>
    <style>
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #fdf7ff; color: #1d1b20; font-family: Inter, system-ui, sans-serif; }
      main { width: min(680px, calc(100% - 32px)); padding: 32px; border-radius: 24px; background: rgba(255,255,255,.78); border: 1px solid rgba(203,196,210,.5); box-shadow: 0 20px 60px rgba(79,55,138,.12); }
      h1 { margin: 0 0 12px; font-family: "Hanken Grotesk", Inter, sans-serif; font-size: 34px; }
      p { color: #494551; line-height: 1.6; }
      code { display: inline-block; padding: 4px 8px; border-radius: 8px; background: #f2ecf4; color: #4f378a; }
      a { color: #4f378a; font-weight: 800; }
      .badge { display: inline-flex; padding: 7px 10px; border-radius: 999px; background: #e9ddff; color: #4f378a; font-size: 12px; font-weight: 900; text-transform: uppercase; }
    </style>
  </head>
  <body>
    <main>
      <span class="badge">OAuth placeholder</span>
      <h1>Connect X Account</h1>
      <p>This route is ready for the official X OAuth flow. It does not scrape X/Twitter and does not exchange tokens yet.</p>
      <p>Configured callback route: <code>${escapeHtml(callbackUrl)}</code></p>
      <p>Client credentials detected: <strong>${hasClient ? "Yes" : "No"}</strong></p>
      <p>Next production step: generate a PKCE verifier, redirect users to the official X authorization URL, then exchange the callback code on <code>GET /auth/x/callback</code>.</p>
      <p><a href="/">Back to scanner</a></p>
    </main>
  </body>
</html>`;
}

function renderOAuthCallbackPage(requestUrl) {
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>X OAuth Callback - ShadowCheck.ai</title>
    <style>
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #fdf7ff; color: #1d1b20; font-family: Inter, system-ui, sans-serif; }
      main { width: min(680px, calc(100% - 32px)); padding: 32px; border-radius: 24px; background: rgba(255,255,255,.78); border: 1px solid rgba(203,196,210,.5); box-shadow: 0 20px 60px rgba(79,55,138,.12); }
      h1 { margin: 0 0 12px; font-family: "Hanken Grotesk", Inter, sans-serif; font-size: 34px; }
      p { color: #494551; line-height: 1.6; }
      code { display: inline-block; padding: 4px 8px; border-radius: 8px; background: #f2ecf4; color: #4f378a; }
      a { color: #4f378a; font-weight: 800; }
    </style>
  </head>
  <body>
    <main>
      <h1>X OAuth Callback</h1>
      <p>The callback route is wired. Token exchange is intentionally left as a production integration step.</p>
      <p>Authorization code received: <code>${escapeHtml(code || "none")}</code></p>
      <p>State received: <code>${escapeHtml(state || "none")}</code></p>
      <p>No scraping is implemented or needed. Use official X API tokens only.</p>
      <p><a href="/">Back to scanner</a></p>
    </main>
  </body>
</html>`;
}

async function handleApiScan(requestUrl, response) {
  const username = validateUsername(requestUrl.searchParams.get("username"));

  if (!username) {
    sendJson(response, 400, {
      error: "Invalid username. Use 1-15 letters, numbers, or underscores.",
    });
    return;
  }

  if (!hasXApiCredentials()) {
    sendJson(response, 200, createDemoReport(username));
    return;
  }

  try {
    const report = await scanWithXApi(username);
    sendJson(response, 200, report);
  } catch (error) {
    sendJson(response, 502, {
      error: "Official X API request failed.",
      message: error.message,
      mode: "real",
      notice: "No scraping fallback was attempted. Check official X API credentials and access level.",
    });
  }
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host || `127.0.0.1:${PORT}`}`);

  if (request.method !== "GET") {
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  if (requestUrl.pathname === "/api/config") {
    sendJson(response, 200, getPublicConfig(requestUrl, request.headers));
    return;
  }

  if (requestUrl.pathname === "/api/scan") {
    await handleApiScan(requestUrl, response);
    return;
  }

  if (requestUrl.pathname === "/auth/x") {
    sendHtml(response, 200, renderOAuthStartPage(requestUrl, request.headers));
    return;
  }

  if (requestUrl.pathname === "/auth/x/callback") {
    sendHtml(response, 200, renderOAuthCallbackPage(requestUrl));
    return;
  }

  serveStatic(requestUrl, response);
});

server.listen(PORT, "127.0.0.1", () => {
  const mode = getXApiMode();
  console.log(`ShadowCheck.ai running at http://127.0.0.1:${PORT}/`);
  console.log(`Data mode: ${mode === "real" ? "Real Data Mode" : "Demo Mode"}`);
});
