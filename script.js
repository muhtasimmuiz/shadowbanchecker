const CHECKS = [
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

const STORAGE_KEY = "shadowcheck_recent_scans_v2";

const state = {
  currentReport: null,
  history: [],
  isScanning: false,
  runtime: {
    apiConnected: false,
    mode: "demo",
    notice: "Real scan requires official X API access or user authorization.",
  },
};

const elements = {
  apiNotice: document.querySelector("#apiNotice"),
  apiNoticeText: document.querySelector("#apiNoticeText"),
  avatar: document.querySelector("#avatar"),
  audienceText: document.querySelector("#audienceText"),
  checkAccountButton: document.querySelector("#checkAccountButton"),
  checksGrid: document.querySelector("#checksGrid"),
  clearButton: document.querySelector("#clearButton"),
  clearHistoryButton: document.querySelector("#clearHistoryButton"),
  complianceText: document.querySelector("#complianceText"),
  connectXButton: document.querySelector("#connectXButton"),
  copyButton: document.querySelector("#copyButton"),
  downloadButton: document.querySelector("#downloadButton"),
  engagementCanvas: document.querySelector("#engagementCanvas"),
  forecastText: document.querySelector("#forecastText"),
  healthBadge: document.querySelector("#healthBadge"),
  healthText: document.querySelector("#healthText"),
  historyList: document.querySelector("#historyList"),
  heroModeBadge: document.querySelector("#heroModeBadge"),
  heroModeText: document.querySelector("#heroModeText"),
  inputWrap: document.querySelector("#inputWrap"),
  jsonButton: document.querySelector("#jsonButton"),
  loginButton: document.querySelector("#loginButton"),
  modeBadge: document.querySelector("#modeBadge"),
  mobileMenuButton: document.querySelector("#mobileMenuButton"),
  navActions: document.querySelector(".nav-actions"),
  navLinks: document.querySelector("#navLinks"),
  newScanButton: document.querySelector("#newScanButton"),
  oauthCancelButton: document.querySelector("#oauthCancelButton"),
  oauthCloseButton: document.querySelector("#oauthCloseButton"),
  oauthModal: document.querySelector("#oauthModal"),
  oauthRouteButton: document.querySelector("#oauthRouteButton"),
  pricingButton: document.querySelector("#pricingButton"),
  privacyButton: document.querySelector("#privacyButton"),
  followersCount: document.querySelector("#followersCount"),
  profileHandle: document.querySelector("#profileHandle"),
  profileMetrics: document.querySelector("#profileMetrics"),
  profileName: document.querySelector("#profileName"),
  progressBar: document.querySelector("#progressBar"),
  progressPanel: document.querySelector("#progressPanel"),
  progressText: document.querySelector("#progressText"),
  progressTitle: document.querySelector("#progressTitle"),
  reachMeter: document.querySelector("#reachMeter"),
  reachText: document.querySelector("#reachText"),
  recommendationList: document.querySelector("#recommendationList"),
  riskLevel: document.querySelector("#riskLevel"),
  scanButton: document.querySelector("#scanButton"),
  scanForm: document.querySelector("#scanForm"),
  scanTime: document.querySelector("#scanTime"),
  termsButton: document.querySelector("#termsButton"),
  toastRegion: document.querySelector("#toastRegion"),
  trendList: document.querySelector("#trendList"),
  trustScore: document.querySelector("#trustScore"),
  twitterButton: document.querySelector("#twitterButton"),
  tweetCount: document.querySelector("#tweetCount"),
  usernameError: document.querySelector("#usernameError"),
  usernameInput: document.querySelector("#usernameInput"),
  verifiedIcon: document.querySelector("#verifiedIcon"),
  visibilityChart: document.querySelector("#visibilityChart"),
  visibilityScore: document.querySelector("#visibilityScore"),
  weeklyCanvas: document.querySelector("#weeklyCanvas"),
};

function hashString(value) {
  return [...value].reduce((hash, char, index) => {
    return (hash + char.charCodeAt(0) * (index + 7)) % 9973;
  }, 331);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function sanitizeUsername(value) {
  return value.trim().replace(/^@+/, "");
}

function validateUsername(rawValue) {
  const username = sanitizeUsername(rawValue);

  if (!username) {
    return {
      ok: false,
      message: "Please enter a Twitter/X username before running a scan.",
    };
  }

  if (!/^[A-Za-z0-9_]{1,15}$/.test(username)) {
    return {
      ok: false,
      message: "Use 1-15 letters, numbers, or underscores. Example: @alex_digital",
    };
  }

  return { ok: true, username };
}

function getInitials(username) {
  return username
    .split("_")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatCompactNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "--";
  }

  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 1,
    notation: "compact",
  }).format(Number(value));
}

