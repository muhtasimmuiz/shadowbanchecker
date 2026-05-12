const CHECK_DEFINITIONS = [
  {
    name: "Search Suggestion Ban",
    icon: "person_search",
    description: "Checks if the profile has enough signal for username suggestions.",
  },
  {
    name: "Search Ban",
    icon: "search_off",
    description: "Reviews whether the profile has healthy public search indicators.",
  },
  {
    name: "Ghost Ban",
    icon: "visibility_off",
    description: "Evaluates reply and profile visibility risk patterns.",
  },
  {
    name: "Reply Deboosting",
    icon: "expand_more",
    description: "Detects signals that can lead to collapsed reply behavior.",
  },
  {
    name: "Thread Ban",
    icon: "forum",
    description: "Reviews conversation thread discoverability signals.",
  },
  {
    name: "Visibility Filtering",
    icon: "filter_list",
    description: "Looks for account-level visibility filtering risk.",
  },
  {
    name: "Trend Blacklist",
    icon: "trending_down",
    description: "Checks trend eligibility signals.",
  },
  {
    name: "Hashtag Suppression",
    icon: "tag",
    description: "Measures hashtag and topic surface risk.",
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
  return Boolean(env.X_BEARER_TOKEN);
}

function getXApiMode(env = process.env) {
  return hasXApiCredentials(env) ? "connected" : "unconfigured";
}

function hashString(value) {
  return [...value].reduce((hash, char, index) => {
    return (hash + char.charCodeAt(0) * (index + 7)) % 9973;
  }, 331);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function daysSince(dateValue) {
  if (!dateValue) return 0;
  const createdAt = new Date(dateValue).getTime();
  if (Number.isNaN(createdAt)) return 0;
  return Math.max(0, Math.floor((Date.now() - createdAt) / 86400000));
}

function statusFromRisk(risk) {
  if (risk >= 74) return "FLAGGED";
  if (risk >= 52) return "RESTRICTED";
  if (risk >= 28) return "WARNING";
  return "CLEAN";
}

function buildSeries(seed, score, length, spread) {
  return Array.from({ length }, (_, index) => {
    const wave = Math.sin((seed + index * 19) / 13) * spread;
    const jitter = ((seed + index * 17) % 15) - 7;
    return Math.round(clamp(score + wave + jitter, 18, 98));
  });
}

function buildDiagnosticChecks(profile) {
  const seed = hashString(String(profile.username || "").toLowerCase());
  const followers = profile.followers_count || 0;
  const following = profile.following_count || 0;
  const tweetCount = profile.tweet_count || 0;
  const ageDays = daysSince(profile.created_at);
  const followerRatio = followers / Math.max(1, following);
  const lowMaturityRisk = (ageDays < 30 ? 18 : 0) + (tweetCount < 12 ? 15 : 0);
  const reachRisk = followers < 50 ? 18 : followers < 500 ? 8 : 0;
  const imbalanceRisk = following > 900 && followerRatio < 0.2 ? 20 : followerRatio < 0.05 ? 12 : 0;
  const protectedRisk = profile.protected ? 45 : 0;
  const verifiedBonus = profile.verified ? -8 : 0;

  const baseRisks = [
    reachRisk + lowMaturityRisk + verifiedBonus,
    protectedRisk + reachRisk + (tweetCount < 5 ? 20 : 0),
    protectedRisk + imbalanceRisk + lowMaturityRisk,
    imbalanceRisk + (tweetCount < 25 ? 16 : 0),
    lowMaturityRisk + (followers < 100 ? 12 : 0),
    protectedRisk + imbalanceRisk + reachRisk,
    followers < 1000 ? 18 : 4,
    tweetCount < 20 ? 20 : 6,
    imbalanceRisk + reachRisk + (followers < 100 ? 8 : 0),
    reachRisk + (tweetCount < 30 ? 12 : 0),
  ];

  return CHECK_DEFINITIONS.map((check, index) => {
    const variance = (seed + index * 17) % 18;
    const risk = clamp(baseRisks[index] + variance, 0, 100);

    return {
      ...check,
      status: statusFromRisk(risk),
    };
  });
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

  recommendations.push("Keep a natural posting cadence and scan again after your next 3-5 posts.");
  recommendations.push("Review recent posts for policy-sensitive language before boosting reach.");

  return recommendations.slice(0, 4);
}

async function fetchXJson(url, bearerToken = process.env.X_BEARER_TOKEN) {
  if (!bearerToken) {
    const error = new Error("Profile lookup is not configured.");
    error.statusCode = 503;
    error.code = "profile_lookup_unconfigured";
    throw error;
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      "User-Agent": "ShadowCheckAI/1.0",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    const error = new Error(getXApiErrorMessage(response.status, body));
    error.statusCode = response.status === 401 || response.status === 403 ? 503 : response.status;
    error.code = getXApiErrorCode(response.status);
    error.details = body.slice(0, 500);
    throw error;
  }

  return response.json();
}

function getXApiErrorCode(statusCode) {
  if (statusCode === 401 || statusCode === 403) return "profile_lookup_unavailable";
  if (statusCode === 402) return "profile_lookup_unavailable";
  if (statusCode === 404) return "user_not_found";
  if (statusCode === 429) return "rate_limited";
  return "profile_lookup_failed";
}

function getXApiErrorMessage(statusCode, body) {
  if (statusCode === 404 || body.includes("Not Found")) {
    return "User not found.";
  }

  if (statusCode === 429) {
    return "Too many scans are running right now. Please wait a few minutes and try again.";
  }

  if (statusCode === 401 || statusCode === 402 || statusCode === 403) {
    return "Profile lookup is unavailable right now.";
  }

  return "Profile lookup failed. Please try again later.";
}

async function getUserByUsername(username, options = {}) {
  const apiBaseUrl = options.apiBaseUrl || "https://api.x.com/2";
  const url = new URL(`${apiBaseUrl}/users/by/username/${encodeURIComponent(username)}`);
  url.searchParams.set(
    "user.fields",
    "id,name,username,profile_image_url,verified,verified_type,public_metrics,description,created_at,protected"
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

function normalizeXUserProfile(userResponse) {
  const user = userResponse?.data;

  if (!user) {
    const error = new Error("User not found.");
    error.statusCode = 404;
    error.code = "user_not_found";
    throw error;
  }

  const metrics = user.public_metrics || {};

  return {
    created_at: user.created_at || null,
    description: user.description || "",
    followers_count: metrics.followers_count ?? 0,
    following_count: metrics.following_count ?? 0,
    id: user.id,
    listed_count: metrics.listed_count ?? 0,
    name: user.name,
    profile_image_url: user.profile_image_url || null,
    protected: Boolean(user.protected),
    tweet_count: metrics.tweet_count ?? 0,
    username: user.username,
    verified: Boolean(user.verified),
    verified_type: user.verified_type || null,
  };
}

function calculateVisibilityScore({ profile, checks }) {
  const diagnosisChecks = checks || buildDiagnosticChecks(profile);
  const penalty = diagnosisChecks.reduce(
    (total, check) => total + STATUS_WEIGHT[check.status] * 7,
    0
  );
  const followers = profile.followers_count || 0;
  const tweetCount = profile.tweet_count || 0;
  const ageDays = daysSince(profile.created_at);
  const maturityBonus = Math.min(10, Math.floor(ageDays / 180));
  const reachBonus = Math.min(10, Math.floor(Math.log10(Math.max(1, followers)) * 2));
  const visibilityScore = clamp(94 - penalty + maturityBonus + reachBonus, 20, 99);
  const trustScore = clamp(96 - penalty + maturityBonus + (profile.verified ? 4 : 0), 20, 99);
  const accountHealth = clamp(Math.round((visibilityScore + trustScore) / 2), 20, 99);
  const engagementRisk =
    diagnosisChecks.some((check) => check.status === "FLAGGED") || visibilityScore < 48
      ? "High Risk"
      : diagnosisChecks.filter((check) => check.status !== "CLEAN").length > 3
        ? "Moderate Risk"
        : "Low Risk";

  const report = {
    accountHealth,
    audienceReach: clamp(visibilityScore - 5 + Math.min(12, Math.floor(tweetCount / 200)), 20, 99),
    checks: diagnosisChecks,
    compliance: clamp(accountHealth + 2, 20, 99),
    engagementRisk,
    engagementSeries: buildSeries(hashString(profile.username || "x") + 177, visibilityScore - 5, 10, 14),
    generatedAt: new Date().toISOString(),
    followers_count: profile.followers_count,
    following_count: profile.following_count,
    listed_count: profile.listed_count,
    name: profile.name,
    profile,
    profile_image_url: profile.profile_image_url,
    source: "official-x-api",
    trustScore,
    tweet_count: profile.tweet_count,
    trendSeries: buildSeries(hashString(profile.id || "x") + 67, visibilityScore, 8, 12),
    username: profile.username,
    verified: profile.verified,
    verified_type: profile.verified_type,
    visibilityBars: buildSeries(hashString(profile.username || "x") + 19, visibilityScore, 8, 16),
    visibilityScore,
  };

  return {
    ...report,
    recommendations: buildRecommendations(report),
  };
}

async function scanWithXApi(username, options = {}) {
  const user = await getUserByUsername(username, options);
  const profile = normalizeXUserProfile(user);
  const checks = buildDiagnosticChecks(profile);

  return calculateVisibilityScore({
    checks,
    profile,
  });
}

module.exports = {
  analyzeReplyVisibility,
  buildDiagnosticChecks,
  calculateVisibilityScore,
  getRecentTweets,
  getUserByUsername,
  getXApiMode,
  hasXApiCredentials,
  normalizeXUserProfile,
  scanWithXApi,
  searchTweetVisibility,
};
