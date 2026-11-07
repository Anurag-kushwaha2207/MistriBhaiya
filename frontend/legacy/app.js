/* MistriBaiya PWA - plain JavaScript, no build step. Served by the FastAPI backend. */
const T = {
  hi: {
    login: "लॉगिन", phone: "मोबाइल नंबर", name: "आपका नाम", iam: "मैं हूँ", worker: "मिस्त्री / मज़दूर", customer: "घर मालिक / ग्राहक",
    getotp: "OTP भेजें", otp: "OTP डालें", verify: "लॉगिन करें", devotp: "टेस्ट मोड: OTP अपने आप भर दिया गया",
    today: "आज", jobs: "काम", bookings: "बुकिंग", profile: "प्रोफाइल", find: "खोजें", post: "काम डालें", myjobs: "मेरे काम",
    freeToday: "✅ मैं आज फ्री हूँ", busy: "⛔ बिज़ी हूँ", offline: "😴 आज काम नहीं", hours: "कितने घंटे फ्री", status: "अभी की स्थिति",
    s_free: "फ्री", s_busy: "बिज़ी", s_offline: "बंद", setloc: "📍 मेरी लोकेशन सेट करें", locok: "लोकेशन मिल गई",
    skills: "आपका काम", rate: "दिन की मज़दूरी (₹)", exp: "अनुभव (साल)", village: "गाँव / मोहल्ला", radius: "कितनी दूर तक काम करेंगे",
    save: "सेव करें", saved: "सेव हो गया", km: "कि.मी.", away: "दूर", call: "📞 कॉल", book: "बुक करें", filters: "फ़िल्टर", dist: "दूरी",
    freeonly: "सिर्फ़ फ्री मिस्त्री", date: "तारीख", days: "कितने दिन", note: "काम की जानकारी", address: "पता / जगह", send: "रिक्वेस्ट भेजें",
    sent: "रिक्वेस्ट भेज दी गई", accept: "मंज़ूर", reject: "मना", complete: "काम पूरा", cancel: "कैंसिल", rateit: "रेटिंग दें", stars: "स्टार (1-5)",
    nojobs: "अभी आपके पास कोई काम नहीं", nowork: "आपकी दूरी में कोई मिस्त्री नहीं मिला", interested: "मैं कर सकता हूँ", interestsent: "ग्राहक को बता दिया गया",
    budget: "बजट (₹)", desc: "काम का विवरण", posted: "काम डाल दिया गया", skill: "काम का प्रकार", all: "सभी", logout: "लॉगआउट",
    profilefirst: "पहले प्रोफाइल और लोकेशन सेट करें", reqd: "ज़रूरी जानकारी भरें", interestedw: "इच्छुक मिस्त्री", sort: "क्रम", smart: "फ्री पहले", rating: "रेटिंग",
    live: "● लाइव", newbook: "नई बुकिंग रिक्वेस्ट!", upd: "बुकिंग अपडेट", customerName: "ग्राहक", workerName: "मिस्त्री", noloc: "लोकेशन चाहिए",
    st_requested: "इंतज़ार में", st_accepted: "मंज़ूर", st_rejected: "मना", st_completed: "पूरा", st_cancelled: "कैंसिल", rupee: "₹/दिन",
    instant: "⚡ अभी चाहिए", instantSub: "सबसे पास के फ्री मिस्त्री को तुरंत रिक्वेस्ट जाएगी", searching: "पास के मिस्त्री ढूँढ रहे हैं…", wave: "राउंड",
    matched: "मिस्त्री मिल गया! 🎉", noWorker: "अभी कोई फ्री मिस्त्री नहीं मिला। थोड़ी देर बाद या दूरी बढ़ाकर कोशिश करें।", offerTitle: "नया काम मिला!", seconds: "सेकंड",
    startWork: "▶ काम शुरू (OTP)", enterOtp: "ग्राहक से 4 अंक का OTP पूछें", otpLabel: "काम शुरू OTP", otpHint: "मिस्त्री आने पर ये OTP उसे बताएँ", st_started: "शुरू",
    inapp: "🎧 ऐप से कॉल (फ्री)", phonecall: "📱 फोन से कॉल", calling: "कॉल लग रही है…", incoming: "आपको कॉल आ रही है", answer: "उठाएँ", hangup: "काटें", callended: "कॉल खत्म",
    connected: "कॉल चालू है", nomic: "माइक की अनुमति चाहिए", sos: "🆘 SOS", sosSent: "SOS भेज दिया गया। ज़रूरत हो तो 112 पर कॉल करें।", report: "शिकायत", reportWhy: "शिकायत का कारण लिखें",
    earnings: "मेरी कमाई", jobsDone: "पूरे काम", totalEarned: "कुल कमाई", thisMonth: "इस महीने", upcoming: "आने वाले काम", close: "बंद करें",
    changePhoto: "फोटो बदलें", editProfile: "जानकारी बदलें", viewProfile: "प्रोफाइल देखें", saveChanges: "सेव करें", removePhoto: "फोटो हटाएं", userInfo: "व्यक्तिगत जानकारी", workInfo: "काम की जानकारी", photoUpdated: "फोटो अपडेट हो गई", confirmLogout: "क्या आप सच में लॉगआउट करना चाहते हैं?", cancelEdit: "रद्द करें"
  },
  en: {
    login: "Login", phone: "Mobile number", name: "Your name", iam: "I am a", worker: "Mistri / Labour", customer: "Home owner / Customer",
    getotp: "Send OTP", otp: "Enter OTP", verify: "Login", devotp: "Test mode: OTP auto-filled",
    today: "Today", jobs: "Jobs", bookings: "Bookings", profile: "Profile", find: "Find", post: "Post job", myjobs: "My jobs",
    freeToday: "✅ I am free today", busy: "⛔ I am busy", offline: "😴 Not working today", hours: "Free for how many hours", status: "Current status",
    s_free: "Free", s_busy: "Busy", s_offline: "Offline", setloc: "📍 Set my location", locok: "Location captured",
    skills: "Your skills", rate: "Daily wage (₹)", exp: "Experience (years)", village: "Village / locality", radius: "How far will you travel for work",
    save: "Save", saved: "Saved", km: "km", away: "away", call: "📞 Call", book: "Book", filters: "Filters", dist: "Distance",
    freeonly: "Only free mistris", date: "Date", days: "Days", note: "Work details", address: "Address / site", send: "Send request",
    sent: "Request sent", accept: "Accept", reject: "Reject", complete: "Mark done", cancel: "Cancel", rateit: "Rate", stars: "Stars (1-5)",
    nojobs: "No jobs near you right now", nowork: "No mistri found in this distance", interested: "I can do this", interestsent: "Customer has been told",
    budget: "Budget (₹)", desc: "Job description", posted: "Job posted", skill: "Type of work", all: "All", logout: "Logout",
    profilefirst: "Set your profile and location first", reqd: "Please fill required fields", interestedw: "Interested mistris", sort: "Sort", smart: "Free first", rating: "Rating",
    live: "● LIVE", newbook: "New booking request!", upd: "Booking update", customerName: "Customer", workerName: "Mistri", noloc: "Location needed",
    st_requested: "Waiting", st_accepted: "Accepted", st_rejected: "Rejected", st_completed: "Done", st_cancelled: "Cancelled", rupee: "₹/day",
    instant: "⚡ Need now", instantSub: "Request goes to the nearest free mistris instantly", searching: "Finding nearby mistris…", wave: "Round",
    matched: "Mistri found! 🎉", noWorker: "No free mistri right now. Try again shortly or increase the distance.", offerTitle: "New job!", seconds: "sec",
    startWork: "▶ Start work (OTP)", enterOtp: "Ask the customer for the 4-digit OTP", otpLabel: "Start-work OTP", otpHint: "Tell this OTP to the mistri when he arrives", st_started: "Started",
    inapp: "🎧 In-app call (free)", phonecall: "📱 Phone call", calling: "Calling…", incoming: "Incoming call", answer: "Answer", hangup: "End", callended: "Call ended",
    connected: "Call in progress", nomic: "Microphone permission needed", sos: "🆘 SOS", sosSent: "SOS sent. Call 112 if you need help.", report: "Report", reportWhy: "Reason for the complaint",
    earnings: "My earnings", jobsDone: "Jobs done", totalEarned: "Total earned", thisMonth: "This month", upcoming: "Upcoming", close: "Close",
    changePhoto: "Change Photo", editProfile: "Edit Details", viewProfile: "View Profile", saveChanges: "Save Changes", removePhoto: "Remove Photo", userInfo: "Personal Info", workInfo: "Work Details", photoUpdated: "Photo updated successfully", confirmLogout: "Are you sure you want to log out?", cancelEdit: "Cancel"
  }
};

