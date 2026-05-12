function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

module.exports = function handler(request, response) {
  const requestUrl = new URL(request.url, `https://${request.headers.host || "localhost"}`);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");

  response.setHeader("Content-Type", "text/html; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(`<!doctype html>
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
      <p>The authorization callback is available for secure account connection workflows.</p>
      <p>Authorization code received: <code>${escapeHtml(code || "none")}</code></p>
      <p>State received: <code>${escapeHtml(state || "none")}</code></p>
      <p>No scraping is implemented or needed.</p>
      <p><a href="/">Back to scanner</a></p>
    </main>
  </body>
</html>`);
};
