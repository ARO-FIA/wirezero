const TRACKER_DOMAINS = new Set([
  "2o7.net",
  "2mdn.net",
  "33across.com",
  "ad.doubleclick.net",
  "adform.net",
  "adition.com",
  "ads-api.twitter.com",
  "ads.linkedin.com",
  "ads.pinterest.com",
  "ads.reddit.com",
  "ads.tiktok.com",
  "adsrvr.org",
  "adnxs.com",
  "adobedtm.com",
  "adservice.google.com",
  "ads-twitter.com",
  "advertising.com",
  "adtechus.com",
  "adroll.com",
  "agkn.com",
  "adjust.com",
  "amazon-adsystem.com",
  "amplitude.com",
  "an.facebook.com",
  "analytics.pinterest.com",
  "analytics.tiktok.com",
  "analytics.twitter.com",
  "appboy.com",
  "appsflyer.com",
  "bat.bing.com",
  "bidswitch.net",
  "bluekai.com",
  "branch.io",
  "braze.com",
  "bugsnag.com",
  "c.bing.com",
  "casalemedia.com",
  "cdn.segment.com",
  "clicktale.com",
  "clicky.com",
  "clarity.ms",
  "cnzz.com",
  "connect.facebook.net",
  "contextweb.com",
  "contentsquare.net",
  "cpro.baidu.com",
  "criteo.com",
  "criteo.net",
  "crwdcntrl.net",
  "customer.io",
  "datadoghq.com",
  "decibelinsight.net",
  "demdex.net",
  "dotomi.com",
  "doubleclick.net",
  "doubleverify.com",
  "drift.com",
  "driftcdn.com",
  "dynatrace.com",
  "everesttech.net",
  "events.redditmedia.com",
  "exoclick.com",
  "fingerprint.com",
  "fingerprintjs.com",
  "flashtalking.com",
  "fpjscdn.net",
  "fullstory.com",
  "goatcounter.com",
  "google-analytics.com",
  "googleadservices.com",
  "googletagmanager.com",
  "googlesyndication.com",
  "heap.io",
  "histats.com",
  "hm.baidu.com",
  "hs-analytics.net",
  "hotjar.com",
  "hotjar.io",
  "hubspot.com",
  "imrworldwide.com",
  "indexww.com",
  "inspectlet.com",
  "intercom.io",
  "intercomcdn.com",
  "jwpltx.com",
  "kochava.com",
  "krxd.net",
  "leadforensics.com",
  "lijit.com",
  "logrocket.com",
  "matomo.cloud",
  "marketo.net",
  "mathtag.com",
  "mc.yandex.ru",
  "media.net",
  "mediamath.com",
  "mgid.com",
  "mixpanel.com",
  "moatads.com",
  "mookie1.com",
  "mouseflow.com",
  "newrelic.com",
  "nr-data.net",
  "omtrdc.net",
  "openx.net",
  "outbrain.com",
  "pardot.com",
  "pendo.io",
  "pixel.facebook.com",
  "pixel.wp.com",
  "plausible.io",
  "popads.net",
  "pubmatic.com",
  "quantserve.com",
  "quantummetric.com",
  "raygun.com",
  "revcontent.com",
  "rlcdn.com",
  "rollbar.com",
  "rubiconproject.com",
  "rudderlabs.com",
  "scorecardresearch.com",
  "segment.io",
  "segment.com",
  "sentry.io",
  "serving-sys.com",
  "sessioncam.com",
  "sharethis.com",
  "sharethrough.com",
  "sizmek.com",
  "sitescout.com",
  "skimlinks.com",
  "simpleanalytics.com",
  "singular.net",
  "smartadserver.com",
  "smartlook.com",
  "sovrn.com",
  "statcounter.com",
  "stickyadstv.com",
  "stats.wp.com",
  "taboola.com",
  "teads.tv",
  "trackjs.com",
  "tr.snapchat.com",
  "trafficjunky.net",
  "tribalfusion.com",
  "trk.pinterest.com",
  "turn.com",
  "tynt.com",
  "umeng.com",
  "unityads.unity3d.com",
  "usefathom.com",
  "yieldlab.net",
  "yieldmo.com",
  "zedo.com",
  "addthis.com",
  "an.yandex.ru"
]);

const TRACKER_SUBDOMAINS = new Set([
  "analytics.tiktok.com",
  "analytics.twitter.com",
  "ads-api.twitter.com",
  "ads.linkedin.com",
  "adservice.google.com",
  "bat.bing.com",
  "c.bing.com",
  "pixel.facebook.com",
  "px.ads.linkedin.com",
  "snap.licdn.com",
  "tr.snapchat.com"
]);