const S = { token: localStorage.getItem("ks_token"), user: null, profile: null, lang: localStorage.getItem("ks_lang") || "hi",
            meta: null, tab: null, loc: JSON.parse(localStorage.getItem("ks_loc") || "null"), ws: null, wsTimer: null,
            f: { skill: "", radius: 6, freeOnly: false, date: "", sort: "smart" }, otpPhone: "" };
const t = k => (T[S.lang] && T[S.lang][k]) || T.en[k] || k;
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const skillName = k => { const s = (S.meta?.skills || []).find(x => x.key === k); return s ? s[S.lang] : k; };
const todayStr = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };

function toast(msg) { const el = $("#toast"); el.textContent = msg; el.style.display = "block"; clearTimeout(toast.t); toast.t = setTimeout(() => el.style.display = "none", 3000); }

const getApiBase = () => (window.MISTRI_API_BASE ? window.MISTRI_API_BASE.replace(/\/+$/, "") : "");

async function api(path, method = "GET", body) {
  const base = getApiBase();
  const url = (base ? base : "") + "/api" + path;
  const r = await fetch(url, { method, headers: { "Content-Type": "application/json", ...(S.token ? { Authorization: "Bearer " + S.token } : {}) },
                                         body: body ? JSON.stringify(body) : undefined });
  let data = {}; try { data = await r.json(); } catch (e) {}
  if (r.status === 401 && S.token) { logout(); throw new Error("Login again"); }
  if (!r.ok) { const d = data.detail; throw new Error(typeof d === "string" ? d : JSON.stringify(d || "Error")); }
  return data;
}
const guard = fn => async (...a) => { try { await fn(...a); } catch (e) { toast(e.message); } };

function getLoc(force) {
  return new Promise((res, rej) => {
    if (S.loc && !force) return res(S.loc);
    if (!navigator.geolocation) return rej(new Error(t("noloc")));
    navigator.geolocation.getCurrentPosition(p => { S.loc = { lat: p.coords.latitude, lng: p.coords.longitude }; localStorage.setItem("ks_loc", JSON.stringify(S.loc)); res(S.loc); },
      () => rej(new Error(t("noloc"))), { enableHighAccuracy: true, timeout: 15000 });
  });
}

/* ---------------- realtime ---------------- */
function connectWS() {
  if (!S.token) return;
  const base = getApiBase();
  let wsUrl;
  if (base) {
    const wsProto = base.startsWith("https") ? "wss" : "ws";
    const host = base.replace(/^https?:\/\//, "");
    wsUrl = `${wsProto}://${host}/ws?token=${encodeURIComponent(S.token)}`;
  } else {
    const proto = location.protocol === "https:" ? "wss" : "ws";
    wsUrl = `${proto}://${location.host}/ws?token=${encodeURIComponent(S.token)}`;
  }
  const ws = new WebSocket(wsUrl);
  S.ws = ws;
  ws.onopen = () => { subscribeWS(); clearInterval(S.pingT); S.pingT = setInterval(() => { try { ws.send(JSON.stringify({ type: "ping" })); } catch (e) {} }, 25000); };
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.type === "worker_status" && S.tab === "find") { clearTimeout(S.refT); S.refT = setTimeout(guard(loadWorkers), 400); }
    if (m.type === "booking_new") { toast(t("newbook")); if (S.tab === "bookings") showBookings(); }
    if (m.type === "booking_update") { toast(t("upd") + ": " + (m.status === "countered" ? t("counterRecv") + " ₹" + m.rate : t("st_" + m.status))); if (S.tab === "bookings") showBookings(); if (S.tab === "today") showToday(); }
    if (m.type === "chat") onChatEvent(m);
    if (m.type === "project_new") { toast("🏗️ " + t("newProject") + ": " + m.title); if (S.tab === "projects") showProjects(); }
    if (m.type === "project_update") { toast("🏗️ " + t("projUpd") + (m.status ? ": " + m.status : "")); if (["projects", "contractors"].includes(S.tab)) route(); }
    if (m.type === "crew_invite") { toast("👥 " + t("crewInvite") + ": " + m.contractor); if (S.tab === "today") showToday(); }
    if (m.type === "crew_update") { toast("👥 " + (m.name || "") + " " + m.status); if (S.tab === "crew") showCrew(); }
    if (m.type === "crew_assigned") { toast("🏗️ " + t("assigned") + ": " + m.title); }
    if (m.type === "instant_offer") showOffer(m);
    if (m.type === "instant_closed") { closeOffer(); }
    if (m.type === "instant_status") onInstantStatus(m);
    if (m.type === "rtc") onRtc(m);
    if (m.type === "rtc_unavailable") { rtcClose(); toast(t("phonecall")); guard(() => doCall({ booking_id: m.booking_id }))(); }
    if (m.type === "sos") { beepOnce(); alert("🆘 SOS!"); }
    if (m.type === "job_interest") { toast("👷 " + m.worker + " - " + t("interested")); if (S.tab === "myjobs") showMyJobs(); }
  };
  ws.onclose = () => { clearInterval(S.pingT); if (S.token) { clearTimeout(S.wsTimer); S.wsTimer = setTimeout(connectWS, 3000); } };
}
function subscribeWS() {
  if (S.ws && S.ws.readyState === 1 && S.loc && S.user?.role === "customer")
    S.ws.send(JSON.stringify({ type: "subscribe", lat: S.loc.lat, lng: S.loc.lng, radius_km: S.f.radius }));
}

