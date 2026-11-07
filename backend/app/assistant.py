"""Sahayak: a chat assistant in regional languages so a mistri / labour / customer / contractor can do everything by chatting
(or by voice: the app converts speech to text and reads replies aloud).

Works fully OFFLINE with a built-in multilingual rule engine (no API key needed).
Optional: set ANTHROPIC_API_KEY to let an LLM classify free-text messages the rules did not understand.

Languages: hi (Hindi), en (English), mr (Marathi), gu (Gujarati), bn (Bengali), ta (Tamil), te (Telugu), bho (Bhojpuri).
NOTE: have a native speaker review the wording of each language before launch.
"""
import json, logging, os, re, time
import urllib.request
from datetime import date, timedelta
from typing import Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from . import config, firebase_sync
from .common import *
from .db import db
from .realtime import hub, notify
from .security import current_user

logger = logging.getLogger("kaamsetu.assistant")
router = APIRouter()
LANGS = ["hi", "en", "mr", "gu", "bn", "ta", "te", "bho"]

# ------------------------------------------------------------------ texts
STR = {
 "hi": {
  "hello": "नमस्ते! मैं आपका सहायक हूँ। प्रोफाइल भरने, फ्री/बिज़ी करने और काम दिखाने में मदद करूँगा।",
  "ask_name": "आपका नाम क्या है?", "ask_skills": "आप कौन सा काम करते हैं? नीचे से चुनें या लिखें।", "ask_rate": "एक दिन की मज़दूरी कितनी लेते हैं? (₹)",
  "ask_exp": "कितने साल का अनुभव है?", "ask_village": "आप किस गाँव/मोहल्ले में रहते हैं?", "ask_location": "अपनी लोकेशन भेजिए। नीचे वाला बटन दबाइए।",
  "loc_ok": "लोकेशन मिल गई।", "loc_fail": "लोकेशन नहीं मिली। फोन में लोकेशन चालू करके फिर कोशिश करें।", "ask_radius": "काम के लिए कितने किलोमीटर तक जा सकते हैं?",
  "saved": "बहुत बढ़िया! आपकी प्रोफाइल तैयार है। अब 'मैं फ्री हूँ' दबाकर काम पाइए।", "free_ok": "ठीक है, आप अभी फ्री दिख रहे हैं। काम आने पर बताया जाएगा।",
  "busy_ok": "ठीक है, आप बिज़ी दिख रहे हैं।", "off_ok": "ठीक है, आज के लिए काम बंद।", "earn": "इस महीने: ₹{m} | कुल: ₹{t} | पूरे काम: {j} | आने वाले काम: {u}",
  "no_jobs": "अभी आपके पास कोई नया काम नहीं है।", "jobs_head": "आपके पास के काम:", "no_bookings": "अभी कोई बुकिंग नहीं है।", "bookings_head": "आपकी बुकिंग:",
  "retry_num": "कृपया सिर्फ़ नंबर लिखिए, जैसे 500।", "retry_skill": "समझ नहीं आया। काम का नाम चुनिए, जैसे राजमिस्त्री या मज़दूर।",
  "unknown": "समझ नहीं आया। नीचे के बटन दबाइए या 'मदद' लिखिए।", "lang_set": "भाषा बदल दी गई।", "menu": "मैं ये कर सकता हूँ:",
  "cust_ask_skill": "आपको कौन सा मिस्त्री चाहिए?", "cust_started": "ढूँढ रहे हैं… पास के फ्री मिस्त्री को रिक्वेस्ट भेज दी गई। 'बुकिंग' में देखें।",
  "cust_none": "अभी कोई फ्री मिस्त्री नहीं मिला। थोड़ी देर बाद कोशिश करें।", "crew_sum": "आपकी टीम में {c} लोग, {p} नई रिक्वेस्ट, बकाया मज़दूरी ₹{d}।",
  "c_ask_name": "नए साथी का नाम?", "c_ask_phone": "उनका फोन नंबर? (नहीं है तो 'छोड़ो' लिखें)", "c_ask_skill": "उनका काम क्या है?", "c_ask_rate": "उनकी दिन की मज़दूरी?",
  "c_added": "टीम में जोड़ दिया गया।", "c_invited": "उन्हें आमंत्रण भेज दिया गया।", "c_dup": "ये व्यक्ति पहले से आपकी टीम में है।",
  "chip_free": "✅ मैं फ्री हूँ", "chip_busy": "⛔ बिज़ी हूँ", "chip_off": "😴 आज बंद", "chip_earn": "💰 कमाई", "chip_jobs": "🧰 काम", "chip_book": "📋 बुकिंग",
  "chip_profile": "👤 प्रोफाइल", "chip_need": "⚡ मिस्त्री चाहिए", "chip_crew": "👥 मेरी टीम", "chip_add": "➕ साथी जोड़ें", "chip_skip": "छोड़ो", "chip_help": "ℹ️ मदद",
  "ask_job_confirm": "क्या आप यह काम पोस्ट करना चाहते हैं?\n• काम: {skill}\n• तारीख: {date}\n• दिन: {days}\n• बजट: ₹{budget}\n• पता: {address}\n\nपुष्टि के लिए 'हाँ' या 'नहीं' चुनें:",
  "job_posted_ok": "✅ आपका काम पोस्ट हो गया है! पास के {skill} कारीगरों को नोटिफिकेशन भेज दिया गया है।",
  "ask_instant_confirm": "क्या आप तुरंत {skill} बुलाना चाहते हैं?\nपास के सबसे नज़दीकी फ्री मिस्त्री को तुरंत अलर्ट जाएगा।",
  "instant_sent_ok": "⚡ तुरंत रिक्वेस्ट भेज दी गई है! पास के मिस्त्री को अलर्ट जा चुका है। 'बुकिंग' में देखें।",
  "action_cancelled": "❌ अनुरोध रद्द कर दिया गया। मैं आपकी और क्या मदद कर सकता हूँ?",
  "worker_cant_post": "⚠️ आप मिस्त्री / मज़दूर अकाउंट से लॉगिन हैं। नया काम पोस्ट करने या मिस्त्री बुलाने के लिए कृपया 'घर मालिक / ग्राहक' अकाउंट से लॉगिन करें। आपके लिए उपलब्ध काम देखने के लिए 'काम' बटन दबाएं।",
  "customer_cant_status": "ℹ️ यह सुविधा सिर्फ मिस्त्री / मज़दूर भाइयों के लिए है (फ्री/बिज़ी स्थिति सेट करने के लिए)।"},
 "en": {
  "hello": "Hello! I am your assistant. I can fill your profile, set you free/busy and show you work.",
  "ask_name": "What is your name?", "ask_skills": "What work do you do? Choose below or type.", "ask_rate": "What is your daily wage? (₹)",
  "ask_exp": "How many years of experience do you have?", "ask_village": "Which village / locality do you live in?", "ask_location": "Please share your location. Tap the button below.",
  "loc_ok": "Location received.", "loc_fail": "Could not get location. Turn on location in your phone and try again.", "ask_radius": "How many km can you travel for work?",
  "saved": "Great! Your profile is ready. Now tap 'I am free' to get work.", "free_ok": "Done, you now show as FREE. You will be told when work arrives.",
  "busy_ok": "Done, you now show as BUSY.", "off_ok": "Done, no work for today.", "earn": "This month: ₹{m} | Total: ₹{t} | Jobs done: {j} | Upcoming: {u}",
  "no_jobs": "No new jobs near you right now.", "jobs_head": "Jobs near you:", "no_bookings": "No bookings yet.", "bookings_head": "Your bookings:",
  "retry_num": "Please type just a number, like 500.", "retry_skill": "I did not understand. Choose the work, like mason or labour.",
  "unknown": "I did not understand. Tap a button below or type 'help'.", "lang_set": "Language changed.", "menu": "I can help with:",
  "cust_ask_skill": "Which worker do you need?", "cust_started": "Searching… request sent to nearby free workers. See 'Bookings'.",
  "cust_none": "No free worker found right now. Please try again shortly.", "crew_sum": "Your crew: {c} people, {p} new requests, wages due ₹{d}.",
  "c_ask_name": "Name of the new crew member?", "c_ask_phone": "Their phone number? (type 'skip' if none)", "c_ask_skill": "What is their work?", "c_ask_rate": "Their daily wage?",
  "c_added": "Added to your crew.", "c_invited": "Invitation sent to them.", "c_dup": "This person is already in your crew.",
  "chip_free": "✅ I am free", "chip_busy": "⛔ I am busy", "chip_off": "😴 Off today", "chip_earn": "💰 Earnings", "chip_jobs": "🧰 Jobs", "chip_book": "📋 Bookings",
  "chip_profile": "👤 Profile", "chip_need": "⚡ Need a worker", "chip_crew": "👥 My crew", "chip_add": "➕ Add member", "chip_skip": "skip", "chip_help": "ℹ️ Help",
  "ask_job_confirm": "Do you want to post this job?\n• Work: {skill}\n• Date: {date}\n• Days: {days}\n• Budget: ₹{budget}\n• Location: {address}\n\nPlease choose Yes or No to confirm:",
  "job_posted_ok": "✅ Your job has been posted! Nearby {skill} workers have been notified.",
  "ask_instant_confirm": "Do you want to dispatch a {skill} immediately?\nNearby free workers will receive an urgent request.",
  "instant_sent_ok": "⚡ Immediate request sent! Check status in 'Bookings'.",
  "action_cancelled": "❌ Request cancelled. How else may I assist you?",
  "worker_cant_post": "⚠️ You are logged in as a worker. To post jobs or hire workers, please use a Customer account. You can view open jobs under the 'Jobs' tab.",
  "customer_cant_status": "ℹ️ Availability status (Free / Busy / Off) is only for workers."},
 "mr": {
  "hello": "नमस्कार! मी तुमचा सहाय्यक आहे. प्रोफाइल भरणे, फ्री/बिझी करणे आणि काम दाखवणे यात मदत करीन.",
  "ask_name": "तुमचे नाव काय?", "ask_skills": "तुम्ही कोणते काम करता? खाली निवडा किंवा लिहा.", "ask_rate": "एका दिवसाची मजुरी किती घेता? (₹)",
  "ask_exp": "किती वर्षांचा अनुभव आहे?", "ask_village": "तुम्ही कोणत्या गावात/भागात राहता?", "ask_location": "तुमचे लोकेशन पाठवा. खालील बटण दाबा.",
  "loc_ok": "लोकेशन मिळाले.", "loc_fail": "लोकेशन मिळाले नाही. फोनमध्ये लोकेशन सुरू करून पुन्हा प्रयत्न करा.", "ask_radius": "कामासाठी किती किमी पर्यंत जाऊ शकता?",
  "saved": "छान! तुमची प्रोफाइल तयार आहे. आता 'मी फ्री आहे' दाबून काम मिळवा.", "free_ok": "ठीक आहे, तुम्ही आता फ्री दिसत आहात.", "busy_ok": "ठीक आहे, तुम्ही बिझी दिसत आहात.",
  "off_ok": "ठीक आहे, आज काम बंद.", "earn": "या महिन्यात: ₹{m} | एकूण: ₹{t} | पूर्ण कामे: {j} | येणारी कामे: {u}", "no_jobs": "सध्या जवळ नवीन काम नाही.", "jobs_head": "तुमच्या जवळची कामे:",
  "no_bookings": "अजून बुकिंग नाही.", "bookings_head": "तुमची बुकिंग:", "retry_num": "कृपया फक्त आकडा लिहा, उदा. 500.", "retry_skill": "समजले नाही. कामाचे नाव निवडा, जसे गवंडी किंवा मजूर.",
  "unknown": "समजले नाही. खालील बटण दाबा किंवा 'मदत' लिहा.", "lang_set": "भाषा बदलली.", "menu": "मी हे करू शकतो:", "cust_ask_skill": "तुम्हाला कोणता कारागीर हवा?",
  "cust_started": "शोधत आहोत… जवळच्या फ्री कारागिरांना विनंती पाठवली. 'बुकिंग' पहा.", "cust_none": "सध्या कोणी फ्री कारागीर मिळाला नाही. थोड्या वेळाने प्रयत्न करा.",
  "crew_sum": "तुमच्या टीममध्ये {c} जण, {p} नवीन विनंत्या, बाकी मजुरी ₹{d}.", "c_ask_name": "नवीन सहकाऱ्याचे नाव?", "c_ask_phone": "त्यांचा फोन नंबर? (नसेल तर 'सोडा' लिहा)",
  "c_ask_skill": "त्यांचे काम काय?", "c_ask_rate": "त्यांची दिवसाची मजुरी?", "c_added": "टीममध्ये जोडले.", "c_invited": "त्यांना निमंत्रण पाठवले.", "c_dup": "ही व्यक्ती आधीच तुमच्या टीममध्ये आहे.",
  "chip_free": "✅ मी फ्री आहे", "chip_busy": "⛔ बिझी आहे", "chip_off": "😴 आज बंद", "chip_earn": "💰 कमाई", "chip_jobs": "🧰 काम", "chip_book": "📋 बुकिंग",
  "chip_profile": "👤 प्रोफाइल", "chip_need": "⚡ कारागीर हवा", "chip_crew": "👥 माझी टीम", "chip_add": "➕ सहकारी जोडा", "chip_skip": "सोडा", "chip_help": "ℹ️ मदत"},
 "gu": {
  "hello": "નમસ્તે! હું તમારો સહાયક છું. પ્રોફાઇલ ભરવા, ફ્રી/બિઝી કરવા અને કામ બતાવવામાં મદદ કરીશ.",
  "ask_name": "તમારું નામ શું છે?", "ask_skills": "તમે કયું કામ કરો છો? નીચેથી પસંદ કરો અથવા લખો.", "ask_rate": "એક દિવસની મજૂરી કેટલી લો છો? (₹)",
  "ask_exp": "કેટલા વર્ષનો અનુભવ છે?", "ask_village": "તમે કયા ગામ/વિસ્તારમાં રહો છો?", "ask_location": "તમારું લોકેશન મોકલો. નીચેનું બટન દબાવો.",
  "loc_ok": "લોકેશન મળી ગયું.", "loc_fail": "લોકેશન મળ્યું નથી. ફોનમાં લોકેશન ચાલુ કરીને ફરી પ્રયત્ન કરો.", "ask_radius": "કામ માટે કેટલા કિમી સુધી જઈ શકો?",
  "saved": "સરસ! તમારી પ્રોફાઇલ તૈયાર છે. હવે 'હું ફ્રી છું' દબાવીને કામ મેળવો.", "free_ok": "બરાબર, તમે હવે ફ્રી દેખાઓ છો.", "busy_ok": "બરાબર, તમે બિઝી દેખાઓ છો.",
  "off_ok": "બરાબર, આજે કામ બંધ.", "earn": "આ મહિને: ₹{m} | કુલ: ₹{t} | પૂરાં કામ: {j} | આવનારાં કામ: {u}", "no_jobs": "હાલ નજીકમાં નવું કામ નથી.", "jobs_head": "તમારી નજીકનાં કામ:",
  "no_bookings": "હજી કોઈ બુકિંગ નથી.", "bookings_head": "તમારાં બુકિંગ:", "retry_num": "કૃપા કરીને ફક્ત નંબર લખો, જેમ કે 500.", "retry_skill": "સમજાયું નહીં. કામનું નામ પસંદ કરો, જેમ કે રાજમિસ્ત્રી અથવા મજૂર.",
  "unknown": "સમજાયું નહીં. નીચેનું બટન દબાવો અથવા 'મદદ' લખો.", "lang_set": "ભાષા બદલાઈ.", "menu": "હું આમાં મદદ કરી શકું:", "cust_ask_skill": "તમને કયો કારીગર જોઈએ?",
  "cust_started": "શોધી રહ્યા છીએ… નજીકના ફ્રી કારીગરોને વિનંતી મોકલી. 'બુકિંગ' જુઓ.", "cust_none": "હાલ કોઈ ફ્રી કારીગર મળ્યો નથી. થોડી વારે પ્રયત્ન કરો.",
  "crew_sum": "તમારી ટીમમાં {c} લોકો, {p} નવી વિનંતી, બાકી મજૂરી ₹{d}.", "c_ask_name": "નવા સાથીનું નામ?", "c_ask_phone": "તેમનો ફોન નંબર? (ન હોય તો 'છોડો' લખો)",
  "c_ask_skill": "તેમનું કામ શું?", "c_ask_rate": "તેમની દિવસની મજૂરી?", "c_added": "ટીમમાં ઉમેર્યા.", "c_invited": "તેમને આમંત્રણ મોકલ્યું.", "c_dup": "આ વ્યક્તિ પહેલેથી તમારી ટીમમાં છે.",
  "chip_free": "✅ હું ફ્રી છું", "chip_busy": "⛔ બિઝી છું", "chip_off": "😴 આજે બંધ", "chip_earn": "💰 કમાણી", "chip_jobs": "🧰 કામ", "chip_book": "📋 બુકિંગ",
  "chip_profile": "👤 પ્રોફાઇલ", "chip_need": "⚡ કારીગર જોઈએ", "chip_crew": "👥 મારી ટીમ", "chip_add": "➕ સાથી ઉમેરો", "chip_skip": "છોડો", "chip_help": "ℹ️ મદદ"},
 "bn": {
  "hello": "নমস্কার! আমি আপনার সহকারী। প্রোফাইল পূরণ, ফ্রি/ব্যস্ত করা এবং কাজ দেখাতে সাহায্য করব।",
  "ask_name": "আপনার নাম কী?", "ask_skills": "আপনি কোন কাজ করেন? নিচ থেকে বেছে নিন বা লিখুন।", "ask_rate": "দিনে কত মজুরি নেন? (₹)",
  "ask_exp": "কত বছরের অভিজ্ঞতা?", "ask_village": "আপনি কোন গ্রাম/এলাকায় থাকেন?", "ask_location": "আপনার লোকেশন পাঠান। নিচের বোতাম চাপুন।",
  "loc_ok": "লোকেশন পাওয়া গেছে।", "loc_fail": "লোকেশন পাওয়া যায়নি। ফোনে লোকেশন চালু করে আবার চেষ্টা করুন।", "ask_radius": "কাজের জন্য কত কিমি পর্যন্ত যেতে পারেন?",
  "saved": "দারুণ! আপনার প্রোফাইল তৈরি। এখন 'আমি ফ্রি' চেপে কাজ পান।", "free_ok": "ঠিক আছে, আপনি এখন ফ্রি দেখাচ্ছেন।", "busy_ok": "ঠিক আছে, আপনি ব্যস্ত দেখাচ্ছেন।",
  "off_ok": "ঠিক আছে, আজ কাজ বন্ধ।", "earn": "এই মাসে: ₹{m} | মোট: ₹{t} | শেষ কাজ: {j} | আসন্ন কাজ: {u}", "no_jobs": "এখন কাছাকাছি নতুন কাজ নেই।", "jobs_head": "আপনার কাছের কাজ:",
  "no_bookings": "এখনও কোনো বুকিং নেই।", "bookings_head": "আপনার বুকিং:", "retry_num": "দয়া করে শুধু সংখ্যা লিখুন, যেমন 500।", "retry_skill": "বুঝতে পারিনি। কাজের নাম বেছে নিন, যেমন রাজমিস্ত্রি বা শ্রমিক।",
  "unknown": "বুঝতে পারিনি। নিচের বোতাম চাপুন বা 'সাহায্য' লিখুন।", "lang_set": "ভাষা বদলানো হয়েছে।", "menu": "আমি এগুলো করতে পারি:", "cust_ask_skill": "আপনার কোন মিস্ত্রি দরকার?",
  "cust_started": "খুঁজছি… কাছের ফ্রি মিস্ত্রিদের অনুরোধ পাঠানো হয়েছে। 'বুকিং' দেখুন।", "cust_none": "এখন কোনো ফ্রি মিস্ত্রি পাওয়া যায়নি। একটু পরে চেষ্টা করুন।",
  "crew_sum": "আপনার দলে {c} জন, {p} নতুন অনুরোধ, বাকি মজুরি ₹{d}।", "c_ask_name": "নতুন সঙ্গীর নাম?", "c_ask_phone": "তাঁর ফোন নম্বর? (না থাকলে 'ছাড়ো' লিখুন)",
  "c_ask_skill": "তাঁর কাজ কী?", "c_ask_rate": "তাঁর দিনের মজুরি?", "c_added": "দলে যোগ করা হয়েছে।", "c_invited": "তাঁকে আমন্ত্রণ পাঠানো হয়েছে।", "c_dup": "এই ব্যক্তি আগে থেকেই আপনার দলে আছেন।",
  "chip_free": "✅ আমি ফ্রি", "chip_busy": "⛔ ব্যস্ত", "chip_off": "😴 আজ বন্ধ", "chip_earn": "💰 আয়", "chip_jobs": "🧰 কাজ", "chip_book": "📋 বুকিং",
  "chip_profile": "👤 প্রোফাইল", "chip_need": "⚡ মিস্ত্রি চাই", "chip_crew": "👥 আমার দল", "chip_add": "➕ সঙ্গী যোগ", "chip_skip": "ছাড়ো", "chip_help": "ℹ️ সাহায্য"},
 "ta": {
  "hello": "வணக்கம்! நான் உங்கள் உதவியாளர். சுயவிவரம் நிரப்ப, ஃப்ரீ/பிஸி அமைக்க, வேலை காட்ட உதவுவேன்.",
  "ask_name": "உங்கள் பெயர் என்ன?", "ask_skills": "நீங்கள் என்ன வேலை செய்கிறீர்கள்? கீழே தேர்வு செய்யுங்கள் அல்லது எழுதுங்கள்.", "ask_rate": "ஒரு நாள் கூலி எவ்வளவு? (₹)",
  "ask_exp": "எத்தனை ஆண்டு அனுபவம்?", "ask_village": "எந்த கிராமம்/பகுதியில் வசிக்கிறீர்கள்?", "ask_location": "உங்கள் இருப்பிடத்தை அனுப்புங்கள். கீழே உள்ள பொத்தானை அழுத்துங்கள்.",
  "loc_ok": "இருப்பிடம் கிடைத்தது.", "loc_fail": "இருப்பிடம் கிடைக்கவில்லை. போனில் இருப்பிடத்தை இயக்கி மீண்டும் முயலுங்கள்.", "ask_radius": "வேலைக்கு எத்தனை கி.மீ வரை செல்வீர்கள்?",
  "saved": "சிறப்பு! உங்கள் சுயவிவரம் தயார். இப்போது 'நான் ஃப்ரீ' அழுத்தி வேலை பெறுங்கள்.", "free_ok": "சரி, நீங்கள் இப்போது ஃப்ரீ என காட்டப்படுகிறீர்கள்.", "busy_ok": "சரி, நீங்கள் பிஸி என காட்டப்படுகிறீர்கள்.",
  "off_ok": "சரி, இன்று வேலை இல்லை.", "earn": "இந்த மாதம்: ₹{m} | மொத்தம்: ₹{t} | முடிந்த வேலை: {j} | வரவிருக்கும்: {u}", "no_jobs": "அருகில் புதிய வேலை இல்லை.", "jobs_head": "உங்கள் அருகிலுள்ள வேலைகள்:",
  "no_bookings": "இன்னும் முன்பதிவு இல்லை.", "bookings_head": "உங்கள் முன்பதிவுகள்:", "retry_num": "தயவுசெய்து எண்ணை மட்டும் எழுதுங்கள், உதா. 500.", "retry_skill": "புரியவில்லை. வேலையைத் தேர்வு செய்யுங்கள், உதா. கொத்தனார் அல்லது தொழிலாளி.",
  "unknown": "புரியவில்லை. கீழே உள்ள பொத்தானை அழுத்துங்கள் அல்லது 'உதவி' என எழுதுங்கள்.", "lang_set": "மொழி மாற்றப்பட்டது.", "menu": "நான் இவற்றில் உதவுவேன்:", "cust_ask_skill": "உங்களுக்கு எந்த தொழிலாளி வேண்டும்?",
  "cust_started": "தேடுகிறோம்… அருகிலுள்ள ஃப்ரீ தொழிலாளர்களுக்கு கோரிக்கை அனுப்பப்பட்டது. 'முன்பதிவு' பாருங்கள்.", "cust_none": "இப்போது ஃப்ரீ தொழிலாளி இல்லை. சிறிது நேரம் கழித்து முயலுங்கள்.",
  "crew_sum": "உங்கள் குழுவில் {c} பேர், {p} புதிய கோரிக்கை, பாக்கி கூலி ₹{d}.", "c_ask_name": "புதிய உறுப்பினரின் பெயர்?", "c_ask_phone": "அவர் போன் எண்? (இல்லையெனில் 'விடு' என எழுதுங்கள்)",
  "c_ask_skill": "அவர் வேலை என்ன?", "c_ask_rate": "அவர் நாள் கூலி?", "c_added": "குழுவில் சேர்க்கப்பட்டது.", "c_invited": "அவருக்கு அழைப்பு அனுப்பப்பட்டது.", "c_dup": "இவர் ஏற்கனவே உங்கள் குழுவில் உள்ளார்.",
  "chip_free": "✅ நான் ஃப்ரீ", "chip_busy": "⛔ பிஸி", "chip_off": "😴 இன்று இல்லை", "chip_earn": "💰 வருமானம்", "chip_jobs": "🧰 வேலை", "chip_book": "📋 முன்பதிவு",
  "chip_profile": "👤 சுயவிவரம்", "chip_need": "⚡ தொழிலாளி வேண்டும்", "chip_crew": "👥 என் குழு", "chip_add": "➕ உறுப்பினர் சேர்", "chip_skip": "விடு", "chip_help": "ℹ️ உதவி"},
 "te": {
  "hello": "నమస్కారం! నేను మీ సహాయకుడిని. ప్రొఫైల్ నింపడం, ఫ్రీ/బిజీ సెట్ చేయడం, పని చూపడంలో సహాయం చేస్తాను.",
  "ask_name": "మీ పేరు ఏమిటి?", "ask_skills": "మీరు ఏ పని చేస్తారు? కింద ఎంచుకోండి లేదా రాయండి.", "ask_rate": "రోజు కూలీ ఎంత? (₹)",
  "ask_exp": "ఎన్ని సంవత్సరాల అనుభవం?", "ask_village": "మీరు ఏ ఊరు/ప్రాంతంలో ఉంటారు?", "ask_location": "మీ లొకేషన్ పంపండి. కింది బటన్ నొక్కండి.",
  "loc_ok": "లొకేషన్ వచ్చింది.", "loc_fail": "లొకేషన్ రాలేదు. ఫోన్‌లో లొకేషన్ ఆన్ చేసి మళ్లీ ప్రయత్నించండి.", "ask_radius": "పని కోసం ఎన్ని కి.మీ వరకు వెళ్లగలరు?",
  "saved": "చాలా బాగుంది! మీ ప్రొఫైల్ సిద్ధం. ఇప్పుడు 'నేను ఫ్రీ' నొక్కి పని పొందండి.", "free_ok": "సరే, మీరు ఇప్పుడు ఫ్రీగా కనిపిస్తున్నారు.", "busy_ok": "సరే, మీరు బిజీగా కనిపిస్తున్నారు.",
  "off_ok": "సరే, ఈ రోజు పని లేదు.", "earn": "ఈ నెల: ₹{m} | మొత్తం: ₹{t} | పూర్తైన పనులు: {j} | రాబోయే పనులు: {u}", "no_jobs": "దగ్గరలో కొత్త పని లేదు.", "jobs_head": "మీ దగ్గరి పనులు:",
  "no_bookings": "ఇంకా బుకింగ్ లేదు.", "bookings_head": "మీ బుకింగ్‌లు:", "retry_num": "దయచేసి సంఖ్య మాత్రమే రాయండి, ఉదా. 500.", "retry_skill": "అర్థం కాలేదు. పని పేరు ఎంచుకోండి, ఉదా. మేస్త్రి లేదా కూలీ.",
  "unknown": "అర్థం కాలేదు. కింది బటన్ నొక్కండి లేదా 'సహాయం' రాయండి.", "lang_set": "భాష మార్చబడింది.", "menu": "నేను వీటిలో సహాయం చేస్తాను:", "cust_ask_skill": "మీకు ఏ పనివాడు కావాలి?",
  "cust_started": "వెతుకుతున్నాం… దగ్గరి ఫ్రీ పనివాళ్లకు అభ్యర్థన పంపాం. 'బుకింగ్' చూడండి.", "cust_none": "ఇప్పుడు ఫ్రీ పనివాడు దొరకలేదు. కాసేపటి తర్వాత ప్రయత్నించండి.",
  "crew_sum": "మీ టీమ్‌లో {c} మంది, {p} కొత్త అభ్యర్థనలు, బాకీ కూలీ ₹{d}.", "c_ask_name": "కొత్త సభ్యుని పేరు?", "c_ask_phone": "వారి ఫోన్ నంబర్? (లేకపోతే 'వదిలేయి' అని రాయండి)",
  "c_ask_skill": "వారి పని ఏమిటి?", "c_ask_rate": "వారి రోజు కూలీ?", "c_added": "టీమ్‌లో చేర్చాం.", "c_invited": "వారికి ఆహ్వానం పంపాం.", "c_dup": "ఈ వ్యక్తి ఇప్పటికే మీ టీమ్‌లో ఉన్నారు.",
  "chip_free": "✅ నేను ఫ్రీ", "chip_busy": "⛔ బిజీ", "chip_off": "😴 ఈ రోజు లేదు", "chip_earn": "💰 ఆదాయం", "chip_jobs": "🧰 పని", "chip_book": "📋 బుకింగ్",
  "chip_profile": "👤 ప్రొఫైల్", "chip_need": "⚡ పనివాడు కావాలి", "chip_crew": "👥 నా టీమ్", "chip_add": "➕ సభ్యుని చేర్చు", "chip_skip": "వదిలేయి", "chip_help": "ℹ️ సహాయం"},
}
# Bhojpuri (Devanagari): based on Hindi with Bhojpuri wording
STR["bho"] = dict(STR["hi"])
STR["bho"].update({
  "hello": "प्रणाम! हम रउआ के सहायक हईं। प्रोफाइल भरे, फ्री/बिज़ी करे आ काम देखावे में मदद करब।",
  "ask_name": "रउआ के नाम का ह?", "ask_skills": "रउआ कवन काम करेनी? नीचे से चुनीं भा लिखीं।", "ask_rate": "एक दिन के मजूरी केतना लेवेनी? (₹)",
  "ask_exp": "केतना साल के अनुभव बा?", "ask_village": "रउआ कवन गाँव/मोहल्ला में रहेनी?", "ask_location": "आपन लोकेशन भेजीं। नीचे वाला बटन दबाईं।",
  "ask_radius": "काम खातिर केतना किलोमीटर ले जा सकेनी?", "saved": "बहुत बढ़िया! रउआ के प्रोफाइल तैयार बा। अब 'हम फ्री हईं' दबाईं आ काम पाईं।",
  "free_ok": "ठीक बा, रउआ अब फ्री देखात बानी।", "busy_ok": "ठीक बा, रउआ बिज़ी देखात बानी।", "off_ok": "ठीक बा, आज काम बंद।",
  "no_jobs": "अबहीं रउआ लगे कवनो नया काम नइखे।", "jobs_head": "रउआ लगे के काम:", "no_bookings": "अबहीं कवनो बुकिंग नइखे।", "bookings_head": "रउआ के बुकिंग:",
  "retry_num": "कृपया खाली नंबर लिखीं, जइसे 500।", "unknown": "समझ में ना आइल। नीचे के बटन दबाईं भा 'मदद' लिखीं।",
  "cust_ask_skill": "रउआ के कवन मिस्त्री चाहीं?", "cust_none": "अबहीं कवनो फ्री मिस्त्री ना मिलल। तनी देर बाद कोशिश करीं।",
  "chip_free": "✅ हम फ्री हईं", "chip_busy": "⛔ बिज़ी हईं", "chip_off": "😴 आज बंद", "chip_need": "⚡ मिस्त्री चाहीं"})

