/* Contractor (thekedar) dashboard + customer side of contractor projects. Loaded after app.js */
Object.assign(T.hi, {
  cdash: "डैशबोर्ड", crew: "टीम", projects: "प्रोजेक्ट", ledger: "हिसाब", contractors: "ठेकेदार", assistant: "सहायक",
  crewActive: "टीम के लोग", crewInvited: "न्योता भेजा", newRequests: "नई रिक्वेस्ट", activeProjects: "चालू प्रोजेक्ट", doneProjects: "पूरे प्रोजेक्ट", businessValue: "कुल काम (₹)", wagesDue: "बकाया मज़दूरी (₹)",
  editProfile: "प्रोफाइल बदलें", company: "फर्म / नाम", addCrew: "टीम में साथी जोड़ें", crewName: "साथी का नाम", crewPhone: "फोन नंबर (ऐप वालों को न्योता जाएगा)", phoneOpt: "बिना फोन वाले मज़दूर भी जोड़ सकते हैं",
  findWorkers: "ऐप से मिस्त्री/मज़दूर खोजें", maxRate: "अधिकतम मज़दूरी (₹)", freeHours: "कम से कम इतने घंटे फ्री", addToCrew: "टीम में जोड़ें", inCrew: "टीम में है", invited: "न्योता गया", offlineWorker: "बिना ऐप (आप संभालते हैं)",
  remove: "हटाएँ", assignCrew: "टीम लगाएँ", attendance: "आज की हाज़िरी", present: "आया", absent: "नहीं आया", advance: "एडवांस दिया", payment: "भुगतान किया", amount: "रकम (₹)", balance: "बाकी", earned: "कमाई", daysWorked: "दिन",
  startProject: "▶ काम शुरू", finish: "✔ प्रोजेक्ट पूरा", callContractor: "📞 ठेकेदार को कॉल", callOwner: "📞 मालिक को कॉल", projTitle: "काम का नाम (जैसे 2 कमरे का मकान)", sendProject: "प्रोजेक्ट भेजें", workersNeeded: "कितने मज़दूर/मिस्त्री",
  totalBudget: "कुल बजट (₹)", contractorsNear: "पास के ठेकेदार", crewSize: "टीम", myProjects: "मेरे प्रोजेक्ट", saveProfile: "प्रोफाइल सेव", skillsLbl: "आपके काम", minBudget: "न्यूनतम बजट (₹)", about: "अपने बारे में",
  onePoint: "💡 कोई गड़बड़ी हो तो सीधे ठेकेदार से बात करें, वही ज़िम्मेदार है।", noCrew: "अभी टीम में कोई नहीं", noProjects: "अभी कोई प्रोजेक्ट नहीं", wageFree: "फ्री", hoursLeft: "घंटे फ्री", offersTo: "प्रोजेक्ट", due: "बकाया",
  invitesTitle: "ठेकेदार का न्योता", join: "जुड़ें", decline: "मना करें", assignedOk: "टीम लगा दी गई", markedOk: "हाज़िरी दर्ज", sortRate: "कम मज़दूरी", sortRating: "रेटिंग", sortSmart: "फ्री पहले", wages: "मज़दूरी"
});
Object.assign(T.en, {
  cdash: "Dashboard", crew: "Crew", projects: "Projects", ledger: "Ledger", contractors: "Contractors", assistant: "Assistant",
  crewActive: "Crew members", crewInvited: "Invited", newRequests: "New requests", activeProjects: "Active projects", doneProjects: "Completed", businessValue: "Business value (₹)", wagesDue: "Wages due (₹)",
  editProfile: "Edit profile", company: "Firm / name", addCrew: "Add a person to your crew", crewName: "Name", crewPhone: "Phone (app users get an invite)", phoneOpt: "You can also add labour who have no phone/app",
  findWorkers: "Find mistris/labour on the app", maxRate: "Max wage (₹)", freeHours: "Free for at least (hours)", addToCrew: "Add to crew", inCrew: "In crew", invited: "Invited", offlineWorker: "No app (managed by you)",
  remove: "Remove", assignCrew: "Assign crew", attendance: "Today's attendance", present: "Present", absent: "Absent", advance: "Give advance", payment: "Record payment", amount: "Amount (₹)", balance: "Balance", earned: "Earned", daysWorked: "days",
  startProject: "▶ Start work", finish: "✔ Complete project", callContractor: "📞 Call contractor", callOwner: "📞 Call owner", projTitle: "Work title (e.g. 2-room house)", sendProject: "Send project", workersNeeded: "Workers needed",
  totalBudget: "Total budget (₹)", contractorsNear: "Contractors near you", crewSize: "Crew", myProjects: "My projects", saveProfile: "Save profile", skillsLbl: "Your work", minBudget: "Minimum budget (₹)", about: "About you",
  onePoint: "💡 If anything goes wrong, talk only to the contractor: he is responsible.", noCrew: "No one in the crew yet", noProjects: "No projects yet", wageFree: "free", hoursLeft: "h free", offersTo: "Project", due: "Due",
  invitesTitle: "Contractor invitation", join: "Join", decline: "Decline", assignedOk: "Crew assigned", markedOk: "Attendance saved", sortRate: "Lowest wage", sortRating: "Rating", sortSmart: "Free first", wages: "Wages"
});