/* ---------------- image compression ---------------- */
function compressAndResizeImage(file, maxDim = 320, quality = 0.82) {
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

/* ---------------- shell & profile ---------------- */
function logout() {
  localStorage.removeItem("ks_token");
  S.token = null;
  S.user = null;
  S.profile = null;
  if (S.ws) try { S.ws.close(); } catch (e) {}
  const modal = $("#profmodal");
  if (modal) modal.remove();
  showLogin();
}

function topbar() {
  let userBtn = "";
  if (S.user) {
    const av = S.user.avatar
      ? `<span class="avatar-sm"><img src="${esc(S.user.avatar)}" alt=""></span>`
      : `<span class="avatar-sm">👤</span>`;
    const dName = esc(S.user.name || t("profile"));
    userBtn = `<button class="sec profile-btn" id="profb" title="${t("viewProfile")}">${av}<span>${dName}</span></button>`;
  }

  $("#topright").innerHTML = `<button class="sec" id="langb" style="padding:6px 10px">${S.lang === "hi" ? "EN" : "हिं"}</button> ` + userBtn;

  $("#langb").onclick = () => {
    S.lang = S.lang === "hi" ? "en" : "hi";
    localStorage.setItem("ks_lang", S.lang);
    document.documentElement.lang = S.lang;
    route();
  };

  if ($("#profb")) {
    $("#profb").onclick = () => openFullProfile();
  }
}

async function openFullProfile() {
  let modal = $("#profmodal");
  if (!modal) {
    modal = document.createElement("div");
    modal.className = "modal";
    modal.id = "profmodal";
    document.body.appendChild(modal);
  }
  const close = () => { if (modal) modal.remove(); };
  modal.onclick = (e) => { if (e.target === modal) close(); };

  try {
    const me = await api("/me");
    S.user = { ...S.user, ...me.user };
    S.profile = me.profile || {};
    if (typeof fbSyncUser === "function") fbSyncUser(S.user);
    if (typeof fbSyncWorkerProfile === "function" && S.user.role === "worker" && S.profile) fbSyncWorkerProfile(S.user.id, S.profile);
    if (typeof fbSyncContractorProfile === "function" && S.user.role === "contractor" && S.profile) fbSyncContractorProfile(S.user.id, S.profile);
  } catch (e) {}

  modal.innerHTML = `<div class="sheet" style="position:relative; max-height:92vh; overflow-y:auto; padding:18px;"><div id="profmodal_inner"></div></div>`;
  const inner = modal.querySelector("#profmodal_inner");
  renderFullProfileContent(inner, false, close);
}

function renderFullProfileContent(container, isEditing = false, onClose = null) {
  const u = S.user || {};
  const p = S.profile || {};
  const role = u.role || "worker";
  const roleLabel = role === "worker" ? `👷 ${t("worker")}` : (role === "customer" ? `🏠 ${t("customer")}` : `🏗️ ${t("contractor")}`);
  const roleColor = role === "worker" ? "#2e7d32" : (role === "customer" ? "#1565c0" : "#e65100");
  const haveSkills = new Set(Array.isArray(p.skills) ? p.skills : (p.skills || "").split(",").filter(Boolean));

  const avatarDisplay = u.avatar
    ? `<img src="${esc(u.avatar)}" alt="Avatar">`
    : `<span>👤</span>`;

  let bodyHtml = "";

  if (isEditing) {
    // ---------------- Edit Form ----------------
    let roleFields = "";
    if (role === "worker") {
      roleFields = `
        <label>${t("skills")}</label>
        <div class="chk">${(S.meta?.skills || []).map(s => `<label><input type="checkbox" value="${s.key}" ${haveSkills.has(s.key) ? "checked" : ""}>${esc(s[S.lang])}</label>`).join("")}</div>
        <label>${t("rate")}</label><input id="rt" type="number" value="${p.daily_rate || ""}">
        <label>${t("exp")}</label><input id="ex" type="number" value="${p.experience_years || ""}">
        <label>${t("village")}</label><input id="vl" value="${esc(p.village || "")}">
        <label>${t("radius")}: <b id="rv">${p.radius_km || 6}</b> ${t("km")}</label><input id="rd" type="range" min="1" max="50" step="1" value="${p.radius_km || 6}">
      `;
    } else if (role === "contractor") {
      roleFields = `
        <label>${t("company") || "कंपनी / फर्म"}</label><input id="pc" value="${esc(p.company || "")}">
        <label>${t("skills")}</label>
        <div class="chk">${(S.meta?.skills || []).map(s => `<label><input type="checkbox" value="${s.key}" ${haveSkills.has(s.key) ? "checked" : ""}>${esc(s[S.lang])}</label>`).join("")}</div>
        <label>${t("village")}</label><input id="pv" value="${esc(p.village || "")}">
        <label>${t("radius")}: <b id="rv">${p.radius_km || 25}</b> ${t("km")}</label><input id="rd" type="range" min="1" max="100" step="1" value="${p.radius_km || 25}">
        <label>${t("minBudget") || "न्यूनतम बजट (₹)"}</label><input id="pm" type="number" value="${p.min_budget || ""}">
        <label>${t("exp")}</label><input id="pe" type="number" value="${p.experience_years || ""}">
        <label>About</label><textarea id="pa" rows="3">${esc(p.about || "")}</textarea>
      `;
    }

    bodyHtml = `
      <div style="margin-top:12px;">
        <h3 style="margin:4px 0 12px;">✏️ ${t("editProfile")}</h3>
        <label>${t("name")}</label><input id="nm" value="${esc(u.name || "")}">
        ${roleFields}
        <button class="big sec" id="loc" style="margin-top:12px;">📍 ${t("setloc")}</button>
        <div class="sub" id="locs" style="margin-bottom:8px;">${p.lat != null || S.loc ? t("locok") : ""}</div>
        <div class="row" style="margin-top:12px;">
          <button class="big" id="sv">💾 ${t("saveChanges")}</button>
          <button class="big sec" id="cancel_edit">${t("cancelEdit")}</button>
        </div>
      </div>
    `;
  } else {
    // ---------------- View Mode ----------------
    let roleDetailsHtml = "";
    if (role === "worker") {
      const skillsHtml = (Array.isArray(p.skills) ? p.skills : (p.skills || "").split(",").filter(Boolean))
        .map(s => `<span>${esc(skillName(s))}</span>`).join("") || "—";
      roleDetailsHtml = `
        <div class="card" style="margin:10px 0; background:#f9fbf9;">
          <h4 style="margin:2px 0 10px; font-size:15px;">🧰 ${t("workInfo")}</h4>
          <div class="info-grid">
            <div class="info-cell"><div class="sub">${t("status")}</div><div class="val"><span class="pill ${p.status || 'offline'}">${t("s_" + (p.status || 'offline'))}</span></div></div>
            <div class="info-cell"><div class="sub">${t("rate")}</div><div class="val">₹${p.daily_rate || 0} / दिन</div></div>
            <div class="info-cell"><div class="sub">${t("exp")}</div><div class="val">${p.experience_years || 0} साल</div></div>
            <div class="info-cell"><div class="sub">${t("radius")}</div><div class="val">${p.radius_km || 6} km</div></div>
            <div class="info-cell" style="grid-column:span 2"><div class="sub">${t("village")}</div><div class="val">${esc(p.village || "—")}</div></div>
            <div class="info-cell" style="grid-column:span 2"><div class="sub">${t("skills")}</div><div class="skills" style="margin-top:4px;">${skillsHtml}</div></div>
            <div class="info-cell"><div class="sub">${t("rating")}</div><div class="val">⭐ ${p.rating_avg || 0} (${p.rating_count || 0})</div></div>
            <div class="info-cell"><div class="sub">GPS Location</div><div class="val">${p.lat != null ? "✅ सेट है" : "⚠️ सेट नहीं"}</div></div>
          </div>
        </div>
      `;
    } else if (role === "contractor") {
      const skillsHtml = (Array.isArray(p.skills) ? p.skills : (p.skills || "").split(",").filter(Boolean))
        .map(s => `<span>${esc(skillName(s))}</span>`).join("") || "—";
      roleDetailsHtml = `
        <div class="card" style="margin:10px 0; background:#f9fbf9;">
          <h4 style="margin:2px 0 10px; font-size:15px;">🏗️ ${t("workInfo")}</h4>
          <div class="info-grid">
            <div class="info-cell" style="grid-column:span 2"><div class="sub">Company / Firm</div><div class="val">${esc(p.company || "—")}</div></div>
            <div class="info-cell"><div class="sub">${t("village")}</div><div class="val">${esc(p.village || "—")}</div></div>
            <div class="info-cell"><div class="sub">${t("radius")}</div><div class="val">${p.radius_km || 25} km</div></div>
            <div class="info-cell"><div class="sub">Min Budget</div><div class="val">₹${p.min_budget || 0}</div></div>
            <div class="info-cell"><div class="sub">${t("exp")}</div><div class="val">${p.experience_years || 0} साल</div></div>
            <div class="info-cell" style="grid-column:span 2"><div class="sub">${t("skills")}</div><div class="skills" style="margin-top:4px;">${skillsHtml}</div></div>
            ${p.about ? `<div class="info-cell" style="grid-column:span 2"><div class="sub">About</div><div class="val" style="font-size:13px; font-weight:normal;">${esc(p.about)}</div></div>` : ""}
          </div>
        </div>
      `;
    } else if (role === "customer") {
      roleDetailsHtml = `
        <div class="card" style="margin:10px 0; background:#f9fbf9;">
          <h4 style="margin:2px 0 10px; font-size:15px;">📍 लोकेशन</h4>
          <div class="info-cell">
            <div class="sub">GPS Status</div>
            <div class="val">${S.loc ? "✅ " + S.loc.lat.toFixed(4) + ", " + S.loc.lng.toFixed(4) : "⚠️ सेट नहीं है"}</div>
          </div>
        </div>
      `;
    }

    bodyHtml = `
      <div style="text-align:center; margin:4px 0 12px;">
        <h3 style="margin:2px 0 4px; font-size:18px;">${esc(u.name || "—")}</h3>
        <span class="pill" style="background:${roleColor}">${roleLabel}</span>
        <div class="sub" style="margin-top:6px;">ID: #${u.id} &nbsp;|&nbsp; 📞 ${esc(u.phone || u.phone_last4 || "—")}</div>
      </div>

      <div class="card" style="margin:10px 0; background:#f9fbf9;">
        <h4 style="margin:2px 0 10px; font-size:15px;">📋 ${t("userInfo")}</h4>
        <div class="info-grid">
          <div class="info-cell"><div class="sub">${t("name")}</div><div class="val">${esc(u.name || "—")}</div></div>
          <div class="info-cell"><div class="sub">${t("phone")}</div><div class="val">${esc(u.phone || u.phone_last4 || "—")}</div></div>
          <div class="info-cell"><div class="sub">${t("iam")}</div><div class="val">${roleLabel}</div></div>
          <div class="info-cell"><div class="sub">Language</div><div class="val">${u.lang === "en" ? "English" : "हिन्दी"}</div></div>
        </div>
      </div>

      ${roleDetailsHtml}

      <div style="display:flex; flex-direction:column; gap:8px; margin-top:14px;">
        <button class="big" id="prof_edit_btn">✏️ ${t("editProfile")}</button>
        <button class="big sec" id="prof_setloc_btn">📍 ${t("setloc")}</button>
        <button class="big warn" id="prof_logout_btn" style="background:#c62828;">🚪 ${t("logout")}</button>
      </div>
    `;
  }

  container.innerHTML = `
    ${onClose ? `<button class="close-btn" id="prof_close_btn" title="${t("close")}">✕</button>` : ""}
    <h2 style="margin:2px 0 10px; display:flex; align-items:center; gap:8px;"><span>👤</span> ${t("profile")}</h2>

    <div class="avatar-wrap">
      <div class="avatar-lg" id="prof_avatar_preview">${avatarDisplay}</div>
      <div style="margin-top:8px; display:flex; gap:8px; justify-content:center;">
        <button type="button" class="sec" id="prof_change_photo_btn" style="padding:6px 14px; font-size:13px;">📷 ${t("changePhoto")}</button>
        ${u.avatar ? `<button type="button" class="sec" id="prof_rm_photo_btn" style="padding:6px 12px; font-size:13px; color:#c62828;" title="${t("removePhoto")}">🗑️</button>` : ""}
      </div>
      <input type="file" id="prof_file_input" accept="image/*" style="display:none">
    </div>

    ${bodyHtml}
  `;

  // ---------------- Event Listeners ----------------
  if (onClose && container.querySelector("#prof_close_btn")) {
    container.querySelector("#prof_close_btn").onclick = onClose;
  }

  // Photo change
  const photoBtn = container.querySelector("#prof_change_photo_btn");
  const fileInp = container.querySelector("#prof_file_input");
  if (photoBtn && fileInp) {
    photoBtn.onclick = () => fileInp.click();
    fileInp.onchange = guard(async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      toast("⏳ फोटो प्रोसेस हो रही है…");
      const base64Data = await compressAndResizeImage(file, 300, 0.82);
      await api("/me", "PUT", { avatar: base64Data });
      S.user.avatar = base64Data;
      if (typeof fbSyncUser === "function") fbSyncUser(S.user);
      topbar();
      toast("✅ " + t("photoUpdated"));
      renderFullProfileContent(container, isEditing, onClose);
    });
  }

  // Remove photo
  const rmPhotoBtn = container.querySelector("#prof_rm_photo_btn");
  if (rmPhotoBtn) {
    rmPhotoBtn.onclick = guard(async () => {
      if (!confirm(t("removePhoto") + "?")) return;
      await api("/me", "PUT", { avatar: "" });
      S.user.avatar = "";
      if (typeof fbSyncUser === "function") fbSyncUser(S.user);
      topbar();
      toast(t("removePhoto") + " ok");
      renderFullProfileContent(container, isEditing, onClose);
    });
  }

  if (isEditing) {
    // Slider value indicator
    const rd = container.querySelector("#rd");
    const rv = container.querySelector("#rv");
    if (rd && rv) rd.oninput = () => rv.textContent = rd.value;

    // Location button
    const locBtn = container.querySelector("#loc");
    const locs = container.querySelector("#locs");
    if (locBtn) {
      locBtn.onclick = guard(async () => {
        await getLoc(true);
        if (locs) locs.textContent = t("locok");
        toast(t("locok"));
      });
    }

    // Cancel edit
    const cancelBtn = container.querySelector("#cancel_edit");
    if (cancelBtn) {
      cancelBtn.onclick = () => renderFullProfileContent(container, false, onClose);
    }

    // Save changes
    const saveBtn = container.querySelector("#sv");
    if (saveBtn) {
      saveBtn.onclick = guard(async () => {
        const newName = container.querySelector("#nm")?.value.trim() || "";
        await api("/me", "PUT", { name: newName });
        S.user.name = newName;

        const loc = S.loc || (p.lat != null ? { lat: p.lat, lng: p.lng } : await getLoc().catch(() => null));

        if (role === "worker") {
          const skills = [...container.querySelectorAll(".chk input:checked")].map(x => x.value);
          if (!skills.length) throw new Error(t("reqd"));
          const payload = {
            skills,
            daily_rate: +(container.querySelector("#rt")?.value || 0),
            experience_years: +(container.querySelector("#ex")?.value || 0),
            village: container.querySelector("#vl")?.value.trim() || "",
            radius_km: +(container.querySelector("#rd")?.value || 6),
            lat: loc?.lat ?? 0,
            lng: loc?.lng ?? 0
          };
          await api("/worker/profile", "PUT", payload);
          S.profile = { ...S.profile, ...payload };
          if (typeof fbSyncWorkerProfile === "function") fbSyncWorkerProfile(S.user.id, S.profile);
        } else if (role === "contractor") {
          const skills = [...container.querySelectorAll(".chk input:checked")].map(x => x.value);
          const payload = {
            company: container.querySelector("#pc")?.value.trim() || "",
            skills,
            village: container.querySelector("#pv")?.value.trim() || "",
            radius_km: +(container.querySelector("#rd")?.value || 25),
            min_budget: +(container.querySelector("#pm")?.value || 0),
            experience_years: +(container.querySelector("#pe")?.value || 0),
            about: container.querySelector("#pa")?.value.trim() || "",
            lat: loc?.lat ?? 0,
            lng: loc?.lng ?? 0
          };
          await api("/contractor/profile", "PUT", payload);
          S.profile = { ...S.profile, ...payload };
          if (typeof fbSyncContractorProfile === "function") fbSyncContractorProfile(S.user.id, S.profile);
        }

        if (typeof fbSyncUser === "function") fbSyncUser(S.user);
        topbar();
        toast("✅ " + t("saved"));
        renderFullProfileContent(container, false, onClose);
      });
    }
  } else {
    // View mode handlers
    const editBtn = container.querySelector("#prof_edit_btn");
    if (editBtn) {
      editBtn.onclick = () => renderFullProfileContent(container, true, onClose);
    }

    const setlocBtn = container.querySelector("#prof_setloc_btn");
    if (setlocBtn) {
      setlocBtn.onclick = guard(async () => {
        await getLoc(true);
        toast("📍 " + t("locok"));
        renderFullProfileContent(container, false, onClose);
      });
    }

    const logoutBtn = container.querySelector("#prof_logout_btn");
    if (logoutBtn) {
      logoutBtn.onclick = () => {
        if (confirm(t("confirmLogout"))) {
          if (onClose) onClose();
          logout();
        }
      };
    }
  }
}