# Ensure all text keys exist in all languages (fallback to Hindi)
for _lg in LANGS:
    if _lg in STR:
        for _k, _v in STR["hi"].items():
            if _k not in STR[_lg]:
                STR[_lg][_k] = _v

SKILLNAMES = {
 "hi": {"rajmistri": "राजमिस्त्री", "labour": "मज़दूर", "plumber": "प्लंबर", "electrician": "इलेक्ट्रीशियन", "painter": "पेंटर", "carpenter": "बढ़ई", "tiles": "टाइल्स", "welder": "वेल्डर", "pop": "POP", "bar_bender": "सरिया"},
 "en": {"rajmistri": "Mason", "labour": "Labour", "plumber": "Plumber", "electrician": "Electrician", "painter": "Painter", "carpenter": "Carpenter", "tiles": "Tiles", "welder": "Welder", "pop": "POP", "bar_bender": "Bar bender"},
 "mr": {"rajmistri": "गवंडी", "labour": "मजूर", "plumber": "प्लंबर", "electrician": "इलेक्ट्रिशियन", "painter": "पेंटर", "carpenter": "सुतार", "tiles": "टाइल्स", "welder": "वेल्डर", "pop": "POP", "bar_bender": "सळई"},
 "gu": {"rajmistri": "રાજમિસ્ત્રી", "labour": "મજૂર", "plumber": "પ્લમ્બર", "electrician": "ઇલેક્ટ્રિશિયન", "painter": "પેઇન્ટર", "carpenter": "સુથાર", "tiles": "ટાઇલ્સ", "welder": "વેલ્ડર", "pop": "POP", "bar_bender": "સળિયા"},
 "bn": {"rajmistri": "রাজমিস্ত্রি", "labour": "শ্রমিক", "plumber": "প্লাম্বার", "electrician": "ইলেকট্রিশিয়ান", "painter": "পেইন্টার", "carpenter": "ছুতার", "tiles": "টাইলস", "welder": "ওয়েল্ডার", "pop": "POP", "bar_bender": "রড"},
 "ta": {"rajmistri": "கொத்தனார்", "labour": "தொழிலாளி", "plumber": "பிளம்பர்", "electrician": "எலக்ட்ரீசியன்", "painter": "பெயிண்டர்", "carpenter": "தச்சர்", "tiles": "டைல்ஸ்", "welder": "வெல்டர்", "pop": "POP", "bar_bender": "கம்பி"},
 "te": {"rajmistri": "మేస్త్రి", "labour": "కూలీ", "plumber": "ప్లంబర్", "electrician": "ఎలక్ట్రీషియన్", "painter": "పెయింటర్", "carpenter": "వడ్రంగి", "tiles": "టైల్స్", "welder": "వెల్డర్", "pop": "POP", "bar_bender": "కడ్డీ"},
}
SKILLNAMES["bho"] = SKILLNAMES["hi"]