const fmtINR = n => "₹" + (n || 0).toLocaleString("en-IN");
const skillChecks = (have = []) => S.meta.skills.map(s => `<label><input type="checkbox" value="${s.key}" ${have.includes(s.key) ? "checked" : ""}>${esc(s[S.lang])}</label>`).join("");
const pill = (s) => `<span class="pill ${s === "free" ? "free" : s === "busy" ? "busy" : "offline"}">${t("s_" + s)}</span>`;

/* ---------------- worker: crew invitations on the Today screen ---------------- */
const _showToday = showToday;
showToday = async function () {
  await _showToday();
  try {
    const r = await api("/worker/invites");
    if (r.invites.length) {
      $("#app").insertAdjacentHTML("afterbegin", r.invites.map(i => `<div class="card" style="border-left:5px solid var(--o)"><b>👥 ${t("invitesTitle")}</b>: ${esc(i.company || i.contractor)}
        <div class="sub">₹${i.daily_rate || "-"}/${t("daySfx")}</div><div class="row"><button data-i="${i.id}" data-y="1">${t("join")}</button><button class="warn" data-i="${i.id}" data-y="0">${t("decline")}</button></div></div>`).join(""));
      document.querySelectorAll("button[data-i]").forEach(b => b.onclick = guard(async () => { await api(`/worker/invites/${b.dataset.i}/respond`, "POST", { accept: b.dataset.y === "1" }); toast(t("saved")); showToday(); }));
    }
  } catch (e) {}
};

/* ---------------- contractor: dashboard + profile ---------------- */
async function showCDash() {
  const [me, d] = await Promise.all([api("/me"), api("/contractor/dashboard")]);
  const p = me.profile || {};
  const stat = (k, v) => `<div class="stat"><b>${v}</b><span class="sub">${t(k)}</span></div>`;
  $("#app").innerHTML = `<div class="card"><h2>${esc(p.company || me.user.name || t("contractor"))}</h2>
    ${p.lat == null ? `<div class="sub" style="color:var(--red)">${t("profilefirst")}</div>` : ""}
    <div>${stat("crewActive", d.crew_active)}${stat("crewInvited", d.crew_invited)}${stat("newRequests", d.new_requests)}${stat("activeProjects", d.active_projects)}${stat("doneProjects", d.completed_projects)}${stat("businessValue", fmtINR(d.business_value))}${stat("wagesDue", fmtINR(d.wages_due))}</div>
    <button class="big sec" id="ep">${t("editProfile")}</button></div><div class="card sub">${t("onePoint")}</div>`;
  $("#ep").onclick = () => showCProfile(p, me.user);
}
function showCProfile(p, user) {
  const have = (p.skills || "").split(",").filter(Boolean);
  $("#app").innerHTML = `<div class="card"><h2>${t("editProfile")}</h2>
    <label>${t("name")}</label><input id="pn" value="${esc(user.name)}"><label>${t("company")}</label><input id="pc" value="${esc(p.company || "")}">
    <label>${t("skillsLbl")}</label><div class="chk">${skillChecks(have)}</div>
    <label>${t("village")}</label><input id="pv" value="${esc(p.village || "")}">
    <label>${t("radius")}: <b id="rv">${p.radius_km || 25}</b> ${t("km")}</label><input id="rd" type="range" min="1" max="100" value="${p.radius_km || 25}">
    <label>${t("minBudget")}</label><input id="pm" type="number" value="${p.min_budget || ""}"><label>${t("exp")}</label><input id="pe" type="number" value="${p.experience_years || ""}">
    <label>${t("about")}</label><textarea id="pa" rows="2">${esc(p.about || "")}</textarea>
    <button class="big sec" id="loc">${t("setloc")}</button><div class="sub" id="locs">${p.lat != null ? t("locok") : ""}</div><button class="big" id="sv">${t("saveProfile")}</button></div>`;
  $("#rd").oninput = () => $("#rv").textContent = $("#rd").value;
  $("#loc").onclick = guard(async () => { await getLoc(true); $("#locs").textContent = t("locok"); });
  $("#sv").onclick = guard(async () => {
    const loc = S.loc || (p.lat != null ? { lat: p.lat, lng: p.lng } : await getLoc());
    await api("/me", "PUT", { name: $("#pn").value });
    await api("/contractor/profile", "PUT", { company: $("#pc").value, skills: [...document.querySelectorAll(".chk input:checked")].map(x => x.value), village: $("#pv").value,
      lat: loc.lat, lng: loc.lng, radius_km: +$("#rd").value, min_budget: +$("#pm").value || 0, experience_years: +$("#pe").value || 0, about: $("#pa").value });
    toast(t("saved")); S.user.name = $("#pn").value; showCDash();
  });
}

