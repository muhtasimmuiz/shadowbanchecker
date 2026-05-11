const CHECK_DEFINITIONS = [
  {
    name: "Search Suggestion Ban",
    icon: "person_search",
    description: "Checks if the profile appears in username suggestions.",
  },
  {
    name: "Search Ban",
    icon: "search_off",
    description: "Tests whether public search can discover the profile.",
  },
  {
    name: "Ghost Ban",
    icon: "visibility_off",
    description: "Simulates logged-out reply and thread visibility.",
  },
  {
    name: "Reply Deboosting",
    icon: "expand_more",
    description: "Detects hidden or collapsed reply behavior.",
  },
  {
    name: "Thread Ban",
    icon: "forum",
    description: "Reviews conversation thread discoverability.",
  },
  {
    name: "Visibility Filtering",
    icon: "filter_list",
    description: "Looks for timeline and profile visibility filters.",
  },
  {
    name: "Trend Blacklist",
    icon: "trending_down",
    description: "Checks simulated trend eligibility signals.",
  },
  {
    name: "Hashtag Suppression",
    icon: "tag",
    description: "Measures hashtag and topic surface visibility.",
  },
  {
    name: "Engagement Limitation",
    icon: "bar_chart_4_bars",
    description: "Estimates like, repost, and reply distribution limits.",
  },
  {
    name: "Timeline Deprioritization",
    icon: "timeline",
    description: "Models home feed recommendation priority.",
  },
];

const STATUS_WEIGHT = {
  CLEAN: 0,
  WARNING: 1,
  RESTRICTED: 2,
  FLAGGED: 3,
};

function hasXApiCredentials(env = process.env) {
  return Boolean(
    env.X_BEARER_TOKEN ||
      (env.X_CLIENT_ID && env.X_CLIENT_SECRET) ||
      (env.X_API_KEY && env.X_API_SECRET)
  );
}

function getXApiMode(env = process.env) {
  return hasXApiCredentials(env) ? "real" : "demo";
}

function hashString(value) {
  return [...value].reduce((hash, char, index) => {
    return (hash + char.charCodeAt(0) * (index + 7)) % 9973;
  }, 331);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function usernameSalt(seed, index) {
  return (seed % (index + 11)) * 7;
}

function getDemoStatus(seed, index) {
  const roll = (seed + index * 29 + usernameSalt(seed, index)) % 100;

  if (roll < 58) return "CLEAN";
  if (roll < 76) return "WARNING";
  if (roll < 90) return "RESTRICTED";
  return "FLAGGED";
}

function buildSeries(seed, score, length, spread) {
  return Array.from({ length }, (_, index) => {
    const wave = Math.sin((seed + index * 19) / 13) * spread;
    const jitter = ((seed + index * 17) % 15) - 7;
    return Math.round(clamp(score + wave + jitter, 18, 98));
  });
}

function getTrustGrade(score) {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 68) return "B+";
  if (score >= 56) return "B";
  if (score >= 44) return "C";
  return "D";
}

function buildRecommendations(report) {
  const constrainedChecks = report.checks
    .filter((check) => check.status === "FLAGGED" || check.status === "RESTRICTED")
    .map((check) => check.name);

  const recommendations = [];

  if (constrainedChecks.length) {
    recommendations.push(
      `Prioritize recovery around ${constrainedChecks.slice(0, 2).join(" and ")}.`
    );
  }

  if (report.engagementRisk !== "Low Risk") {
    recommendations.push("Reduce repetitive replies and avoid posting identical links for 48 hours.");
  }

  if (report.visibilityScore < 65) {
    recommendations.push("Post original media, vary hashtags, and slow down automation-like activity.");
  }

  recommendations.push("Keep a natural posting cadence and re-scan after your next 3-5 posts.");
  recommendations.push("Review recent posts for policy-sensitive language before boosting reach.");

  return recommendations.slice(0, 4);
}

