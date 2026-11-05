import React from 'react';

export default function Header({ lang, onToggleLang, user, onOpenProfile, t }) {
  return (
    <header id="top">
      <span className="brand">🏗️ MistriBhaiya</span>
      <span id="topright">
        <button
          className="sec"
          id="langb"
          style={{ padding: '6px 10px', marginRight: user ? '6px' : '0' }}
          onClick={onToggleLang}
        >
          {lang === 'hi' ? 'EN' : 'हिं'}
        </button>
        {user && (
          <button
            className="sec profile-btn"
            id="profb"
            title={user.name || t('viewProfile')}
            onClick={onOpenProfile}
            style={{
              padding: '2px',
              borderRadius: '50%',
              width: '38px',
              height: '38px',
              minWidth: '38px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid rgba(255, 255, 255, 0.6)',
              background: '#fff',
              overflow: 'hidden',
              cursor: 'pointer',
              boxShadow: '0 1px 4px rgba(0,0,0,0.2)'
            }}
          >
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name || 'Profile'}
                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <span style={{ fontSize: '18px', lineHeight: '1' }}>👤</span>
            )}
          </button>
        )}
      </span>
    </header>
  );
}

