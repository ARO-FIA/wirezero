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

const GPU_PROFILES = [
  { vendor: "Google Inc. (Intel)", renderer: "ANGLE (Intel, Intel(R) UHD Graphics 630 ({id}) Direct3D11 vs_5_0 ps_5_0, D3D11)" },
  { vendor: "Google Inc. (NVIDIA)", renderer: "ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 SUPER ({id}) Direct3D11 vs_5_0 ps_5_0, D3D11)" },
  { vendor: "Google Inc. (AMD)", renderer: "ANGLE (AMD, AMD Radeon RX 580 ({id}) Direct3D11 vs_5_0 ps_5_0, D3D11)" },
  { vendor: "Google Inc. (Intel)", renderer: "ANGLE (Intel, Intel Iris(TM) Plus Graphics ({id}) Direct3D11 vs_5_0 ps_5_0, D3D11)" },
  { vendor: "Google Inc. (NVIDIA)", renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 ({id}) Direct3D11 vs_5_0 ps_5_0, D3D11)" },
  { vendor: "Google Inc. (AMD)", renderer: "ANGLE (AMD, AMD Radeon RX 6700 XT ({id}) Direct3D11 vs_5_0 ps_5_0, D3D11)" },
  { vendor: "Google Inc. (Intel)", renderer: "ANGLE (Intel, Intel(R) UHD Graphics 620 ({id}) Direct3D11 vs_5_0 ps_5_0, D3D11)" },
  { vendor: "Google Inc. (NVIDIA)", renderer: "ANGLE (NVIDIA, NVIDIA GeForce GTX 1050 Ti ({id}) Direct3D11 vs_5_0 ps_5_0, D3D11)" },
  { vendor: "Google Inc. (AMD)", renderer: "ANGLE (AMD, AMD Radeon RX 5700 ({id}) Direct3D11 vs_5_0 ps_5_0, D3D11)" },
  { vendor: "Google Inc. (Intel)", renderer: "ANGLE (Intel, Intel(R) CometLake GT2 ({id}) Direct3D11 vs_5_0 ps_5_0, D3D11)" }
];

const appliedPatches = [];

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function deriveSeed() {
  let host = "";
  try {
    host = window.location.hostname;
  } catch {}
  if (!host) {
    try {
      if (document.referrer) host = new URL(document.referrer).hostname;
    } catch {}
  }
  if (!host) host = "wirezero.local";
  return hashString(host.toLowerCase());
}

const domainSeed = deriveSeed();
const gpuProfile = GPU_PROFILES[domainSeed % GPU_PROFILES.length];
const gpuId = "0x" + (((domainSeed & 0xffff) + 0x1000) >>> 0).toString(16).toUpperCase();
const maskedVendor = gpuProfile.vendor;
const maskedRenderer = gpuProfile.renderer.replace("{id}", gpuId);

let active = true;
let modules = { fingerprint: true, timezone: false, params: true };
let pendingProbes = 0;
let probeTimer = 0;
const maskedArrays = typeof WeakSet === "function" ? new WeakSet() : null;

function groupActive(group) {
  if (group === "fingerprint") return active && modules.fingerprint;
  if (group === "timezone") return active && modules.timezone;
  if (group === "history") return active && modules.params;
  return active;
}

function syncPatches() {
  for (let i = appliedPatches.length - 1; i >= 0; i--) {
    const patch = appliedPatches[i];
    if (!patch.on || groupActive(patch.group)) continue;
    try {
      patch.target[patch.name] = patch.original;
      patch.on = false;
    } catch {}
  }
  for (const patch of appliedPatches) {
    if (patch.on || !groupActive(patch.group)) continue;
    try {
      exportFunction(patch.wrapper, patch.target, { defineAs: patch.name });
      patch.on = true;
    } catch {}
  }
}

function applyState(state) {
  if (!state) return;
  active = Boolean(state.enabled);
  if (Array.isArray(state.allowlist)) {
    active = active && !state.allowlist.includes(window.location.hostname);
  }
  if (state.modules) modules = { ...modules, ...state.modules };
  syncPatches();
}

function notifyProbe() {
  pendingProbes++;
  if (probeTimer) return;
  probeTimer = setTimeout(() => {
    probeTimer = 0;
    const count = pendingProbes;
    pendingProbes = 0;
    if (count > 0 && active) {
      try {
        const sent = browser.runtime.sendMessage({ type: "probe_spoofed", count });
        if (sent && typeof sent.catch === "function") sent.catch(() => {});
      } catch {}
    }
  }, 200);
}

