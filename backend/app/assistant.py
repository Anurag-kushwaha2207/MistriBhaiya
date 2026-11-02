"""Sahayak: a chat assistant in regional languages so a mistri / labour / customer / contractor can do everything by chatting
(or by voice: the app converts speech to text and reads replies aloud).

Works fully OFFLINE with a built-in multilingual rule engine (no API key needed).
Optional: set ANTHROPIC_API_KEY to let an LLM classify free-text messages the rules did not understand.

Languages: hi (Hindi), en (English), mr (Marathi), gu (Gujarati), bn (Bengali), ta (Tamil), te (Telugu), bho (Bhojpuri).
NOTE: have a native speaker review the wording of each language before launch.
"""
import json, re, time
import urllib.request
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from . import config
from .common import *
from .db import db
from .security import current_user

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
  "chip_profile": "👤 प्रोफाइल", "chip_need": "⚡ मिस्त्री चाहिए", "chip_crew": "👥 मेरी टीम", "chip_add": "➕ साथी जोड़ें", "chip_skip": "छोड़ो", "chip_help": "ℹ️ मदद"},
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
  "chip_profile": "👤 Profile", "chip_need": "⚡ Need a worker", "chip_crew": "👥 My crew", "chip_add": "➕ Add member", "chip_skip": "skip", "chip_help": "ℹ️ Help"},
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
 "rajmistri": ["rajmistri", "raj mistri", "mason", "राजमिस्त्री", "राज मिस्त्री", "गवंडी", "ગવંડી", "રાજમિસ્ત્રી", "রাজমিস্ত্রি", "கொத்தனார்", "மேஸ்திரி", "మేస్త్రి", "తాపీ"],
 "labour": ["labour", "labor", "mazdoor", "majdoor", "majur", "helper", "मजदूर", "मज़दूर", "मजूर", "हेल्पर", "મજૂર", "શ્રમિક", "শ্রমিক", "মজুর", "தொழிலாளி", "கூலி", "కూలీ", "కూలి"],
 "plumber": ["plumber", "प्लंबर", "प्लम्बर", "नल", "પ્લમ્બર", "প্লাম্বার", "பிளம்பர்", "ப்ளம்பர்", "ప్లంబర్"],
 "electrician": ["electrician", "bijli", "बिजली", "इलेक्ट्रीशियन", "इलेक्ट्रिशियन", "वायरमैन", "ઇલેક્ટ્રિશિયન", "ইলেকট্রিশিয়ান", "எலக்ட்ரீசியன்", "ఎలక్ట్రీషియన్"],
 "painter": ["painter", "पेंटर", "पुताई", "रंगाई", "પેઇન્ટર", "পেইন্টার", "பெயிண்டர்", "పెయింటర్"],
 "carpenter": ["carpenter", "badhai", "बढ़ई", "बढई", "कारपेंटर", "सुतार", "સુથાર", "ছুতার", "কাঠমিস্ত্রি", "தச்சர்", "కార్పెంటర్", "వడ్రంగి"],
 "tiles": ["tiles", "tile", "टाइल", "टाइल्स", "ટાઇલ", "টাইলস", "டைல்", "టైల్"],
 "welder": ["welder", "welding", "वेल्डर", "वेल्डिंग", "વેલ્ડર", "ওয়েল্ডার", "வெல்டர்", "వెల్డర్"],
 "pop": ["pop", "पीओपी", "ceiling", "सीलिंग"],
 "bar_bender": ["sariya", "bar bender", "सरिया", "बार बेंडर", "सळई", "સળિયા"],
}
GENERIC_MISTRI = ["mistri", "मिस्त्री", "मिस्री", "મિસ્ત્રી", "মিস্ত্রি"]

def find_skills(t: str):
    t = norm(t)
    found = [k for k, ws in SKILL_WORDS.items() if any(w in t for w in ws)]
    if not found and any(w in t for w in GENERIC_MISTRI):
        found = ["rajmistri"]
    return found

