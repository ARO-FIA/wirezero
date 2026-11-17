const params = new URLSearchParams(window.location.search);
const target = params.get("target");
const host = params.get("host");
document.getElementById("host-display").textContent = host || "Unknown domain";

document.getElementById("go-back").addEventListener("click", () => {
  if (window.history.length > 1) window.history.back();
  else window.close();
});

document.getElementById("proceed").addEventListener("click", async () => {
  if (host && target) {
    await browser.runtime.sendMessage({ type: "allow_punycode_host", host });
    window.location.replace(target);
  }
});