/* ---------------- contractor: crew (add by phone, find workers with filters) ---------------- */
const CF = { skill: "", radius: 10, maxRate: "", freeOnly: true, date: "", hours: 0, sort: "smart" };
async function showCrew() {
  const r = await api("/contractor/crew");
  $("#app").innerHTML = `<div class="card"><h2>👥 ${t("crew")} (${r.crew.length})</h2>${r.crew.length ? r.crew.map(m => `<div class="card"><div class="row"><div><b>${esc(m.name)}</b> ${m.phone_last4 ? `<span class="sub">…${esc(m.phone_last4)}</span>` : ""}
      <div class="skills">${m.skills.map(s => `<span>${esc(skillName(s))}</span>`).join("")}</div><div class="sub">₹${m.daily_rate || "-"}/${t("daySfx")} · ${m.status === "invited" ? t("invited") : m.registered ? "" : t("offlineWorker")}</div></div>
      <div style="flex:0 0 auto">${m.live_status ? pill(m.live_status) : ""}</div></div>
      <div class="row" style="margin-top:6px"><button class="sec" data-r="${m.id}" data-n="${m.daily_rate}">₹</button><button class="warn" data-d="${m.id}">${t("remove")}</button></div></div>`).join("") : `<div class="sub">${t("noCrew")}</div>`}</div>
    <div class="card"><h2>➕ ${t("addCrew")}</h2><div class="sub">${t("phoneOpt")}</div>
      <label>${t("crewName")}</label><input id="an"><label>${t("crewPhone")}</label><input id="ap" inputmode="numeric" maxlength="10">
      <label>${t("skills")}</label><div class="chk" id="askills">${skillChecks()}</div><label>${t("rate")}</label><input id="ar" type="number"><button class="big" id="aadd">${t("addCrew")}</button></div>
    <div class="card"><h2>🔎 ${t("findWorkers")}</h2>
      <div class="row"><div><label>${t("skill")}</label><select id="fs"><option value="">${t("all")}</option>${S.meta.skills.map(s => `<option value="${s.key}" ${CF.skill === s.key ? "selected" : ""}>${esc(s[S.lang])}</option>`).join("")}</select></div>
      <div><label>${t("date")}</label><input id="fd" type="date" value="${CF.date}"></div></div>
      <label>${t("dist")}: <b id="frv">${CF.radius}</b> ${t("km")}</label><input id="fr" type="range" min="1" max="50" value="${CF.radius}">
      <div class="row"><div><label>${t("maxRate")}</label><input id="fm" type="number" value="${CF.maxRate}"></div>
      <div><label>${t("freeHours")}</label><select id="fh">${[0, 2, 4, 6, 8].map(h => `<option value="${h}" ${CF.hours === h ? "selected" : ""}>${h}</option>`).join("")}</select></div></div>
      <div class="row"><div class="chk"><label><input id="ff" type="checkbox" ${CF.freeOnly ? "checked" : ""}>${t("freeonly")}</label></div>
      <div><select id="fo"><option value="smart" ${CF.sort === "smart" ? "selected" : ""}>${t("sortSmart")}</option><option value="rate" ${CF.sort === "rate" ? "selected" : ""}>${t("sortRate")}</option><option value="distance" ${CF.sort === "distance" ? "selected" : ""}>${t("dist")}</option><option value="rating" ${CF.sort === "rating" ? "selected" : ""}>${t("sortRating")}</option></select></div></div>
      <button class="sec big" id="floc">${t("setloc")}</button></div><div id="flist"></div>`;
  document.querySelectorAll("button[data-d]").forEach(b => b.onclick = guard(async () => { if (confirm("?")) { await api(`/contractor/crew/${b.dataset.d}`, "DELETE"); showCrew(); } }));
  document.querySelectorAll("button[data-r]").forEach(b => b.onclick = guard(async () => { const v = prompt(t("rate"), b.dataset.n); if (v === null) return; await api(`/contractor/crew/${b.dataset.r}`, "PUT", { daily_rate: +v || 0 }); showCrew(); }));
  $("#aadd").onclick = guard(async () => {
    const res = await api("/contractor/crew", "POST", { name: $("#an").value, phone: $("#ap").value, skills: [...document.querySelectorAll("#askills input:checked")].map(x => x.value), daily_rate: +$("#ar").value || 0 });
    toast(res.status === "invited" ? t("invited") : t("saved")); showCrew();
  });
  const apply = () => { CF.skill = $("#fs").value; CF.date = $("#fd").value; CF.radius = +$("#fr").value; CF.maxRate = $("#fm").value; CF.hours = +$("#fh").value; CF.freeOnly = $("#ff").checked; CF.sort = $("#fo").value; guard(loadFind)(); };
  $("#fr").oninput = () => $("#frv").textContent = $("#fr").value;
  ["fs", "fd", "fr", "fm", "fh", "ff", "fo"].forEach(id => $("#" + id).onchange = apply);
  $("#floc").onclick = guard(async () => { await getLoc(true); apply(); });
  if (S.loc) apply();
}
async function loadFind() {
  if (!S.loc || !$("#flist")) return;
  const q = new URLSearchParams({ lat: S.loc.lat, lng: S.loc.lng, radius_km: CF.radius, free_only: CF.freeOnly, sort: CF.sort });
  if (CF.skill) q.set("skill", CF.skill); if (CF.date) q.set("on_date", CF.date); if (CF.maxRate) q.set("max_rate", CF.maxRate); if (CF.hours) q.set("min_hours_free", CF.hours);
  const r = await api("/contractor/find-workers?" + q);
  $("#flist").innerHTML = r.workers.length ? r.workers.map(w => `<div class="card"><div class="row"><div><b>${esc(w.name)}</b> ${w.verified ? "✔️" : ""}<div class="skills">${w.skills.map(s => `<span>${esc(skillName(s))}</span>`).join("")}</div>
    <div class="sub">${w.distance_km} ${t("km")} · ⭐${w.rating_avg} · ₹${w.daily_rate || "-"}${w.free_hours_left != null ? " · " + w.free_hours_left + " " + t("hoursLeft") : ""}</div></div><div style="flex:0 0 auto">${pill(w.status)}</div></div>
    ${w.in_crew ? `<div class="sub">${t("inCrew")}</div>` : `<button data-w="${w.id}" data-r="${w.daily_rate || 0}">${t("addToCrew")}</button>`}</div>`).join("") : `<div class="card sub">${t("nowork")}</div>`;
  document.querySelectorAll("#flist button[data-w]").forEach(b => b.onclick = guard(async () => {
    const v = prompt(t("rate"), b.dataset.r); if (v === null) return;
    await api(`/contractor/crew/from-worker/${b.dataset.w}`, "POST", { daily_rate: +v || 0 }); toast(t("invited")); loadFind();
  }));
}