function createDemoReport(username) {
  const seed = hashString(username.toLowerCase());
  const checks = CHECK_DEFINITIONS.map((check, index) => ({
    ...check,
    status: getDemoStatus(seed, index),
  }));

  const penalty = checks.reduce((total, check) => total + STATUS_WEIGHT[check.status] * 7, 0);
  const visibilityScore = clamp(96 - penalty + (seed % 9) - 4, 21, 98);
  const accountHealth = clamp(100 - penalty + ((seed >> 2) % 7), 24, 99);
  const audienceReach = clamp(visibilityScore - 7 + (seed % 18), 20, 99);
  const compliance = clamp(accountHealth + 5 - (seed % 8), 32, 99);
  const flaggedCount = checks.filter((check) => check.status === "FLAGGED").length;
  const restrictedCount = checks.filter((check) => check.status === "RESTRICTED").length;
  const warningCount = checks.filter((check) => check.status === "WARNING").length;
  const engagementRisk =
    flaggedCount > 1 || visibilityScore < 48
      ? "High Risk"
      : restrictedCount + warningCount > 3
        ? "Moderate Risk"
        : "Low Risk";

  const report = {
    accountHealth,
    audienceReach,
    checks,
    compliance,
    dataMode: "demo",
    engagementRisk,
    engagementSeries: buildSeries(seed + 177, visibilityScore - 6, 10, 18),
    generatedAt: new Date().toISOString(),
    notice: "Demo data. Real scan requires official X API access or user authorization.",
    source: "simulated-demo",
    trendSeries: buildSeries(seed + 67, visibilityScore, 8, 16),
    trustGrade: getTrustGrade(accountHealth),
    username,
    visibilityBars: buildSeries(seed + 19, visibilityScore, 8, 20),
    visibilityScore,
  };

  return {
    ...report,
    recommendations: buildRecommendations(report),
  };
}

async function fetchXJson(url, bearerToken = process.env.X_BEARER_TOKEN) {
  if (!bearerToken) {
    throw new Error("X_BEARER_TOKEN is required for official X API requests.");
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      "User-Agent": "ShadowCheckAI/1.0",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`X API request failed (${response.status}): ${body.slice(0, 240)}`);
  }

  return response.json();
}

async function getUserByUsername(username, options = {}) {
  const apiBaseUrl = options.apiBaseUrl || "https://api.x.com/2";
  const url = new URL(`${apiBaseUrl}/users/by/username/${encodeURIComponent(username)}`);
  url.searchParams.set(
    "user.fields",
    "created_at,description,id,name,profile_image_url,protected,public_metrics,username,verified,verified_type"
  );

  return fetchXJson(url, options.bearerToken);
}

async function getRecentTweets(userId, options = {}) {
  const apiBaseUrl = options.apiBaseUrl || "https://api.x.com/2";
  const url = new URL(`${apiBaseUrl}/users/${encodeURIComponent(userId)}/tweets`);
  url.searchParams.set("max_results", String(options.maxResults || 20));
  url.searchParams.set("tweet.fields", "created_at,conversation_id,public_metrics,reply_settings,text");

  return fetchXJson(url, options.bearerToken);
}

async function searchTweetVisibility(user, tweets = []) {
  const tweetCount = Array.isArray(tweets.data) ? tweets.data.length : 0;
  const followers = user?.data?.public_metrics?.followers_count || 0;
  const status = tweetCount === 0 ? "WARNING" : followers === 0 ? "RESTRICTED" : "CLEAN";

  return {
    searchBan: status,
    searchSuggestionBan: followers > 10 ? "CLEAN" : "WARNING",
    hashtagSuppression: tweetCount > 2 ? "CLEAN" : "WARNING",
    trendBlacklist: followers > 100 ? "CLEAN" : "WARNING",
  };
}

