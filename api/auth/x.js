function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getOrigin(request) {
  const host = request.headers.host || "localhost";
  const forwardedProto = String(request.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  const isLocalHost = host.startsWith("127.") || host.startsWith("localhost");
  const protocol = forwardedProto === "https" || !isLocalHost ? "https" : "http";

  return `${protocol}://${host}`;
}

module.exports = function handler(request, response) {
  const callbackUrl = `${getOrigin(request)}/auth/x/callback`;
  const hasClient = Boolean(process.env.X_CLIENT_ID && process.env.X_CLIENT_SECRET);

  response.setHeader("Content-Type", "text/html; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(`<!doctype html>
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
</html>`);
};
