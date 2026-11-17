const DEFAULT_SETTINGS = {
  enabled: true,
  allowlist: [],
  totalBlocked: 0,
  modules: {
    trackers: true,
    cname: true,
    fingerprint: true,
    params: true,
    headers: true,
    webrtc: true,
    phishing: true,
    timezone: false
  }
};

const STRIPPED_HEADERS = new Set([
  "x-client-data",
  "sec-ch-ua-full-version",
  "sec-ch-ua-full-version-list",
  "sec-ch-ua-model",
  "sec-ch-ua-platform-version",
  "sec-ch-ua-arch",
  "sec-ch-ua-bitness",
  "sec-ch-ua-wow64",
  "sec-ch-ua-form-factors"
]);

const PING_LIKE_TYPES = new Set(["ping", "beacon"]);
const TRACKING_REQUEST_TYPES = new Set([
  "ping",
  "beacon",
  "xmlhttprequest",
  "image",
  "script",
  "csp_report"
]);

let currentState = structuredClone(DEFAULT_SETTINGS);
const tabStats = new Map();
const cnameCache = new Map();
const cnamePending = new Set();
const recentRedirects = new Map();
const redirectBurst = new Map();
let saveTimer = null;

function getStats(tabId) {
  if (typeof tabId !== "number" || tabId < 0) {
    return { host: "", trackersBlocked: 0, paramsStripped: 0, probesBlocked: 0 };
  }
  let stats = tabStats.get(tabId);
  if (!stats) {
    stats = {
      host: "",
      trackersBlocked: 0,
      paramsStripped: 0,
      probesBlocked: 0,
      lastMainFrameAt: 0
    };
    tabStats.set(tabId, stats);
  }
  return stats;
}

function scheduleTotalSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    browser.storage.local.set({ totalBlocked: currentState.totalBlocked }).catch(() => {});
  }, 500);
}

function recordBlock(tabId, field, amount) {
  const count = Number(amount) > 0 ? Math.floor(Number(amount)) : 1;
  if (typeof tabId === "number" && tabId >= 0) {
    const stats = getStats(tabId);
    stats[field] = (stats[field] || 0) + count;
  }
  currentState.totalBlocked += count;
  scheduleTotalSave();
}

function isUrlBypassed(urlStr) {
  if (!currentState.enabled) return true;
  try {
    return currentState.allowlist.includes(new URL(urlStr).hostname);
  } catch {
    return true;
  }
}

function initiatorHost(details) {
  const candidates = [details.originUrl, details.documentUrl];
  for (const raw of candidates) {
    if (!raw) continue;
    try {
      const host = new URL(raw).hostname;
      if (host) return normalizeHost(host);
    } catch {}
  }
  return "";
}

function trackMainFrame(tabId, hostname) {
  if (typeof tabId !== "number" || tabId < 0) return;
  const stats = getStats(tabId);
  const base = getBaseDomain(hostname);
  const now = Date.now();
  const since = now - (stats.lastMainFrameAt || 0);
  stats.lastMainFrameAt = now;
  if (stats.host !== base) {
    if (since > 1500) {
      stats.trackersBlocked = 0;
      stats.paramsStripped = 0;
      stats.probesBlocked = 0;
    }
    stats.host = base;
  }
}

function allowRedirect(tabId, urlStr) {
  if (typeof tabId !== "number" || tabId < 0) return true;
  const now = Date.now();
  const prev = recentRedirects.get(tabId);
  if (prev && prev.url === urlStr && now - prev.at < 5000) return false;
  let burst = redirectBurst.get(tabId);
  if (!burst || now - burst.at > 8000) {
    burst = { at: now, count: 0 };
    redirectBurst.set(tabId, burst);
  }
  burst.count += 1;
  if (burst.count > 6) return false;
  recentRedirects.set(tabId, { url: urlStr, at: now });
  if (recentRedirects.size > 400) {
    for (const [key, value] of recentRedirects) {
      if (now - value.at > 15000) recentRedirects.delete(key);
    }
  }
  return true;
}

function pruneCnameCache() {
  const now = Date.now();
  for (const [key, value] of cnameCache) {
    if (!value.blocked && value.exp <= now) cnameCache.delete(key);
  }
}

