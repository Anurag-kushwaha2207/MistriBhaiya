const { JSDOM, VirtualConsole } = require("jsdom");
const B = "http://127.0.0.1:8079";
const api = async (p, m = "GET", body, tok) => { const r = await fetch(B + "/api" + p, { method: m, headers: { "Content-Type": "application/json", ...(tok ? { Authorization: "Bearer " + tok } : {}) }, body: body ? JSON.stringify(body) : undefined }); const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(p + " " + r.status + " " + JSON.stringify(d)); return d; };
async function signup(phone, role, name) { const o = (await api("/auth/request-otp", "POST", { phone })).dev_otp; const r = await api("/auth/verify", "POST", { phone, otp: o, role, name }); return r.token; }
const sleep = ms => new Promise(r => setTimeout(r, ms));
const LAT = 25.15, LNG = 82.57;
let errors = [];
async function open(token) {
  const vc = new VirtualConsole(); vc.on("jsdomError", e => errors.push("jsdomError: " + (e.detail || e.message))); vc.on("error", e => errors.push("console.error: " + e));
  const dom = await JSDOM.fromURL(B + "/", { runScripts: "dangerously", resources: "usable", pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      w.fetch = (u, o) => fetch(new URL(u, B).toString(), o);
      w.localStorage.setItem("ks_token", token); w.localStorage.setItem("ks_loc", JSON.stringify({ lat: LAT, lng: LNG }));
      w.navigator.geolocation = { getCurrentPosition: ok => ok({ coords: { latitude: LAT, longitude: LNG } }) };
      w.prompt = (m, d) => d || "700"; w.confirm = () => true; w.alert = () => {};
      w.addEventListener("error", e => errors.push("window error: " + e.message)); w.addEventListener("unhandledrejection", e => errors.push("unhandled: " + (e.reason && e.reason.message || e.reason)));
    } });
  await sleep(1500); return dom.window;
}
const text = w => w.document.querySelector("#app").textContent.replace(/\s+/g, " ").trim();
async function tab(w, name) { w.eval(`S.tab=${JSON.stringify(name)}; route()`); await sleep(700); }
async function clickText(w, sel, contains) { const els = [...w.document.querySelectorAll(sel)]; const el = els.find(e => e.textContent.includes(contains)); if (!el) throw new Error("no element " + sel + " containing " + contains + " in: " + text(w).slice(0, 200)); el.click(); await sleep(600); }
function check(cond, msg) { if (!cond) { console.log("FAIL:", msg); errors.push("assert: " + msg); } else console.log("ok  :", msg); }

(async () => {
  // ---- data: worker, customer, contractor
  const wt = await signup("9777000001", "worker", "Ramesh Mistri");
  await api("/worker/profile", "PUT", { skills: ["rajmistri"], daily_rate: 700, experience_years: 5, village: "Sarnath", lat: LAT + 0.01, lng: LNG, radius_km: 10 }, wt);
  await api("/worker/status", "POST", { status: "free" }, wt);
  const ct = await signup("9777000002", "customer", "Ghar Malik");
  const kt = await signup("9777000003", "contractor", "Thekedar Ji");
  await api("/contractor/profile", "PUT", { company: "Ram Builders", skills: ["rajmistri", "labour"], village: "Sarnath", lat: LAT, lng: LNG, radius_km: 30, experience_years: 8 }, kt);

  // ---- customer UI
  let w = await open(ct);
  for (const t of ["find", "post", "contractors", "bookings", "myjobs", "assistant"]) { await tab(w, t); check(text(w).length > 10, "customer tab " + t + " renders: " + text(w).slice(0, 50)); }
  await tab(w, "find"); await sleep(800); check(text(w).includes("Ramesh"), "customer sees the free mistri in search");
  await tab(w, "contractors"); await sleep(800); check(text(w).includes("Ram Builders"), "customer sees the contractor");
  // book the mistri with an offer of 500, through the real modal
  await tab(w, "find"); await sleep(800); await clickText(w, "button.bookb", ""); 
  w.document.querySelector("#bo").value = "500"; await clickText(w, "#bsend", "");
  await tab(w, "bookings"); check(text(w).includes("500"), "booking shows the customer's offer of 500");
  // send project to contractor
  await tab(w, "contractors"); await sleep(800); await clickText(w, "button[data-k]", "");
  w.document.querySelector("#pt").value = "2 room ghar"; w.document.querySelector("#pb").value = "50000"; await clickText(w, "#psend", "");
  await sleep(800); check(text(w).includes("2 room ghar") && text(w).includes("50,000"), "project appears under My projects with budget");
  // assistant tab (customer)
  await tab(w, "assistant"); await sleep(800); check(w.document.querySelectorAll("#botchips button").length > 0, "assistant shows quick-reply chips");
  w.close();

  // ---- worker UI: negotiation
  w = await open(wt);
  for (const t of ["today", "jobs", "bookings", "assistant", "profile"]) { await tab(w, t); check(text(w).length > 10, "worker tab " + t + " renders"); }
  await tab(w, "bookings"); check(text(w).includes("500"), "worker sees the offered 500");
  await clickText(w, "button[data-a=counter]", ""); await sleep(500);
  w.document.querySelector("#nr").value = "650"; await clickText(w, "#nsend", ""); await sleep(600);
  await tab(w, "bookings"); check(text(w).includes("650"), "worker counter of 650 is shown");
  await clickText(w, "button[data-a=chat]", ""); w.document.querySelector("#cin").value = "call 9876543210 now"; await clickText(w, "#csend", "");
  await sleep(500); check(w.document.querySelector("#chatlist").textContent.includes("[number hidden]"), "phone number masked in chat UI");
  w.document.querySelector("#cx").click();
  // assistant: free by chat
  await tab(w, "assistant"); await sleep(800);
  const inp = w.document.querySelector("#bin"); inp.value = "मैं फ्री हूँ"; w.document.querySelector("#bgo").click(); await sleep(900);
  check(w.document.querySelector("#botbox").textContent.includes("फ्री"), "assistant replies in Hindi to 'main free hoon'");
  w.close();

  // ---- contractor UI
  w = await open(kt);
  for (const t of ["cdash", "crew", "projects", "ledger", "assistant"]) { await tab(w, t); check(text(w).length > 10, "contractor tab " + t + " renders"); }
  await tab(w, "crew"); await sleep(600);
  w.document.querySelector("#an").value = "Ramu"; w.document.querySelector("#ar").value = "450";
  w.document.querySelector("#askills input[value=labour]").checked = true; await clickText(w, "#aadd", ""); await sleep(600);
  check(text(w).includes("Ramu"), "contractor added an offline labour to the crew");
  await sleep(800); check(text(w).includes("Ramesh"), "find-workers lists the free mistri with filters");
  await clickText(w, "#flist button[data-w]", ""); await sleep(600);
  await tab(w, "projects"); await sleep(600); check(text(w).includes("2 room ghar"), "contractor sees the incoming project");
  await clickText(w, "button[data-pa=counter]", ""); w.document.querySelector("#nr").value = "60000"; await clickText(w, "#nsend", ""); await sleep(600);
  await tab(w, "ledger"); check(text(w).includes("Ramu"), "ledger lists crew");
  w.close();

  console.log(errors.length ? "\nERRORS:\n" + errors.join("\n") : "\nNO JS ERRORS");
  process.exit(errors.length ? 1 : 0);
})().catch(e => { console.log("CRASH", e); process.exit(2); });