function getStatus(seed, index) {
  const roll = (seed + index * 29 + usernameSalt(seed, index)) % 100;

  if (roll < 58) {
    return "CLEAN";
  }

  if (roll < 76) {
    return "WARNING";
  }

  if (roll < 90) {
    return "RESTRICTED";
  }

  return "FLAGGED";
}

function usernameSalt(seed, index) {
  return (seed % (index + 11)) * 7;
}

function buildSeries(seed, score, length, spread) {
  return Array.from({ length }, (_, index) => {
    const wave = Math.sin((seed + index * 19) / 13) * spread;
    const jitter = ((seed + index * 17) % 15) - 7;
    return Math.round(clamp(score + wave + jitter, 18, 98));
  });
}

function buildReport(username) {
  const seed = hashString(username.toLowerCase());
  const checks = CHECKS.map((check, index) => {
    return {
      ...check,
      status: getStatus(seed, index),
    };
  });

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

  const recommendations = buildRecommendations({
    accountHealth,
    checks,
    engagementRisk,
    flaggedCount,
    restrictedCount,
    visibilityScore,
  });

  return {
    accountHealth,
    audienceReach,
    checks,
    compliance,
    dataMode: "demo",
    engagementRisk,
    engagementSeries: buildSeries(seed + 177, visibilityScore - 6, 10, 18),
    generatedAt: new Date().toISOString(),
    mode: "demo",
    notice: "Demo data. Real scan requires official X API access or user authorization.",
    profile: {
      followers_count: null,
      following_count: null,
      listed_count: null,
      name: username,
      profile_image_url: null,
      tweet_count: null,
      username,
      verified: false,
      verified_type: null,
    },
    recommendations,
    source: "client-demo",
    trendSeries: buildSeries(seed + 67, visibilityScore, 8, 16),
    trustGrade: getTrustGrade(accountHealth),
    username,
    visibilityBars: buildSeries(seed + 19, visibilityScore, 8, 20),
    visibilityScore,
  };
}

