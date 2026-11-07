/* Sahayak: chat + voice assistant in regional languages. Loaded after app.js */
Object.assign(T.hi, { botTitle: "सहायक (अपनी भाषा में बात करें)", botType: "यहाँ लिखें या 🎤 दबाकर बोलें…", botListen: "सुन रहा हूँ… बोलिए", botNoMic: "इस फोन/ब्राउज़र में आवाज़ पहचान नहीं है, लिखकर बताइए।", botSpeak: "आवाज़ में जवाब", botLang: "भाषा" });
Object.assign(T.en, { botTitle: "Assistant (talk in your language)", botType: "Type here or tap 🎤 and speak…", botListen: "Listening… speak now", botNoMic: "Voice input is not available here, please type.", botSpeak: "Speak replies", botLang: "Language" });

const BOT_LANGS = [["hi", "हिन्दी"], ["en", "English"], ["mr", "मराठी"], ["gu", "ગુજરાતી"], ["bn", "বাংলা"], ["ta", "தமிழ்"], ["te", "తెలుగు"], ["bho", "भोजपुरी"]];
const BOT_VOICE = { hi: "hi-IN", en: "en-IN", mr: "mr-IN", gu: "gu-IN", bn: "bn-IN", ta: "ta-IN", te: "te-IN", bho: "hi-IN" };
const BOT = S.bot = S.bot || { lang: localStorage.getItem("ks_botlang") || (S.lang === "en" ? "en" : "hi"), msgs: [], chips: [], started: false, speak: localStorage.getItem("ks_speak") !== "0", busy: false };

function botSpeak(text) {
  if (!BOT.speak || !("speechSynthesis" in window)) return;
  try { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text.replace(/[•\n]+/g, ". ")); u.lang = BOT_VOICE[BOT.lang] || "hi-IN"; u.rate = 0.95; window.speechSynthesis.speak(u); } catch (e) {}
}
function botRender() {
  const box = $("#botbox"); if (!box) return;
  box.innerHTML = BOT.msgs.map(m => `<div class="bubble ${m.me ? "me" : "ot"}">${esc(m.text).replace(/\n/g, "<br>")}</div>`).join("");
  box.scrollTop = box.scrollHeight;
  const ch = $("#botchips"); if (ch) { ch.innerHTML = BOT.chips.map((c, i) => `<button data-i="${i}">${esc(c.label)}</button>`).join(""); ch.querySelectorAll("button").forEach(b => b.onclick = () => botSend(BOT.chips[+b.dataset.i].text)); }
}
async function botCall(body) {
  BOT.busy = true;
  try {
    const r = await api("/assistant", "POST", body);
    BOT.lang = r.lang; localStorage.setItem("ks_botlang", BOT.lang);
    if (r.reply) { BOT.msgs.push({ me: false, text: r.reply }); botSpeak(r.reply); }
    BOT.chips = r.chips || [];
    botRender();
    for (const a of r.actions || []) await botAction(a);
  } catch (e) { BOT.msgs.push({ me: false, text: "⚠️ " + e.message }); botRender(); }
  BOT.busy = false;
}
async function botAction(a) {
  if (a.type === "request_location") {
    try { const loc = await getLoc(true); BOT.msgs.push({ me: true, text: "📍" }); await botCall({ text: "", location: loc }); }
    catch (e) { BOT.msgs.push({ me: false, text: "⚠️ " + e.message }); botRender(); }
  } else if (a.type === "navigate") { setTimeout(() => { S.tab = a.tab; route(); }, 1200); }
  else if (a.type === "refresh") { try { const me = await api("/me"); S.user = me.user; S.profile = me.profile || null; } catch (e) {} }
  else if (a.type === "instant_started") { S.instant = { id: a.id, status: "searching" }; setTimeout(() => { instantScreen({ status: "searching", wave: 1 }); pollInstant(); }, 800); }
}
function botSend(text) {
  text = (text || "").trim(); if (!text || BOT.busy) return;
  const map = Object.fromEntries(BOT_LANGS.map(([c, n]) => [n, c]));
  BOT.msgs.push({ me: true, text });
  if (map[text]) { botCall({ text: "", lang: map[text] }); return; }       // chip tapped to change language
  botRender(); botCall({ text });
}
function showAssistant() {
  $("#app").innerHTML = `<div class="card"><div class="row"><h2 style="margin:0">🤖 ${t("botTitle")}</h2></div>
    <div class="row" style="margin-top:6px"><div><select id="blang">${BOT_LANGS.map(([c, n]) => `<option value="${c}" ${BOT.lang === c ? "selected" : ""}>${n}</option>`).join("")}</select></div>
    <div class="chk"><label><input id="bsp" type="checkbox" ${BOT.speak ? "checked" : ""}>🔊 ${t("botSpeak")}</label></div></div>
    <div id="botbox" class="botbox"></div><div id="botchips" class="chips"></div>
    <div class="row"><input id="bin" placeholder="${t("botType")}"><button id="bmic" class="mic" style="flex:0 0 56px">🎤</button><button id="bgo" style="flex:0 0 56px">➤</button></div></div>`;
  $("#blang").onchange = () => { BOT.lang = $("#blang").value; BOT.msgs = []; BOT.started = false; startBot(); };
  $("#bsp").onchange = () => { BOT.speak = $("#bsp").checked; localStorage.setItem("ks_speak", BOT.speak ? "1" : "0"); if (!BOT.speak && window.speechSynthesis) window.speechSynthesis.cancel(); };
  $("#bgo").onclick = () => { const v = $("#bin").value; $("#bin").value = ""; botSend(v); };
  $("#bin").onkeydown = e => { if (e.key === "Enter") $("#bgo").click(); };
  $("#bmic").onclick = botMic;
  botRender();
  if (!BOT.started) startBot();
}
function startBot() { BOT.started = true; botCall({ start: true, lang: BOT.lang }); }
function botMic() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return toast(t("botNoMic"));
  const btn = $("#bmic"); const rec = new SR();
  rec.lang = BOT_VOICE[BOT.lang] || "hi-IN"; rec.interimResults = false; rec.maxAlternatives = 1;
  btn.classList.add("on"); toast(t("botListen"));
  rec.onresult = e => { const text = e.results[0][0].transcript; botSend(text); };
  rec.onerror = () => toast(t("botNoMic"));
  rec.onend = () => btn.classList.remove("on");
  try { rec.start(); } catch (e) {}
}
