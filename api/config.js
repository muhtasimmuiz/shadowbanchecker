const { getXApiMode, hasXApiCredentials } = require("../services/xApiService");

function getOrigin(request) {
  const protocol = request.headers["x-forwarded-proto"] || "https";
  const host = request.headers.host || "localhost";
  return `${protocol}://${host}`;
}

module.exports = function handler(request, response) {
  if (request.method !== "GET") {
    response.statusCode = 405;
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  const origin = getOrigin(request);

  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(
    JSON.stringify({
      apiConnected: hasXApiCredentials(),
      authRoutes: {
        callback: `${origin}/auth/x/callback`,
        start: `${origin}/auth/x`,
      },
      mode: getXApiMode(),
      notice: "Real scan requires official X API access or user authorization.",
    })
  );
};