function tabs(list) {
  $("#tabs").innerHTML = list.map(([k, icon]) => `<button data-k="${k}" class="${S.tab === k ? "on" : ""}"><span>${icon}</span>${t(k)}</button>`).join("");
  document.querySelectorAll("#tabs button").forEach(b => b.onclick = () => { S.tab = b.dataset.k; route(); });
}

function route() {
  topbar();
  if (!S.user) return showLogin();
  const role = S.user.role;
  const MAP = {
    worker: { tabs: [["today", "🟢"], ["jobs", "🧰"], ["bookings", "📋"], ["assistant", "🤖"], ["profile", "👤"]],
              fn: { today: showToday, jobs: showWorkerJobs, bookings: showBookings, assistant: showAssistant, profile: showProfile }, def: "today" },
    customer: { tabs: [["find", "🔎"], ["post", "➕"], ["contractors", "👷"], ["bookings", "📋"], ["assistant", "🤖"]],
                fn: { find: showFind, post: showPost, myjobs: showMyJobs, contractors: showContractors, bookings: showBookings, assistant: showAssistant }, def: "find" },
    contractor: { tabs: [["cdash", "📊"], ["crew", "👥"], ["projects", "🏗️"], ["ledger", "💰"], ["assistant", "🤖"]],
                  fn: { cdash: showCDash, crew: showCrew, projects: showProjects, ledger: showLedger, assistant: showAssistant }, def: "cdash" },
  }[role];
  tabs(MAP.tabs);
  (MAP.fn[S.tab] || MAP.fn[MAP.def])();
}