INTENTS = [   # order matters: first match wins
 ("help", ["help", "madad", "मदद", "सहायता", "मदत", "મદદ", "সাহায্য", "உதவி", "సహాయం", "menu"]),
 ("language", ["language", "bhasha", "भाषा", "ભાષા", "ভাষা", "மொழி", "భాష"]),
 ("profile", ["profile", "प्रोफाइल", "प्रोफ़ाइल", "પ્રોફાઇલ", "প্রোফাইল", "சுயவிவரம்", "ప్రొఫైల్"]),
 ("earnings", ["kamai", "earning", "earn", "income", "paisa", "कमाई", "कमाणी", "पैसे", "કમાણી", "আয়", "வருமானம்", "ఆదాయం", "कमाई"]),
 ("bookings", ["booking", "bukking", "बुकिंग", "बुकींग", "બુકિંગ", "বুকিং", "முன்பதிவு", "బుకింగ్"]),
 ("add_crew", ["add", "jodo", "जोड़", "जोड", "साथी जोड", "सहकारी जोडा", "સાથી ઉમેર", "সঙ্গী যোগ", "உறுப்பினர் சேர்", "సభ్యుని చేర్"]),
 ("crew", ["team", "crew", "saathi", "टीम", "साथी", "ટીમ", "দল", "குழு", "టీమ్"]),
 ("need", ["chahiye", "chaiye", "need", "hire", "चाहिए", "चाहीं", "पाहिजे", "हवा", "જોઈએ", "চাই", "வேண்டும்", "కావాలి", "bulao"]),
 ("offline", ["offline", "band", "off", "बंद", "छुट्टी", "बंद", "बंद", "બંધ", "বন্ধ", "இல்லை", "లేదు", "chhutti", "आज बंद", "आज नहीं"]),
 ("busy", ["busy", "bizi", "bijy", "बिज़ी", "बिजी", "व्यस्त", "बिझी", "બિઝી", "ব্যস্ত", "பிஸி", "బిజీ"]),
 ("free", ["free", "khali", "khaali", "फ्री", "खाली", "मोकळा", "ફ્રી", "ખાલી", "ফ্রি", "খালি", "ஃப்ரீ", "ஃபிரீ", "ఫ్రీ"]),
 ("jobs", ["jobs", "job", "kaam", "काम", "કામ", "কাজ", "வேலை", "పని", "nearby"]),
]
SKIP_WORDS = ["skip", "chhodo", "chodo", "छोड़ो", "छोडो", "सोडा", "છોડો", "ছাড়ো", "விடு", "వదిలేయి", "-", "none", "नहीं है", "nahi hai"]

def detect_intent(t: str):
    t = norm(t)
    for name, words in INTENTS:
        for w in words:
            if w in t:
                return name
    return None

def llm_intent(text: str, role: str) -> Optional[str]:
    """Optional: ask an LLM to classify a message the rules could not understand. Returns an intent name or None. (Needs ANTHROPIC_API_KEY.)"""
    if not config.ANTHROPIC_API_KEY:
        return None
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
    if req.start or (not text and not req.location and not st.get("flow")):
        if role == "worker" and worker_incomplete(u):
            st.clear(); st.update({"flow": "onboard", "step": "name" if not u["name"] else "skills", "data": {}})
            first = T(lang, "hello") + " " + (T(lang, "ask_name") if not u["name"] else T(lang, "ask_skills"))
            return first, ([] if not u["name"] else skill_chips(lang)), actions
        st.clear()
        return T(lang, "hello") + " " + T(lang, "menu"), menu(), actions

    flow = st.get("flow")
    # ----- worker onboarding (fills the whole profile by chat)
    if flow == "onboard":
        return await onboard(u, lang, st, text, req.location)
    # ----- customer: instant request flow
    if flow == "cust":
        return await cust_flow(u, lang, st, text, req.location)
    # ----- contractor: add crew member flow
    if flow == "addcrew":
        return await addcrew_flow(u, lang, st, text)

    intent = detect_intent(text)
    if intent is None:
        intent = llm_intent(text, role)
    # numbers can directly change rate / radius
    num = parse_number(text)

    if intent == "help":
        return T(lang, "menu"), menu(), actions
    if intent == "language":
        return T(lang, "menu"), [{"label": n, "text": n} for n in ("हिन्दी", "English", "मराठी", "ગુજરાતી", "বাংলা", "தமிழ்", "తెలుగు", "भोजपुरी")], [{"type": "choose_language"}]

    if role == "worker":
        if intent == "profile" or worker_incomplete(u) and intent in (None, "need"):
            st.clear(); st.update({"flow": "onboard", "step": "name", "data": {}})
            return T(lang, "ask_name"), [], actions
        if intent in ("free", "busy", "offline"):
            from .main import worker_status, StatusReq
            try:
                await worker_status(StatusReq(status={"free": "free", "busy": "busy", "offline": "offline"}[intent], hours=None), u)
            except HTTPException as e:
                return str(e.detail), menu(), actions
            actions.append({"type": "refresh"})
            return T(lang, {"free": "free_ok", "busy": "busy_ok", "offline": "off_ok"}[intent]), menu(), actions
        if intent == "earnings":
            from .main import earnings
            e = earnings(u)
            return T(lang, "earn", m=e["this_month"], t=e["total_earned"], j=e["jobs_done"], u=e["upcoming_jobs"]), menu(), actions
        if intent == "jobs":
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
