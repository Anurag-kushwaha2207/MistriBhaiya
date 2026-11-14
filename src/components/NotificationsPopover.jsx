import React from 'react';

/**
 * Format raw notification payloads into clean, human-friendly Hindi UI representations.
 */
function formatNotification(n) {
  let p = {};
  if (typeof n.payload === 'object' && n.payload !== null) {
    p = n.payload;
  } else if (typeof n.payload_json === 'string') {
    try {
      p = JSON.parse(n.payload_json);
    } catch (e) {
      p = {};
    }
  }

  // Friendly relative time calculation
  let timeStr = '';
  if (n.created_at) {
    const ts = typeof n.created_at === 'number' && n.created_at < 1e11 ? n.created_at * 1000 : Number(n.created_at);
    const now = Date.now();
    const diffSec = Math.max(0, Math.floor((now - ts) / 1000));
    if (diffSec < 60) {
      timeStr = 'अभी-अभी';
    } else if (diffSec < 3600) {
      timeStr = `${Math.floor(diffSec / 60)} मिनट पहले`;
    } else if (diffSec < 86400) {
      timeStr = `${Math.floor(diffSec / 3600)} घंटे पहले`;
    } else {
      const d = new Date(ts);
      timeStr = d.toLocaleDateString('hi-IN', { day: 'numeric', month: 'short' });
    }
  }

  const type = n.type || '';
  let icon = '🔔';
  let iconBg = '#e8f5e9';
  let iconColor = '#2e7d32';
  let title = 'सूचना';
  let desc = '';
  let targetTab = null;

  if (type === 'booking_new') {
    icon = '📋';
    iconBg = '#e3f2fd';
    iconColor = '#1565c0';
    title = 'नई बुकिंग का अनुरोध';
    desc = `${p.customer || 'ग्राहक'} ने ${p.skill || 'काम'} के लिए बुकिंग भेजी है।`;
    targetTab = 'bookings';
  } else if (type === 'booking_update') {
    targetTab = 'bookings';
    if (p.status === 'accepted') {
      icon = '✅';
      iconBg = '#e8f5e9';
      iconColor = '#2e7d32';
      title = 'बुकिंग स्वीकार हो गई!';
      desc = p.text || 'मिस्त्री ने बुकिंग स्वीकार कर ली है। ₹10 टोकन जमा कर OTP अनलॉक करें।';
    } else if (p.status === 'rejected') {
      icon = '❌';
      iconBg = '#ffebee';
      iconColor = '#c62828';
      title = 'बुकिंग अस्वीकार';
      desc = p.reason === 'job_assigned' ? 'कारीगर दूसरे काम में लग गया है।' : (p.text || 'बुकिंग स्वीकार नहीं की गई।');
    } else if (p.status === 'started') {
      icon = '🔨';
      iconBg = '#fff3e0';
      iconColor = '#ef6c00';
      title = 'काम शुरू हो चुका है';
      desc = p.text || 'मिस्त्री ने काम शुरू कर दिया है।';
    } else if (p.status === 'completed') {
      icon = '🎉';
      iconBg = '#e8f5e9';
      iconColor = '#2e7d32';
      title = 'काम पूरा हुआ!';
      desc = p.text || 'काम सफलतापूर्वक पूरा कर दिया गया है।';
    } else if (p.status === 'cancelled') {
      icon = '🚫';
      iconBg = '#f5f5f5';
      iconColor = '#757575';
      title = 'बुकिंग रद्द हुई';
      desc = p.text || 'बुकिंग रद्द कर दी गई है।';
    } else {
      icon = '📋';
      title = 'बुकिंग अपडेट';
      desc = p.text || `बुकिंग की स्थिति: ${p.status || 'अपडेट'}`;
    }
  } else if (type === 'payment_cash_pending') {
    icon = '💵';
    iconBg = '#fffde7';
    iconColor = '#f57f17';
    title = p.title || 'नकद भुगतान लंबित';
    desc = p.body || `ग्राहक से ₹${p.amount || 0} नकद भुगतान प्राप्त करें।`;
    targetTab = 'bookings';
  } else if (type.startsWith('payment')) {
    icon = '💳';
    iconBg = '#e8f5e9';
    iconColor = '#2e7d32';
    title = p.title || 'भुगतान सूचना';
    desc = p.body || (p.amount ? `₹${p.amount} का भुगतान अपडेट` : 'भुगतान की स्थिति अपडेट हुई है।');
    targetTab = 'bookings';
  } else if (type === 'job_interest') {
    icon = '👷';
    iconBg = '#e3f2fd';
    iconColor = '#1565c0';
    title = 'कारीगर ने काम में रुचि दिखाई';
    desc = `${p.worker || 'कारीगर'} ने ₹${p.rate || ''} के भाव पर काम करने का प्रस्ताव दिया है।`;
    targetTab = 'post_job';
  } else if (type === 'chat') {
    icon = '💬';
    iconBg = '#e0f7fa';
    iconColor = '#00838f';
    title = p.from ? `${p.from} का नया संदेश` : 'नया चैट संदेश';
    desc = p.text || 'आपको एक नया संदेश प्राप्त हुआ है।';
    targetTab = 'bookings';
  } else if (type === 'instant_offer') {
    icon = '⚡';
    iconBg = '#fff8e1';
    iconColor = '#f57f17';
    title = 'तत्काल काम का प्रस्ताव!';
    desc = `${p.skill || 'काम'} के लिए पास में ग्राहक को ज़रूरत है (${p.distance_km || 1} किमी)।`;
    targetTab = 'today';
  } else if (type === 'instant_status') {
    icon = '⚡';
    iconBg = '#e8f5e9';
    iconColor = '#2e7d32';
    title = 'त्वरित खोज अपडेट';
    desc = p.status === 'matched' ? 'कारीगर मिल गया है!' : (p.status === 'no_worker' ? 'कोई कारीगर उपलब्ध नहीं मिला।' : 'कारीगर खोजे जा रहे हैं...');
    targetTab = 'find';
  } else if (type.startsWith('sos')) {
    icon = '🚨';
    iconBg = '#ffebee';
    iconColor = '#d32f2f';
    title = 'आपातकालीन चेतावनी (SOS)';
    desc = `बुकिंग #${p.booking_id || ''} में आपातकालीन सहायता मांगी गई है!`;
    targetTab = 'bookings';
  } else if (type.startsWith('crew') || type.startsWith('project')) {
    icon = '🏗️';
    iconBg = '#f3e5f5';
    iconColor = '#7b1fa2';
    title = p.title || 'ठेकेदार / प्रोजेक्ट अपडेट';
    desc = p.customer || p.contractor ? `${p.customer || p.contractor} ने प्रोजेक्ट अपडेट किया` : (p.status || 'नया अपडेट');
    targetTab = 'thekedar';
  } else {
    icon = '🔔';
    title = p.title || 'सूचना';
    desc = p.text || p.note || p.body || (p.customer ? `${p.customer} ने संपर्क किया` : 'नया अपडेट प्राप्त हुआ');
  }

  return { icon, iconBg, iconColor, title, desc, timeStr, targetTab, isUnread: !n.read };
}

