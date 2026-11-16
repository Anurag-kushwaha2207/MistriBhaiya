import React, { useState, useEffect } from 'react';
import { api, getLoc } from '../api';
import { syncWorkerProfile } from '../firebase';
import LocationPicker from './LocationPicker';
import { getFriendlyLocationName } from '../data/locations';

export default function WorkerToday({ user, profile, token, onUpdateProfile, showToast, lang = 'hi', t }) {
  const [hours, setHours] = useState(profile?.hours_free || 8);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [selectedVillage, setSelectedVillage] = useState(profile?.village || '');
  const [pickerLat, setPickerLat] = useState(profile?.lat ?? null);
  const [pickerLng, setPickerLng] = useState(profile?.lng ?? null);

  const status = profile?.status || 'offline';
  const isEn = lang === 'en';

  const loadData = async () => {
    try {
      const invRes = await api('/worker/invites', 'GET', null, token).catch(() => ({ invites: [] }));
      setInvites(invRes.invites || []);
    } catch (e) {}
  };

  useEffect(() => {
    loadData();
  }, [token]);

  const setStatus = async (newStatus) => {
    setLoading(true);
    try {
      let loc = null;
      try {
        loc = await getLoc(false);
      } catch (e) {}

      const payload = {
        status: newStatus,
        hours_free: newStatus === 'free' ? parseInt(hours, 10) : 0,
        ...(loc ? { lat: loc.lat, lng: loc.lng } : {})
      };
      const res = await api('/worker/status', 'POST', payload, token);
      const updatedProfile = { ...profile, ...res.profile, status: newStatus };
      onUpdateProfile(updatedProfile);
      syncWorkerProfile(user.id, updatedProfile);

      if (newStatus === 'free') {
        showToast(isEn ? '🟡 You are available today! (FREE)' : '🟡 आप आज काम के लिए उपलब्ध हैं! (FREE)');
      } else if (newStatus === 'busy') {
        showToast(isEn ? '⛔ Availability set to BUSY' : '⛔ आपकी स्थिति "काम पर व्यस्त" सेट हो गई');
      } else {
        showToast(isEn ? '😴 Availability set to OFFLINE' : '😴 आपकी स्थिति "छुट्टी/ऑफलाइन" सेट हो गई');
      }
    } catch (err) {
      showToast(err.message || "Failed to update status");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLocation = async () => {
    if (pickerLat == null || pickerLng == null) {
      showToast(isEn ? "Please select a location first" : "कृपया पहले अपनी लोकेशन चुनें");
      return;
    }
    setLoading(true);
    try {
      await api('/worker/location', 'POST', { lat: pickerLat, lng: pickerLng }, token);
      const updatedProfile = {
        ...profile,
        lat: pickerLat,
        lng: pickerLng,
        village: selectedVillage || profile?.village || ''
      };
      onUpdateProfile(updatedProfile);
      syncWorkerProfile(user.id, updatedProfile);
      setIsLocationModalOpen(false);
      showToast(isEn ? "📍 Location updated successfully!" : "📍 लोकेशन सफलतापूर्वक सेट हो गई!");
    } catch (err) {
      showToast(err.message || "Location error");
    } finally {
      setLoading(false);
    }
  };

  const handleGpsLocation = async () => {
    try {
      showToast(isEn ? "📍 Getting live GPS..." : "📍 लाइव GPS ले रहे हैं...");
      const loc = await getLoc(true);
      setPickerLat(loc.lat);
      setPickerLng(loc.lng);
      showToast(isEn ? "GPS detected! Click Save" : "GPS मिल गया! अब 'सेव करें' दबाएँ");
    } catch (err) {
      showToast(err.message || "GPS error");
    }
  };

  const handleInviteResponse = async (inviteId, accept) => {
    try {
      await api(`/worker/invites/${inviteId}/respond`, 'POST', { accept }, token);
      showToast(accept ? (isEn ? "Joined contractor crew!" : "ठेकेदार के क्रू से जुड़ गए!") : t('saved'));
      loadData();
    } catch (err) {
      showToast(err.message || "Error responding to invite");
    }
  };

  // Display location helper
  const displayLocation = () => {
    if (profile?.village) return `${profile.village} • ${profile.radius_km || 6} km radius`;
    if (profile?.lat && profile?.lng) return `${getFriendlyLocationName(profile.lat, profile.lng, isEn ? 'en' : 'hi')} • ${profile.radius_km || 6} km`;
    return isEn ? "Set location to get nearby jobs" : "आस-पास काम पाने के लिए लोकेशन सेट करें";
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '20px' }}>
      
      {/* Contractor Invitations Banner */}
      {invites.map((inv) => (
        <div
          key={inv.id}
          style={{
            background: '#ffffff',
            borderLeft: '5px solid #ef6c00',
            borderRadius: '16px',
            padding: '14px 16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <b style={{ color: '#0f172a', fontSize: '15px' }}>👥 {isEn ? 'Contractor Crew Invite' : 'ठेकेदार से न्योता'}</b>
              <div style={{ fontSize: '13px', color: '#196126', fontWeight: 'bold', marginTop: '2px' }}>
                {inv.company || inv.contractor}
              </div>
            </div>
            <span style={{ background: '#fef3c7', color: '#b45309', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>
              ₹{inv.daily_rate || '-'}/{isEn ? 'day' : 'दिन'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button
              style={{ flex: 1, background: '#196126', color: '#fff', padding: '9px', borderRadius: '10px', fontSize: '13px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
              onClick={() => handleInviteResponse(inv.id, true)}
            >
              ✔ {isEn ? 'Accept & Join' : 'स्वीकार करें'}
            </button>
            <button
              style={{ flex: 1, background: '#f1f5f9', color: '#64748b', padding: '9px', borderRadius: '10px', fontSize: '13px', fontWeight: 'bold', border: '1px solid #cbd5e1', cursor: 'pointer' }}
              onClick={() => handleInviteResponse(inv.id, false)}
            >
              ✖ {isEn ? 'Decline' : 'मना करें'}
            </button>
          </div>
        </div>
      ))}

      {/* 1. Hero Banner Card */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(8px)',
          borderRadius: '18px',
          padding: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          border: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#0f172a', lineHeight: '1.25' }}>
            {isEn ? 'Your Work. Your Availability.' : 'आपका काम। आपकी उपलब्धता।'}
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>
            {isEn ? 'Manage your daily work availability and get hired.' : 'दैनिक उपलब्धता सेट करें और आस-पास काम पाएं।'}
          </p>
        </div>
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: '#ecfdf5',
            color: '#196126',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            marginLeft: '12px',
            border: '1px solid #bbf7d0',
            fontSize: '18px'
          }}
        >
          <i className="fa-solid fa-shield-halved"></i>
        </div>
      </div>

      {/* 2. Today's Availability Card */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.96)',
          backdropFilter: 'blur(10px)',
          borderRadius: '20px',
          padding: '18px',
          boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
          border: '1px solid #f1f5f9',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}
      >
        {/* Section Header with Status Badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
            {isEn ? "Today's Availability" : "आज की उपलब्धता"}
          </h3>
          <div
            style={{
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: '800',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: status === 'free' ? '#dcfce7' : status === 'busy' ? '#fee2e2' : '#f1f5f9',
              color: status === 'free' ? '#15803d' : status === 'busy' ? '#b91c1c' : '#475569',
              border: `1px solid ${status === 'free' ? '#bbf7d0' : status === 'busy' ? '#fca5a5' : '#cbd5e1'}`
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: status === 'free' ? '#16a34a' : status === 'busy' ? '#dc2626' : '#64748b'
              }}
            ></span>
            <span>{status === 'free' ? (isEn ? 'FREE' : 'फ्री (उपलब्ध)') : status === 'busy' ? (isEn ? 'BUSY' : 'व्यस्त') : (isEn ? 'OFFLINE' : 'छुट्टी')}</span>
          </div>
        </div>

        {/* Available Hours Selector */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
            {isEn ? 'How many hours are you available?' : 'आप आज कितने घंटे काम कर सकते हैं?'}
          </label>
          <div style={{ position: 'relative' }}>
            <select
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              style={{
                width: '100%',
                background: '#f8fafc',
                border: '1.5px solid #cbd5e1',
                borderRadius: '12px',
                padding: '10px 14px',
                fontSize: '13.5px',
                fontWeight: '600',
                color: '#1e293b',
                outline: 'none',
                appearance: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="4">{isEn ? '4 Hours (Half Day)' : '4 घंटे (आधा दिन)'}</option>
              <option value="6">{isEn ? '6 Hours' : '6 घंटे'}</option>
              <option value="8">{isEn ? '8 Hours (Full Day)' : '8 घंटे (पूरा दिन)'}</option>
              <option value="10">{isEn ? '10 Hours (Extended)' : '10 घंटे'}</option>
              <option value="12">{isEn ? '12 Hours (Overtime)' : '12 घंटे (ओवरटाइम)'}</option>
            </select>
            <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b', fontSize: '11px' }}>
              <i className="fa-solid fa-chevron-down"></i>
            </div>
          </div>
        </div>

        {/* Dynamic Status Alert Box */}
        <div>
          {status === 'free' ? (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '14px',
                background: '#fffbeb',
                border: '1.5px solid #fde68a',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px'
              }}
            >
              <i className="fa-solid fa-circle-check" style={{ color: '#d97706', fontSize: '16px', marginTop: '2px', flexShrink: 0 }}></i>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#78350f' }}>
                  {isEn ? 'You are available today!' : 'आप आज काम के लिए उपलब्ध हैं!'}
                </div>
                <div style={{ fontSize: '11.5px', color: '#92400e', marginTop: '2px', lineHeight: '1.4' }}>
                  {isEn
                    ? 'Customers and contractors can find, see, and contact you for tasks.'
                    : 'आपकी प्रोफ़ाइल ग्राहकों और ठेकेदारों को दिख रही है। वे आपको कॉल कर सकते हैं।'}
                </div>
              </div>
            </div>
          ) : status === 'busy' ? (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '14px',
                background: '#fef2f2',
                border: '1.5px solid #fecaca',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px'
              }}
            >
              <i className="fa-solid fa-circle-exclamation" style={{ color: '#dc2626', fontSize: '16px', marginTop: '2px', flexShrink: 0 }}></i>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#991b1b' }}>
                  {isEn ? 'You are currently busy!' : 'आप अभी काम पर व्यस्त हैं!'}
                </div>
                <div style={{ fontSize: '11.5px', color: '#b91c1c', marginTop: '2px', lineHeight: '1.4' }}>
                  {isEn
                    ? 'New customer calls are paused while you complete active work.'
                    : 'नया काम आने पर व्यवधान न हो इसलिए आपकी ID लिस्ट में छुपी है।'}
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '14px',
                background: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px'
              }}
            >
              <i className="fa-solid fa-moon" style={{ color: '#64748b', fontSize: '16px', marginTop: '2px', flexShrink: 0 }}></i>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#334155' }}>
                  {isEn ? 'You are not working today' : 'आज आप काम नहीं कर रहे हैं'}
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px', lineHeight: '1.4' }}>
                  {isEn
                    ? 'Enjoy your day off! Toggle back to free whenever you are ready.'
                    : 'छुट्टी का आनंद लें! काम के लिए तैयार होते ही "मैं आज उपलब्ध हूँ" दबाएँ।'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Interactive Availability Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          
          {/* Main "I AM FREE TODAY" Button:
              - YELLOW (#FFC32C) when Free (active looking for work!)
              - GREEN (#196126) when Busy or Offline (inviting the worker to click & go free!) */}
          <button
            type="button"
            onClick={() => setStatus('free')}
            disabled={loading}
            style={
              status === 'free'
                ? {
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: '14px',
                    fontSize: '14.5px',
                    fontWeight: '800',
                    letterSpacing: '0.03em',
                    background: '#FFC32C',
                    color: '#0f172a',
                    border: '2px solid #f59e0b',
                    boxShadow: '0 4px 16px rgba(255, 195, 44, 0.45)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    transform: 'scale(1.01)',
                    transition: 'all 0.2s ease'
                  }
                : {
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: '14px',
                    fontSize: '14.5px',
                    fontWeight: '800',
                    letterSpacing: '0.03em',
                    background: '#196126',
                    color: '#ffffff',
                    border: 'none',
                    boxShadow: '0 3px 10px rgba(25, 97, 38, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }
            }
          >
            {status === 'free' ? (
              <>
                <i className="fa-solid fa-check" style={{ fontSize: '15px' }}></i>
                <span>{isEn ? 'I AM FREE TODAY (Active)' : 'मैं आज फ्री हूँ (उपलब्ध)'}</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-bolt" style={{ color: '#FFC32C', fontSize: '15px' }}></i>
                <span>{isEn ? 'I AM FREE TODAY (Click to Start)' : 'मैं आज फ्री हूँ (काम शुरू करें)'}</span>
              </>
            )}
          </button>

          {/* Sub Action Buttons: I AM BUSY & Not Working */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {/* Busy Button */}
            <button
              type="button"
              onClick={() => setStatus('busy')}
              disabled={loading}
              style={
                status === 'busy'
                  ? {
                      padding: '11px',
                      borderRadius: '12px',
                      fontSize: '12.5px',
                      fontWeight: '800',
                      background: '#C92525',
                      color: '#ffffff',
                      border: '2px solid #ef4444',
                      boxShadow: '0 3px 10px rgba(201, 37, 37, 0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      cursor: 'pointer'
                    }
                  : {
                      padding: '11px',
                      borderRadius: '12px',
                      fontSize: '12.5px',
                      fontWeight: '700',
                      background: '#f8fafc',
                      color: '#64748b',
                      border: '1px solid #cbd5e1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      cursor: 'pointer'
                    }
              }
            >
              <i className="fa-solid fa-ban" style={{ fontSize: '12px' }}></i>
              <span>{isEn ? 'I AM BUSY' : 'काम पर व्यस्त'}</span>
            </button>

            {/* Not Working Button */}
            <button
              type="button"
              onClick={() => setStatus('offline')}
              disabled={loading}
              style={
                status === 'offline'
                  ? {
                      padding: '11px',
                      borderRadius: '12px',
                      fontSize: '12.5px',
                      fontWeight: '800',
                      background: '#334155',
                      color: '#ffffff',
                      border: '2px solid #475569',
                      boxShadow: '0 3px 10px rgba(51, 65, 85, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      cursor: 'pointer'
                    }
                  : {
                      padding: '11px',
                      borderRadius: '12px',
                      fontSize: '12.5px',
                      fontWeight: '700',
                      background: '#f8fafc',
                      color: '#64748b',
                      border: '1px solid #cbd5e1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      cursor: 'pointer'
                    }
              }
            >
              <i className="fa-solid fa-power-off" style={{ fontSize: '12px' }}></i>
              <span>{isEn ? 'Not Working' : 'आज छुट्टी'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Your Work Location Card */}
      <div
        onClick={() => setIsLocationModalOpen(true)}
        style={{
          background: 'rgba(255, 255, 255, 0.96)',
          backdropFilter: 'blur(8px)',
          borderRadius: '18px',
          padding: '14px 16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          border: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          transition: 'background 0.2s'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '14px',
              background: '#ecfdf5',
              color: '#196126',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #bbf7d0',
              fontSize: '18px',
              flexShrink: 0
            }}
          >
            <i className="fa-solid fa-location-dot"></i>
          </div>
          <div>
            <div style={{ fontWeight: '800', fontSize: '14px', color: '#0f172a' }}>
              {isEn ? 'Set your location' : 'काम करने का स्थान (लोकेशन)'}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
              {displayLocation()}
            </div>
          </div>
        </div>
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94a3b8',
            fontSize: '13px'
          }}
        >
          <i className="fa-solid fa-chevron-right"></i>
        </div>
      </div>

      {/* 4. Quick Stats Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.94)',
            backdropFilter: 'blur(8px)',
            borderRadius: '18px',
            padding: '14px',
            textAlign: 'center',
            border: '1px solid #f1f5f9',
            boxShadow: '0 1px 4px rgba(0,0,0,0.03)'
          }}
        >
          <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '600', display: 'block' }}>
            {isEn ? 'Completed Jobs' : 'पूरे किए गए काम'}
          </span>
          <span style={{ fontSize: '19px', fontWeight: '800', color: '#196126', display: 'block', marginTop: '3px' }}>
            {profile?.jobs_done ? `${profile.jobs_done} Projects` : '42 Projects'}
          </span>
        </div>

        <div
          style={{
            background: 'rgba(255, 255, 255, 0.94)',
            backdropFilter: 'blur(8px)',
            borderRadius: '18px',
            padding: '14px',
            textAlign: 'center',
            border: '1px solid #f1f5f9',
            boxShadow: '0 1px 4px rgba(0,0,0,0.03)'
          }}
        >
          <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '600', display: 'block' }}>
            {isEn ? 'Worker Rating' : 'आपकी रेटिंग'}
          </span>
          <span
            style={{
              fontSize: '19px',
              fontWeight: '800',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              marginTop: '3px'
            }}
          >
            <i className="fa-solid fa-star" style={{ fontSize: '15px' }}></i>
            <span>{(profile?.rating_avg || 4.8).toFixed(1)}</span>
          </span>
        </div>
      </div>

      {/* Location Picker Modal */}
      {isLocationModalOpen && (
        <div
          className="modal"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'flex-end',
            zIndex: 1000
          }}
          onClick={(e) => {
            if (e.target.className === 'modal') setIsLocationModalOpen(false);
          }}
        >
          <div
            className="sheet"
            style={{
              background: '#ffffff',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: '24px 24px 0 0',
              padding: '20px 18px',
              maxWidth: '500px',
              margin: '0 auto',
              boxShadow: '0 -4px 20px rgba(0,0,0,0.15)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#0f172a' }}>
                📍 {isEn ? 'Set Working Location' : 'काम की लोकेशन सेट करें'}
              </h3>
              <button
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', fontSize: '16px', color: '#64748b', cursor: 'pointer' }}
                onClick={() => setIsLocationModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <LocationPicker
              lat={pickerLat}
              lng={pickerLng}
              onLocationSelect={(lat, lng) => {
                setPickerLat(lat);
                setPickerLng(lng);
              }}
              village={selectedVillage}
              onVillageChange={setSelectedVillage}
              onGpsClick={handleGpsLocation}
              lang={lang}
            />

            <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
              <button
                style={{ flex: 1, background: '#196126', color: '#fff', padding: '12px', borderRadius: '12px', fontWeight: '800', fontSize: '14px', border: 'none', cursor: 'pointer' }}
                onClick={handleSaveLocation}
                disabled={loading}
              >
                {loading ? 'सहेज रहे हैं...' : '💾 लोकेशन सेव करें'}
              </button>
              <button
                style={{ background: '#f1f5f9', color: '#64748b', padding: '12px 18px', borderRadius: '12px', fontWeight: '700', fontSize: '14px', border: 'none', cursor: 'pointer' }}
                onClick={() => setIsLocationModalOpen(false)}
              >
                रद्द करें
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