/* ---------------- projects: used by contractor (tab) and customer (inside Thekedar tab) ---------------- */
async function renderProjects(sel) {
  const r = await api("/projects/mine"); const isC = S.user.role === "contractor";
  const el = $(sel);
  el.innerHTML = r.projects.length ? r.projects.map(p => {
    const other = isC ? p.customer_name : p.contractor_name;
    let act = "";
    if (p.status === "requested") act += p.my_turn
      ? `<button data-pa="accept" data-p="${p.id}">${t("acceptOffer")}</button><button class="sec" data-pa="counter" data-p="${p.id}">${t("counter")}</button><button class="warn" data-pa="reject" data-p="${p.id}">${t("reject")}</button>`
      : `<button class="sec" data-pa="reject" data-p="${p.id}">${t("withdraw")}</button>`;
    if (isC && p.status === "accepted") act += `<button data-pa="assign" data-p="${p.id}">${t("assignCrew")}</button><button data-pa="start" data-p="${p.id}">${t("startProject")}</button>`;
    if (isC && ["accepted", "in_progress"].includes(p.status)) act += `<button class="sec" data-pa="att" data-p="${p.id}">${t("attendance")}</button>`;
    if (isC && p.status === "in_progress") act += `<button data-pa="finish" data-p="${p.id}">${t("finish")}</button>`;
    if (!isC && p.status === "completed" && !p.rating) act += `<button data-pa="rate" data-p="${p.id}">${t("rateit")}</button>`;
    if (!["rejected", "cancelled"].includes(p.status)) act += `<button class="sec" data-pa="chat" data-p="${p.id}">💬 ${t("chat")}</button><button class="sec" data-pa="call" data-p="${p.id}">${isC ? t("callOwner") : t("callContractor")}</button>`;
    if (["accepted"].includes(p.status)) act += `<button class="sec" data-pa="cancel" data-p="${p.id}">${t("cancel")}</button>`;
    return `<div class="card"><b>${esc(p.title)}</b> <span class="pill ${p.status === "completed" || p.status === "accepted" || p.status === "in_progress" ? "free" : p.status === "requested" ? "offline" : "busy"}">${esc(p.status)}</span>
      <div class="sub">${esc(other || "")} · ${esc(p.start_date)} · ${p.days} ${t("days")} · ${p.workers_needed} ${t("workersNeeded")}</div>
      <div><b>${fmtINR(p.budget)}</b> <span class="sub">${p.status === "requested" ? (p.my_turn ? t("yourTurn") : t("waitingOther")) + " · " + t("round") + " " + (p.offer_rounds || 1) : ""}</span></div>
      <div class="sub">${esc(p.description)}</div>${p.crew_assigned ? `<div class="sub">👥 ${p.crew_assigned}</div>` : ""}${p.rating ? `<div class="sub">⭐${p.rating}</div>` : ""}
      <div class="row" style="margin-top:8px;flex-wrap:wrap">${act}</div></div>`;
  }).join("") : `<div class="card sub">${t("noProjects")}</div>`;
  el.querySelectorAll("button[data-pa]").forEach(b => b.onclick = guard(async () => {
    const id = +b.dataset.p, a = b.dataset.pa, again = () => renderProjects(sel);
    if (a === "accept") await api(`/projects/${id}/accept`, "POST");
    else if (a === "reject") await api(`/projects/${id}/reject`, "POST");
    else if (a === "counter") return counterModal("projects", id, again);
    else if (a === "chat") return chatModal("projects", id);
    else if (a === "call") { const r2 = await api(`/projects/${id}/call`, "POST"); if (r2.tel) location.href = r2.tel; else toast(r2.message || ""); return; }
    else if (a === "start") await api(`/projects/${id}/start`, "POST");
    else if (a === "finish") await api(`/projects/${id}/complete`, "POST");
    else if (a === "cancel") await api(`/projects/${id}/cancel`, "POST");
    else if (a === "rate") { const s = prompt(t("stars"), "5"); if (!s) return; await api(`/projects/${id}/rate`, "POST", { stars: Math.max(1, Math.min(5, +s || 5)) }); }
    else if (a === "assign") return assignModal(id, again);
    else if (a === "att") return attendanceModal(id, again);
    again();
  }));
}
const showProjects = guard(async function () { $("#app").innerHTML = `<div id="plist"></div>`; await renderProjects("#plist"); });

