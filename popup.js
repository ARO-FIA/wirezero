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

const domainEl = document.getElementById("domain");
const siteBtn = document.getElementById("site-btn");
const trackersEl = document.getElementById("trackers-count");
const paramsEl = document.getElementById("params-count");
const probesEl = document.getElementById("probes-count");
const allTimeEl = document.getElementById("all-time-total");

let state = structuredClone(DEFAULT_SETTINGS);
let activeHost = "";
let activeTabId = null;

function renderStatus() {
  const isOn = Boolean(state.enabled);
  siteBtn.textContent = isOn ? "Active" : "Paused";
  siteBtn.classList.toggle("paused", !isOn);
  document.querySelectorAll("[data-module]").forEach((input) => {
    input.disabled = !isOn;
  });
}

async function refreshStats() {
  if (activeTabId === null) return;
  try {
    const stats = await browser.runtime.sendMessage({ type: "get_stats", tabId: activeTabId });
    if (!stats) return;
    trackersEl.textContent = Number(stats.trackersBlocked || 0).toLocaleString();
    paramsEl.textContent = Number(stats.paramsStripped || 0).toLocaleString();
    probesEl.textContent = Number(stats.probesBlocked || 0).toLocaleString();
    allTimeEl.textContent = Number(stats.totalBlocked || 0).toLocaleString();
  } catch {}
}

async function init() {
  try {
    const saved = await browser.storage.local.get(DEFAULT_SETTINGS);
    state = {
      ...DEFAULT_SETTINGS,
      ...saved,
      modules: { ...DEFAULT_SETTINGS.modules, ...(saved.modules || {}) }
    };
  } catch {}

  document.querySelectorAll("[data-module]").forEach((input) => {
    const key = input.dataset.module;
    input.checked = Boolean(state.modules[key]);
    input.addEventListener("change", async () => {
      if (!state.enabled) {
        input.checked = Boolean(state.modules[key]);
        return;
      }
      state.modules[key] = input.checked;
      await browser.storage.local.set({ modules: state.modules });
    });
  });

  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      activeTabId = tab.id;
      const url = new URL(tab.url);
      if (url.protocol.startsWith("http")) {
        activeHost = url.hostname;
        domainEl.textContent = activeHost;
      }
    }
  } catch {}

  renderStatus();
  await refreshStats();
  setInterval(refreshStats, 600);
}

siteBtn.addEventListener("click", async () => {
  state.enabled = !state.enabled;
  await browser.storage.local.set({ enabled: state.enabled });
  renderStatus();
});

init();
