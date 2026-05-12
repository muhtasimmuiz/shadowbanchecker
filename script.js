const CHECKS = [
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

const STORAGE_KEY = "shadowcheck_recent_scans_v3";

const state = {
  currentReport: null,
  history: [],
  isScanning: false,
  runtime: {
    profileLookupReady: false,
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
  createdAtText: document.querySelector("#createdAtText"),
  downloadButton: document.querySelector("#downloadButton"),
  engagementCanvas: document.querySelector("#engagementCanvas"),
  emptyProfileState: document.querySelector("#emptyProfileState"),
  followersCount: document.querySelector("#followersCount"),
  followingCount: document.querySelector("#followingCount"),
  forecastText: document.querySelector("#forecastText"),
  healthBadge: document.querySelector("#healthBadge"),
  healthText: document.querySelector("#healthText"),
  historyList: document.querySelector("#historyList"),
  inputWrap: document.querySelector("#inputWrap"),
  loginButton: document.querySelector("#loginButton"),
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
  profileHandle: document.querySelector("#profileHandle"),
  profileMetrics: document.querySelector("#profileMetrics"),
  profileName: document.querySelector("#profileName"),
  profileSummary: document.querySelector("#profileSummary"),
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
      message: "Use 1-15 letters, numbers, or underscores. Example: @username",
    };
  }

  return { ok: true, username };
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

function formatFullNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "--";
  }

  return new Intl.NumberFormat().format(Number(value));
}

function formatDateTime(isoDate) {
  if (!isoDate) return "--";

  return new Date(isoDate).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatDateOnly(isoDate) {
  if (!isoDate) return "--";

  return new Date(isoDate).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
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

function setReportActionsEnabled(enabled) {
  elements.downloadButton.disabled = !enabled;
  elements.copyButton.disabled = !enabled;
}

function resetDashboard({ notify = false } = {}) {
  state.currentReport = null;
  elements.emptyProfileState.hidden = false;
  elements.profileSummary.hidden = true;
  elements.avatar.innerHTML = "";
  elements.profileHandle.textContent = "";
  elements.profileName.textContent = "";
  elements.profileMetrics.hidden = true;
  elements.verifiedIcon.hidden = true;
  elements.followersCount.textContent = "--";
  elements.followingCount.textContent = "--";
  elements.tweetCount.textContent = "--";
  elements.createdAtText.textContent = "--";
  elements.scanTime.textContent = "Ready to scan";
  elements.visibilityScore.textContent = "--";
  elements.trustScore.textContent = "--";
  elements.reachMeter.style.width = "0%";
  elements.reachText.textContent = "Awaiting scan";
  elements.riskLevel.textContent = "Not Scanned";
  elements.healthText.textContent = "Account health: --";
  elements.healthBadge.textContent = "Not Scanned";
  elements.healthBadge.className = "health-badge neutral";
  elements.complianceText.textContent = "Waiting for scan.";
  elements.audienceText.textContent = "Waiting for scan.";
  elements.forecastText.textContent = "Waiting for scan.";
  renderChecks(CHECKS.map((check) => ({ ...check, status: "UNKNOWN" })));
  renderBars([]);
  renderTrend([]);
  renderRecommendations([]);
  drawLineChart(elements.engagementCanvas, [], {
    color: "#7a7582",
    fill: "rgba(122, 117, 130, 0.04)",
  });
  drawLineChart(elements.weeklyCanvas, [], {
    color: "#7a7582",
    fill: "rgba(122, 117, 130, 0.04)",
  });
  setReportActionsEnabled(false);

  if (notify) {
    showToast("Ready for a new scan", "The dashboard has been reset.", "success");
  }
}

async function loadRuntimeConfig() {
  if (window.location.protocol === "file:") {
    state.runtime.profileLookupReady = false;
    return;
  }

  try {
    const response = await fetch("/api/config", {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) return;
    const config = await response.json();
    state.runtime = {
      ...state.runtime,
      ...config,
    };
  } catch {
    state.runtime.profileLookupReady = false;
  }
}

async function fetchScanReport(username) {
  if (window.location.protocol === "file:") {
    throw new Error("Open the server URL before scanning accounts.");
  }

  const response = await fetch(`/api/scan?username=${encodeURIComponent(username)}`, {
    headers: { Accept: "application/json" },
  });
  const payload = await response.json().catch(() => null);

  if (response.ok && payload) {
    return payload;
  }

  throw new Error(payload?.message || payload?.error || "Scan unavailable. Please try again.");
}

function runScan(username) {
  if (state.isScanning) return;

  resetDashboard();
  setScanning(true);
  setError("");

  const steps = [
    "Validating username format...",
    "Loading public profile intelligence...",
    "Evaluating search and reply signals...",
    "Building visibility analytics...",
    "Preparing report...",
  ];
  let progress = 0;

  elements.progressTitle.textContent = `Scanning @${username}`;
  elements.progressText.textContent = steps[0];

  const interval = window.setInterval(() => {
    progress += 9 + Math.round(Math.random() * 11);
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
          showToast("Scan complete", `@${report.username || username} visibility audit is ready.`, "success");
          document.querySelector("#scanner").scrollIntoView({ behavior: "smooth", block: "start" });
        } catch (error) {
          setScanning(false);
          resetDashboard();
          showToast("Scan unavailable", error.message, "error");
        }
      }, 260);
    }
  }, 130);
}

