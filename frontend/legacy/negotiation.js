/* Negotiation (counter-offers) and chat for bookings and projects. Loaded after app.js */
Object.assign(T.hi, {
  contractor: "ठेकेदार (Contractor)", offerRate: "आपका ऑफर (₹ प्रति दिन)", offerHint: "मज़दूरी आप खुद तय करें। सामने वाला मंज़ूर या कम-ज़्यादा कर सकता है।",
  acceptOffer: "✅ मंज़ूर", counter: "↔️ कम-ज़्यादा", withdraw: "वापस लें", chat: "चैट", waitingOther: "सामने वाले के जवाब का इंतज़ार", yourTurn: "आपकी बारी: मंज़ूर करें या नया रेट बताएँ",
  round: "राउंड", daySfx: "दिन", quote: "इस काम के लिए आपकी मज़दूरी (₹/दिन)?", counterRecv: "नया ऑफर", counterTitle: "नया रेट बताएँ", newRate: "नया रेट (₹ प्रति दिन)",
  newBudget: "नया कुल बजट (₹)", newDays: "दिन", sendCounter: "ऑफर भेजें", typeMessage: "मैसेज लिखें…", negHistory: "बातचीत का इतिहास", you: "आप", other: "सामने वाला",
  newProject: "नया प्रोजेक्ट", projUpd: "प्रोजेक्ट अपडेट", crewInvite: "टीम का न्योता", assigned: "आपको काम पर लगाया गया", noPhoneChat: "फोन नंबर चैट में छिपा दिए जाते हैं।", close: "बंद करें", total: "कुल"
});
Object.assign(T.en, {
  contractor: "Contractor (Thekedar)", offerRate: "Your offer (₹ per day)", offerHint: "You set the wage. The other side can accept or counter.",
  acceptOffer: "✅ Accept", counter: "↔️ Counter", withdraw: "Withdraw", chat: "Chat", waitingOther: "Waiting for the other side", yourTurn: "Your turn: accept or counter",
  round: "Round", daySfx: "day", quote: "Your wage for this job (₹/day)?", counterRecv: "New offer", counterTitle: "Make a counter-offer", newRate: "New rate (₹ per day)",
  newBudget: "New total budget (₹)", newDays: "Days", sendCounter: "Send offer", typeMessage: "Type a message…", negHistory: "Negotiation history", you: "You", other: "Other side",
  newProject: "New project", projUpd: "Project update", crewInvite: "Crew invitation", assigned: "You were assigned", noPhoneChat: "Phone numbers are hidden in chat.", close: "Close", total: "Total"
});

function modalSheet(html, id) {
  const old = id && document.getElementById(id); if (old) old.remove();
  const m = document.createElement("div"); m.className = "modal"; if (id) m.id = id;
  m.innerHTML = `<div class="sheet">${html}</div>`;
  m.addEventListener("click", e => { if (e.target === m) m.remove(); });
  document.body.appendChild(m); return m;
}

async function counterModal(kind, id, done) {
  const n = await api(`/${kind}/${id}/negotiation`);
  const isProj = kind === "projects";
  const hist = n.offers.map(o => `<div class="bubble ${o.mine ? "me" : "ot"}"><b>${o.mine ? t("you") : esc(o.from)}</b>: ₹${o.rate}${isProj ? "" : "/" + t("daySfx")} · ${o.days} ${t("days")}${o.note ? `<div class="sub">${esc(o.note)}</div>` : ""}</div>`).join("");
  const m = modalSheet(`<h2>${t("counterTitle")}</h2><div class="sub">${t("round")} ${n.rounds}/${n.max_rounds}</div><div class="neg">${hist}</div>
    <label>${isProj ? t("newBudget") : t("newRate")}</label><input id="nr" type="number" min="50" value="${n.current.rate}">
    <label>${t("newDays")}</label><input id="nd" type="number" min="1" value="${n.current.days}">
    <label>${t("note")}</label><input id="nn" maxlength="200">
    <button class="big" id="nsend" ${n.my_turn ? "" : "disabled"}>${t("sendCounter")}</button><button class="big sec" id="nx">${t("close")}</button>`, "counterui");
  m.querySelector("#nx").onclick = () => m.remove();
  m.querySelector("#nsend").onclick = guard(async () => {
    await api(`/${kind}/${id}/counter`, "POST", { rate: +m.querySelector("#nr").value, days: +m.querySelector("#nd").value || null, note: m.querySelector("#nn").value });
    m.remove(); toast(t("sent")); if (done) done();
  });
}

const CHAT = { kind: null, id: null };
async function chatModal(kind, id) {
  CHAT.kind = kind; CHAT.id = id;
  const m = modalSheet(`<h2>💬 ${t("chat")}</h2><div class="sub">${t("noPhoneChat")}</div><div id="chatlist" class="chatlist"></div>
    <div class="row"><input id="cin" placeholder="${t("typeMessage")}" maxlength="500"><button id="csend" style="flex:0 0 auto">➤</button></div>
    <button class="big sec" id="cx">${t("close")}</button>`, "chatui");
  const close = () => { CHAT.kind = CHAT.id = null; m.remove(); };
  m.querySelector("#cx").onclick = close;
  m.addEventListener("click", e => { if (e.target === m) { CHAT.kind = CHAT.id = null; } });
  const send = guard(async () => { const el = m.querySelector("#cin"); const text = el.value.trim(); if (!text) return; el.value = ""; await api(`/${kind}/${id}/messages`, "POST", { text }); await loadChat(); });
  m.querySelector("#csend").onclick = send;
  m.querySelector("#cin").onkeydown = e => { if (e.key === "Enter") send(); };
  await loadChat();
}
async function loadChat() {
  if (!CHAT.kind) return;
  const r = await api(`/${CHAT.kind}/${CHAT.id}/messages`); const box = document.getElementById("chatlist"); if (!box) return;
  box.innerHTML = r.messages.map(x => `<div class="bubble ${x.mine ? "me" : "ot"}">${x.mine ? "" : `<b>${esc(x.from)}</b><br>`}${esc(x.text)}</div>`).join("") || `<div class="sub">—</div>`;
  box.scrollTop = box.scrollHeight;
}
function onChatEvent(m) {
  if (CHAT.kind === m.kind && CHAT.id === m.ref_id) loadChat().catch(() => {});
  else toast("💬 " + m.from + ": " + m.text);
}