def T(lang, key, **kw):
    s = STR.get(lang, {}).get(key) or STR["hi"].get(key) or STR["en"].get(key, key)
    return s.format(**kw) if kw else s

# ------------------------------------------------------------------ NLU helpers
DIGITS = str.maketrans("०१२३४५६७८९૦૧૨૩૪૫૬૭૮૯০১২৩৪৫৬৭৮৯௦௧௨௩௪௫௬௭௮௯౦౧౨౩౪౫౬౭౮౯", "0123456789" * 5)
NUMW = {"ek": 1, "do": 2, "teen": 3, "char": 4, "chaar": 4, "paanch": 5, "panch": 5, "chhe": 6, "chah": 6, "saat": 7, "aath": 8, "nau": 9, "das": 10,
        "bees": 20, "tees": 30, "chalis": 40, "pachas": 50, "sau": 100, "hazaar": 1000, "hazar": 1000,
        "एक": 1, "दो": 2, "तीन": 3, "चार": 4, "पांच": 5, "पाँच": 5, "छह": 6, "छः": 6, "सात": 7, "आठ": 8, "नौ": 9, "दस": 10, "बीस": 20, "तीस": 30, "चालीस": 40, "पचास": 50,
        "सौ": 100, "हज़ार": 1000, "हजार": 1000, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
        "twenty": 20, "thirty": 30, "forty": 40, "fifty": 50, "hundred": 100, "thousand": 1000}