function resolveCnameCheck(hostname) {
  const host = normalizeHost(hostname);
  if (!host || isIPAddress(host) || !host.includes(".")) return;
  if (cnamePending.has(host)) return;
  if (!browser.dns || typeof browser.dns.resolve !== "function") return;
  cnamePending.add(host);
  browser.dns
    .resolve(host, ["canonical_name"])
    .then((record) => {
      cnamePending.delete(host);
      const target = record && record.canonicalName ? normalizeHost(record.canonicalName) : "";
      const blocked = Boolean(target && target !== host && isTrackerHost(target));
      cnameCache.set(host, {
        blocked,
        exp: Date.now() + (blocked ? 3600000 : 600000)
      });
      if (cnameCache.size > 3000) pruneCnameCache();
    })
    .catch(() => {
      cnamePending.delete(host);
      cnameCache.set(host, { blocked: false, exp: Date.now() + 600000 });
    });
}

function setPrivacyValue(branch, value, retried) {
  if (!branch || typeof branch.set !== "function") return;
  try {
    const result = branch.set({ value });
    if (result && typeof result.then === "function") {
      result
        .then((outcome) => {
          if (!retried && outcome && outcome.successful === false) {
            setTimeout(() => setPrivacyValue(branch, value, true), 500);
          }
        })
        .catch(() => {
          if (!retried) setTimeout(() => setPrivacyValue(branch, value, true), 500);
        });
    }
  } catch {}
}

function applyBrowserPrivacySettings() {
  if (!browser.privacy) return;
  const hardening = currentState.enabled && currentState.modules.webrtc;
  setPrivacyValue(browser.privacy.network.webRTCIPHandlingPolicy, hardening ? "default_public_interface_only" : "default");
  setPrivacyValue(browser.privacy.network.networkPredictionEnabled, !hardening);
  setPrivacyValue(browser.privacy.websites.hyperlinkAuditingEnabled, !hardening);
  setPrivacyValue(browser.privacy.websites.firstPartyIsolate, hardening);
}

browser.storage.local
  .get(DEFAULT_SETTINGS)
  .then((saved) => {
    currentState = {
      ...DEFAULT_SETTINGS,
      ...saved,
      modules: { ...DEFAULT_SETTINGS.modules, ...(saved.modules || {}) }
    };
    if (!Array.isArray(currentState.allowlist)) currentState.allowlist = [];
    applyBrowserPrivacySettings();
  })
  .catch(() => {});

browser.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.enabled) currentState.enabled = Boolean(changes.enabled.newValue);
  if (changes.allowlist) {
    currentState.allowlist = Array.isArray(changes.allowlist.newValue) ? changes.allowlist.newValue : [];
  }
  if (changes.modules) {
    currentState.modules = { ...DEFAULT_SETTINGS.modules, ...(changes.modules.newValue || {}) };
  }
  if (changes.enabled || changes.allowlist || changes.modules) applyBrowserPrivacySettings();
});

browser.tabs.onRemoved.addListener((tabId) => {
  tabStats.delete(tabId);
  recentRedirects.delete(tabId);
  redirectBurst.delete(tabId);
});

browser.webRequest.onBeforeRequest.addListener(
  (details) => {
    try {
      if (!currentState.enabled) return {};
      let url;
      try {
        url = new URL(details.url);
      } catch {
        return {};
      }
      const reqHost = normalizeHost(url.hostname);
      if (!reqHost) return {};

      if (details.type === "main_frame") {
        const bypassed = isUrlBypassed(details.url);
        trackMainFrame(details.tabId, reqHost);
        if (bypassed) return {};
        if (currentState.modules.phishing && isPunycodeHost(reqHost)) {
          const warnUrl =
            browser.runtime.getURL("warning.html") +
            "?target=" +
            encodeURIComponent(details.url) +
            "&host=" +
            encodeURIComponent(reqHost);
          return { redirectUrl: warnUrl };
        }
        if (currentState.modules.params) {
          const target = findRedirectTarget(url);
          if (target && allowRedirect(details.tabId, details.url)) {
            recordBlock(details.tabId, "paramsStripped", 1);
            return { redirectUrl: target };
          }
          let stripped = 0;
          for (const key of [...url.searchParams.keys()]) {
            if (isTrackingParam(key)) {
              url.searchParams.delete(key);
              stripped++;
            }
          }
          if (stripped > 0 && allowRedirect(details.tabId, details.url)) {
            recordBlock(details.tabId, "paramsStripped", stripped);
            return { redirectUrl: url.toString() };
          }
        }
        return {};
      }

      const initiator = details.originUrl || details.documentUrl;
      if (initiator && isUrlBypassed(initiator)) return {};

      const trackersOn = currentState.modules.trackers;
      const cnameOn = currentState.modules.cname;
      if (!trackersOn && !cnameOn) return {};

      const pageHost = initiatorHost(details);
      if (!pageHost) {
        if (trackersOn && isTrackerHost(reqHost)) {
          recordBlock(details.tabId, "trackersBlocked", 1);
          return { cancel: true };
        }
        return {};
      }

      const pageBase = getBaseDomain(pageHost);
      const reqBase = getBaseDomain(reqHost);
      const sameBase = pageBase === reqBase;
      const owned = isOwnedSibling(pageHost, reqHost);
      const firstPartySubdomain = sameBase && reqHost.length > pageBase.length && reqHost.endsWith("." + pageBase);
      const thirdParty = !sameBase && !owned;

      if (!thirdParty && !firstPartySubdomain) return {};

      if (thirdParty && trackersOn) {
        if (isTrackerHost(reqHost) || isPixelRequest(url)) {
          recordBlock(details.tabId, "trackersBlocked", 1);
          return { cancel: true };
        }
        if (PING_LIKE_TYPES.has(details.type)) {
          recordBlock(details.tabId, "trackersBlocked", 1);
          return { cancel: true };
        }
        if (TRACKING_REQUEST_TYPES.has(details.type) && hasTrackingLabel(reqHost)) {
          recordBlock(details.tabId, "trackersBlocked", 1);
          return { cancel: true };
        }
      }

      if (cnameOn && !isIPAddress(reqHost) && reqHost !== pageHost) {
        const entry = cnameCache.get(reqHost);
        if (entry && entry.blocked) {
          recordBlock(details.tabId, "trackersBlocked", 1);
          return { cancel: true };
        }
        if (!entry || entry.exp <= Date.now()) resolveCnameCheck(reqHost);
      }

      return {};
    } catch {
      return {};
    }
  },
  { urls: ["<all_urls>"] },
  ["blocking"]
);