function updateDashboard(report) {
  state.currentReport = report;
  const health = getHealthLabel(report.accountHealth);
  const profile = report.profile || report;
  const username = profile.username || report.username;
  const displayName = profile.name || report.name || username;

  elements.emptyProfileState.hidden = true;
  elements.profileSummary.hidden = false;
  elements.profileMetrics.hidden = false;

  if (profile.profile_image_url) {
    elements.avatar.innerHTML = `<img src="${escapeHtml(profile.profile_image_url)}" alt="${escapeHtml(
      displayName
    )} profile avatar">`;
  } else {
    elements.avatar.textContent = String(username || "?").slice(0, 2).toUpperCase();
  }

  elements.profileHandle.textContent = `@${username}`;
  elements.profileName.textContent = displayName;
  elements.followersCount.textContent = formatCompactNumber(profile.followers_count ?? report.followers_count);
  elements.followingCount.textContent = formatCompactNumber(profile.following_count ?? report.following_count);
  elements.tweetCount.textContent = formatCompactNumber(profile.tweet_count ?? report.tweet_count);
  elements.createdAtText.textContent = formatDateOnly(profile.created_at);
  elements.verifiedIcon.hidden = !profile.verified;
  elements.verifiedIcon.setAttribute("aria-label", profile.verified ? "Verified X account" : "Unverified X account");
  elements.scanTime.textContent = `Scan completed ${formatDateTime(report.generatedAt)}`;
  elements.visibilityScore.textContent = `${report.visibilityScore}%`;
  elements.trustScore.textContent = String(report.trustScore ?? report.accountHealth ?? "--");
  elements.reachMeter.style.width = `${report.audienceReach}%`;
  elements.reachText.textContent = `${report.audienceReach}% reach`;
  elements.riskLevel.textContent = report.engagementRisk;
  elements.healthText.textContent = `Account health: ${report.accountHealth}%`;
  elements.healthBadge.textContent = health.label;
  elements.healthBadge.className = `health-badge ${health.className}`;
  elements.complianceText.textContent = `Your account matches ${report.compliance}% of healthy visibility signals.`;
  elements.audienceText.textContent =
    report.engagementRisk === "High Risk"
      ? "Engagement distribution needs review before scaling posts."
      : "Audience and engagement signals look stable.";
  elements.forecastText.textContent =
    report.visibilityScore >= 75
      ? "Visibility is projected to remain stable this week."
      : "Visibility can improve with safer posting cadence and stronger audience engagement.";

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
  setReportActionsEnabled(true);
}

function renderChecks(checks) {
  elements.checksGrid.innerHTML = checks
    .map((check) => {
      const unknown = check.status === "UNKNOWN";
      const icon = unknown ? "help" : check.icon;
      const label = unknown ? "Unknown" : check.status;
      const description = unknown ? "Waiting for scan." : check.description;

      return `
        <article class="check-card" data-status="${check.status}">
          <span class="check-icon" aria-hidden="true">
            <span class="material-symbols-outlined">${icon}</span>
          </span>
          <div>
            <h4>${check.name}</h4>
            <p>${description}</p>
          </div>
          <span class="status-badge status-${check.status.toLowerCase()}">${label}</span>
        </article>
      `;
    })
    .join("");
}