/* ---------------- login ---------------- */
function showLogin() {
  $("#tabs").innerHTML = "";
  topbar();
  $("#app").innerHTML = `<div class="card"><h2>${t("login")}</h2>
    <label>${t("phone")}</label><input id="ph" inputmode="numeric" maxlength="10" placeholder="98XXXXXXXX">
    <label>${t("name")}</label><input id="nm">
    <label>${t("iam")}</label><select id="rl"><option value="worker">${t("worker")}</option><option value="customer">${t("customer")}</option><option value="contractor">${t("contractor")}</option></select>
    <button class="big" id="go">${t("getotp")}</button>
    <div id="otpbox" style="display:none"><label>${t("otp")}</label><input id="otp" inputmode="numeric" maxlength="6"><div class="sub" id="devnote"></div>
    <button class="big" id="vf">${t("verify")}</button></div></div>`;
  $("#go").onclick = guard(async () => {
    const phone = $("#ph").value.trim();
    const r = await api("/auth/request-otp", "POST", { phone });
    S.otpPhone = phone; $("#otpbox").style.display = "block";
    if (r.dev_otp) { $("#otp").value = r.dev_otp; $("#devnote").textContent = t("devotp"); }
  });
  $("#vf").onclick = guard(async () => {
    const r = await api("/auth/verify", "POST", { phone: S.otpPhone || $("#ph").value, otp: $("#otp").value, role: $("#rl").value, name: $("#nm").value });
    S.token = r.token; localStorage.setItem("ks_token", S.token); await boot();
  });
}

/* ---------------- worker: today ---------------- */
async function showToday() {
  const me = await api("/me"); S.profile = me.profile;
  const p = me.profile, st = p.status;
  $("#app").innerHTML = `<div class="card"><h2>${t("status")}: <span class="pill ${st}">${t("s_" + st)}</span></h2>
    ${p.lat == null ? `<div class="sub">${t("profilefirst")}</div>` : ""}
    <label>${t("hours")}</label><select id="hrs"><option value="4">4</option><option value="8">8</option><option value="12" selected>12</option><option value="24">24</option></select>
    <button class="big" id="bf">${t("freeToday")}</button>
    <button class="big warn" id="bb">${t("busy")}</button>
    <button class="big sec" id="bo">${t("offline")}</button></div>`;
  const set = (s) => guard(async () => { await api("/worker/status", "POST", { status: s, hours: +$("#hrs").value }); toast(t("saved")); showToday(); });
  $("#bf").onclick = set("free"); $("#bb").onclick = set("busy"); $("#bo").onclick = set("offline");
  try {
    const e = await api("/worker/earnings");
    $("#app").insertAdjacentHTML("beforeend", `<div class="card"><h2>${t("earnings")}</h2><div class="row"><div><div class="sub">${t("thisMonth")}</div><b>₹${e.this_month}</b></div>
      <div><div class="sub">${t("totalEarned")}</div><b>₹${e.total_earned}</b></div><div><div class="sub">${t("jobsDone")}</div><b>${e.jobs_done}</b></div><div><div class="sub">${t("upcoming")}</div><b>${e.upcoming_jobs}</b></div></div></div>`);
  } catch (err) {}
}

/* ---------------- worker: profile ---------------- */
async function showProfile() {
  try {
    const me = await api("/me");
    S.user = { ...S.user, ...me.user };
    S.profile = me.profile || {};
    if (typeof fbSyncUser === "function") fbSyncUser(S.user);
    if (typeof fbSyncWorkerProfile === "function" && S.profile) fbSyncWorkerProfile(S.user.id, S.profile);
  } catch (e) {}

  $("#app").innerHTML = `<div class="card" id="app_profile_inner" style="position:relative;"></div>`;
  renderFullProfileContent($("#app_profile_inner"), false, null);
}

/* ---------------- worker: nearby jobs ---------------- */
async function showWorkerJobs() {
  const me = await api("/me"); const r0 = me.profile.radius_km;
  $("#app").innerHTML = `<div class="card"><label>${t("radius")}: <b id="rv">${r0}</b> ${t("km")}</label><input id="rd" type="range" min="1" max="50" value="${r0}"></div><div id="list"></div>`;
  const load = guard(async () => {
    const r = await api("/worker/jobs?radius_km=" + $("#rd").value);
    $("#list").innerHTML = r.jobs.length ? r.jobs.map(j => `<div class="card"><b>${esc(skillName(j.skill))}</b> · ${j.distance_km} ${t("km")} ${t("away")}
      <div class="sub">${esc(j.start_date)} · ${j.days} ${t("days")} ${j.budget ? "· ₹" + j.budget : ""}</div><div>${esc(j.description)}</div><div class="sub">${esc(j.address)}</div>
      <button data-j="${j.id}" class="intr">${t("interested")}</button></div>`).join("") : `<div class="card sub">${t("nojobs")}</div>`;
    document.querySelectorAll(".intr").forEach(b => b.onclick = guard(async () => { const q = prompt(t("quote"), (S.profile && S.profile.daily_rate) || ""); if (q === null) return; await api(`/jobs/${b.dataset.j}/interest`, "POST", { rate: +q || 0 }); toast(t("interestsent")); b.disabled = true; }));
  });
  $("#rd").oninput = () => $("#rv").textContent = $("#rd").value; $("#rd").onchange = load; load();
}

/* ---------------- customer: find mistri ---------------- */
async function showFind() {
  const f = S.f;
  $("#app").innerHTML = `<div class="card"><div class="row"><div><label>${t("skill")}</label><select id="sk"><option value="">${t("all")}</option>${S.meta.skills.map(s => `<option value="${s.key}" ${f.skill === s.key ? "selected" : ""}>${esc(s[S.lang])}</option>`).join("")}</select></div>
    <div><label>${t("date")}</label><input id="dt" type="date" value="${f.date}"></div></div>
    <label>${t("dist")}: <b id="rv">${f.radius}</b> ${t("km")}</label><input id="rd" type="range" min="1" max="50" value="${f.radius}">
    <div class="row"><div class="chk"><label><input id="fo" type="checkbox" ${f.freeOnly ? "checked" : ""}>${t("freeonly")}</label></div>
    <div><select id="so"><option value="smart" ${f.sort === "smart" ? "selected" : ""}>${t("smart")}</option><option value="distance" ${f.sort === "distance" ? "selected" : ""}>${t("dist")}</option><option value="rating" ${f.sort === "rating" ? "selected" : ""}>${t("rating")}</option><option value="rate" ${f.sort === "rate" ? "selected" : ""}>${t("rate")}</option></select></div></div>
    <button class="sec big" id="loc">${t("setloc")}</button><button class="big warn" id="inst" style="background:var(--o)">${t("instant")}</button><div class="sub">${t("instantSub")}</div><span class="live">${t("live")}</span></div><div id="list"></div>`;
  $("#inst").onclick = guard(async () => { await getLoc(); instantModal(); });
  const apply = () => { f.skill = $("#sk").value; f.date = $("#dt").value; f.radius = +$("#rd").value; f.freeOnly = $("#fo").checked; f.sort = $("#so").value; subscribeWS(); guard(loadWorkers)(); };
  $("#rd").oninput = () => $("#rv").textContent = $("#rd").value;
  ["sk", "dt", "rd", "fo", "so"].forEach(id => $("#" + id).onchange = apply);
  $("#loc").onclick = guard(async () => { await getLoc(true); apply(); });
  if (S.loc) apply(); else $("#list").innerHTML = `<div class="card sub">${t("noloc")} - ${t("setloc")}</div>`;
}
async function loadWorkers() {
  if (!S.loc || !$("#list")) return;
  const f = S.f;
  const q = new URLSearchParams({ lat: S.loc.lat, lng: S.loc.lng, radius_km: f.radius, sort: f.sort, free_only: f.freeOnly });
  if (f.skill) q.set("skill", f.skill); if (f.date) q.set("on_date", f.date);
  const r = await api("/workers/search?" + q);
  $("#list").innerHTML = r.workers.length ? r.workers.map(w => `<div class="card"><div class="row" style="align-items:flex-start"><div style="flex:0 0 auto; margin-right:8px;">${w.avatar ? `<div class="avatar-md"><img src="${esc(w.avatar)}" alt=""></div>` : `<div class="avatar-md">👷</div>`}</div><div style="flex:1"><b>${esc(w.name)}</b> ${w.verified ? "✔️" : ""}
    <div class="skills">${w.skills.map(s => `<span>${esc(skillName(s))}</span>`).join("")}</div>
    <div class="sub">${w.distance_km} ${t("km")} ${t("away")} · ${w.village ? esc(w.village) + " · " : ""}⭐ ${w.rating_avg} (${w.rating_count}) · ₹${w.daily_rate || "-"}</div></div>
    <div style="flex:0 0 auto"><span class="pill ${w.status}">${t("s_" + w.status)}</span></div></div>
    <div class="row" style="margin-top:8px"><button class="sec callb" data-w="${w.id}">${t("call")}</button><button class="bookb" data-w="${w.id}" data-r="${w.daily_rate || 0}" data-s="${esc(w.skills[0] || "")}">${t("book")}</button></div></div>`).join("")
    : `<div class="card sub">${t("nowork")}</div>`;
  document.querySelectorAll(".callb").forEach(b => b.onclick = guard(() => doCall({ worker_id: +b.dataset.w })));
  document.querySelectorAll(".bookb").forEach(b => b.onclick = () => bookModal(+b.dataset.w, b.dataset.s, null, +b.dataset.r));
}
async function doCall(body) {
  const r = await api("/calls/connect", "POST", body);
  if (r.tel) location.href = r.tel; else toast(r.message || "Calling...");
}
function bookModal(workerId, skill, jobId, rate) {
  const m = document.createElement("div"); m.className = "modal";
  m.innerHTML = `<div class="sheet"><h2>${t("book")}</h2>
    <label>${t("skill")}</label><select id="bs">${S.meta.skills.map(s => `<option value="${s.key}" ${s.key === skill ? "selected" : ""}>${esc(s[S.lang])}</option>`).join("")}</select>
    <div class="row"><div><label>${t("date")}</label><input id="bd" type="date" value="${S.f.date || todayStr()}" min="${todayStr()}"></div><div><label>${t("days")}</label><input id="bn" type="number" min="1" value="1"></div></div>
    <label>${t("offerRate")}</label><input id="bo" type="number" min="50" value="${rate || ""}"><div class="sub">${t("offerHint")}</div>
    <label>${t("address")}</label><input id="ba"><label>${t("note")}</label><textarea id="bt" rows="2"></textarea>
    <button class="big" id="bsend">${t("send")}</button><button class="big sec" id="bx">✖</button></div>`;
  document.body.appendChild(m);
  $("#bx").onclick = () => m.remove();
  $("#bsend").onclick = guard(async () => {
    await api("/bookings", "POST", { worker_id: workerId, skill: $("#bs").value, start_date: $("#bd").value, days: +$("#bn").value || 1, note: $("#bt").value,
                                     address: $("#ba").value, lat: S.loc?.lat, lng: S.loc?.lng, job_id: jobId || null, agreed_rate: +$("#bo").value || 0 });
    m.remove(); toast(t("sent"));
  });
}

