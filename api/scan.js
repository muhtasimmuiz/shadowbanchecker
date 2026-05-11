const {
  createDemoReport,
  hasXApiCredentials,
  scanWithXApi,
} = require("../services/xApiService");

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(payload, null, 2));
}

function validateUsername(value) {
  const username = String(value || "").trim().replace(/^@+/, "");
  return /^[A-Za-z0-9_]{1,15}$/.test(username) ? username : null;
}

module.exports = async function handler(request, response) {
  if (request.method !== "GET") {
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  const query = new URL(request.url, `https://${request.headers.host || "localhost"}`).searchParams;
  const username = validateUsername(query.get("username"));

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
    sendJson(response, 200, await scanWithXApi(username));
  } catch (error) {
    sendJson(response, 502, {
      error: "Official X API request failed.",
      message: error.message,
      mode: "real",
      notice: "No scraping fallback was attempted. Check official X API credentials and access level.",
    });
  }
};