async function assignModal(pid, done) {
  const [crew, det] = await Promise.all([api("/contractor/crew"), api(`/projects/${pid}`)]);
  const have = new Set(det.crew.map(x => x.crew_id));
  const act = crew.crew.filter(m => m.status === "active");
  const m = modalSheet(`<h2>${t("assignCrew")}</h2><div class="chk">${act.map(x => `<label><input type="checkbox" value="${x.id}" ${have.has(x.id) ? "checked" : ""}>${esc(x.name)} · ₹${x.daily_rate || "-"}</label>`).join("") || t("noCrew")}</div>
    <button class="big" id="as">${t("save")}</button><button class="big sec" id="ax">${t("close")}</button>`, "assignui");
  m.querySelector("#ax").onclick = () => m.remove();
  m.querySelector("#as").onclick = guard(async () => { await api(`/projects/${pid}/assign`, "POST", { crew_ids: [...m.querySelectorAll("input:checked")].map(x => +x.value) }); m.remove(); toast(t("assignedOk")); done(); });
}
async function attendanceModal(pid, done) {
  const det = await api(`/projects/${pid}`); const day = todayStr();
  const m = modalSheet(`<h2>${t("attendance")} · ${day}</h2>${det.crew.map(x => `<div class="row" style="margin:6px 0"><div><b>${esc(x.name)}</b><div class="sub">₹${x.daily_rate}</div></div>
    <button data-c="${x.crew_id}" data-p="1">${t("present")}</button><button class="warn" data-c="${x.crew_id}" data-p="0">${t("absent")}</button></div>`).join("") || `<div class="sub">${t("noCrew")}</div>`}
    <button class="big sec" id="ax">${t("close")}</button>`, "attui");
  m.querySelector("#ax").onclick = () => { m.remove(); done(); };
  m.querySelectorAll("button[data-c]").forEach(b => b.onclick = guard(async () => { await api(`/projects/${pid}/attendance`, "POST", { crew_id: +b.dataset.c, day, present: b.dataset.p === "1" }); toast(t("markedOk")); }));
}