const PIXEL_PATHS = [
  { hosts: ["facebook.com", "www.facebook.com", "m.facebook.com", "web.facebook.com"], paths: ["/tr"] },
  { hosts: ["twitter.com", "www.twitter.com", "x.com", "www.x.com"], paths: ["/i/adsct", "/i/ct"] },
  { hosts: ["google.com", "www.google.com"], paths: ["/pagead"] }
];

const TRACKING_SUBDOMAIN_PREFIXES = new Set([
  "analytics",
  "telemetry",
  "metrics",
  "beacon",
  "pixel",
  "track",
  "tracker",
  "tracking",
  "collect",
  "collector",
  "events",
  "stats",
  "log",
  "logs",
  "logging",
  "apm",
  "ads",
  "ad",
  "tag",
  "tags"
]);

const OWNED_DOMAIN_GROUPS = [
  ["facebook.com", "facebook.net", "fbcdn.net", "fb.com", "instagram.com", "messenger.com"],
  ["reddit.com", "redditstatic.com", "redditmedia.com", "redd.it"],
  ["twitter.com", "x.com", "twimg.com"],
  ["linkedin.com", "licdn.com"],
  ["google.com", "googleapis.com", "gstatic.com", "googleusercontent.com", "youtube.com", "youtu.be"],
  ["tiktok.com", "tiktokv.com", "bytedance.com", "byteoversea.com", "snssdk.com"],
  ["spotify.com", "scdn.co", "spotifycdn.com"],
  ["amazon.com", "amazonaws.com", "media-amazon.com"],
  ["microsoft.com", "live.com", "office.com", "msn.com"],
  ["apple.com", "icloud.com"],
  ["yahoo.com", "yimg.com"],
  ["snapchat.com", "snapcdn.net"],
  ["pinterest.com", "pinimg.com"],
  ["twitch.tv", "ttvnw.net"],
  ["zoom.us", "zoominfo.com"]
];

const SECOND_LEVEL_SUFFIXES = new Set([
  "ac.uk",
  "co.uk",
  "gov.uk",
  "me.uk",
  "net.uk",
  "org.uk",
  "pl.uk",
  "sch.uk",
  "com.au",
  "net.au",
  "org.au",
  "edu.au",
  "gov.au",
  "id.au",
  "asn.au",
  "co.nz",
  "net.nz",
  "org.nz",
  "ac.nz",
  "go.jp",
  "ne.jp",
  "or.jp",
  "co.jp",
  "lg.jp",
  "ac.jp",
  "com.br",
  "net.br",
  "org.br",
  "com.mx",
  "com.ar",
  "com.co",
  "com.pe",
  "com.cl",
  "com.cn",
  "net.cn",
  "org.cn",
  "com.tw",
  "org.tw",
  "com.hk",
  "com.sg",
  "com.my",
  "co.kr",
  "or.kr",
  "ne.kr",
  "co.in",
  "net.in",
  "org.in",
  "firm.in",
  "gen.in",
  "ind.in",
  "com.tr",
  "org.tr",
  "net.tr",
  "co.za",
  "org.za",
  "web.za",
  "com.pl",
  "com.ua",
  "com.ru",
  "net.ru",
  "org.ru",
  "com.ve",
  "com.uy",
  "com.ec",
  "com.eg",
  "com.sa",
  "com.ae",
  "com.qa",
  "com.kw",
  "com.bh",
  "com.om",
  "com.jo",
  "com.lb",
  "com.pk",
  "com.bd",
  "com.np",
  "com.lk",
  "com.mm",
  "com.kh",
  "com.vn",
  "com.ph",
  "com.id",
  "co.th",
  "in.th",
  "com.sg"
]);

const TRACKING_PARAMS = new Set([
  "fbclid",
  "gclid",
  "dclid",
  "gbraid",
  "wbraid",
  "msclkid",
  "mc_eid",
  "mc_cid",
  "yclid",
  "_hsenc",
  "_hsmi",
  "igshid",
  "si",
  "ref_src",
  "ref_url",
  "oly_anon_id",
  "oly_enc_id",
  "vero_id",
  "wickedid",
  "rb_clickid",
  "s_cid",
  "srsltid",
  "mkt_tok",
  "pk_campaign",
  "pk_kwd",
  "mtm_campaign",
  "mtm_cid",
  "mtm_group",
  "mtm_keyword",
  "mtm_source",
  "twclid",
  "ttclid",
  "li_fat_id",
  "epik",
  "vero_conv",
  "hmpl",
  "trkinfo",
  "campaign_id",
  "ad_id",
  "adid"
]);