export default function NotificationsPopover({
  isOpen,
  onClose,
  notifications = [],
  unreadCount = 0,
  onMarkAllRead,
  onSelectTab
}) {
  if (!isOpen) return null;

  return (
    <>
      {/* 1. Transparent Backdrop to catch outside clicks and close effortlessly */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 998,
          background: 'rgba(0, 0, 0, 0.15)',
          backdropFilter: 'blur(1px)',
          transition: 'opacity 0.2s'
        }}
        onClick={onClose}
      />

      {/* 2. Sleek Floating Popover anchored directly below header at top-right */}
      <div
        style={{
          position: 'fixed',
          top: '56px',
          right: '12px',
          width: 'min(390px, calc(100vw - 24px))',
          maxHeight: 'min(520px, calc(100vh - 80px))',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.18), 0 4px 12px rgba(0, 0, 0, 0.08)',
          border: '1px solid #e0e6ed',
          zIndex: 999,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1b5e20, #2e7d32)',
            color: '#ffffff',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 4px rgba(0,0,0,0.08)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🔔</span>
            <span style={{ fontWeight: 'bold', fontSize: '15px' }}>सूचनाएं</span>
            {unreadCount > 0 ? (
              <span
                style={{
                  background: '#ff5252',
                  color: '#fff',
                  borderRadius: '12px',
                  padding: '2px 8px',
                  fontSize: '11px',
                  fontWeight: 'bold'
                }}
              >
                {unreadCount} नई
              </span>
            ) : (
              <span
                style={{
                  background: 'rgba(255, 255, 255, 0.25)',
                  borderRadius: '12px',
                  padding: '2px 8px',
                  fontSize: '11px'
                }}
              >
                {notifications.length}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {unreadCount > 0 && onMarkAllRead && (
              <button
                type="button"
                onClick={onMarkAllRead}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title="सभी सूचनाओं को पढ़ा हुआ मार्क करें"
              >
                ✓✓ पढ़ी मार्क करें
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '50%',
                width: '26px',
                height: '26px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
                lineHeight: 1
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable Notification List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '10px',
            background: '#f8faf8',
            maxHeight: '400px'
          }}
        >
          {notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: '#718096' }}>
              <div style={{ fontSize: '38px', marginBottom: '8px' }}>🔕</div>
              <div style={{ fontWeight: '600', fontSize: '15px', color: '#2d3748' }}>कोई नई सूचना नहीं है</div>
              <div style={{ fontSize: '12px', color: '#718096', marginTop: '4px' }}>
                नई बुकिंग, मैसेज या अपडेट आने पर आपको तुरंत यहाँ दिखेगा।
              </div>
            </div>
          ) : (
            notifications.map((n) => {
              const info = formatNotification(n);
              return (
                <div
                  key={n.id}
                  onClick={() => {
                    if (info.targetTab && onSelectTab) {
                      onSelectTab(info.targetTab);
                    }
                    onClose();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '12px',
                    marginBottom: '8px',
                    borderRadius: '12px',
                    background: info.isUnread ? '#ffffff' : '#f9fbf9',
                    border: info.isUnread ? '1.5px solid #a7f3d0' : '1px solid #e5e7eb',
                    boxShadow: info.isUnread ? '0 2px 8px rgba(46, 125, 50, 0.08)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f0fdf4';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = info.isUnread ? '#ffffff' : '#f9fbf9';
                  }}
                >
                  {/* Icon Avatar */}
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: info.iconBg,
                      color: info.iconColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      flexShrink: 0
                    }}
                  >
                    {info.icon}
                  </div>

                  {/* Text details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          fontWeight: info.isUnread ? '700' : '600',
                          fontSize: '13px',
                          color: '#1a202c',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {info.title}
                      </span>
                      {info.timeStr && (
                        <span style={{ fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap', flexShrink: 0 }}>
                          {info.timeStr}
                        </span>
                      )}
                    </div>

                    <div
                      style={{
                        fontSize: '12px',
                        color: '#475569',
                        marginTop: '3px',
                        lineHeight: '1.45',
                        wordBreak: 'break-word'
                      }}
                    >
                      {info.desc}
                    </div>

                    {info.targetTab && (
                      <div
                        style={{
                          fontSize: '11px',
                          color: '#2e7d32',
                          fontWeight: '600',
                          marginTop: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px'
                        }}
                      >
                        👉 देखें ({info.targetTab === 'bookings' ? 'बुकिंग' : info.targetTab === 'thekedar' ? 'ठेकेदार' : 'विवरण'})
                      </div>
                    )}
                  </div>

                  {/* Unread dot */}
                  {info.isUnread && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        background: '#10b981'
                      }}
                      title="नया"
                    />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '8px 14px',
            background: '#ffffff',
            borderTop: '1px solid #edf2f7',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '11px',
            color: '#64748b'
          }}
        >
          <span>🏗️ मिस्त्री भैया रियल-टाइम सूचनाएं</span>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              color: '#334155',
              border: 'none',
              padding: '3px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            बंद करें
          </button>
        </div>
      </div>
    </>
  );
}