function buildRecommendations(report) {
  const flaggedNames = report.checks
    .filter((check) => check.status === "FLAGGED" || check.status === "RESTRICTED")
    .map((check) => check.name);

  const recommendations = [];

  if (flaggedNames.length) {
    recommendations.push(`Prioritize recovery around ${flaggedNames.slice(0, 2).join(" and ")}.`);
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

function getTrustGrade(score) {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 68) return "B+";
  if (score >= 56) return "B";
  if (score >= 44) return "C";
  return "D";
}

function getHealthLabel(score) {
  if (score >= 75) return { label: "Healthy", className: "" };
  if (score >= 55) return { label: "Needs Attention", className: "warn" };
  return { label: "Restricted", className: "danger" };
}

function setError(message) {
  elements.usernameError.textContent = message || "";
  elements.inputWrap.classList.toggle("has-error", Boolean(message));
  elements.usernameInput.setAttribute("aria-invalid", message ? "true" : "false");
}

function setScanning(isScanning) {
  state.isScanning = isScanning;
  document.body.classList.toggle("is-scanning", isScanning);
  elements.scanButton.disabled = isScanning;
  elements.newScanButton.disabled = isScanning;
  elements.clearButton.disabled = isScanning;
  elements.scanButton.classList.toggle("is-loading", isScanning);
  elements.progressPanel.hidden = !isScanning;

  if (!isScanning) {
    elements.progressBar.style.width = "0%";
  }
}

function setDataMode(config) {
  state.runtime = {
    ...state.runtime,
    ...config,
  };

  const realMode = state.runtime.mode === "real" && state.runtime.apiConnected;
  const badgeText = realMode ? "Real Data Mode" : "Demo Mode";
  const compactBadgeText = realMode ? "Real data" : "Demo data";
  const notice = realMode
    ? "Real Data Mode is active through the official X API. No scraping is performed."
    : "Demo Mode is active. Real scan requires official X API access or user authorization.";

  elements.heroModeBadge.textContent = badgeText;
  elements.heroModeBadge.className = `mode-badge ${realMode ? "real" : "demo"}`;
  elements.heroModeText.textContent = state.runtime.notice || notice;
  elements.modeBadge.textContent = compactBadgeText;
  elements.modeBadge.className = `mode-badge ${realMode ? "real" : "demo"}`;
  elements.apiNotice.classList.toggle("real", realMode);
  elements.apiNoticeText.textContent = notice;
}

async function loadRuntimeConfig() {
  if (window.location.protocol === "file:") {
    setDataMode({
      apiConnected: false,
      mode: "demo",
      notice: "Demo Mode is active from a local file. Start the Node backend for real X API mode.",
    });
    return;
  }

  try {
    const response = await fetch("/api/config", {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error("Config endpoint unavailable.");
    }

    setDataMode(await response.json());
  } catch {
    setDataMode({
      apiConnected: false,
      mode: "demo",
      notice: "Demo Mode is active. Start the Node backend and add .env keys for real X API mode.",
    });
  }
}

async function fetchScanReport(username) {
  if (window.location.protocol === "file:") {
    return buildReport(username);
  }

  try {
    const response = await fetch(`/api/scan?username=${encodeURIComponent(username)}`, {
      headers: { Accept: "application/json" },
    });
    const payload = await response.json().catch(() => null);

    if (response.ok && payload) {
      return payload;
    }

    const message = payload?.message || payload?.error || "Scan endpoint unavailable.";
    throw new Error(message);
  } catch (error) {
    if (state.runtime.apiConnected) {
      throw error;
    }

    showToast("Demo fallback active", "Backend scan endpoint was unavailable, so simulated data was used.", "error");
    return buildReport(username);
  }
}

function simulateScan(username) {
  if (state.isScanning) return;

  setScanning(true);
  setError("");

  const steps = [
    "Normalizing username format...",
    state.runtime.apiConnected ? "Requesting official X API signals..." : "Generating demo visibility signals...",
    state.runtime.apiConnected ? "Analyzing authorized reply visibility..." : "Simulating logged-out reply checks...",
    "Measuring timeline ranking risk...",
    "Generating recommendations...",
  ];
  let progress = 0;

  elements.progressTitle.textContent = `Scanning @${username}`;
  elements.progressText.textContent = steps[0];

  const interval = window.setInterval(() => {
    progress += 10 + Math.round(Math.random() * 10);
    const clamped = clamp(progress, 0, 100);
    elements.progressBar.style.width = `${clamped}%`;
    elements.progressText.textContent = steps[Math.min(steps.length - 1, Math.floor(clamped / 24))];

    if (clamped >= 100) {
      window.clearInterval(interval);
      window.setTimeout(async () => {
        try {
          const report = await fetchScanReport(username);
          updateDashboard(report);
          saveHistory(report);
          setScanning(false);
          showToast(
            "Scan complete",
            `@${username} ${
              (report.mode || report.dataMode) === "real" ? "real-data" : "demo"
            } visibility audit is ready.`,
            "success"
          );
          document.querySelector("#scanner").scrollIntoView({ behavior: "smooth", block: "start" });
        } catch (error) {
          setScanning(false);
          showToast("Real scan failed", error.message, "error");
        }
      }, 260);
    }
  }, 130);
}

function updateDashboard(report) {
  state.currentReport = report;
  const health = getHealthLabel(report.accountHealth);
  const reportMode = report.mode || report.dataMode || state.runtime.mode || "demo";
  const realMode = reportMode === "real";
  const profile = report.profile || report;
  const username = profile.username || report.username || "alex_digital";
  const displayName = profile.name || report.name || username;
  const realNotice =
    "Real profile data is from the official X API. Shadowban diagnosis remains simulated.";
  const demoNotice =
    "Demo Mode is active. Real scan requires official X API access or user authorization.";

  if (realMode && profile.profile_image_url) {
    elements.avatar.innerHTML = `<img src="${escapeHtml(profile.profile_image_url)}" alt="${escapeHtml(
      displayName
    )} profile avatar">`;
  } else {
    elements.avatar.textContent = getInitials(username);
  }

  elements.profileHandle.textContent = `@${username}`;
  elements.profileName.textContent = realMode ? displayName : "Simulated demo profile";
  elements.profileMetrics.hidden = !realMode;
  elements.followersCount.textContent = formatCompactNumber(
    profile.followers_count ?? report.followers_count
  );
  elements.tweetCount.textContent = formatCompactNumber(profile.tweet_count ?? report.tweet_count);
  elements.verifiedIcon.hidden = realMode && !profile.verified;
  elements.verifiedIcon.setAttribute(
    "aria-label",
    realMode ? (profile.verified ? "Verified X profile" : "Unverified X profile") : "Verified demo account"
  );
  elements.scanTime.textContent = `Scan completed ${formatDateTime(report.generatedAt)}`;
  elements.heroModeBadge.textContent = realMode ? "Real Data Mode" : "Demo Mode";
  elements.heroModeBadge.className = `mode-badge ${realMode ? "real" : "demo"}`;
  elements.heroModeText.textContent = realMode ? realNotice : report.notice || demoNotice;
  elements.modeBadge.textContent = realMode ? "Real data" : "Demo data";
  elements.modeBadge.className = `mode-badge ${realMode ? "real" : "demo"}`;
  elements.apiNotice.classList.toggle("real", realMode);
  elements.apiNoticeText.textContent = realMode
    ? "Real profile data is live from the official X API. Shadowban diagnosis remains simulated."
    : report.notice || demoNotice;
  elements.visibilityScore.textContent = `${report.visibilityScore}%`;
  elements.trustScore.textContent = report.trustGrade;
  elements.reachMeter.style.width = `${report.audienceReach}%`;
  elements.reachText.textContent = `${report.audienceReach}% Optimal`;
  elements.riskLevel.textContent = report.engagementRisk;
  elements.healthText.textContent = `Account health: ${report.accountHealth}%`;
  elements.healthBadge.textContent = health.label;
  elements.healthBadge.className = `health-badge ${health.className}`;
  elements.complianceText.textContent = `Your account adheres to ${report.compliance}% of safety guidelines.`;
  elements.audienceText.textContent =
    report.engagementRisk === "High Risk"
      ? "Suspicious engagement clustering needs review before scaling posts."
      : "No significant bot clusters detected in followers.";
  elements.forecastText.textContent =
    report.visibilityScore >= 75
      ? "Visibility is projected to remain stable this week."
      : `Visibility may normalize within ${3 + (hashString(report.username) % 5)} days with safer posting.`;

  renderChecks(report.checks);
  renderBars(report.visibilityBars);
  renderTrend(report.trendSeries);
  renderRecommendations(report.recommendations);
  drawLineChart(elements.engagementCanvas, report.engagementSeries, {
    color: "#ba1a1a",
    fill: "rgba(186, 26, 26, 0.08)",
  });
  drawLineChart(elements.weeklyCanvas, report.trendSeries, {
    color: "#4f378a",
    fill: "rgba(79, 55, 138, 0.1)",
  });
}

function renderChecks(checks) {
  elements.checksGrid.innerHTML = checks
    .map(
      (check) => `
        <article class="check-card" data-status="${check.status}">
          <span class="check-icon" aria-hidden="true">
            <span class="material-symbols-outlined">${check.icon}</span>
          </span>
          <div>
            <h4>${check.name}</h4>
            <p>${check.description}</p>
          </div>
          <span class="status-badge status-${check.status.toLowerCase()}">${check.status}</span>
        </article>
      `
    )
    .join("");
}

function renderBars(values) {
  const max = Math.max(...values);
  elements.visibilityChart.innerHTML = values
    .map((value, index) => {
      const opacity = 0.12 + (index / values.length) * 0.86;
      const height = Math.max(24, Math.round((value / max) * 76));
      return `<span style="height:${height}px; opacity:${opacity.toFixed(2)}"></span>`;
    })
    .join("");
}

function renderTrend(values) {
  const today = new Date();
  const rows = values.slice(-3).reverse();

  elements.trendList.innerHTML = rows
    .map((value, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - index * 7);
      const previous = rows[index + 1] ?? value;
      const direction = value >= previous ? "trending_up" : "trending_down";
      const downClass = value >= previous ? "" : "down";

      return `
        <div class="trend-row">
          <span>${date.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}</span>
          <span class="trend-value ${downClass}">
            <span class="material-symbols-outlined" aria-hidden="true">${direction}</span>
            ${value}%
          </span>
        </div>
      `;
    })
    .join("");
}

function renderRecommendations(recommendations) {
  elements.recommendationList.innerHTML = recommendations
    .map((recommendation) => `<li>${recommendation}</li>`)
    .join("");
}

function drawLineChart(canvas, values, options) {
  const context = canvas.getContext("2d");
  const ratio = window.devicePixelRatio || 1;
  const cssWidth = canvas.clientWidth || canvas.width;
  const cssHeight = canvas.clientHeight || canvas.height;

  canvas.width = Math.round(cssWidth * ratio);
  canvas.height = Math.round(cssHeight * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, cssWidth, cssHeight);

  const padding = 18;
  const width = cssWidth - padding * 2;
  const height = cssHeight - padding * 2;
  const max = Math.max(...values, 100);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  context.strokeStyle = "rgba(203, 196, 210, 0.38)";
  context.lineWidth = 1;
  for (let index = 0; index < 4; index += 1) {
    const y = padding + (height / 3) * index;
    context.beginPath();
    context.moveTo(padding, y);
    context.lineTo(cssWidth - padding, y);
    context.stroke();
  }

  const points = values.map((value, index) => {
    return {
      x: padding + (width / (values.length - 1)) * index,
      y: padding + height - ((value - min) / range) * height,
    };
  });

  context.beginPath();
  points.forEach((point, index) => {
    if (index === 0) {
      context.moveTo(point.x, point.y);
    } else {
      context.lineTo(point.x, point.y);
    }
  });
  context.lineTo(points[points.length - 1].x, cssHeight - padding);
  context.lineTo(points[0].x, cssHeight - padding);
  context.closePath();
  context.fillStyle = options.fill;
  context.fill();

  context.beginPath();
  points.forEach((point, index) => {
    if (index === 0) {
      context.moveTo(point.x, point.y);
    } else {
      context.lineTo(point.x, point.y);
    }
  });
  context.strokeStyle = options.color;
  context.lineWidth = 3;
  context.lineJoin = "round";
  context.lineCap = "round";
  context.stroke();

  points.forEach((point) => {
    context.beginPath();
    context.arc(point.x, point.y, 4, 0, Math.PI * 2);
    context.fillStyle = "#ffffff";
    context.fill();
    context.strokeStyle = options.color;
    context.lineWidth = 2;
    context.stroke();
  });
}

function formatDateTime(isoDate) {
  return new Date(isoDate).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatReport(report) {
  const checks = report.checks.map((check) => `- ${check.name}: ${check.status}`).join("\n");
  const recommendations = report.recommendations.map((item) => `- ${item}`).join("\n");
  const realMode = (report.mode || report.dataMode) === "real";
  const profile = report.profile || report;
  const profileBlock = realMode
    ? `Real profile data:
- Source: Official X API v2
- Name: ${profile.name || report.name || report.username}
- Handle: @${profile.username || report.username}
- Verified: ${profile.verified ? "Yes" : "No"}
- Followers: ${formatCompactNumber(profile.followers_count ?? report.followers_count)}
- Following: ${formatCompactNumber(profile.following_count ?? report.following_count)}
- Tweets: ${formatCompactNumber(profile.tweet_count ?? report.tweet_count)}
- Listed: ${formatCompactNumber(profile.listed_count ?? report.listed_count)}`
    : `Demo profile data:
- Source: Simulated demo mode
- Handle: @${report.username}`;

  return `ShadowCheck.ai Full Visibility Audit

Username: @${report.username}
Scan date/time: ${formatDateTime(report.generatedAt)}
Data mode: ${realMode ? "Real Data Mode" : "Demo Mode"}

${profileBlock}

Visibility score: ${report.visibilityScore}%
Account health score: ${report.accountHealth}%
Trust score: ${report.trustGrade}
Audience reach meter: ${report.audienceReach}%
Engagement risk level: ${report.engagementRisk}

Simulated shadowban diagnosis:
${checks}

Recommendations:
${recommendations}

Note: ${report.notice || "Real scan requires official X API access or user authorization."}`;
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await Promise.race([
        navigator.clipboard.writeText(text),
        new Promise((_, reject) => {
          window.setTimeout(() => reject(new Error("Clipboard timed out")), 400);
        }),
      ]);
      return true;
    } catch {
      // Fall back to the textarea method for browsers that block clipboard permissions.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    return document.execCommand("copy");
  } finally {
    textarea.remove();
  }
}

function requireReport(action) {
  if (!state.currentReport) {
    showToast("No report yet", "Run a visibility scan before using this tool.", "error");
    elements.usernameInput.focus();
    return null;
  }

  return action(state.currentReport);
}

function saveHistory(report) {
  const compact = {
    accountHealth: report.accountHealth,
    dataMode: report.mode || report.dataMode || "demo",
    generatedAt: report.generatedAt,
    username: report.username,
    visibilityScore: report.visibilityScore,
  };

  state.history = [
    compact,
    ...state.history.filter((item) => item.username.toLowerCase() !== report.username.toLowerCase()),
  ].slice(0, 5);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.history));
  renderHistory();
}