function renderBars(values) {
  if (!Array.isArray(values) || !values.length) {
    elements.visibilityChart.classList.add("is-empty");
    elements.visibilityChart.innerHTML = Array.from({ length: 8 }, () => "<span></span>").join("");
    return;
  }

  const max = Math.max(...values);
  elements.visibilityChart.classList.remove("is-empty");
  elements.visibilityChart.innerHTML = values
    .map((value, index) => {
      const opacity = 0.2 + (index / values.length) * 0.8;
      const height = Math.max(24, Math.round((value / max) * 76));
      return `<span style="height:${height}px; opacity:${opacity.toFixed(2)}"></span>`;
    })
    .join("");
}

function renderTrend(values) {
  if (!Array.isArray(values) || !values.length) {
    elements.trendList.innerHTML = `
      <div class="empty-state compact">
        <span class="material-symbols-outlined" aria-hidden="true">timeline</span>
        Waiting for scan.
      </div>
    `;
    return;
  }

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
  if (!Array.isArray(recommendations) || !recommendations.length) {
    elements.recommendationList.innerHTML = `
      <li class="is-empty">Run a scan to generate recommendations.</li>
    `;
    return;
  }

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

  context.strokeStyle = "rgba(203, 196, 210, 0.42)";
  context.lineWidth = 1;
  for (let index = 0; index < 4; index += 1) {
    const y = padding + (height / 3) * index;
    context.beginPath();
    context.moveTo(padding, y);
    context.lineTo(cssWidth - padding, y);
    context.stroke();
  }

  if (!Array.isArray(values) || values.length < 2) {
    context.fillStyle = "rgba(73, 69, 81, 0.54)";
    context.font = "600 12px Inter, sans-serif";
    context.fillText("Waiting for scan", padding, cssHeight / 2);
    return;
  }

  const max = Math.max(...values, 100);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
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

function formatReport(report) {
  const profile = report.profile || report;
  const checks = report.checks.map((check) => `- ${check.name}: ${check.status}`).join("\n");
  const recommendations = report.recommendations.map((item) => `- ${item}`).join("\n");

  return `ShadowCheck.ai Full Visibility Audit

Profile
- Name: ${profile.name || report.name || report.username}
- Handle: @${profile.username || report.username}
- Verified: ${profile.verified ? "Yes" : "No"}
- Followers: ${formatFullNumber(profile.followers_count ?? report.followers_count)}
- Following: ${formatFullNumber(profile.following_count ?? report.following_count)}
- Tweets: ${formatFullNumber(profile.tweet_count ?? report.tweet_count)}
- Listed: ${formatFullNumber(profile.listed_count ?? report.listed_count)}
- Account created: ${profile.created_at ? formatDateTime(profile.created_at) : "--"}

Scan
- Date/time: ${formatDateTime(report.generatedAt)}
- Visibility score: ${report.visibilityScore}%
- Trust score: ${report.trustScore}/100
- Account health: ${report.accountHealth}%
- Audience reach: ${report.audienceReach}%
- Risk level: ${report.engagementRisk}

Diagnostic results
${checks}

Recommendations
${recommendations}`;
}

function pdfEscape(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function splitPdfText(text, maxLength = 86) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let current = "";

  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxLength) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  });

  if (current) lines.push(current);
  return lines;
}