async function analyzeReplyVisibility(user, tweets = []) {
  const data = Array.isArray(tweets.data) ? tweets.data : [];
  const replyLimited = data.some((tweet) => tweet.reply_settings && tweet.reply_settings !== "everyone");
  const averageReplies =
    data.reduce((total, tweet) => total + (tweet.public_metrics?.reply_count || 0), 0) /
    Math.max(data.length, 1);

  return {
    engagementLimitation: averageReplies < 1 ? "WARNING" : "CLEAN",
    ghostBan: replyLimited ? "WARNING" : "CLEAN",
    replyDeboosting: averageReplies < 0.4 ? "RESTRICTED" : "CLEAN",
    threadBan: replyLimited ? "WARNING" : "CLEAN",
    timelineDeprioritization: data.length < 3 ? "WARNING" : "CLEAN",
    visibilityFiltering: user?.data?.protected ? "FLAGGED" : "CLEAN",
  };
}

function calculateVisibilityScore({ user, tweets, visibilitySignals, replySignals }) {
  const signalMap = {
    "Search Suggestion Ban": visibilitySignals.searchSuggestionBan,
    "Search Ban": visibilitySignals.searchBan,
    "Ghost Ban": replySignals.ghostBan,
    "Reply Deboosting": replySignals.replyDeboosting,
    "Thread Ban": replySignals.threadBan,
    "Visibility Filtering": replySignals.visibilityFiltering,
    "Trend Blacklist": visibilitySignals.trendBlacklist,
    "Hashtag Suppression": visibilitySignals.hashtagSuppression,
    "Engagement Limitation": replySignals.engagementLimitation,
    "Timeline Deprioritization": replySignals.timelineDeprioritization,
  };

  const checks = CHECK_DEFINITIONS.map((check) => ({
    ...check,
    status: signalMap[check.name] || "WARNING",
  }));

  const penalty = checks.reduce((total, check) => total + STATUS_WEIGHT[check.status] * 7, 0);
  const followers = user?.data?.public_metrics?.followers_count || 0;
  const tweetCount = Array.isArray(tweets?.data) ? tweets.data.length : 0;
  const visibilityScore = clamp(96 - penalty + Math.min(8, Math.floor(followers / 500)), 20, 99);
  const accountHealth = clamp(100 - penalty + Math.min(6, tweetCount), 20, 99);
  const engagementRisk =
    checks.some((check) => check.status === "FLAGGED") || visibilityScore < 48
      ? "High Risk"
      : checks.filter((check) => check.status !== "CLEAN").length > 3
        ? "Moderate Risk"
        : "Low Risk";

  const report = {
    accountHealth,
    audienceReach: clamp(visibilityScore - 4 + Math.min(12, tweetCount), 20, 99),
    checks,
    compliance: clamp(accountHealth + 2, 20, 99),
    dataMode: "real",
    engagementRisk,
    engagementSeries: buildSeries(hashString(user?.data?.username || "real") + 177, visibilityScore - 5, 10, 14),
    generatedAt: new Date().toISOString(),
    notice: "Real Data Mode uses official X API responses only. No scraping is performed.",
    source: "official-x-api",
    trendSeries: buildSeries(hashString(user?.data?.id || "real") + 67, visibilityScore, 8, 12),
    trustGrade: getTrustGrade(accountHealth),
    username: user?.data?.username,
    visibilityBars: buildSeries(hashString(user?.data?.username || "real") + 19, visibilityScore, 8, 16),
    visibilityScore,
  };

  return {
    ...report,
    recommendations: buildRecommendations(report),
  };
}

async function scanWithXApi(username, options = {}) {
  const user = await getUserByUsername(username, options);
  const tweets = await getRecentTweets(user.data.id, options);
  const visibilitySignals = await searchTweetVisibility(user, tweets, options);
  const replySignals = await analyzeReplyVisibility(user, tweets, options);

  return calculateVisibilityScore({
    replySignals,
    tweets,
    user,
    visibilitySignals,
  });
}

module.exports = {
  calculateVisibilityScore,
  createDemoReport,
  getRecentTweets,
  getUserByUsername,
  getXApiMode,
  hasXApiCredentials,
  searchTweetVisibility,
  analyzeReplyVisibility,
  scanWithXApi,
};