function loadHistory() {
  try {
    state.history = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    state.history = [];
  }

  renderHistory();
}

function renderHistory() {
  if (!state.history.length) {
    elements.historyList.innerHTML = `
      <div class="empty-state">
        <span class="material-symbols-outlined" aria-hidden="true">manage_search</span>
        Run a scan to build your recent search history.
      </div>
    `;
    return;
  }

  elements.historyList.innerHTML = state.history
    .map(
      (item) => `
        <button class="history-item" type="button" data-username="${item.username}">
          <span>
            <strong>@${item.username}</strong>
            <span>${formatDateTime(item.generatedAt)} - ${item.dataMode === "real" ? "Real Data" : "Demo"}</span>
          </span>
          <span>${item.visibilityScore}% visibility</span>
        </button>
      `
    )
    .join("");
}

function clearResults() {
  const emptyReport = buildReport("alex_digital");
  state.currentReport = null;
  updateDashboard(emptyReport);
  state.currentReport = null;
  elements.profileHandle.textContent = "@alex_digital";
  elements.scanTime.textContent = "Results cleared. Run a new scan.";
  showToast("Results cleared", "The dashboard has been reset to demo mode.", "success");
}

function showToast(title, message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="material-symbols-outlined" aria-hidden="true">${
      type === "error" ? "error" : "check_circle"
    }</span>
    <div>
      <strong>${title}</strong>
      <p>${message}</p>
    </div>
  `;

  elements.toastRegion.appendChild(toast);
  window.setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    window.setTimeout(() => toast.remove(), 180);
  }, 3200);
}

function handleScanSubmit(event) {
  event.preventDefault();
  const result = validateUsername(elements.usernameInput.value);

  if (!result.ok) {
    setError(result.message);
    showToast("Check the username", result.message, "error");
    return;
  }

  elements.usernameInput.value = result.username;
  simulateScan(result.username);
}

function openOAuthModal() {
  elements.oauthModal.hidden = false;
  elements.oauthCloseButton.focus();
}

function closeOAuthModal() {
  elements.oauthModal.hidden = true;
  elements.connectXButton.focus();
}

function wireEvents() {
  elements.scanForm.addEventListener("submit", handleScanSubmit);

  elements.checkAccountButton.addEventListener("click", () => {
    document.querySelector("#scanner").scrollIntoView({ behavior: "smooth", block: "start" });
    elements.usernameInput.focus();
  });

  elements.connectXButton.addEventListener("click", openOAuthModal);
  elements.oauthCloseButton.addEventListener("click", closeOAuthModal);
  elements.oauthCancelButton.addEventListener("click", closeOAuthModal);
  elements.oauthModal.addEventListener("click", (event) => {
    if (event.target === elements.oauthModal) {
      closeOAuthModal();
    }
  });
  elements.oauthRouteButton.addEventListener("click", (event) => {
    if (window.location.protocol === "file:") {
      event.preventDefault();
      showToast("Start backend first", "Run npm start, then open http://127.0.0.1:4174/auth/x.", "error");
    }
  });

  elements.newScanButton.addEventListener("click", () => {
    elements.usernameInput.value = "";
    setError("");
    document.querySelector("#top").scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => elements.usernameInput.focus(), 350);
  });

  elements.clearButton.addEventListener("click", clearResults);

  elements.downloadButton.addEventListener("click", () => {
    requireReport((report) => {
      downloadFile(`${report.username}-shadowcheck-audit.txt`, formatReport(report), "text/plain");
      showToast("Audit downloaded", "A clean text report has been saved.", "success");
    });
  });

  elements.copyButton.addEventListener("click", async () => {
    if (!state.currentReport) {
      showToast("No report yet", "Run a visibility scan before using this tool.", "error");
      elements.usernameInput.focus();
      return;
    }

    const copied = await copyTextToClipboard(formatReport(state.currentReport));

    if (copied) {
      showToast("Report copied", "The audit summary is now on your clipboard.", "success");
    } else {
      showToast("Copy blocked", "Your browser blocked clipboard access. Try downloading the audit.", "error");
    }
  });

  elements.jsonButton.addEventListener("click", () => {
    requireReport((report) => {
      downloadFile(
        `${report.username}-shadowcheck-audit.json`,
        JSON.stringify(report, null, 2),
        "application/json"
      );
      showToast("JSON exported", "The structured scan data has been saved.", "success");
    });
  });

  elements.historyList.addEventListener("click", (event) => {
    const item = event.target.closest("[data-username]");
    if (!item) return;
    elements.usernameInput.value = item.dataset.username;
    simulateScan(item.dataset.username);
  });

  elements.clearHistoryButton.addEventListener("click", () => {
    state.history = [];
    localStorage.removeItem(STORAGE_KEY);
    renderHistory();
    showToast("History cleared", "Recent scans were removed from this browser.", "success");
  });

  elements.mobileMenuButton.addEventListener("click", () => {
    const isOpen = elements.navLinks.classList.toggle("is-open");
    elements.navActions.classList.toggle("is-open", isOpen);
    elements.mobileMenuButton.setAttribute("aria-expanded", String(isOpen));
  });

  document.querySelectorAll(".nav-links a").forEach((link) => {
    link.addEventListener("click", () => {
      document.querySelectorAll(".nav-links a").forEach((item) => item.classList.remove("active"));
      link.classList.add("active");
      elements.navLinks.classList.remove("is-open");
      elements.navActions.classList.remove("is-open");
      elements.mobileMenuButton.setAttribute("aria-expanded", "false");
    });
  });

  [
    [elements.loginButton, "Demo login", "Authentication can be connected to your backend later."],
    [elements.pricingButton, "Demo plan", "The current build is a free front-end SaaS demo."],
    [elements.twitterButton, "Twitter link", "Add your production social URL here."],
    [elements.privacyButton, "Privacy policy", "This demo stores only recent usernames in localStorage."],
    [elements.termsButton, "Terms of service", "Connect this to your legal page when ready."],
  ].forEach(([button, title, message]) => {
    button.addEventListener("click", () => showToast(title, message, "success"));
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !elements.oauthModal.hidden) {
      closeOAuthModal();
    }
  });

  window.addEventListener("resize", () => {
    if (!state.currentReport) return;
    drawLineChart(elements.engagementCanvas, state.currentReport.engagementSeries, {
      color: "#ba1a1a",
      fill: "rgba(186, 26, 26, 0.08)",
    });
    drawLineChart(elements.weeklyCanvas, state.currentReport.trendSeries, {
      color: "#4f378a",
      fill: "rgba(79, 55, 138, 0.1)",
    });
  });
}

function init() {
  wireEvents();
  loadHistory();
  updateDashboard(buildReport("alex_digital"));
  state.currentReport = null;
  loadRuntimeConfig();
}

init();
