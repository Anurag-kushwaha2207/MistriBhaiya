// ============================================================================
// MistriBhaiya Frontend Configuration
// ============================================================================

(function () {
  const isLocal = window.location.hostname === "localhost" ||
                  window.location.hostname === "127.0.0.1" ||
                  window.location.hostname.startsWith("192.168.") ||
                  window.location.hostname.startsWith("10.");

  let stored = localStorage.getItem("mistri_api_base");

  // Fix any legacy stored typo (mistribhaiya-api -> mistribaiya-api)
  if (stored && stored.includes("mistribhaiya-api")) {
    stored = stored.replace("mistribhaiya-api", "mistribaiya-api");
    localStorage.setItem("mistri_api_base", stored);
  }

  if (stored) {
    window.MISTRI_API_BASE = stored;
  } else if (isLocal) {
    // When running locally, use relative origin
    window.MISTRI_API_BASE = "";
  } else {
    // When hosted on Firebase Hosting or public domain, point to live Render backend
    window.MISTRI_API_BASE = "https://mistribaiya-api.onrender.com";
  }
})();
