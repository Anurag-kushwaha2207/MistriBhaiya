import React from 'react';

export default function BottomNav({ role, activeTab, onSelectTab, t }) {
  if (!role) return null;

  let tabs = [];
  if (role === 'worker') {
    tabs = [
      { id: 'today', icon: '🏠', label: t('today') },
      { id: 'jobs', icon: '🔨', label: t('jobs') },
      { id: 'bookings', icon: '📋', label: t('bookings') },
      { id: 'assistant', icon: '🤖', label: t('assistant') }
    ];
  } else if (role === 'contractor') {
    tabs = [
      { id: 'cdash', icon: '📊', label: t('cdash') },
      { id: 'crew', icon: '👥', label: t('crew') },
      { id: 'projects', icon: '🏗️', label: t('projects') },
      { id: 'ledger', icon: '💰', label: t('ledger') },
      { id: 'assistant', icon: '🤖', label: t('assistant') }
    ];
  } else {
    // customer
    tabs = [
      { id: 'find', icon: '🔍', label: t('find') },
      { id: 'post', icon: '➕', label: t('post') },
      { id: 'contractors', icon: '🏗️', label: t('contractors') },
      { id: 'bookings', icon: '📋', label: t('bookings') },
      { id: 'assistant', icon: '🤖', label: t('assistant') }
    ];
  }

  return (
    <nav id="tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={activeTab === tab.id ? 'on' : ''}
          onClick={() => onSelectTab(tab.id)}
        >
          <span>{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </nav>
  );
}