function defineOn(target, name, fn, group) {
  try {
    if (!target || typeof exportFunction !== "function") return false;
    const original = target[name];
    if (typeof original !== "function") return false;
    const wrapper = function () {
      try {
        return fn.apply(this, arguments);
      } catch {
        return original.apply(this, arguments);
      }
    };
    exportFunction(wrapper, target, { defineAs: name });
    appliedPatches.push({
      target,
      name,
      group: group || "fingerprint",
      original,
      wrapper,
      on: true
    });
    return true;
  } catch {
    return false;
  }
}

function maskedCanvasCopy(canvas) {
  try {
    const width = canvas.width;
    const height = canvas.height;
    if (!width || !height) return null;
    if (width * height > 512 * 512) return null;
    const off = document.createElement("canvas");
    off.width = width;
    off.height = height;
    const ctx = off.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(canvas, 0, 0);
    const probe = ctx.getImageData(0, 0, 1, 1);
    if (!probe || !probe.data || probe.data[3] === 0) return null;
    const r = domainSeed & 255;
    const g = (domainSeed >>> 8) & 255;
    const b = (domainSeed >>> 16) & 255;
    ctx.fillStyle = "rgba(" + r + "," + g + "," + b + ",0.02)";
    ctx.fillRect(0, 0, Math.min(2, width), Math.min(2, height));
    return off;
  } catch {
    return null;
  }
}

function maskImageData(img) {
  try {
    const data = img && img.data;
    if (!data || data.length < 4) return;
    const delta = ((domainSeed >>> 5) & 3) + 1;
    data[0] = (data[0] + delta) & 255;
  } catch {}
}

function maskChannelData(arr) {
  try {
    if (!arr || !arr.length) return;
    if (maskedArrays && maskedArrays.has(arr)) return;
    const limit = Math.min(arr.length, 32);
    for (let i = 0; i < limit; i++) {
      const sign = (domainSeed >>> i) & 1 ? 1 : -1;
      arr[i] = arr[i] + sign * 1e-6;
    }
    if (maskedArrays) maskedArrays.add(arr);
  } catch {}
}

function patchContextClass(cls) {
  if (!cls || !cls.prototype) return;
  const proto = cls.prototype;
  const orig = proto.getImageData;
  if (typeof orig !== "function") return;
  defineOn(proto, "getImageData", function (sx, sy, sw, sh) {
    const img = orig.call(this, sx, sy, sw, sh);
    if (active && modules.fingerprint && sw * sh <= 65536) {
      notifyProbe();
      maskImageData(img);
    }
    return img;
  });
}

function patchWebGLClass(cls) {
  if (!cls || !cls.prototype) return;
  const proto = cls.prototype;
  const orig = proto.getParameter;
  if (typeof orig !== "function") return;
  defineOn(proto, "getParameter", function (param) {
    if (active && modules.fingerprint && (param === 37445 || param === 37446)) {
      notifyProbe();
      return param === 37445 ? maskedVendor : maskedRenderer;
    }
    return orig.apply(this, arguments);
  });
}

const pageWin = window.wrappedJSObject;

if (pageWin) {
  const canvasProto = pageWin.HTMLCanvasElement && pageWin.HTMLCanvasElement.prototype;
  const origToDataURL = canvasProto && canvasProto.toDataURL;
  if (typeof origToDataURL === "function") {
    defineOn(canvasProto, "toDataURL", function () {
      if (active && modules.fingerprint) {
        notifyProbe();
        const copy = maskedCanvasCopy(this);
        if (copy) return origToDataURL.apply(copy, arguments);
      }
      return origToDataURL.apply(this, arguments);
    });
  }
  const origToBlob = canvasProto && canvasProto.toBlob;
  if (typeof origToBlob === "function") {
    defineOn(canvasProto, "toBlob", function (callback) {
      if (active && modules.fingerprint) {
        notifyProbe();
        const copy = maskedCanvasCopy(this);
        if (copy) return origToBlob.apply(copy, arguments);
      }
      return origToBlob.apply(this, arguments);
    });
  }

  patchContextClass(pageWin.CanvasRenderingContext2D);
  patchContextClass(pageWin.OffscreenCanvasRenderingContext2D);
  patchWebGLClass(pageWin.WebGLRenderingContext);
  patchWebGLClass(pageWin.WebGL2RenderingContext);

  const audioBufferProto = pageWin.AudioBuffer && pageWin.AudioBuffer.prototype;
  const origGetChannelData = audioBufferProto && audioBufferProto.getChannelData;
  if (typeof origGetChannelData === "function") {
    defineOn(audioBufferProto, "getChannelData", function (channel) {
      const arr = origGetChannelData.call(this, channel);
      if (active && modules.fingerprint) {
        notifyProbe();
        maskChannelData(arr);
      }
      return arr;
    });

    const offlineProto = pageWin.OfflineAudioContext && pageWin.OfflineAudioContext.prototype;
    const origStartRendering = offlineProto && offlineProto.startRendering;
    if (typeof origStartRendering === "function") {
      defineOn(offlineProto, "startRendering", function () {
        const result = origStartRendering.apply(this, arguments);
        if (active && modules.fingerprint && result && typeof result.then === "function") {
          notifyProbe();
          return result.then((buffer) => {
            try {
              for (let i = 0; i < buffer.numberOfChannels; i++) {
                maskChannelData(origGetChannelData.call(buffer, i));
              }
            } catch {}
            return buffer;
          });
        }
        return result;
      });
    }
  }

  const dtfProto = pageWin.Intl && pageWin.Intl.DateTimeFormat && pageWin.Intl.DateTimeFormat.prototype;
  const origResolved = dtfProto && dtfProto.resolvedOptions;
  if (typeof origResolved === "function") {
    defineOn(
      dtfProto,
      "resolvedOptions",
      function () {
        const res = origResolved.apply(this, arguments);
        if (active && modules.timezone) {
          try {
            res.timeZone = "UTC";
            if (res.timeZone === "UTC") return res;
          } catch {}
          try {
            return Object.assign({}, res, { timeZone: "UTC" });
          } catch {}
        }
        return res;
      },
      "timezone"
    );
  }

  const dateProto = pageWin.Date && pageWin.Date.prototype;
  const origOffset = dateProto && dateProto.getTimezoneOffset;
  if (typeof origOffset === "function") {
    defineOn(
      dateProto,
      "getTimezoneOffset",
      function () {
        if (active && modules.timezone) return 0;
        return origOffset.call(this);
      },
      "timezone"
    );
  }
}