/* ---------------- customer: post job / my jobs ---------------- */
function showPost() {
  $("#app").innerHTML = `<div class="card"><h2>${t("post")}</h2>
    <label>${t("skill")}</label><select id="js">${S.meta.skills.map(s => `<option value="${s.key}">${esc(s[S.lang])}</option>`).join("")}</select>
    <div class="row"><div><label>${t("date")}</label><input id="jd" type="date" value="${todayStr()}" min="${todayStr()}"></div><div><label>${t("days")}</label><input id="jn" type="number" min="1" value="1"></div></div>
    <label>${t("budget")}</label><input id="jb" type="number"><label>${t("address")}</label><input id="ja"><label>${t("desc")}</label><textarea id="jt" rows="3"></textarea>
    <button class="sec big" id="loc">${t("setloc")}</button><button class="big" id="jp">${t("post")}</button></div>`;
  $("#loc").onclick = guard(async () => { await getLoc(true); toast(t("locok")); });
  $("#jp").onclick = guard(async () => {
    const loc = await getLoc();
    await api("/jobs", "POST", { skill: $("#js").value, description: $("#jt").value, lat: loc.lat, lng: loc.lng, address: $("#ja").value,
                                 start_date: $("#jd").value, days: +$("#jn").value || 1, budget: +$("#jb").value || 0 });
    toast(t("posted")); S.tab = "myjobs"; route();
  });
}
const showMyJobs = guard(async function () {
  const r = await api("/jobs/mine");
  $("#app").innerHTML = r.jobs.length ? r.jobs.map(j => `<div class="card"><b>${esc(skillName(j.skill))}</b> <span class="pill ${j.status === "open" ? "free" : "offline"}">${esc(j.status)}</span>
    <div class="sub">${esc(j.start_date)} · ${j.days} ${t("days")} ${j.budget ? "· ₹" + j.budget : ""}</div><div>${esc(j.description)}</div>
    <button class="sec" data-j="${j.id}" data-s="${esc(j.skill)}">${t("interestedw")}</button><div class="intl" id="il${j.id}"></div></div>`).join("") : `<div class="card sub">${t("nojobs")}</div>`;
  document.querySelectorAll("button[data-j]").forEach(b => b.onclick = guard(async () => {
    const r2 = await api(`/jobs/${b.dataset.j}/interested`);
    $("#il" + b.dataset.j).innerHTML = r2.workers.map(w => `<div class="row" style="margin-top:6px"><div><b>${esc(w.name)}</b> <span class="pill ${w.status}">${t("s_" + w.status)}</span><div class="sub">${w.distance_km} ${t("km")} · ₹${w.quoted_rate || w.daily_rate || "-"}</div></div>
      <button class="sec c2" data-w="${w.id}" style="flex:0 0 auto">${t("call")}</button><button class="b2" data-w="${w.id}" data-q="${w.quoted_rate || w.daily_rate || 0}" data-j="${b.dataset.j}" style="flex:0 0 auto">${t("book")}</button></div>`).join("") || `<div class="sub">-</div>`;
    document.querySelectorAll(".c2").forEach(x => x.onclick = guard(() => doCall({ worker_id: +x.dataset.w })));
    document.querySelectorAll(".b2").forEach(x => x.onclick = () => bookModal(+x.dataset.w, b.dataset.s, +x.dataset.j, +x.dataset.q));
  }));
});

