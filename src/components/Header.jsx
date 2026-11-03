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
            title={t('viewProfile')}
            onClick={onOpenProfile}
          >
            <span className="avatar-sm">
              {user.avatar ? (
                <img src={user.avatar} alt="" />
              ) : (
                '👤'
              )}
            </span>
            <span>{user.name || t('profile')}</span>
          </button>
        )}
      </span>
    </header>
  );
}