const REDIRECT_WRAPPERS = [
  { hosts: ["facebook.com", "www.facebook.com", "m.facebook.com", "l.facebook.com", "web.facebook.com"], path: "/l.php", params: ["u"] },
  { hosts: ["instagram.com", "www.instagram.com", "l.instagram.com"], path: "/", params: ["u"] },
  { hosts: ["reddit.com", "www.reddit.com", "old.reddit.com", "new.reddit.com", "out.reddit.com"], path: "/url", params: ["url"] },
  { hosts: ["google.com", "www.google.com", "google.co.uk", "www.google.co.uk", "google.ca", "www.google.ca", "google.de", "www.google.de", "google.fr", "www.google.fr", "google.com.au", "www.google.com.au"], path: "/url", params: ["url", "q"] },
  { hosts: ["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com"], path: "/redirect", params: ["q"] },
  { hosts: ["twitter.com", "www.twitter.com", "x.com", "www.x.com"], path: "/i/redirect", params: ["url"] },
  { hosts: ["linkedin.com", "www.linkedin.com"], path: "/safety/go", params: ["url"] },
  { hosts: ["mail.google.com"], path: "/url", params: ["q", "url"] },
  { hosts: ["tumblr.com", "www.tumblr.com"], path: "/redirect", params: ["u"] }
];

function normalizeHost(hostname) {
  return String(hostname || "").toLowerCase().replace(/\.$/, "");
}

function isIPAddress(hostname) {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || hostname.includes(":");
}

function getBaseDomain(hostname) {
  const host = normalizeHost(hostname);
  const parts = host.split(".").filter(Boolean);
  if (parts.length <= 2) return host;
  const lastTwo = parts.slice(-2).join(".");
  if (SECOND_LEVEL_SUFFIXES.has(lastTwo)) return parts.slice(-3).join(".");
  return lastTwo;
}

function domainMatches(hostname, domain) {
  const host = normalizeHost(hostname);
  const target = normalizeHost(domain);
  return host === target || host.endsWith("." + target);
}

function isTrackerHost(hostname) {
  const host = normalizeHost(hostname);
  if (!host || isIPAddress(host)) return false;
  for (const domain of TRACKER_DOMAINS) {
    if (domainMatches(host, domain)) return true;
  }
  for (const domain of TRACKER_SUBDOMAINS) {
    if (domainMatches(host, domain)) return true;
  }
  return false;
}

function hasTrackingLabel(hostname) {
  const host = normalizeHost(hostname);
  const labels = host.split(".").filter(Boolean);
  if (labels.length < 3) return false;
  return TRACKING_SUBDOMAIN_PREFIXES.has(labels[0]);
}

function isOwnedSibling(firstHost, secondHost) {
  const a = normalizeHost(firstHost);
  const b = normalizeHost(secondHost);
  if (!a || !b) return false;
  if (getBaseDomain(a) === getBaseDomain(b)) return true;
  for (const group of OWNED_DOMAIN_GROUPS) {
    const inA = group.some((d) => domainMatches(a, d));
    const inB = group.some((d) => domainMatches(b, d));
    if (inA && inB) return true;
  }
  return false;
}

function isTrackingParam(key) {
  const lower = String(key || "").toLowerCase();
  if (lower.startsWith("utm_")) return true;
  return TRACKING_PARAMS.has(lower);
}

function isPixelRequest(url) {
  const host = normalizeHost(url.hostname);
  const path = url.pathname || "/";
  for (const pixel of PIXEL_PATHS) {
    if (!pixel.hosts.includes(host)) continue;
    for (const prefix of pixel.paths) {
      if (path === prefix || path.startsWith(prefix + "/")) return true;
    }
  }
  return false;
}

function findRedirectTarget(url) {
  const host = normalizeHost(url.hostname);
  const path = (url.pathname || "/").replace(/\/+$/, "") || "/";
  const lowerPath = path.toLowerCase();
  for (const wrapper of REDIRECT_WRAPPERS) {
    if (!wrapper.hosts.includes(host)) continue;
    if (lowerPath !== wrapper.path) continue;
    for (const param of wrapper.params) {
      const value = url.searchParams.get(param);
      if (value && /^https?:\/\//i.test(value.trim())) return value.trim();
    }
  }
  return null;
}

function isPunycodeHost(hostname) {
  const host = normalizeHost(hostname);
  if (!host) return false;
  return host.split(".").some((label) => label.startsWith("xn--"));
}