def norm(t: str) -> str:
    return (t or "").translate(DIGITS).strip().lower()

def parse_number(t: str) -> Optional[int]:
    t = norm(t)
    m = re.search(r"\d+", t.replace(",", ""))
    if m:
        return int(m.group())
    total = cur = 0
    seen = False
    for w in re.split(r"[\s,]+", t):
        v = NUMW.get(w)
        if v is None:
            continue
        seen = True
        if v == 100:
            cur = (cur or 1) * 100
        elif v == 1000:
            total += (cur or 1) * 1000
            cur = 0
        else:
            cur += v
    return total + cur if seen else None

SKILL_WORDS = {
 "rajmistri": ["rajmistri", "raj mistri", "mason", "मिस्त्री", "राजमिस्त्री", "राज मिस्त्री", "गवंडी", "ગવંડી", "રાજમિસ્ત્રી", "রাজমিস্ত্রি", "கொத்தனார்", "மேஸ்திரி", "మేస్త్రి", "తాపీ", "itai", "chunai", "plaster", "dhalai", "chhat", "ईंटाई", "चुनाई", "प्लास्टर", "ढलाई", "छत"],
 "labour": ["labour", "labor", "mazdoor", "majdoor", "majur", "helper", "मजदूर", "मज़दूर", "मजूर", "हेल्पर", "મજૂર", "શ્રમિક", "শ্রমিক", "মজুর", "தொழிலாளி", "கூலி", "కూలీ", "కూలి", "kuli", "beldar", "कुली", "बेलदार"],
 "plumber": ["plumber", "प्लंबर", "प्लम्बर", "नल", "પ્લમ્બર", "প্লাম্বার", "பிளம்பர்", "ப்ளம்பர்", "ప్లంబర్", "nal wala", "pani wala", "water fitting", "pipe wala", "tanki", "नल वाला", "पानी वाला", "पाइप", "टंकी"],
 "electrician": ["electrician", "bijli", "बिजली", "इलेक्ट्रीशियन", "इलेक्ट्रिशियन", "वायरमैन", "ઇલેક્ટ્રિશિયન", "ইলেকট্রিশিয়ান", "எலக்ட்ரீசியன்", "ఎలక్ట్రీషియన్", "bijli wala", "light wala", "wiring", "current", "बिजली वाला", "लाइट वाला", "वायरिंग"],
 "painter": ["painter", "पेंटर", "पुताई", "रंगाई", "પેઇન્ટર", "পেইন্টার", "பெயிண்டர்", "పెయింటర్", "colour wala", "color wala", "rangai", "putai", "putty", "whitewash", "कलर वाला", "रंग वाला", "सफेदी", "पुट्टी"],
 "carpenter": ["carpenter", "badhai", "बढ़ई", "बढई", "कारपेंटर", "सुतार", "સુથાર", "ছুতার", "কাঠমিস্ত্রি", "தச்சர்", "కార్పెంటర్", "వడ్రంగి", "lakdi wala", "furniture", "darwaza", "khidki", "लकड़ी वाला", "फर्नीचर", "दरवाजा"],
 "tiles": ["tiles", "tile", "टाइल", "टाइल्स", "ટાઇલ", "টাইলસ", "டைல்", "టైల్", "pathar", "marbal", "पत्थर", "मार्बल", "फ्लोरिंग"],
 "welder": ["welder", "welding", "वेल्डर", "वेल्डिंग", "વેલ્ડર", "ওয়েল্ডার", "வெல்டர்", "వెల్డర్", "lohe ka kaam", "लोहे का काम", "गेट"],
 "pop": ["pop", "पीओपी", "ceiling", "सीलिंग", "false ceiling", "gypsum"],
 "bar_bender": ["sariya", "bar bender", "सरिया", "बार बेंडर", "सळई", "સળિયા", "loha bandhne wala", "सरिया वाला", "लोहा बांधने वाला"],
}
GENERIC_MISTRI = ["mistri", "मिस्त्री", "मिस्री", "મિસ્ત્રી", "মিস্ত্রি"]

