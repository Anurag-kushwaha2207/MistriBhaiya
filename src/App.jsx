import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { api, getApiBase, getLoc, clearLocCache } from './api';
import { createT } from './translations';
import { syncUser, syncWorkerProfile, syncContractorProfile } from './firebase';

// Components
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import Toast from './components/Toast';
import ProfileModal from './components/ProfileModal';
import LoginView from './components/LoginView';
import WorkerToday from './components/WorkerToday';
import WorkerJobs from './components/WorkerJobs';
import CustomerFind from './components/CustomerFind';
import CustomerPost from './components/CustomerPost';
import CustomerContractors from './components/CustomerContractors';
import BookingsView from './components/BookingsView';
import ContractorDashboard from './components/ContractorDashboard';
import ContractorCrew from './components/ContractorCrew';
import ContractorProjects from './components/ContractorProjects';
import ContractorLedger from './components/ContractorLedger';
import AssistantView from './components/AssistantView';
import CallModal from './components/CallModal';
import ChatModal from './components/ChatModal';
import { BookingModal, ProjectModal, CounterModal, OfferModal } from './components/Modals';
import NotificationsPopover from './components/NotificationsPopover';
import { playRingChime, playMessageChime } from './sounds';

export default function App() {
  const [lang, setLang] = useState(() => localStorage.getItem('ks_lang') || 'hi');
  const [token, setToken] = useState(() => localStorage.getItem('ks_token') || null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [meta, setMeta] = useState(null);
  const [tab, setTab] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const toastTimerRef = useRef(null);

  // In-App WebRTC Calling
  const [callTarget, setCallTarget] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const wsRef = useRef(null);

  // Modals & Navigation state
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [bookingWorker, setBookingWorker] = useState(null);
  const [bookingJobContext, setBookingJobContext] = useState(null);
  const [projectContractor, setProjectContractor] = useState(null);
  const [counterData, setCounterData] = useState(null);
  const [instantOffer, setInstantOffer] = useState(null);
  const [activeChatBooking, setActiveChatBooking] = useState(null);

  // Instant Dispatch & Search states (A1, A2)
  const [instantSearch, setInstantSearch] = useState(null);
  const [instantSkillPicker, setInstantSkillPicker] = useState(false);

  // Notifications (A6)
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // Cold start / loading status
  const [isWakingUp, setIsWakingUp] = useState(false);
  const [wakeRetryCount, setWakeRetryCount] = useState(0);

  // Memoize translation function to avoid re-renders thrashing WebSocket (A4)
  const t = useMemo(() => createT(lang), [lang]);
  const tRef = useRef(t);
  tRef.current = t;

  const showToast = useCallback((msg) => {
    setToastMsg(msg);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastMsg(null);
    }, 3200);
  }, []);

  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;
  const setTabRef = useRef(setTab);
  setTabRef.current = setTab;

  const toggleLang = () => {
    const nextLang = lang === 'hi' ? 'en' : 'hi';
    setLang(nextLang);
    localStorage.setItem('ks_lang', nextLang);
    document.documentElement.lang = nextLang;
  };

  const handleLogout = useCallback(() => {
    localStorage.removeItem('ks_token');
    clearLocCache();
    setToken(null);
    setUser(null);
    setProfile(null);
    setTab(null);
    setIsProfileOpen(false);
  }, []);

  // Notifications fetch & mark read (A6)
  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api('/notifications', 'GET', null, token);
      if (res && res.notifications) {
        setNotifications(res.notifications);
        setUnreadNotifs(res.unread_count || 0);
      }
    } catch (e) {}
  }, [token]);

  const markNotifsRead = async () => {
    if (!token) return;
    try {
      await api('/notifications/read', 'POST', {}, token);
      setUnreadNotifs(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: 1 })));
    } catch (e) {}
  };

  useEffect(() => {
    if (token) {
      fetchNotifications();
    }
  }, [token, refreshTrigger, fetchNotifications]);

  // Fetch Meta & Me
  const initApp = useCallback(async () => {
    try {
      const metaData = await api('/meta');
      setMeta(metaData);
      setIsWakingUp(false);
    } catch (err) {
      setIsWakingUp(true);
      setTimeout(() => setWakeRetryCount(c => c + 1), 3000);
      return;
    }

    if (token) {
      try {
        const me = await api('/me', 'GET', null, token, handleLogout);
        setUser(me.user);
        setProfile(me.profile || {});
        syncUser(me.user);
        if (me.user.role === 'worker' && me.profile) syncWorkerProfile(me.user.id, me.profile);
        if (me.user.role === 'contractor' && me.profile) syncContractorProfile(me.user.id, me.profile);

        // Default tab
        setTab(currentTab => {
          if (currentTab) return currentTab;
          if (me.user.role === 'worker') return 'today';
          if (me.user.role === 'contractor') return 'cdash';
          return 'find';
        });
      } catch (err) {
        // Token invalid
        handleLogout();
      }
    }
  }, [token, wakeRetryCount, handleLogout]);

  useEffect(() => {
    initApp();
  }, [initApp]);

  // Real-time WebSocket connection (A4, A5)
  useEffect(() => {
    if (!token) return;

    let ws = null;
    let pingInterval = null;
    let reconnectTimeout = null;
    let closedByCleanup = false;
    let backoffDelay = 2000;

    const connectWS = () => {
      if (closedByCleanup) return;
      const base = getApiBase();
      let wsUrl = '';
      if (base) {
        const wsProto = base.startsWith('https') ? 'wss' : 'ws';
        const host = base.replace(/^https?:\/\//, '');
        wsUrl = `${wsProto}://${host}/ws?token=${encodeURIComponent(token)}`;
      } else {
        const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
        wsUrl = `${proto}://${window.location.host}/ws?token=${encodeURIComponent(token)}`;
      }

      try {
        ws = new WebSocket(wsUrl);
        wsRef.current = ws;
      } catch (e) {
        return;
      }

      ws.onopen = () => {
        backoffDelay = 2000;
        pingInterval = setInterval(() => {
          try { ws.send(JSON.stringify({ type: 'ping' })); } catch (e) {}
        }, 25000);
      };

      ws.onmessage = (ev) => {
        try {
          const m = JSON.parse(ev.data);
          const tFn = tRef.current;
          const toast = showToastRef.current;

          if (m.type === 'job_new') {
            playRingChime();
            toast('📢 नया काम पोस्ट हुआ!');
            setRefreshTrigger(c => c + 1);
            setUnreadNotifs(c => c + 1);
          } else if (m.type === 'job_interest') {
            playRingChime();
            toast('👷 ' + (m.worker || 'मिस्त्री') + ' ने काम में दिलचस्पी दिखाई!');
            setRefreshTrigger(c => c + 1);
            setUnreadNotifs(c => c + 1);
          } else if (m.type === 'booking_new') {
            playRingChime();
            toast('🔔 ' + (m.customer || 'ग्राहक') + ' ने नई बुकिंग भेजी है!');
            setRefreshTrigger(c => c + 1);
            setUnreadNotifs(c => c + 1);
          } else if (m.type === 'booking_update') {
            playRingChime();
            if (m.status === 'started') {
              toast('▶️ काम शुरू हो गया है!');
            } else if (m.status === 'countered') {
              toast('🔔 नया रेट आया: ₹' + (m.rate || ''));
            } else {
              toast('🔔 बुकिंग अपडेट: ' + m.status);
            }
            setRefreshTrigger(c => c + 1);
            setUnreadNotifs(c => c + 1);
          } else if (m.type === 'crew_invite') {
            playRingChime();
            toast('👥 ' + tFn('crewInvite') + ': ' + (m.contractor || ''));
            setRefreshTrigger(c => c + 1);
            setUnreadNotifs(c => c + 1);
          } else if (m.type === 'crew_update') {
            playRingChime();
            toast('👥 क्रू अपडेट');
            setRefreshTrigger(c => c + 1);
            setUnreadNotifs(c => c + 1);
          } else if (m.type === 'crew_assigned') {
            playRingChime();
            toast('👷 आपको प्रोजेक्ट में क्रू के रूप में जोड़ा गया है');
            setRefreshTrigger(c => c + 1);
            setUnreadNotifs(c => c + 1);
          } else if (m.type === 'project_new') {
            playRingChime();
            toast('🏗️ ' + tFn('newProject') + ': ' + (m.title || ''));
            setRefreshTrigger(c => c + 1);
            setUnreadNotifs(c => c + 1);
          } else if (m.type === 'project_update') {
            playRingChime();
            toast('🏗️ प्रोजेक्ट अपडेट: ' + (m.status || ''));
            setRefreshTrigger(c => c + 1);
            setUnreadNotifs(c => c + 1);
          } else if (m.type === 'sos') {
            playRingChime();
            toast('🚨 SOS आपातकालीन अलर्ट आया है!');
            setRefreshTrigger(c => c + 1);
            setUnreadNotifs(c => c + 1);
          } else if (m.type === 'instant_offer') {
            playRingChime();
            setInstantOffer(m);
            setUnreadNotifs(c => c + 1);
          } else if (m.type === 'instant_status') {
            if (m.status === 'matched') {
              playRingChime();
              toast('🎉 मिस्त्री मिल गया! ' + (m.worker_name ? m.worker_name + ' को असाइन किया गया।' : ''));
              setInstantSearch(null);
              setTabRef.current('bookings');
              setRefreshTrigger(c => c + 1);
            } else if (m.status === 'no_worker') {
              toast('⚠️ माफ़ करें, इस समय आस-पास कोई मिस्त्री उपलब्ध नहीं है।');
              setInstantSearch(null);
            } else if (m.status === 'cancelled') {
              toast('तुरंत मिस्त्री अनुरोध रद्द कर दिया गया।');
              setInstantSearch(null);
            }
          } else if (m.type === 'instant_closed') {
            setInstantOffer(curr => (curr && curr.dispatch_id === m.dispatch_id ? null : curr));
          } else if (m.type === 'chat') {
            window.dispatchEvent(new CustomEvent('mistri_chat_message', { detail: m }));
            playMessageChime(false);
            if (!activeChatBooking || String(activeChatBooking.id) !== String(m.ref_id)) {
              toast('💬 ' + (m.from || 'साथी') + ': ' + m.text);
            }
          } else if (m.type === 'rtc') {
            if (m.data?.kind === 'offer') {
              setIncomingCall({
                from: m.from,
                caller: m.caller,
                booking_id: m.booking_id,
                target_user_id: m.from,
                offer: m.data.sdp
              });
            } else {
              window.dispatchEvent(new CustomEvent('mistri_rtc_signal', { detail: m }));
            }
          } else if (m.type === 'rtc_unavailable') {
            toast('साथी अभी ऐप पर ऑफलाइन है। फोन डायलर से कॉल करें।');
          }
        } catch (e) {}
      };

      ws.onclose = () => {
        clearInterval(pingInterval);
        if (!closedByCleanup) {
          reconnectTimeout = setTimeout(connectWS, backoffDelay);
          backoffDelay = Math.min(backoffDelay * 1.5, 30000);
        }
      };
    };

    connectWS();

    return () => {
      closedByCleanup = true;
      clearInterval(pingInterval);
      clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, [token]);

  const handleLoginSuccess = async (newToken, newUser, newProfile) => {
    setToken(newToken);
    setUser(newUser);
    if (newProfile && Object.keys(newProfile).length > 0) {
      setProfile(newProfile);
    }
    if (newUser.role === 'worker') setTab('today');
    else if (newUser.role === 'contractor') setTab('cdash');
    else setTab('find');

    try {
      const me = await api('/me', 'GET', null, newToken, handleLogout);
      if (me.user) setUser(me.user);
      if (me.profile) {
        setProfile(me.profile);
        if (me.user.role === 'worker') syncWorkerProfile(me.user.id, me.profile);
        if (me.user.role === 'contractor') syncContractorProfile(me.user.id, me.profile);
      }
    } catch (e) {}
  };

  const handleStartInstant = (skillParam) => {
    let chosenSkill = skillParam;
    if (!chosenSkill || typeof chosenSkill !== 'string' || chosenSkill.trim() === '') {
      setInstantSkillPicker(true);
      return;
    }
    executeInstantDispatch(chosenSkill);
  };

  const executeInstantDispatch = async (chosenSkill) => {
    try {
      showToast(t('searching') || 'आस-पास के मिस्त्री खोज रहे हैं…');
      let loc = null;
      try { loc = await getLoc(false); } catch (e) {}
      if (!loc || !loc.lat || !loc.lng) {
        if (user?.lat && user?.lng) {
          loc = { lat: user.lat, lng: user.lng };
        }
      }
      if (!loc || !loc.lat || !loc.lng) {
        showToast('⚠️ लोकेशन नहीं मिली। कृपया GPS चालू करें या प्रोफाइल में शहर चुनें।');
        return;
      }

      const res = await api('/instant', 'POST', {
        skill: chosenSkill,
        note: 'तुरंत मिस्त्री की आवश्यकता है',
        lat: loc.lat,
        lng: loc.lng,
        radius_km: 25,
        days: 1
      }, token);

      if (res && res.id) {
        setInstantSearch({
          id: res.id,
          skill: chosenSkill,
          status: 'searching',
          countdown: 60,
          startedAt: Date.now()
        });
      }
    } catch (err) {
      showToast(err.message || 'Instant dispatch error');
    }
  };

  // Instant polling fallback (every 3s) and countdown timer (A2)
  useEffect(() => {
    if (!instantSearch || instantSearch.status !== 'searching') return;

    const timer = setInterval(() => {
      setInstantSearch(curr => {
        if (!curr || curr.status !== 'searching') return curr;
        if (curr.countdown <= 1) {
          showToast('समय समाप्त: कोई मिस्त्री अभी उपलब्ध नहीं मिला।');
          return null;
        }
        return { ...curr, countdown: curr.countdown - 1 };
      });
    }, 1000);

    const poll = setInterval(async () => {
      try {
        const res = await api(`/instant/${instantSearch.id}`, 'GET', null, token);
        if (res && res.status === 'matched') {
          playRingChime();
          showToast('🎉 मिस्त्री मिल गया!');
          setInstantSearch(null);
          setTab('bookings');
          setRefreshTrigger(c => c + 1);
        } else if (res && (res.status === 'no_worker' || res.status === 'timeout')) {
          showToast('माफ़ करें, कोई मिस्त्री स्वीकार नहीं कर सका।');
          setInstantSearch(null);
        } else if (res && res.status === 'cancelled') {
          setInstantSearch(null);
        }
      } catch (e) {}
    }, 3000);

    return () => {
      clearInterval(timer);
      clearInterval(poll);
    };
  }, [instantSearch, token, showToast]);

  const cancelInstantSearch = async () => {
    if (!instantSearch) return;
    try {
      await api(`/instant/${instantSearch.id}/cancel`, 'POST', {}, token);
      showToast('अनुरोध रद्द कर दिया गया');
    } catch (e) {}
    setInstantSearch(null);
  };

  return (
    <>
      <Header
        lang={lang}
        onToggleLang={toggleLang}
        user={user}
        onOpenProfile={() => setIsProfileOpen(true)}
        unreadNotifs={unreadNotifs}
        onOpenNotifs={() => {
          setIsNotifOpen(prev => !prev);
          fetchNotifications();
        }}
        t={t}
      />

      <main id="app">
        {/* Render Wake-up Banner if server is starting */}
        {isWakingUp && (
          <div className="card" style={{ background: '#fff9c4', border: '1px solid #fbc02d', textAlign: 'center', padding: '16px' }}>
            <h3 style={{ margin: '0 0 6px' }}>⏳ सर्वर कनेक्ट हो रहा है…</h3>
            <div className="sub">फ्री सर्वर स्लीप मोड से जाग रहा है (10-20 सेकंड)। कृपया थोड़ा इंतज़ार करें।</div>
            <div style={{ marginTop: '10px' }}>
              <button className="sec" onClick={() => initApp()}>🔄 दोबारा प्रयास करें</button>
            </div>
          </div>
        )}

        {/* View Switcher */}
        {!user || !token ? (
          <LoginView
            onLoginSuccess={handleLoginSuccess}
            meta={meta}
            lang={lang}
            showToast={showToast}
            t={t}
          />
        ) : (
          <>
            {/* Worker Views */}
            {user.role === 'worker' && tab === 'today' && (
              <WorkerToday
                user={user}
                profile={profile}
                token={token}
                onUpdateProfile={setProfile}
                showToast={showToast}
                t={t}
              />
            )}
            {user.role === 'worker' && tab === 'jobs' && (
              <WorkerJobs
                token={token}
                meta={meta}
                lang={lang}
                refreshTrigger={refreshTrigger}
                onStartCall={(target) => setCallTarget(target)}
                showToast={showToast}
                t={t}
              />
            )}

            {/* Customer Views */}
            {user.role === 'customer' && tab === 'find' && (
              <CustomerFind
                token={token}
                meta={meta}
                lang={lang}
                onOpenBooking={(w, ctx) => {
                  setBookingWorker(w);
                  setBookingJobContext(ctx || null);
                }}
                onStartCall={(target) => setCallTarget(target)}
                onStartInstant={handleStartInstant}
                showToast={showToast}
                t={t}
              />
            )}
            {user.role === 'customer' && tab === 'post' && (
              <CustomerPost
                token={token}
                meta={meta}
                lang={lang}
                refreshTrigger={refreshTrigger}
                onOpenBooking={(w, ctx) => {
                  setBookingWorker(w);
                  setBookingJobContext(ctx || null);
                }}
                onStartCall={(target) => setCallTarget(target)}
                showToast={showToast}
                t={t}
              />
            )}
            {user.role === 'customer' && tab === 'contractors' && (
              <CustomerContractors
                token={token}
                meta={meta}
                lang={lang}
                onOpenProject={(c) => setProjectContractor(c)}
                showToast={showToast}
                t={t}
              />
            )}

            {/* Contractor Views */}
            {user.role === 'contractor' && tab === 'cdash' && (
              <ContractorDashboard
                user={user}
                profile={profile}
                token={token}
                onOpenProfile={() => setIsProfileOpen(true)}
                showToast={showToast}
                t={t}
              />
            )}
            {user.role === 'contractor' && tab === 'crew' && (
              <ContractorCrew
                token={token}
                meta={meta}
                lang={lang}
                showToast={showToast}
                t={t}
              />
            )}
            {user.role === 'contractor' && tab === 'projects' && (
              <ContractorProjects
                token={token}
                onOpenCounter={(kind, id, onDone) => setCounterData({ kind, id, onDone })}
                showToast={showToast}
                t={t}
              />
            )}
            {user.role === 'contractor' && tab === 'ledger' && (
              <ContractorLedger
                token={token}
                showToast={showToast}
                t={t}
              />
            )}

            {/* Shared Bookings View */}
            {tab === 'bookings' && (
              <BookingsView
                user={user}
                token={token}
                meta={meta}
                lang={lang}
                refreshTrigger={refreshTrigger}
                onOpenCounter={(kind, id, onDone) => setCounterData({ kind, id, onDone })}
                onStartCall={(target) => setCallTarget(target)}
                onOpenChat={(b) => setActiveChatBooking(b)}
                showToast={showToast}
                t={t}
              />
            )}

            {/* Shared Assistant View */}
            {tab === 'assistant' && (
              <AssistantView
                token={token}
                lang={lang}
                onNavigateTab={setTab}
                showToast={showToast}
                t={t}
              />
            )}
          </>
        )}
      </main>

      {/* Bottom Navigation */}
      {user && (
        <BottomNav
          role={user.role}
          activeTab={tab}
          onSelectTab={setTab}
          t={t}
        />
      )}

      {/* Floating Toast Notification */}
      <Toast message={toastMsg} />

      {/* Profile Modal */}
      {isProfileOpen && user && (
        <ProfileModal
          user={user}
          profile={profile}
          meta={meta}
          lang={lang}
          token={token}
          onClose={() => setIsProfileOpen(false)}
          onUpdateUser={setUser}
          onUpdateProfile={setProfile}
          onLogout={handleLogout}
          showToast={showToast}
          t={t}
        />
      )}

      {/* Booking Modal (A8, A9) */}
      {bookingWorker && (
        <BookingModal
          worker={bookingWorker}
          jobContext={bookingJobContext}
          token={token}
          onClose={() => {
            setBookingWorker(null);
            setBookingJobContext(null);
          }}
          onSuccess={() => {
            setBookingWorker(null);
            setBookingJobContext(null);
            setTab('bookings');
          }}
          showToast={showToast}
          t={t}
        />
      )}

      {/* Project Modal */}
      {projectContractor && (
        <ProjectModal
          contractor={projectContractor}
          token={token}
          onClose={() => setProjectContractor(null)}
          onSuccess={() => showToast(t('posted'))}
          showToast={showToast}
          t={t}
        />
      )}

      {/* Counter Offer Modal */}
      {counterData && (
        <CounterModal
          kind={counterData.kind}
          id={counterData.id}
          token={token}
          onClose={() => setCounterData(null)}
          onSuccess={() => { if (counterData.onDone) counterData.onDone(); }}
          showToast={showToast}
          t={t}
        />
      )}

      {/* Instant Offer Popup */}
      {instantOffer && (
        <OfferModal
          offer={instantOffer}
          token={token}
          onClose={() => setInstantOffer(null)}
          onAccept={() => setTab('bookings')}
          showToast={showToast}
          t={t}
        />
      )}

      {/* Instant Searching Countdown Modal (A2) */}
      {instantSearch && (
        <div className="modal-backdrop">
          <div className="modal" style={{ maxWidth: '380px', textAlign: 'center', padding: '24px' }}>
            <div style={{ fontSize: '48px', animation: 'pulse 1.5s infinite' }}>⚡</div>
            <h3 style={{ margin: '12px 0 6px' }}>मिस्त्री खोज रहे हैं…</h3>
            <p className="sub" style={{ margin: '0 0 16px' }}>
              काम: <b>{meta?.skills?.find(s => s.key === instantSearch.skill)?.[lang] || instantSearch.skill}</b>
            </p>
            <div style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: '#d97706',
              margin: '12px 0'
            }}>
              {instantSearch.countdown}s
            </div>
            <p className="sub" style={{ fontSize: '13px', color: '#666' }}>
              आस-पास के सभी मिस्त्रियों को अनुरोध भेजा गया है। जैसे ही कोई स्वीकार करेगा, आपको सूचित किया जाएगा।
            </p>
            <div style={{ marginTop: '20px' }}>
              <button
                className="sec"
                style={{ width: '100%', borderColor: '#ef4444', color: '#ef4444' }}
                onClick={cancelInstantSearch}
              >
                रद्द करें (Cancel)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instant Skill Picker Modal (A1) */}
      {instantSkillPicker && (
        <div className="modal-backdrop">
          <div className="modal" style={{ maxWidth: '420px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>⚡ तुरंत किस काम के लिए चाहिए?</h3>
              <button className="sec" style={{ padding: '4px 10px' }} onClick={() => setInstantSkillPicker(false)}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
              {(meta?.skills || []).map(s => (
                <button
                  key={s.key}
                  className="sec"
                  style={{ textAlign: 'left', padding: '10px 12px' }}
                  onClick={() => {
                    setInstantSkillPicker(false);
                    executeInstantDispatch(s.key);
                  }}
                >
                  <div style={{ fontWeight: 'bold' }}>{s[lang] || s.name}</div>
                  <div className="sub" style={{ fontSize: '11px' }}>₹{s.base_rate}/दिन</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modern Top-Right Notifications Popover (Dropdown) */}
      <NotificationsPopover
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        notifications={notifications}
        unreadCount={unreadNotifs}
        onMarkAllRead={markNotifsRead}
        onSelectTab={(newTab) => setTab(newTab)}
      />

      {/* WhatsApp Style In-App Chat Modal */}
      {activeChatBooking && (
        <ChatModal
          booking={activeChatBooking}
          token={token}
          user={user}
          onClose={() => setActiveChatBooking(null)}
          onStartCall={(target) => setCallTarget(target)}
          showToast={showToast}
          t={t}
        />
      )}

      {/* In-App WebRTC Voice Calling Modal */}
      {(callTarget || incomingCall) && (
        <CallModal
          callTarget={callTarget}
          incomingCall={incomingCall}
          ws={wsRef.current}
          meta={meta}
          onClose={() => {
            setCallTarget(null);
            setIncomingCall(null);
          }}
          showToast={showToast}
          t={t}
        />
      )}
    </>
  );
}