browser.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    try {
      if (!currentState.enabled || !currentState.modules.headers) return {};
      if (details.method && String(details.method).toUpperCase() === "OPTIONS") return {};
      const initiator = details.originUrl || details.documentUrl || details.url;
      if (isUrlBypassed(initiator)) return {};
      const headers = details.requestHeaders;
      if (!Array.isArray(headers)) return {};
      let destOrigin = "";
      try {
        destOrigin = new URL(details.url).origin;
      } catch {
        return {};
      }
      const method = String(details.method || "GET").toUpperCase();
      const safeMethod = method === "GET" || method === "HEAD" || method === "DELETE";
      const next = [];
      let changed = false;
      for (const header of headers) {
        const lower = header.name.toLowerCase();
        if (safeMethod && STRIPPED_HEADERS.has(lower)) {
          changed = true;
          continue;
        }
        if (lower === "referer" && header.value) {
          try {
            const ref = new URL(header.value);
            if (ref.origin === destOrigin) {
              next.push(header);
            } else {
              next.push({ name: header.name, value: ref.origin + "/" });
              changed = true;
            }
          } catch {
            next.push(header);
          }
          continue;
        }
        next.push(header);
      }
      if (!changed) return {};
      return { requestHeaders: next };
    } catch {
      return {};
    }
  },
  { urls: ["<all_urls>"] },
  ["blocking", "requestHeaders"]
);

browser.runtime.onMessage.addListener((msg, sender) => {
  if (!msg || typeof msg.type !== "string") return undefined;
  if (msg.type === "probe_spoofed") {
    if (!currentState.enabled) return undefined;
    const tabId = sender && sender.tab ? sender.tab.id : -1;
    recordBlock(tabId, "probesBlocked", Number(msg.count) || 1);
    return undefined;
  }
  if (msg.type === "params_stripped_spa") {
    if (!currentState.enabled) return undefined;
    const tabId = sender && sender.tab ? sender.tab.id : -1;
    recordBlock(tabId, "paramsStripped", Number(msg.count) || 1);
    return undefined;
  }
  if (msg.type === "get_stats") {
    const tabId = typeof msg.tabId === "number" ? msg.tabId : -1;
    return Promise.resolve({
      ...getStats(tabId),
      totalBlocked: currentState.totalBlocked
    });
  }
  if (msg.type === "allow_punycode_host") {
    const host = normalizeHost(msg.host);
    if (!host) return Promise.resolve({ ok: false });
    if (!currentState.allowlist.includes(host)) {
      currentState.allowlist = [...currentState.allowlist, host];
      return browser.storage.local
        .set({ allowlist: currentState.allowlist })
        .then(() => ({ ok: true }))
        .catch(() => ({ ok: false }));
    }
    return Promise.resolve({ ok: true });
  }
  return undefined;
});