/* ---------------- contractor: ledger ---------------- */
const showLedger = guard(async function () {
  const r = await api("/contractor/ledger/summary");
  $("#app").innerHTML = `<div class="card"><h2>💰 ${t("ledger")}</h2><div class="stat"><b>${fmtINR(r.total_due)}</b><span class="sub">${t("wagesDue")}</span></div>
    ${r.summary.length ? `<table class="t"><tr><th></th><th>${t("daysWorked")}</th><th>${t("earned")}</th><th>${t("advance")}</th><th>${t("payment")}</th><th>${t("balance")}</th></tr>${r.summary.map(x => `<tr><td><b>${esc(x.name)}</b></td><td>${x.days}</td><td>${x.earned}</td><td>${x.advance}</td><td>${x.paid}</td><td><b>${x.balance}</b></td></tr>
    <tr><td colspan="6"><button class="sec" data-l="advance" data-c="${x.crew_id}">${t("advance")}</button> <button data-l="payment" data-c="${x.crew_id}">${t("payment")}</button></td></tr>`).join("")}</table>` : `<div class="sub">${t("noCrew")}</div>`}</div>`;
  document.querySelectorAll("button[data-l]").forEach(b => b.onclick = guard(async () => {
    const v = prompt(t("amount")); if (!v) return; await api("/contractor/ledger", "POST", { crew_id: +b.dataset.c, kind: b.dataset.l, amount: +v }); toast(t("saved")); showLedger();
  }));
});

