import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api, getApiBase } from './api';
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
import { BookingModal, ProjectModal, CounterModal, OfferModal } from './components/Modals';

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

  // Modals
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [bookingWorker, setBookingWorker] = useState(null);
  const [projectContractor, setProjectContractor] = useState(null);
  const [counterData, setCounterData] = useState(null);
  const [instantOffer, setInstantOffer] = useState(null);

  // Cold start / loading status
  const [isWakingUp, setIsWakingUp] = useState(false);
  const [wakeRetryCount, setWakeRetryCount] = useState(0);

  const t = createT(lang);

  const showToast = useCallback((msg) => {
    setToastMsg(msg);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastMsg(null);
    }, 3200);
  }, []);

  const toggleLang = () => {
    const nextLang = lang === 'hi' ? 'en' : 'hi';
    setLang(nextLang);
    localStorage.setItem('ks_lang', nextLang);
    document.documentElement.lang = nextLang;
  };

  const handleLogout = useCallback(() => {
    localStorage.removeItem('ks_token');
    setToken(null);
    setUser(null);
    setProfile(null);
    setTab(null);
    setIsProfileOpen(false);
  }, []);

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

  // Real-time WebSocket connection
  useEffect(() => {
    if (!token) return;

    let ws = null;
    let pingInterval = null;
    let reconnectTimeout = null;

    const connectWS = () => {
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
        pingInterval = setInterval(() => {
          try { ws.send(JSON.stringify({ type: 'ping' })); } catch (e) {}
        }, 25000);
      };

      ws.onmessage = (ev) => {
        try {
          const m = JSON.parse(ev.data);
          if (m.type === 'job_new') {
            showToast('📢 नया काम मिला!');
            setRefreshTrigger(c => c + 1);
          } else if (m.type === 'job_interest') {
            showToast('👷 ' + (m.worker || 'मिस्त्री') + ' ने काम में दिलचस्पी दिखाई!');
            setRefreshTrigger(c => c + 1);
          } else if (m.type === 'booking_new') {
            showToast(t('newbook'));
            setRefreshTrigger(c => c + 1);
          } else if (m.type === 'booking_update') {
            showToast(t('upd') + ': ' + (m.status === 'countered' ? t('counterRecv') + ' ₹' + m.rate : t('st_' + m.status)));
            setRefreshTrigger(c => c + 1);
          } else if (m.type === 'crew_invite') {
            showToast('👥 ' + t('crewInvite') + ': ' + (m.contractor || ''));
            setRefreshTrigger(c => c + 1);
          } else if (m.type === 'project_new') {
            showToast('🏗️ ' + t('newProject') + ': ' + (m.title || ''));
            setRefreshTrigger(c => c + 1);
          } else if (m.type === 'instant_offer') {
            setInstantOffer(m);
          } else if (m.type === 'instant_closed') {
            setInstantOffer(null);
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
            showToast('साथी अभी ऐप पर ऑफलाइन है। फोन डायलर से कॉल करें।');
          }
        } catch (e) {}
      };

      ws.onclose = () => {
        clearInterval(pingInterval);
        reconnectTimeout = setTimeout(connectWS, 4000);
      };
    };

    connectWS();

    return () => {
      clearInterval(pingInterval);
      clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, [token, showToast, t]);

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

  const handleStartInstant = async () => {
    try {
      showToast(t('searching'));
      await api('/instant/start', 'POST', { skill: 'mistri', description: 'Immediate mistri needed' }, token);
    } catch (err) {
      showToast(err.message || "Instant dispatch error");
    }
  };

  return (
    <>
      <Header
        lang={lang}
        onToggleLang={toggleLang}
        user={user}
        onOpenProfile={() => setIsProfileOpen(true)}
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
                onOpenBooking={(w) => setBookingWorker(w)}
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
                onOpenBooking={(w) => setBookingWorker(w)}
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

      {/* Booking Modal */}
      {bookingWorker && (
        <BookingModal
          worker={bookingWorker}
          token={token}
          onClose={() => setBookingWorker(null)}
          onSuccess={() => setTab('bookings')}
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