def find_skills(t: str):
    t = norm(t)
    found = [k for k, ws in SKILL_WORDS.items() if any(w in t for w in ws)]
    if not found and any(w in t for w in GENERIC_MISTRI):
        found = ["rajmistri"]
    return found

# ------------------------------------------------------------------ Geocoding & Entity Extractors
GEO_CITIES = {
    "kanpur": (26.4499, 80.3319),
    "कानपुर": (26.4499, 80.3319),
    "lucknow": (26.8467, 80.9462),
    "लखनऊ": (26.8467, 80.9462),
    "delhi": (28.6139, 77.2090),
    "दिल्ली": (28.6139, 77.2090),
    "noida": (28.5355, 77.3910),
    "नोएडा": (28.5355, 77.3910),
    "greater noida": (28.4744, 77.5040),
    "ग्रेटर नोएडा": (28.4744, 77.5040),
    "ghaziabad": (28.6692, 77.4538),
    "गाजियाबाद": (28.6692, 77.4538),
    "varanasi": (25.3176, 82.9739),
    "वाराणसी": (25.3176, 82.9739),
    "banaras": (25.3176, 82.9739),
    "बनारस": (25.3176, 82.9739),
    "kashi": (25.3176, 82.9739),
    "काशी": (25.3176, 82.9739),
    "prayagraj": (25.4358, 81.8463),
    "प्रयागराज": (25.4358, 81.8463),
    "allahabad": (25.4358, 81.8463),
    "इलाहाबाद": (25.4358, 81.8463),
    "agra": (27.1767, 78.0081),
    "आगरा": (27.1767, 78.0081),
    "meerut": (28.9845, 77.7064),
    "मेरठ": (28.9845, 77.7064),
    "bareilly": (28.3670, 79.4304),
    "बरेली": (28.3670, 79.4304),
    "aligarh": (27.8974, 78.0880),
    "अलीगढ़": (27.8974, 78.0880),
    "moradabad": (28.8386, 78.7733),
    "मुरादाबाद": (28.8386, 78.7733),
    "gorakhpur": (26.7606, 83.3732),
    "गोरखपुर": (26.7606, 83.3732),
    "ayodhya": (26.7922, 82.1998),
    "अयोध्या": (26.7922, 82.1998),
    "faizabad": (26.7922, 82.1998),
    "फैजाबाद": (26.7922, 82.1998),
    "jhansi": (25.4484, 78.5685),
    "झांसी": (25.4484, 78.5685),
    "patna": (25.5941, 85.1376),
    "पटना": (25.5941, 85.1376),
    "jaipur": (26.9124, 75.7873),
    "जयपुर": (26.9124, 75.7873),
    "mumbai": (19.0760, 72.8777),
    "मुंबई": (19.0760, 72.8777),
    "kolkata": (22.5726, 88.3639),
    "कोलकाता": (22.5726, 88.3639),
}

def geocode_city(t: str) -> Optional[dict]:
    t = norm(t)
    for city, coords in GEO_CITIES.items():
        if city in t:
            return {"city": city.title(), "lat": coords[0], "lng": coords[1]}
    return None

def extract_date(t: str, ref_date: Optional[date] = None) -> Optional[str]:
    ref = ref_date or today()
    t = norm(t)
    m = re.search(r"\b(20\d{2})-(\d{1,2})-(\d{1,2})\b", t)
    if m:
        try:
            return date(int(m.group(1)), int(m.group(2)), int(m.group(3))).isoformat()
        except ValueError:
            pass
    m = re.search(r"\b(\d{1,2})[-/](\d{1,2})[-/](20\d{2})\b", t)
    if m:
        try:
            return date(int(m.group(3)), int(m.group(2)), int(m.group(1))).isoformat()
        except ValueError:
            pass
    m = re.search(r"\b(\d{1,2})[-/](\d{1,2})\b", t)
    if m:
        try:
            d_obj = date(ref.year, int(m.group(2)), int(m.group(1)))
            if d_obj < ref:
                d_obj = date(ref.year + 1, int(m.group(2)), int(m.group(1)))
            return d_obj.isoformat()
        except ValueError:
            pass
    if any(w in t for w in ["aaj", "today", "आज"]):
        return ref.isoformat()
    if any(w in t for w in ["parson", "parso", "day after tomorrow", "परसों", "परसो"]):
        return (ref + timedelta(days=2)).isoformat()
    if any(w in t for w in ["narson", "narso", "नरसों", "नरसो"]):
        return (ref + timedelta(days=3)).isoformat()
    if any(w in t for w in ["kal", "tomorrow", "कल", "काल्हे", "काले"]):
        return (ref + timedelta(days=1)).isoformat()
    m = re.search(r"\b(\d{1,2})\s*(?:tarikh|taarikh|तारीख|th|st|nd|rd)\b", t)
    if m:
        day_num = int(m.group(1))
        if 1 <= day_num <= 31:
            try:
                cand = date(ref.year, ref.month, day_num)
                if cand < ref:
                    m_next = ref.month % 12 + 1
                    y_next = ref.year + (1 if ref.month == 12 else 0)
                    cand = date(y_next, m_next, day_num)
                return cand.isoformat()
            except ValueError:
                pass
    WEEKDAYS = {
        0: ["somwar", "somvaar", "monday", "सोमवार", "सोम"],
        1: ["mangalwar", "mangalvaar", "tuesday", "मंगलवार", "मंगल"],
        2: ["budhwar", "budhvaar", "wednesday", "बुधवार", "बुध"],
        3: ["guruwar", "brihaspatiwar", "thursday", "गुरुवार", "बृहस्पतिवार", "गुरु"],
        4: ["shukrawar", "shukravaar", "friday", "शुक्रवार", "शुक्र"],
        5: ["shaniwar", "shanivaar", "saturday", "शनिवार", "शनि"],
        6: ["itwar", "itvaar", "raviwar", "ravivaar", "sunday", "रविवार", "इतवार", "रवि"],
    }
    for target_wd, words in WEEKDAYS.items():
        if any(w in t for w in words):
            delta = (target_wd - ref.weekday()) % 7
            if delta == 0:
                delta = 7
            return (ref + timedelta(days=delta)).isoformat()
    return None

def extract_days(t: str) -> Optional[int]:
    t = norm(t)
    if any(w in t for w in ["do hafte", "2 hafte", "2 weeks", "two weeks", "दो हफ्ते", "दो सप्ताह"]):
        return 14
    if any(w in t for w in ["ek hafta", "1 hafta", "1 week", "one week", "एक हफ्ता", "एक सप्ताह"]):
        return 7
    if any(w in t for w in ["ek mahina", "1 mahina", "1 month", "एक महीना"]):
        return 30
    
    m = re.search(r"(\d+)\s*(?:din|days?|दिन|दिवस)", t)
    if m:
        return min(max(1, int(m.group(1))), 365)
    
    WORD_DAYS = {
        "ek din": 1, "एक दिन": 1, "one day": 1,
        "do din": 2, "दो दिन": 2, "two days": 2,
        "teen din": 3, "तीन दिन": 3, "three days": 3,
        "char din": 4, "chaar din": 4, "चार दिन": 4, "four days": 4,
        "panch din": 5, "paanch din": 5, "पांच दिन": 5, "five days": 5,
        "chhe din": 6, "छह दिन": 6, "six days": 6,
        "saat din": 7, "सात दिन": 7, "seven days": 7,
        "das din": 10, "दस दिन": 10, "ten days": 10,
    }
    for phrase, count in WORD_DAYS.items():
        if phrase in t:
            return count
    return None

def extract_budget(t: str) -> Optional[int]:
    t = norm(t)
    m = re.search(r"(\d+)\s*(?:hazar|hazaar|हज़ार|हजार|k\b)", t)
    if m:
        return int(m.group(1)) * 1000
    
    m = re.search(r"(?:₹|rs\.?|inr|रु|रुपये|रूपये|budget|बजट|रेट|rate)\s*(\d{2,6})", t)
    if m:
        return int(m.group(1))
    
    m = re.search(r"(\d{2,6})\s*(?:₹|rs\.?|inr|रु|रुपये|रूपये|rupaye|rupee|rupees|per day|/din|/day)", t)
    if m:
        return int(m.group(1))
    
    return None

INTENTS = [   # order matters: first match wins
    ("instant_request", [
        "turant", "jaldi", "urgent", "abhi chahiye", "right now", "instant", "tatkal",
        "तुरंत", "जल्दी", "तत्काल", "अभी चाहिए", "इमरजेंसी", "इमर्जेंसी", "emergency"
    ]),
    ("post_job", [
        "kam post", "kaam post", "job post", "kam dalna", "kaam dalna", "post job",
        "mistri lagwana", "plaster karwana", "chunai karwani", "putai karwani", "kam karwana",
        "kaam karwana", "theka", "ek mistri chahiye kal",
        "काम डाल", "काम पोस्ट", "जॉब पोस्ट", "काम करवाना", "पुताई करवानी", "प्लास्टर करवाना",
        "चुनाई करवानी", "नया काम", "काम देना"
    ]),
    ("find_workers", [
        "search worker", "find worker", "workers dikhao", "mistri dhundo", "plumber dhundo",
        "painter dhundo", "मिस्त्री ढूंढो", "मिस्त्री खोजो", "कामगार खोजो", "ढूंढो", "खोजो",
        "find mistri", "search mistri", "search"
    ]),
    ("help", ["help", "madad", "मदद", "सहायता", "मदत", "મદદ", "সাহায্য", "உதவி", "సహాయం", "menu"]),
    ("language", ["language", "bhasha", "भाषा", "ભાષા", "ভাষা", "மொழி", "భాష"]),
    ("profile", ["profile", "प्रोफाइल", "प्रोफ़ाइल", "પ્રોફાઇલ", "প্রোফাইল", "சுயவிவரம்", "ప్రొఫైల్"]),
    ("earnings", ["kamai", "earning", "earn", "income", "paisa", "paise", "कमाई", "कमाणी", "पैसे", "કમાણી", "আয়", "வருமானம்", "ఆదాయం"]),
    ("bookings", ["booking", "bukking", "बुकिंग", "बुकींग", "બુકિંગ", "বুকિંગ", "முன்பதிவு", "బుకింగ్"]),
    ("add_crew", ["add crew", "add", "jodo", "जोड़", "जोड", "साथी जोड", "सहकारी जोडा", "સાથી ઉમેર", "সঙ্গী যোগ", "உறுப்பினர் சேர்", "సభ్యుని చేర్"]),
    ("crew", ["team", "crew", "saathi", "टीम", "साथी", "టీమ్", "दल", "குழு"]),
    ("offline", ["offline", "band", "off", "छुट्टी", "बंद", "बंध", "বন্ধ", "இல்லை", "లేదు", "chhutti", "आज बंद", "आज नहीं", "काम बंद"]),
    ("busy", ["busy", "bizi", "bijy", "बिज़ी", "बिजी", "व्यस्त", "बिझी", "બિઝી", "ব্যસ્ત", "பிஸி", "బిజీ"]),
    ("free", ["free", "khali", "khaali", "फ्री", "खाली", "मोकळा", "ફ્રી", "ખાલી", "ফ্রি", "খালি", "ஃப்ரீ", "ஃபிரீ", "ఫ్రీ", "kaam chahiye", "kaam do", "काम चाहिए", "काम दो"]),
    ("jobs", ["jobs", "job", "kaam", "काम", "કામ", "কাজ", "வேலை", "పని", "nearby", "paas ke kaam", "pass ke kaam", "पास के काम", "koi kaam", "koi kam", "area me"]),
    ("need", ["chahiye", "chaiye", "need", "hire", "चाहिए", "चाहीं", "पाहिजे", "हवा", "જોઈએ", "চাই", "வேண்டும்", "కావాలి", "bulao", "बुलाओ", "बुलाना"]),
]
SKIP_WORDS = ["skip", "chhodo", "chodo", "छोड़ो", "छोडो", "सोडा", "છોડો", "ছাড়ো", "விடு", "వదిలేయి", "-", "none", "नहीं है", "nahi hai"]