const SPA_TRACKING_PARAMS = new Set([
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

function isSpaTrackingParam(key) {
  const lower = String(key || "").toLowerCase();
  if (lower.startsWith("utm_")) return true;
  return SPA_TRACKING_PARAMS.has(lower);
}

function cleanUrlString(href) {
  try {
    const parsed = new URL(href);
    let removed = 0;
    for (const key of [...parsed.searchParams.keys()]) {
      if (isSpaTrackingParam(key)) {
        parsed.searchParams.delete(key);
        removed++;
      }
    }
    if (!removed) return null;
    return { url: parsed.toString(), count: removed };
  } catch {
    return null;
  }
}

function reportParams(count) {
  try {
    const sent = browser.runtime.sendMessage({ type: "params_stripped_spa", count });
    if (sent && typeof sent.catch === "function") sent.catch(() => {});
  } catch {}
}

function patchHistory() {
  try {
    const pageHist = (window.wrappedJSObject && window.wrappedJSObject.history) || window.history;
    if (!pageHist) return;
    const origPush = pageHist.pushState;
    const origReplace = pageHist.replaceState;
    if (typeof origPush !== "function" || typeof origReplace !== "function") return;

    const cleanLocation = () => {
      if (!active || !modules.params) return;
      try {
        const cleaned = cleanUrlString(window.location.href);
        if (!cleaned) return;
        origReplace.call(pageHist, pageHist.state, document.title || "", cleaned.url);
        reportParams(cleaned.count);
      } catch {}
    };

    const wrappedPush = function (state, title, url) {
      const result = origPush.apply(this, arguments);
      cleanLocation();
      return result;
    };

    const wrappedReplace = function (state, title, url) {
      let nextUrl = url;
      if (active && modules.params && typeof url === "string") {
        try {
          const cleaned = cleanUrlString(new URL(url, window.location.href).href);
          if (cleaned) {
            nextUrl = cleaned.url;
            reportParams(cleaned.count);
          }
        } catch {}
      }
      return origReplace.apply(this, [state, title, nextUrl]);
    };

    if (typeof exportFunction === "function") {
      exportFunction(wrappedPush, pageHist, { defineAs: "pushState" });
      exportFunction(wrappedReplace, pageHist, { defineAs: "replaceState" });
    } else {
      pageHist.pushState = wrappedPush;
      pageHist.replaceState = wrappedReplace;
    }

    appliedPatches.push({ target: pageHist, name: "pushState", group: "history", original: origPush, wrapper: wrappedPush, on: true });
    appliedPatches.push({ target: pageHist, name: "replaceState", group: "history", original: origReplace, wrapper: wrappedReplace, on: true });

    if (typeof window.addEventListener === "function") {
      window.addEventListener("popstate", cleanLocation);
    }
  } catch {}
}

patchHistory();

browser.storage.local
  .get(DEFAULT_SETTINGS)
  .then(applyState)
  .catch(() => {});

browser.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (!changes.enabled && !changes.allowlist && !changes.modules) return;
  browser.storage.local
    .get(DEFAULT_SETTINGS)
    .then(applyState)
    .catch(() => {});
});