/* ---------------- customer: find a contractor and send a project ---------------- */
const KF = { skill: "", radius: 25, sort: "distance" };
async function showContractors() {
  $("#app").innerHTML = `<div class="card sub">${t("onePoint")}</div><div class="card"><h2>👷 ${t("contractorsNear")}</h2>
    <div class="row"><div><label>${t("skill")}</label><select id="ks"><option value="">${t("all")}</option>${S.meta.skills.map(s => `<option value="${s.key}" ${KF.skill === s.key ? "selected" : ""}>${esc(s[S.lang])}</option>`).join("")}</select></div>
    <div><label>${t("sort")}</label><select id="ko"><option value="distance" ${KF.sort === "distance" ? "selected" : ""}>${t("dist")}</option><option value="rating" ${KF.sort === "rating" ? "selected" : ""}>${t("sortRating")}</option><option value="crew" ${KF.sort === "crew" ? "selected" : ""}>${t("crewSize")}</option></select></div></div>
    <label>${t("dist")}: <b id="krv">${KF.radius}</b> ${t("km")}</label><input id="kr" type="range" min="1" max="100" value="${KF.radius}"><button class="sec big" id="kloc">${t("setloc")}</button></div>
    <div id="klist"></div><h2>🏗️ ${t("myProjects")}</h2><div id="myproj"></div>`;
  const apply = guard(async () => {
    KF.skill = $("#ks").value; KF.sort = $("#ko").value; KF.radius = +$("#kr").value; if (!S.loc) return;
    const q = new URLSearchParams({ lat: S.loc.lat, lng: S.loc.lng, radius_km: KF.radius, sort: KF.sort }); if (KF.skill) q.set("skill", KF.skill);
    const r = await api("/contractors/search?" + q);
    $("#klist").innerHTML = r.contractors.length ? r.contractors.map(c => `<div class="card"><b>${esc(c.company || c.name)}</b> ${c.verified ? "✔️" : ""}<div class="skills">${c.skills.map(s => `<span>${esc(skillName(s))}</span>`).join("")}</div>
      <div class="sub">${c.distance_km} ${t("km")} · ⭐${c.rating_avg} (${c.rating_count}) · 👥 ${c.crew_size} · ${c.experience_years} ${t("exp")}${c.min_budget ? " · ≥" + fmtINR(c.min_budget) : ""}</div><div class="sub">${esc(c.about)}</div>
      <button data-k="${c.id}" data-n="${esc(c.company || c.name)}">${t("sendProject")}</button></div>`).join("") : `<div class="card sub">${t("nowork")}</div>`;
    document.querySelectorAll("button[data-k]").forEach(b => b.onclick = () => projectModal(+b.dataset.k, b.dataset.n));
  });
  $("#kr").oninput = () => $("#krv").textContent = $("#kr").value;
  ["ks", "ko", "kr"].forEach(id => $("#" + id).onchange = apply);
  $("#kloc").onclick = guard(async () => { await getLoc(true); apply(); });
  if (S.loc) apply();
  await renderProjects("#myproj");
}
function projectModal(contractorId, name) {
  const m = modalSheet(`<h2>🏗️ ${esc(name)}</h2><label>${t("projTitle")}</label><input id="pt"><label>${t("desc")}</label><textarea id="pd" rows="2"></textarea>
    <label>${t("skill")}</label><select id="ps"><option value="">${t("all")}</option>${S.meta.skills.map(s => `<option value="${s.key}">${esc(s[S.lang])}</option>`).join("")}</select>
    <div class="row"><div><label>${t("date")}</label><input id="pdt" type="date" value="${todayStr()}" min="${todayStr()}"></div><div><label>${t("days")}</label><input id="pdy" type="number" min="1" value="5"></div></div>
    <div class="row"><div><label>${t("totalBudget")}</label><input id="pb" type="number" min="0"></div><div><label>${t("workersNeeded")}</label><input id="pw" type="number" min="1" value="2"></div></div>
    <div class="sub">${t("offerHint")}</div><label>${t("address")}</label><input id="pa"><button class="big" id="psend">${t("sendProject")}</button><button class="big sec" id="px">${t("close")}</button>`, "projui");
  m.querySelector("#px").onclick = () => m.remove();
  m.querySelector("#psend").onclick = guard(async () => {
    await api("/projects", "POST", { contractor_id: contractorId, title: m.querySelector("#pt").value, description: m.querySelector("#pd").value, address: m.querySelector("#pa").value,
      lat: S.loc?.lat, lng: S.loc?.lng, skill: m.querySelector("#ps").value, start_date: m.querySelector("#pdt").value, days: +m.querySelector("#pdy").value || 1,
      budget: +m.querySelector("#pb").value || 0, workers_needed: +m.querySelector("#pw").value || 1 });
    m.remove(); toast(t("sent")); showContractors();
  });
}