YES_WORDS = ["haan", "yes", "ha", "haa", "sahi hai", "theek hai", "thik hai", "ok", "confirm", "kar do", "bhej do", "post kar do", "हाँ", "हा", "सही है", "ठीक है", "कर दो", "भेज दो", "होय", "હા", "হ্যাঁ", "ஆம்", "అవును"]
NO_WORDS = ["nahi", "no", "na", "cancel", "mat karo", "roko", "rehne do", "रहने दो", "नहीं", "ना", "नही", "रद्द", "नाही", "ના", "না", "இல்லை", "వద్దు"]

def detect_intent(t: str, role: str = "") -> Optional[str]:
    t = norm(t)
    for name, words in INTENTS:
        for w in words:
            if w in t:
                if name == "need":
                    if any(iw in t for iw in ["turant", "jaldi", "urgent", "abhi", "instant", "tatkal", "तुरंत", "जल्दी"]):
                        return "instant_request"
                    if role == "worker":
                        return "free" if any(kw in t for kw in ["kaam", "kam", "काम"]) else "jobs"
                    if extract_date(t) or extract_days(t) or extract_budget(t):
                        return "post_job"
                return name
    return None

def call_llm_structured(text: str, role: str) -> Optional[dict]:
    """Call Gemini or Anthropic LLM if configured; fallback to None."""
    if config.GEMINI_API_KEY:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={config.GEMINI_API_KEY}"
            payload = {
                "contents": [{"parts": [{"text": f"""Role: {role}
User message: {text}
Extract the structured intent and entities from the user message into JSON with keys:
- "intent": one of "instant_request", "post_job", "find_workers", "set_free", "set_busy", "set_offline", "earnings", "show_jobs", "bookings", "help", "crew", "add_crew", "unknown"
- "skill": worker skill (rajmistri, labour, plumber, electrician, painter, carpenter, tiles, welder, pop, bar_bender) or null
- "date": YYYY-MM-DD or null
- "days": number of days (int) or null
- "budget": total or daily budget in INR (int) or null
- "city": city name or null
- "reply": short friendly response in the user's language

Return ONLY valid JSON."""}]}],
                "generationConfig": {"response_mime_type": "application/json"}
            }
            req = urllib.request.Request(url, data=json.dumps(payload).encode(), headers={"content-type": "application/json"})
            resp = json.loads(urllib.request.urlopen(req, timeout=5).read().decode())
            out_text = resp["candidates"][0]["content"]["parts"][0]["text"].strip()
            return json.loads(out_text)
        except Exception as e:
            logger.debug(f"Gemini API call failed: {e}")

    if config.ANTHROPIC_API_KEY:
        try:
            body = json.dumps({
                "model": config.ASSISTANT_MODEL,
                "max_tokens": 150,
                "system": """Extract user intent from any Indian language into JSON with keys:
intent (one of: instant_request, post_job, find_workers, set_free, set_busy, set_offline, earnings, show_jobs, bookings, help, crew, add_crew, unknown),
skill (rajmistri|labour|plumber|electrician|painter|carpenter|tiles|welder|pop|bar_bender|null),
date (YYYY-MM-DD|null), days (int|null), budget (int|null), city (str|null), reply (str|null).
Return ONLY JSON.""",
                "messages": [{"role": "user", "content": f"role={role}\nmessage={text}"}]
            }).encode()
            req = urllib.request.Request("https://api.anthropic.com/v1/messages", data=body, headers={
                "x-api-key": config.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json"
            })
            out = json.loads(urllib.request.urlopen(req, timeout=5).read().decode())
            txt = out["content"][0]["text"].strip()
            if txt.startswith("```"):
                txt = re.sub(r"^```(?:json)?\s*", "", txt)
                txt = re.sub(r"\s*```$", "", txt)
            return json.loads(txt)
        except Exception as e:
            logger.debug(f"Anthropic API call failed: {e}")

    return None