/* ---------------- bookings (both roles) ---------------- */
const showBookings = guard(async function () {
  const r = await api("/bookings/mine"); const isW = S.user.role === "worker";
  $("#app").innerHTML = r.bookings.length ? r.bookings.map(b => {
    const who = isW ? b.customer_name || t("customerName") : b.worker_name || t("workerName");
    let act = "";
    const myTurn = b.status === "requested" && b.offer_by !== S.user.id;
    if (myTurn) act += `<button data-a="accept" data-b="${b.id}">${t("acceptOffer")}</button><button class="sec" data-a="counter" data-b="${b.id}">${t("counter")}</button><button class="warn" data-a="reject" data-b="${b.id}">${t("reject")}</button>`;
    if (b.status === "requested" && !myTurn) act += `<button class="sec" data-a="reject" data-b="${b.id}">${t("withdraw")}</button>`;
    if (["requested", "accepted"].includes(b.status)) act += `<button class="sec" data-a="chat" data-b="${b.id}">💬 ${t("chat")}</button>`;
    if (["requested", "accepted"].includes(b.status)) act += `<button class="sec" data-a="call" data-b="${b.id}">${t("call")}</button>`;
    if (b.status === "accepted" && isW && !b.started_at && S.meta.require_start_otp) act += `<button data-a="start" data-b="${b.id}">${t("startWork")}</button>`;
    if (b.status === "accepted" && (b.started_at || !S.meta.require_start_otp)) act += `<button data-a="complete" data-b="${b.id}">${t("complete")}</button>`;
    if (b.status === "accepted") act += `<button class="warn" data-a="sos" data-b="${b.id}">${t("sos")}</button>`;
    if (["accepted", "completed"].includes(b.status)) act += `<button class="sec" data-a="report" data-b="${b.id}" data-o="${isW ? b.customer_id : b.worker_id}">${t("report")}</button>`;
    if (["requested", "accepted"].includes(b.status)) act += `<button class="sec" data-a="cancel" data-b="${b.id}">${t("cancel")}</button>`;
    if (b.status === "completed" && !isW && !b.rating) act += `<button data-a="rate" data-b="${b.id}">${t("rateit")}</button>`;
    return `<div class="card"><b>${esc(who)}</b> · ${esc(skillName(b.skill))} <span class="pill ${b.status === "accepted" ? "free" : b.status === "requested" ? "offline" : "busy"}">${t("st_" + b.status)}</span>
      <div class="sub">${esc(b.start_date)} · ${b.days} ${t("days")} · ₹${b.agreed_rate || "-"}/${t("daySfx")} = <b>₹${(b.agreed_rate || 0) * b.days}</b>${b.rating ? " · ⭐" + b.rating : ""}</div>
      ${b.status === "requested" ? `<div class="sub">${b.offer_by === S.user.id ? t("waitingOther") : t("yourTurn")} · ${t("round")} ${b.offer_rounds || 1}</div>` : ""}<div>${esc(b.note)}</div><div class="sub">${esc(b.address)}</div>
      ${b.start_otp ? `<div class="card" style="background:#fff8e1;text-align:center"><div class="sub">${t("otpLabel")}</div><div style="font-size:30px;letter-spacing:6px;font-weight:800">${esc(b.start_otp)}</div><div class="sub">${t("otpHint")}</div></div>` : ""}
      <div class="row" style="margin-top:8px;flex-wrap:wrap">${act}</div></div>`;
  }).join("") : `<div class="card sub">${t("nojobs")}</div>`;
  document.querySelectorAll("button[data-a]").forEach(b => b.onclick = guard(async () => {
    const id = b.dataset.b, a = b.dataset.a;
    if (a === "accept") await api(`/bookings/${id}/accept`, "POST");
    else if (a === "reject") await api(`/bookings/${id}/reject`, "POST");
    else if (a === "counter") return counterModal("bookings", +id, () => showBookings());
    else if (a === "chat") return chatModal("bookings", +id);
    else if (a === "call") return callChoice(+id);
    else if (a === "start") { const o = prompt(t("enterOtp")); if (!o) return; await api(`/bookings/${id}/start`, "POST", { otp: o }); toast(t("st_started")); }
    else if (a === "sos") return doSos(+id);
    else if (a === "report") { const why = prompt(t("reportWhy")); if (!why) return; await api("/reports", "POST", { reported_id: +b.dataset.o, booking_id: +id, reason: why }); toast(t("saved")); return; }
    else if (a === "rate") { const s = prompt(t("stars"), "5"); if (!s) return; await api(`/bookings/${id}/rate`, "POST", { stars: Math.max(1, Math.min(5, +s || 5)), review: "" }); }
    else await api(`/bookings/${id}/${a}`, "POST");
    showBookings();
  }));
});


/* ---------------- sounds ---------------- */
let _ac = null, _ringT = null;
function beepOnce() { try { _ac = _ac || new (window.AudioContext || window.webkitAudioContext)(); const o = _ac.createOscillator(), g = _ac.createGain(); o.frequency.value = 880; g.gain.value = 0.2; o.connect(g); g.connect(_ac.destination); o.start(); o.stop(_ac.currentTime + 0.25); } catch (e) {} }
function startRing() { stopRing(); beepOnce(); _ringT = setInterval(beepOnce, 1200); if (navigator.vibrate) navigator.vibrate([400, 200, 400]); }
function stopRing() { if (_ringT) clearInterval(_ringT); _ringT = null; }

/* ---------------- instant request (Rapido style) ---------------- */
function instantModal() {
  const m = document.createElement("div"); m.className = "modal"; m.id = "instui";
  m.innerHTML = `<div class="sheet"><h2>${t("instant")}</h2>
    <label>${t("skill")}</label><select id="is">${S.meta.skills.map(s => `<option value="${s.key}" ${s.key === S.f.skill ? "selected" : ""}>${esc(s[S.lang])}</option>`).join("")}</select>
    <label>${t("days")}</label><input id="id" type="number" min="1" value="1"><label>${t("address")}</label><input id="ia"><label>${t("note")}</label><textarea id="in" rows="2"></textarea>
    <button class="big" id="igo" style="background:var(--o)">${t("instant")}</button><button class="big sec" id="ix">✖</button></div>`;
  document.body.appendChild(m);
  $("#ix").onclick = () => m.remove();
  $("#igo").onclick = guard(async () => {
    const r = await api("/instant", "POST", { skill: $("#is").value, lat: S.loc.lat, lng: S.loc.lng, radius_km: S.f.radius, days: +$("#id").value || 1, note: $("#in").value, address: $("#ia").value });
    m.remove(); S.instant = { id: r.id, status: r.status }; instantScreen({ status: r.status, wave: 1 }); pollInstant();
  });
}
function instantScreen(r) {
  let o = $("#instscr"); if (!o) { o = document.createElement("div"); o.id = "instscr"; o.className = "modal"; document.body.appendChild(o); }
  let body = "";
  if (r.status === "searching") body = `<h2>${t("searching")}</h2><div class="sub">${t("wave")} ${r.wave || 1}</div><div style="font-size:48px;margin:14px">⏳</div><button class="warn big" id="icx">${t("cancel")}</button>`;
  else if (r.status === "matched") body = `<h2>${t("matched")}</h2><div class="card"><b>${esc(r.worker?.name || "")}</b> ${r.worker?.distance_km != null ? "· " + r.worker.distance_km + " " + t("km") : ""}<div class="sub">₹${r.worker?.daily_rate || "-"} ${t("rupee")}</div></div>
      <button class="big" id="ig2">📋 ${t("bookings")}</button><button class="big sec" id="icl">${t("close")}</button>`;
  else body = `<h2>😕</h2><div>${t("noWorker")}</div><button class="big sec" id="icl">${t("close")}</button>`;
  o.innerHTML = `<div class="sheet" style="text-align:center">${body}</div>`;
  if ($("#icx")) $("#icx").onclick = guard(async () => { await api(`/instant/${S.instant.id}/cancel`, "POST"); closeInstant(); });
  if ($("#icl")) $("#icl").onclick = closeInstant;
  if ($("#ig2")) $("#ig2").onclick = () => { closeInstant(); S.tab = "bookings"; route(); };
}
function closeInstant() { clearTimeout(S.instT); S.instant = null; const o = $("#instscr"); if (o) o.remove(); }
async function pollInstant() {
  clearTimeout(S.instT);
  if (!S.instant) return;
  try { const r = await api("/instant/" + S.instant.id); S.instant.status = r.status; instantScreen(r); } catch (e) {}
  if (S.instant && S.instant.status === "searching") S.instT = setTimeout(pollInstant, 3000);
}
function onInstantStatus(m) { if (S.instant && S.instant.id === m.request_id) { S.instant.status = m.status; if (m.status !== "searching") pollInstant(); else instantScreen(m); } }

/* worker side: incoming job offer with countdown */
function closeOffer() { stopRing(); clearInterval(S.offT); const o = $("#offerui"); if (o) o.remove(); }
function showOffer(m) {
  closeOffer(); startRing();
  const o = document.createElement("div"); o.className = "modal"; o.id = "offerui";
  let left = Math.round(m.seconds || 30);
  o.innerHTML = `<div class="sheet" style="text-align:center"><h2>⚡ ${t("offerTitle")}</h2><div style="font-size:20px"><b>${esc(skillName(m.skill))}</b></div>
    <div class="sub">${m.distance_km} ${t("km")} ${t("away")} · ${m.days} ${t("days")} · ₹${m.rate || "-"}</div><div>${esc(m.note)}</div>
    <div style="font-size:40px;margin:10px" id="cd">${left}</div><div class="sub">${t("seconds")}</div>
    <button class="big" id="oa">${t("accept")}</button><button class="big warn" id="od">${t("reject")}</button></div>`;
  document.body.appendChild(o);
  S.offT = setInterval(() => { left--; const c = $("#cd"); if (c) c.textContent = left; if (left <= 0) closeOffer(); }, 1000);
  $("#oa").onclick = guard(async () => { await api(`/instant/${m.request_id}/accept`, "POST"); closeOffer(); toast("✅"); S.tab = "bookings"; route(); });
  $("#od").onclick = guard(async () => { closeOffer(); await api(`/instant/${m.request_id}/decline`, "POST"); });
}

