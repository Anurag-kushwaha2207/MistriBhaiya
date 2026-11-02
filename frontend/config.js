// ============================================================================
// MistriBhaiya Frontend Configuration
// ============================================================================
// 1. When running locally or hosted on Render (All-in-One):
//    Leave window.MISTRI_API_BASE empty ("") - calls will use the same origin.
//
// 2. When frontend is hosted on Firebase Hosting:
//    Paste your Render backend URL here:
//    Example: window.MISTRI_API_BASE = "https://mistribaiya-api.onrender.com";
// ============================================================================

window.MISTRI_API_BASE = window.MISTRI_API_BASE || "";

(function () {
  const stored = localStorage.getItem("mistri_api_base");
  if (stored && !window.MISTRI_API_BASE) {
    window.MISTRI_API_BASE = stored;
  }
})();