def classify_and_extract(text: str, role: str = "customer") -> dict:
    t_norm = norm(text)
    
    llm_res = call_llm_structured(text, role)
    if llm_res and isinstance(llm_res, dict) and llm_res.get("intent"):
        if not llm_res.get("skill"):
            sks = find_skills(text)
            if sks:
                llm_res["skill"] = sks[0]
        if not llm_res.get("date"):
            llm_res["date"] = extract_date(text)
        if not llm_res.get("days"):
            llm_res["days"] = extract_days(text) or 1
        if not llm_res.get("budget"):
            llm_res["budget"] = extract_budget(text)
        if not llm_res.get("city"):
            geo = geocode_city(text)
            if geo:
                llm_res["city"] = geo["city"]
                llm_res["lat"] = geo["lat"]
                llm_res["lng"] = geo["lng"]
        return llm_res

    skills = find_skills(text)
    skill = skills[0] if skills else None
    parsed_date = extract_date(text)
    days = extract_days(text) or 1
    budget = extract_budget(text)
    geo = geocode_city(text)

    intent = detect_intent(text, role)
    if not intent:
        if skill and (parsed_date or days > 1 or budget):
            intent = "post_job" if role == "customer" else "show_jobs"

    if role == "customer":
        if any(w in t_norm for w in ["turant", "jaldi", "urgent", "abhi", "instant", "tatkal", "तुरंत", "जल्दी"]):
            intent = "instant_request"
        elif intent == "post_job" or (intent == "need" and (parsed_date or (days and days > 1) or budget)):
            intent = "post_job"
        elif intent == "need":
            intent = "need"
    elif role == "worker":
        if intent in ("free", "set_free"):
            intent = "free"
        elif intent in ("busy", "set_busy"):
            intent = "busy"
        elif intent in ("offline", "set_offline"):
            intent = "offline"
        elif intent in ("jobs", "show_jobs"):
            intent = "jobs"

    return {
        "intent": intent or "unknown",
        "skill": skill,
        "date": parsed_date,
        "days": days,
        "budget": budget,
        "city": geo["city"] if geo else None,
        "lat": geo["lat"] if geo else None,
        "lng": geo["lng"] if geo else None,
    }
    try:
        body = json.dumps({"model": config.ASSISTANT_MODEL, "max_tokens": 30,
                           "system": "Classify the user's message (any Indian language) into exactly one intent word from: free, busy, offline, earnings, jobs, bookings, profile, help, need, crew, add_crew, unknown. Reply with the single word only.",
                           "messages": [{"role": "user", "content": f"role={role}\nmessage={text}"}]}).encode()
        req = urllib.request.Request("https://api.anthropic.com/v1/messages", data=body, headers={
            "x-api-key": config.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json"})
        out = json.loads(urllib.request.urlopen(req, timeout=8).read().decode())
        w = out["content"][0]["text"].strip().lower()
        return w if w in {n for n, _ in INTENTS} else None
    except Exception:
        return None

# ------------------------------------------------------------------ session
def load_state(c, uid, default_lang):
    r = c.execute("SELECT * FROM assistant_sessions WHERE user_id=?", (uid,)).fetchone()
    if r:
        return r["lang"], json.loads(r["state"] or "{}")
    return default_lang, {}

def save_state(c, uid, lang, state):
    c.execute("INSERT INTO assistant_sessions(user_id,lang,state,updated_at) VALUES(?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET lang=excluded.lang,state=excluded.state,updated_at=excluded.updated_at",
              (uid, lang, json.dumps(state), time.time()))

def chips_menu(role, lang):
    k = {"worker": ["chip_free", "chip_busy", "chip_off", "chip_earn", "chip_jobs", "chip_book", "chip_profile"],
         "customer": ["chip_need", "chip_book", "chip_help"],
         "contractor": ["chip_crew", "chip_add", "chip_book", "chip_help"]}[role]
    return [{"label": T(lang, x), "text": T(lang, x)} for x in k]

def skill_chips(lang):
    names = SKILLNAMES.get(lang, SKILLNAMES["hi"])
    return [{"label": names[k], "text": names[k]} for k in ("rajmistri", "labour", "plumber", "electrician", "painter", "carpenter", "tiles", "welder")]

def num_chips(vals, lang):
    return [{"label": str(v), "text": str(v)} for v in vals]

class AssistantReq(BaseModel):
    text: str = ""
    lang: Optional[str] = None
    start: bool = False
    location: Optional[dict] = None

@router.post("/api/assistant")
async def assistant(req: AssistantReq, u=Depends(current_user)):
    role = u["role"]
    with db() as c:
        lang, st = load_state(c, u["id"], u.get("lang") or "hi")
    if req.lang in LANGS:
        lang = req.lang
        changed_lang = True
    else:
        changed_lang = False
    if lang not in LANGS:
        lang = "hi"
    reply, chips, actions = await handle(u, role, lang, st, req, changed_lang)
    with db() as c:
        save_state(c, u["id"], lang, st)
    return {"reply": reply, "chips": chips, "actions": actions, "lang": lang}

@router.post("/api/assistant/reset")
def assistant_reset(u=Depends(current_user)):
    with db() as c:
        c.execute("DELETE FROM assistant_sessions WHERE user_id=?", (u["id"],))
    return {"ok": True}

# ------------------------------------------------------------------ conversation logic
async def handle(u, role, lang, st, req, changed_lang):
    text = (req.text or "").strip()
    nt = norm(text)
    actions = []
    menu = lambda: chips_menu(role, lang)

    if changed_lang and not text and not req.start and not req.location:
        return T(lang, "lang_set") + " " + T(lang, "menu"), menu(), actions
    if req.start or (not text and not req.location and not st.get("flow") and not st.get("pending_confirmation")):
        if role == "worker" and worker_incomplete(u):
            st.clear(); st.update({"flow": "onboard", "step": "name" if not u["name"] else "skills", "data": {}})
            first = T(lang, "hello") + " " + (T(lang, "ask_name") if not u["name"] else T(lang, "ask_skills"))
            return first, ([] if not u["name"] else skill_chips(lang)), actions
        st.clear()
        return T(lang, "hello") + " " + T(lang, "menu"), menu(), actions

    # ----- 1. Pending confirmation check
    pending = st.get("pending_confirmation")
    if pending:
        is_yes = any(w in nt for w in YES_WORDS)
        is_no = any(w in nt for w in NO_WORDS)
        if is_yes:
            act = pending.get("action")
            pdata = pending.get("data", {})
            if act == "post_job":
                skill = pdata.get("skill") or "rajmistri"
                start_date = pdata.get("start_date") or today().isoformat()
                days = pdata.get("days") or 1
                budget = pdata.get("budget") or 0
                address = pdata.get("address") or ""
                lat = pdata.get("lat")
                lng = pdata.get("lng")
                if (lat is None or lng is None) and req.location:
                    lat, lng = float(req.location.get("lat", 0)), float(req.location.get("lng", 0))
                if lat is None or lng is None:
                    with db() as c:
                        prev = c.execute("SELECT lat, lng, address FROM jobs WHERE customer_id=? AND lat IS NOT NULL ORDER BY id DESC LIMIT 1", (u["id"],)).fetchone()
                        if prev:
                            lat, lng = prev["lat"], prev["lng"]
                            if not address and prev["address"]:
                                address = prev["address"]
                if lat is None or lng is None:
                    return T(lang, "ask_location"), [], [{"type": "request_location"}]
                
                with db() as c:
                    cur = c.execute("INSERT INTO jobs(customer_id,skill,description,lat,lng,address,start_date,days,budget,created_at,status) VALUES(?,?,?,?,?,?,?,?,?,?,'open')",
                                    (u["id"], skill, f"Sahayak job for {skill}", lat, lng, address, start_date, days, budget, time.time()))
                    jid = cur.lastrowid
                    workers = c.execute("SELECT user_id, lat, lng, radius_km FROM worker_profiles WHERE lat IS NOT NULL AND lng IS NOT NULL AND (',' || skills || ',') LIKE ?",
                                        (f"%,{skill},%",)).fetchall()
                firebase_sync.sync_job(jid)
                for w in workers:
                    if w["user_id"] == u["id"]:
                        continue
                    d = haversine_km(lat, lng, w["lat"], w["lng"])
                    if d <= min(50.0, w["radius_km"] or config.DEFAULT_RADIUS_KM):
                        await notify(w["user_id"], {
                            "type": "job_new", "job_id": jid, "skill": skill,
                            "customer": u["name"] or "Customer", "title": "नया काम उपलब्ध",
                            "body": f"नया काम: {skill} ({days} दिन, ₹{budget})"
                        })
                st.pop("pending_confirmation", None)
                skill_title = SKILLNAMES.get(lang, {}).get(skill, skill)
                actions.append({"type": "navigate", "tab": "jobs"})
                return T(lang, "job_posted_ok", skill=skill_title), menu(), actions

            elif act == "instant_request":
                from .main import instant_create, InstantReq
                skill = pdata.get("skill") or "rajmistri"
                lat = pdata.get("lat")
                lng = pdata.get("lng")
                if (lat is None or lng is None) and req.location:
                    lat, lng = float(req.location.get("lat", 0)), float(req.location.get("lng", 0))
                if lat is None or lng is None:
                    with db() as c:
                        prev = c.execute("SELECT lat, lng FROM jobs WHERE customer_id=? AND lat IS NOT NULL ORDER BY id DESC LIMIT 1", (u["id"],)).fetchone()
                        if prev:
                            lat, lng = prev["lat"], prev["lng"]
                if lat is None or lng is None:
                    return T(lang, "ask_location"), [], [{"type": "request_location"}]
                try:
                    r = await instant_create(InstantReq(skill=skill, lat=lat, lng=lng, radius_km=config.DEFAULT_RADIUS_KM, days=1, note="Sahayak instant", address=""), u)
                    st.pop("pending_confirmation", None)
                    skill_title = SKILLNAMES.get(lang, {}).get(skill, skill)
                    actions.append({"type": "instant_started", "id": r["id"]})
                    actions.append({"type": "navigate", "tab": "bookings"})
                    return T(lang, "instant_sent_ok", skill=skill_title), menu(), actions
                except HTTPException as e:
                    st.pop("pending_confirmation", None)
                    return str(e.detail), menu(), actions

        elif is_no:
            st.pop("pending_confirmation", None)
            return T(lang, "action_cancelled"), menu(), actions

    flow = st.get("flow")
    if flow == "onboard":
        return await onboard(u, lang, st, text, req.location)
    if flow == "cust":
        return await cust_flow(u, lang, st, text, req.location)
    if flow == "addcrew":
        return await addcrew_flow(u, lang, st, text)

    extracted = classify_and_extract(text, role)
    intent = extracted.get("intent")
    skill = extracted.get("skill")
    num = parse_number(text)

    if intent == "help":
        return T(lang, "menu"), menu(), actions
    if intent == "language":
        return T(lang, "menu"), [{"label": n, "text": n} for n in ("हिन्दी", "English", "मराठी", "ગુજરાતી", "বাংলা", "தமிழ்", "తెలుగు", "भोजपुरी")], [{"type": "choose_language"}]

    # Role boundaries check
    if role == "worker":
        if intent in ("post_job", "instant_request"):
            return T(lang, "worker_cant_post"), menu(), actions
    elif role == "customer":
        if intent in ("set_free", "set_busy", "set_offline", "free", "busy", "offline"):
            return T(lang, "customer_cant_status"), menu(), actions

    if role == "worker":
        if intent == "profile" or (worker_incomplete(u) and intent in (None, "need", "unknown")):
            st.clear(); st.update({"flow": "onboard", "step": "name", "data": {}})
            return T(lang, "ask_name"), [], actions
        if intent in ("free", "set_free", "busy", "set_busy", "offline", "set_offline"):
            from .main import worker_status, StatusReq
            stat_map = {"free": "free", "set_free": "free", "busy": "busy", "set_busy": "busy", "offline": "offline", "set_offline": "offline"}
            target_stat = stat_map[intent]
            try:
                await worker_status(StatusReq(status=target_stat, hours=None), u)
            except HTTPException as e:
                return str(e.detail), menu(), actions
            actions.append({"type": "refresh"})
            return T(lang, {"free": "free_ok", "busy": "busy_ok", "offline": "off_ok"}[target_stat]), menu(), actions
        if intent == "earnings":
            from .main import earnings
            e = earnings(u)
            return T(lang, "earn", m=e["this_month"], t=e["total_earned"], j=e["jobs_done"], u=e["upcoming_jobs"]), menu(), actions
        if intent in ("jobs", "show_jobs"):
            from .main import nearby_jobs
            jobs = nearby_jobs(None, u)["jobs"]
            if not jobs:
                return T(lang, "no_jobs"), menu(), actions
            names = SKILLNAMES.get(lang, SKILLNAMES["hi"])
            lines = [f"• {names.get(j['skill'], j['skill'])} · {j['distance_km']} km · {j['days']}d" + (f" · ₹{j['budget']}" if j["budget"] else "") for j in jobs[:5]]
            actions.append({"type": "navigate", "tab": "jobs"})
            return T(lang, "jobs_head") + "\n" + "\n".join(lines), menu(), actions
        if intent == "bookings":
            return await bookings_reply(u, lang), menu(), [{"type": "navigate", "tab": "bookings"}]
        if num and any(w in nt for w in ("rate", "majduri", "mazduri", "रेट", "मज़दूरी", "मजदूरी", "मजुरी", "મજૂરી", "মজুরি", "கூலி", "కూలీ")):
            with db() as c:
                c.execute("UPDATE worker_profiles SET daily_rate=? WHERE user_id=?", (min(num, 100000), u["id"]))
            return f"₹{num} ✔", menu(), actions
        if num and any(w in nt for w in ("radius", "door", "dur", "दूर", "दूरी", "km", "किमी", "अंतर", "અંતર", "দূর", "தூரம்", "దూరం")):
            with db() as c:
                c.execute("UPDATE worker_profiles SET radius_km=? WHERE user_id=?", (clamp_radius(num), u["id"]))
            return f"{clamp_radius(num)} km ✔", menu(), actions
    elif role == "customer":
        if intent == "post_job":
            if not skill:
                st.clear(); st.update({"flow": "cust", "step": "skill", "data": {}})
                return T(lang, "cust_ask_skill"), skill_chips(lang), actions
            start_date = extracted.get("date") or today().isoformat()
            days = extracted.get("days") or 1
            budget = extracted.get("budget") or 0
            city = extracted.get("city") or ""
            lat = extracted.get("lat")
            lng = extracted.get("lng")
            if lat is None or lng is None:
                with db() as c:
                    prev = c.execute("SELECT lat, lng, address FROM jobs WHERE customer_id=? AND lat IS NOT NULL ORDER BY id DESC LIMIT 1", (u["id"],)).fetchone()
                    if prev:
                        lat, lng = prev["lat"], prev["lng"]
                        if not city and prev["address"]:
                            city = prev["address"]
            st["pending_confirmation"] = {
                "action": "post_job",
                "data": {"skill": skill, "start_date": start_date, "days": days, "budget": budget, "address": city, "lat": lat, "lng": lng}
            }
            skill_title = SKILLNAMES.get(lang, {}).get(skill, skill)
            msg = T(lang, "ask_job_confirm", skill=skill_title, date=start_date, days=days, budget=budget, address=city or "वर्तमान स्थान")
            chips = [
                {"label": "✅ हाँ, पोस्ट करें" if lang == "hi" else "✅ Yes, Post", "text": "हाँ" if lang == "hi" else "yes"},
                {"label": "❌ नहीं" if lang == "hi" else "❌ No", "text": "नहीं" if lang == "hi" else "no"}
            ]
            return msg, chips, actions

        if intent == "instant_request":
            if not skill:
                st.clear(); st.update({"flow": "cust", "step": "skill", "data": {}})
                return T(lang, "cust_ask_skill"), skill_chips(lang), actions
            lat = extracted.get("lat")
            lng = extracted.get("lng")
            if lat is None or lng is None:
                with db() as c:
                    prev = c.execute("SELECT lat, lng FROM jobs WHERE customer_id=? AND lat IS NOT NULL ORDER BY id DESC LIMIT 1", (u["id"],)).fetchone()
                    if prev:
                        lat, lng = prev["lat"], prev["lng"]
            st["pending_confirmation"] = {
                "action": "instant_request",
                "data": {"skill": skill, "lat": lat, "lng": lng}
            }
            skill_title = SKILLNAMES.get(lang, {}).get(skill, skill)
            msg = T(lang, "ask_instant_confirm", skill=skill_title)
            chips = [
                {"label": "⚡ हाँ, तुरंत बुलाएं" if lang == "hi" else "⚡ Yes, Call Now", "text": "हाँ" if lang == "hi" else "yes"},
                {"label": "❌ नहीं" if lang == "hi" else "❌ No", "text": "नहीं" if lang == "hi" else "no"}
            ]
            return msg, chips, actions

        if intent == "find_workers":
            actions.append({"type": "navigate", "tab": "search"})
            if skill:
                skill_title = SKILLNAMES.get(lang, {}).get(skill, skill)
                return f"🔍 {skill_title} खोजे जा रहे हैं...", menu(), actions
            return "🔍 कारीगर खोजने के लिए खोज टैब खोल दिया गया है।", menu(), actions

        if intent == "need":
            st.clear(); st.update({"flow": "cust", "step": "skill", "data": {}})
            skills = find_skills(text)
            if skills:
                st["data"]["skill"] = skills[0]; st["step"] = "location"
                return T(lang, "ask_location"), [], [{"type": "request_location"}]
            return T(lang, "cust_ask_skill"), skill_chips(lang), actions
        if intent == "bookings":
            return await bookings_reply(u, lang), menu(), [{"type": "navigate", "tab": "bookings"}]
    else:  # contractor
        if intent == "crew":
            from .contractor import contractor_dashboard
            d = contractor_dashboard(u)
            return T(lang, "crew_sum", c=d["crew_active"], p=d["new_requests"], d=d["wages_due"]), menu(), [{"type": "navigate", "tab": "crew"}]
        if intent == "add_crew":
            st.clear(); st.update({"flow": "addcrew", "step": "name", "data": {}})
            return T(lang, "c_ask_name"), [], actions
        if intent == "bookings":
            actions.append({"type": "navigate", "tab": "projects"})
            return T(lang, "menu"), menu(), actions
    return T(lang, "unknown"), menu(), actions

def worker_incomplete(u):
    with db() as c:
        wp = c.execute("SELECT skills,lat FROM worker_profiles WHERE user_id=?", (u["id"],)).fetchone()
    return not wp or not wp["skills"] or wp["lat"] is None

async def bookings_reply(u, lang):
    from .main import my_bookings
    bs = my_bookings(u)["bookings"][:5]
    if not bs:
        return T(lang, "no_bookings")
    names = SKILLNAMES.get(lang, SKILLNAMES["hi"])
    return T(lang, "bookings_head") + "\n" + "\n".join(f"• {names.get(b['skill'], b['skill'])} · {b['start_date']} · {b['status']} · ₹{b['agreed_rate']}" for b in bs)

async def onboard(u, lang, st, text, location):
    d, step = st.setdefault("data", {}), st.get("step")
    skip = any(w in norm(text) for w in SKIP_WORDS)
    if step == "name":
        if len(text) < 2:
            return T(lang, "ask_name"), [], []
        d["name"] = text[:60]; st["step"] = "skills"
        return T(lang, "ask_skills"), skill_chips(lang), []
    if step == "skills":
        sk = find_skills(text)
        if not sk:
            return T(lang, "retry_skill"), skill_chips(lang), []
        d["skills"] = sk; st["step"] = "rate"
        return T(lang, "ask_rate"), num_chips([500, 600, 700, 800, 1000], lang), []
    if step == "rate":
        n = parse_number(text)
        if not n or n < 50:
            return T(lang, "retry_num"), num_chips([500, 600, 700, 800, 1000], lang), []
        d["rate"] = min(n, 100000); st["step"] = "exp"
        return T(lang, "ask_exp"), num_chips([1, 3, 5, 10], lang), []
    if step == "exp":
        n = parse_number(text)
        if n is None:
            return T(lang, "retry_num"), num_chips([1, 3, 5, 10], lang), []
        d["exp"] = min(n, 60); st["step"] = "village"
        return T(lang, "ask_village"), [{"label": T(lang, "chip_skip"), "text": T(lang, "chip_skip")}], []
    if step == "village":
        d["village"] = "" if skip else text[:80]; st["step"] = "location"
        return T(lang, "ask_location"), [], [{"type": "request_location"}]
    if step == "location":
        if location and "lat" in location:
            d["lat"], d["lng"] = float(location["lat"]), float(location["lng"]); st["step"] = "radius"
            return T(lang, "loc_ok") + " " + T(lang, "ask_radius"), num_chips([3, 6, 10, 20], lang), []
        return T(lang, "loc_fail") + " " + T(lang, "ask_location"), [], [{"type": "request_location"}]
    if step == "radius":
        n = parse_number(text)
        if not n:
            return T(lang, "retry_num"), num_chips([3, 6, 10, 20], lang), []
        d["radius"] = clamp_radius(n)
        with db() as c:
            c.execute("UPDATE users SET name=? WHERE id=?", (d.get("name") or u["name"], u["id"]))
            c.execute("UPDATE worker_profiles SET skills=?,daily_rate=?,experience_years=?,village=?,lat=?,lng=?,radius_km=? WHERE user_id=?",
                      (",".join(d["skills"]), d["rate"], d["exp"], d.get("village", ""), d["lat"], d["lng"], d["radius"], u["id"]))
            await push_worker_status(c, u["id"])
        st.clear()
        return T(lang, "saved"), chips_menu("worker", lang), [{"type": "refresh"}]
    st.clear()
    return T(lang, "unknown"), chips_menu("worker", lang), []

async def cust_flow(u, lang, st, text, location):
    d, step = st["data"], st.get("step")
    if step == "skill":
        sk = find_skills(text)
        if not sk:
            return T(lang, "retry_skill"), skill_chips(lang), []
        d["skill"] = sk[0]; st["step"] = "location"
        return T(lang, "ask_location"), [], [{"type": "request_location"}]
    if step == "location":
        if location and "lat" in location:
            from .main import instant_create, InstantReq
            try:
                r = await instant_create(InstantReq(skill=d["skill"], lat=float(location["lat"]), lng=float(location["lng"]), radius_km=config.DEFAULT_RADIUS_KM, days=1, note="", address=""), u)
            except HTTPException as e:
                st.clear(); return str(e.detail), chips_menu("customer", lang), []
            st.clear()
            if r["status"] == "no_worker":
                return T(lang, "cust_none"), chips_menu("customer", lang), []
            return T(lang, "cust_started"), chips_menu("customer", lang), [{"type": "instant_started", "id": r["id"]}]
        return T(lang, "loc_fail") + " " + T(lang, "ask_location"), [], [{"type": "request_location"}]
    st.clear()
    return T(lang, "unknown"), chips_menu("customer", lang), []

async def addcrew_flow(u, lang, st, text):
    d, step = st["data"], st.get("step")
    skip = any(w in norm(text) for w in SKIP_WORDS)
    if step == "name":
        d["name"] = text[:60]; st["step"] = "phone"
        return T(lang, "c_ask_phone"), [{"label": T(lang, "chip_skip"), "text": T(lang, "chip_skip")}], []
    if step == "phone":
        d["phone"] = "" if skip else re.sub(r"\D", "", text.translate(DIGITS))[-10:]; st["step"] = "skill"
        return T(lang, "c_ask_skill"), skill_chips(lang), []
    if step == "skill":
        sk = find_skills(text)
        if not sk:
            return T(lang, "retry_skill"), skill_chips(lang), []
        d["skills"] = sk; st["step"] = "rate"
        return T(lang, "c_ask_rate"), num_chips([500, 600, 700, 800], lang), []
    if step == "rate":
        n = parse_number(text)
        if not n:
            return T(lang, "retry_num"), num_chips([500, 600, 700, 800], lang), []
        from .contractor import crew_add, CrewReq
        try:
            r = await crew_add(CrewReq(name=d["name"], phone=d.get("phone", ""), skills=d["skills"], daily_rate=n), u)
        except HTTPException as e:
            st.clear()
            return (T(lang, "c_dup") if e.status_code == 409 else str(e.detail)), chips_menu("contractor", lang), []
        st.clear()
        return T(lang, "c_invited" if r["status"] == "invited" else "c_added"), chips_menu("contractor", lang), [{"type": "navigate", "tab": "crew"}]
    st.clear()
    return T(lang, "unknown"), chips_menu("contractor", lang), []