/* ---------------- calling: in-app (WebRTC, free) with masked phone call as fallback ---------------- */
const RTC = { pc: null, stream: null, booking: null, queued: [], offer: null };
function rtcSend(data) { S.ws.send(JSON.stringify({ type: "rtc", booking_id: RTC.booking, data })); }
function rtcUI(html) { let o = $("#callui"); if (!o) { o = document.createElement("div"); o.id = "callui"; o.className = "modal"; document.body.appendChild(o); } o.innerHTML = `<div class="sheet" style="text-align:center">${html}</div>`; }
function rtcClose() { stopRing(); try { RTC.pc && RTC.pc.close(); } catch (e) {} if (RTC.stream) RTC.stream.getTracks().forEach(tr => tr.stop()); RTC.pc = RTC.stream = RTC.booking = RTC.offer = null; RTC.queued = []; const o = $("#callui"); if (o) o.remove(); }
function rtcConnectedUI() { rtcUI(`<h2>🎧 ${t("connected")}</h2><button class="warn big" id="hang">${t("hangup")}</button>`); $("#hang").onclick = hangup; }
async function rtcPrepare(booking) {
  RTC.booking = booking;
  RTC.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const pc = new RTCPeerConnection({ iceServers: S.meta.ice_servers });
  RTC.pc = pc;
  RTC.stream.getTracks().forEach(tr => pc.addTrack(tr, RTC.stream));
  pc.onicecandidate = e => { if (e.candidate) rtcSend({ kind: "ice", candidate: e.candidate }); };
  pc.ontrack = e => { let a = $("#rtcaudio"); if (!a) { a = document.createElement("audio"); a.id = "rtcaudio"; a.autoplay = true; document.body.appendChild(a); } a.srcObject = e.streams[0]; };
  pc.onconnectionstatechange = () => {
    if (pc.connectionState === "connected") rtcConnectedUI();
    if (["failed", "closed"].includes(pc.connectionState)) { toast(t("callended")); rtcClose(); }
  };
  return pc;
}
async function startInAppCall(bookingId) {
  if (!navigator.mediaDevices || !window.RTCPeerConnection) throw new Error(t("nomic"));
  if (!S.ws || S.ws.readyState !== 1) throw new Error("offline");
  const pc = await rtcPrepare(bookingId);
  rtcUI(`<h2>${t("calling")}</h2><button class="warn big" id="hang">${t("hangup")}</button>`); $("#hang").onclick = hangup;
  const offer = await pc.createOffer(); await pc.setLocalDescription(offer);
  rtcSend({ kind: "offer", sdp: offer });
}
function hangup() { if (RTC.booking && S.ws && S.ws.readyState === 1) { try { rtcSend({ kind: "hangup" }); } catch (e) {} } rtcClose(); }
async function onRtc(m) {
  const d = m.data || {};
  if (d.kind === "offer") {
    if (RTC.booking) { S.ws.send(JSON.stringify({ type: "rtc", booking_id: m.booking_id, data: { kind: "busy" } })); return; }
    RTC.booking = m.booking_id; RTC.offer = d.sdp; startRing();
    rtcUI(`<h2>📞 ${t("incoming")}</h2><div class="row"><button id="ans">${t("answer")}</button><button class="warn" id="dec">${t("reject")}</button></div>`);
    $("#dec").onclick = () => { try { rtcSend({ kind: "hangup" }); } catch (e) {} rtcClose(); };
    $("#ans").onclick = guard(async () => {
      stopRing(); const offer = RTC.offer, q = RTC.queued; const pc = await rtcPrepare(m.booking_id);
      await pc.setRemoteDescription(offer); for (const c of q) await pc.addIceCandidate(c).catch(() => {}); RTC.queued = [];
      const ans = await pc.createAnswer(); await pc.setLocalDescription(ans); rtcSend({ kind: "answer", sdp: ans }); rtcConnectedUI();
    });
  } else if (d.kind === "answer" && RTC.pc) {
    await RTC.pc.setRemoteDescription(d.sdp); for (const c of RTC.queued) await RTC.pc.addIceCandidate(c).catch(() => {}); RTC.queued = [];
  } else if (d.kind === "ice") {
    if (RTC.pc && RTC.pc.remoteDescription) await RTC.pc.addIceCandidate(d.candidate).catch(() => {}); else RTC.queued.push(d.candidate);
  } else if (d.kind === "hangup" || d.kind === "busy") { toast(t("callended")); rtcClose(); }
}
function callChoice(bookingId) {
  const m = document.createElement("div"); m.className = "modal";
  m.innerHTML = `<div class="sheet"><h2>${t("call")}</h2><button class="big" id="c1">${t("inapp")}</button><button class="big sec" id="c2">${t("phonecall")}</button><button class="big sec" id="c3">✖</button></div>`;
  document.body.appendChild(m);
  $("#c3").onclick = () => m.remove();
  $("#c1").onclick = guard(async () => { m.remove(); try { await startInAppCall(bookingId); } catch (e) { rtcClose(); toast(e.message); await doCall({ booking_id: bookingId }); } });
  $("#c2").onclick = guard(async () => { m.remove(); await doCall({ booking_id: bookingId }); });
}

/* ---------------- safety ---------------- */
async function doSos(bookingId) {
  if (!confirm(t("sos") + "?")) return;
  let loc = S.loc; try { loc = await getLoc(true); } catch (e) {}
  await api("/sos", "POST", { booking_id: bookingId, lat: loc?.lat, lng: loc?.lng });
  alert(t("sosSent"));
}

/* ---------------- boot & resilience ---------------- */
async function boot(attempt = 1) {
  try {
    S.meta = S.meta || await api("/meta");
    if (S.token) {
      try {
        const me = await api("/me");
        S.user = me.user;
        S.profile = me.profile || null;
        if (typeof fbSyncUser === "function") fbSyncUser(S.user);
        if (typeof fbSyncWorkerProfile === "function" && S.user.role === "worker" && S.profile) fbSyncWorkerProfile(S.user.id, S.profile);
        if (typeof fbSyncContractorProfile === "function" && S.user.role === "contractor" && S.profile) fbSyncContractorProfile(S.user.id, S.profile);
      } catch (e) { S.user = null; }
    }
    if (S.user) { if (S.user.lang && !localStorage.getItem("ks_lang")) S.lang = S.user.lang; connectWS(); }
    S.tab = S.tab || (S.user ? ({ worker: "today", customer: "find", contractor: "cdash" }[S.user.role]) : "find");
    route();
  } catch (err) {
    if (attempt < 3) {
      $("#app").innerHTML = `
        <div class="card" style="text-align:center; padding:28px 16px;">
          <div style="font-size:36px; margin-bottom:10px;">⏳</div>
          <h3 style="margin:4px 0 8px;">सर्वर से कनेक्ट हो रहे हैं…</h3>
          <div class="sub">Render सर्वर शुरू होने में कुछ सेकंड लग सकते हैं (कोशिश ${attempt}/3)…</div>
        </div>
      `;
      await new Promise(r => setTimeout(r, 2500));
      return boot(attempt + 1);
    }
    showBootError(err);
  }
}

function showBootError(err) {
  const currentBase = getApiBase();
  $("#app").innerHTML = `
    <div class="card" style="text-align:center; padding:24px 16px;">
      <div style="font-size:42px; margin-bottom:8px;">⚠️</div>
      <h3 style="margin:4px 0 8px;">सर्वर से संपर्क नहीं हो पाया</h3>
      <div class="sub" style="margin-bottom:14px;">
        ${esc(err.message || "Failed to fetch")}<br>
        (Render Free tier स्लीप मोड से जागने में 20-30 सेकंड ले सकता है)
      </div>
      <button class="big" id="retry_boot_btn" style="margin:8px 0;">🔄 फिर से कोशिश करें (Retry)</button>
      <div style="margin-top:16px; text-align:left; border-top:1px solid #eee; padding-top:12px;">
        <label style="font-size:12px; color:var(--mut);">Backend Server URL:</label>
        <div class="row">
          <input id="custom_api_url" value="${esc(currentBase)}" style="font-size:13px; padding:9px;">
          <button class="sec" id="save_api_url_btn" style="padding:9px 12px; font-size:13px; flex:0 0 auto;">सेव</button>
        </div>
      </div>
    </div>
  `;
  const retryBtn = $("#retry_boot_btn");
  if (retryBtn) retryBtn.onclick = () => boot(1);
  const saveBtn = $("#save_api_url_btn");
  if (saveBtn) {
    saveBtn.onclick = () => {
      const val = $("#custom_api_url").value.trim();
      localStorage.setItem("mistri_api_base", val);
      window.MISTRI_API_BASE = val;
      toast("URL सेव हो गया, कनेक्ट कर रहे हैं…");
      boot(1);
    };
  }
}

if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
window.addEventListener("load", () => boot(1));