function createPdfReport(report) {
  const profile = report.profile || report;
  const commands = [];

  function text(value, x, y, size = 10, font = "F1", color = "0.11 0.10 0.13") {
    commands.push(`${color} rg BT /${font} ${size} Tf ${x} ${y} Td (${pdfEscape(value)}) Tj ET`);
  }

  function wrapped(value, x, y, options = {}) {
    const size = options.size || 10;
    const leading = options.leading || 14;
    const font = options.font || "F1";
    const color = options.color || "0.11 0.10 0.13";
    let cursor = y;
    splitPdfText(value, options.maxLength || 86).forEach((line) => {
      text(line, x, cursor, size, font, color);
      cursor -= leading;
    });
    return cursor;
  }

  commands.push("0.99 0.97 1 rg 0 0 612 792 re f");
  commands.push("0.31 0.22 0.54 rg 0 724 612 68 re f");
  text("ShadowCheck.ai", 46, 762, 18, "F2", "1 1 1");
  text("Full Visibility Audit", 46, 742, 12, "F1", "0.93 0.90 1");
  text(`Generated ${formatDateTime(report.generatedAt)}`, 382, 746, 9, "F1", "0.93 0.90 1");

  commands.push("1 1 1 rg 36 554 540 142 re f");
  commands.push("0.83 0.79 0.86 RG 36 554 540 142 re S");
  text("Profile Intelligence", 54, 674, 14, "F2");
  text(`${profile.name || report.name || report.username} (@${profile.username || report.username})`, 54, 650, 12, "F2");
  text(`Verified: ${profile.verified ? "Yes" : "No"}`, 54, 630);
  text(`Followers: ${formatFullNumber(profile.followers_count ?? report.followers_count)}`, 54, 614);
  text(`Following: ${formatFullNumber(profile.following_count ?? report.following_count)}`, 210, 614);
  text(`Tweets: ${formatFullNumber(profile.tweet_count ?? report.tweet_count)}`, 366, 614);
  text(`Account created: ${profile.created_at ? formatDateTime(profile.created_at) : "--"}`, 54, 594);

  commands.push("1 1 1 rg 36 430 540 100 re f");
  commands.push("0.83 0.79 0.86 RG 36 430 540 100 re S");
  text("Visibility Summary", 54, 508, 14, "F2");
  text(`Visibility Score: ${report.visibilityScore}%`, 54, 484, 12, "F2");
  text(`Trust Score: ${report.trustScore}/100`, 210, 484, 12, "F2");
  text(`Risk Level: ${report.engagementRisk}`, 366, 484, 12, "F2");
  text(`Audience Reach: ${report.audienceReach}%`, 54, 462);
  text(`Account Health: ${report.accountHealth}%`, 210, 462);

  let y = 394;
  text("Diagnostic Results", 54, y, 14, "F2");
  y -= 22;
  report.checks.forEach((check) => {
    text(`${check.name}: ${check.status}`, 54, y, 10, "F1");
    y -= 14;
  });

  y -= 10;
  text("Recommendations", 54, y, 14, "F2");
  y -= 22;
  report.recommendations.forEach((item) => {
    y = wrapped(`- ${item}`, 54, y, { maxLength: 78 });
  });

  text("Generated by ShadowCheck.ai", 54, 34, 9, "F1", "0.29 0.27 0.32");

  const content = commands.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets[index + 1] = pdf.length;
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return pdf;
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
      await navigator.clipboard.writeText(text);
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
            <span>${formatDateTime(item.generatedAt)}</span>
          </span>
          <span>${item.visibilityScore}% visibility</span>
        </button>
      `
    )
    .join("");
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
  runScan(result.username);
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
      showToast("Open the server URL", "Start the local server, then open the OAuth route.", "error");
    }
  });

  elements.newScanButton.addEventListener("click", () => {
    elements.usernameInput.value = "";
    setError("");
    resetDashboard({ notify: true });
    document.querySelector("#top").scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => elements.usernameInput.focus(), 350);
  });

  elements.clearButton.addEventListener("click", () => resetDashboard({ notify: true }));

  elements.downloadButton.addEventListener("click", () => {
    requireReport((report) => {
      downloadFile(`${report.username}-shadowcheck-audit.pdf`, createPdfReport(report), "application/pdf");
      showToast("Audit downloaded", "A branded PDF report has been saved.", "success");
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

  elements.historyList.addEventListener("click", (event) => {
    const item = event.target.closest("[data-username]");
    if (!item) return;
    elements.usernameInput.value = item.dataset.username;
    runScan(item.dataset.username);
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
    [elements.loginButton, "Account access", "Secure sign-in can be connected to your workspace."],
    [elements.pricingButton, "Usage notes", "Profile lookups and report access can be governed from the server."],
    [elements.twitterButton, "Social link", "Add your production social URL here."],
    [elements.privacyButton, "Privacy policy", "Recent usernames are stored locally in this browser."],
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
    if (!state.currentReport) {
      drawLineChart(elements.engagementCanvas, [], {
        color: "#7a7582",
        fill: "rgba(122, 117, 130, 0.04)",
      });
      drawLineChart(elements.weeklyCanvas, [], {
        color: "#7a7582",
        fill: "rgba(122, 117, 130, 0.04)",
      });
      return;
    }

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
  resetDashboard();
  loadRuntimeConfig();
}

init();
