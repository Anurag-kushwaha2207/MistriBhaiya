export const getApiBase = () => (window.MISTRI_API_BASE ? window.MISTRI_API_BASE.replace(/\/+$/, "") : "");

export async function api(path, method = "GET", body = null, token = null, onAuthFail = null) {
  const base = getApiBase();
  const url = (base ? base : "") + "/api" + path;
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = "Bearer " + token;
  }

  let r;
  let attempts = 0;
  const maxAttempts = (method === "GET") ? 3 : 1;

  while (attempts < maxAttempts) {
    attempts++;
    try {
      r = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
      });
      break;
    } catch (err) {
      if (attempts >= maxAttempts) {
        throw new Error(err.message || "Failed to fetch. Server might be waking up.");
      }
      // Wait 2.5s before retrying for cold starts
      await new Promise(res => setTimeout(res, 2500));
    }
  }

  let data = {};
  try {
    data = await r.json();
  } catch (e) {}

  if (r.status === 401 && token) {
    if (onAuthFail) onAuthFail();
    throw new Error("Session expired. Please login again.");
  }

  if (!r.ok) {
    const d = data.detail;
    throw new Error(typeof d === "string" ? d : JSON.stringify(d || "Request failed"));
  }

  return data;
}

const LOC_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function clearLocCache() {
  localStorage.removeItem("ks_loc");
  localStorage.removeItem("ks_loc_ts");
}

export function setLocCache(loc) {
  if (loc && loc.lat != null && loc.lng != null) {
    localStorage.setItem("ks_loc", JSON.stringify({ lat: loc.lat, lng: loc.lng }));
    localStorage.setItem("ks_loc_ts", Date.now().toString());
  }
}

export function getLoc(force = false) {
  return new Promise((res, rej) => {
    const cached = localStorage.getItem("ks_loc");
    const cachedTs = parseInt(localStorage.getItem("ks_loc_ts") || "0", 10);
    const isFresh = cached && (Date.now() - cachedTs < LOC_TTL_MS);

    if (isFresh && !force) {
      try { return res(JSON.parse(cached)); } catch (e) {}
    }
    if (!navigator.geolocation) {
      return rej(new Error("Location permission needed"));
    }
    navigator.geolocation.getCurrentPosition(
      p => {
        const loc = { lat: p.coords.latitude, lng: p.coords.longitude };
        setLocCache(loc);
        res(loc);
      },
      () => {
        // Fallback without high accuracy if satellite lock timed out
        navigator.geolocation.getCurrentPosition(
          p2 => {
            const loc = { lat: p2.coords.latitude, lng: p2.coords.longitude };
            setLocCache(loc);
            res(loc);
          },
          () => {
            if (isFresh && cached) {
              try { return res(JSON.parse(cached)); } catch (e) {}
            }
            rej(new Error("कृपया GPS / लोकेशन ऑन करें और अनुमति दें"));
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  });
}

export function compressAndResizeImage(file, maxDim = 320, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

