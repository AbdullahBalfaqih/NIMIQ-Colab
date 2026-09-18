import React from 'react';
import { Home, ShoppingBag, Wallet, Users } from 'lucide-react';

export type NavTab = 'home' | 'market' | 'ai' | 'cards' | 'settings';

interface BottomNavBarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({ activeTab, onSelectTab }) => {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        alignItems: 'center',
        justifyItems: 'center',
        width: '454px',
        height: '88px',
        borderRadius: '50px',
        background: 'rgba(255, 255, 255, 0.94)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: '0 3px 10px 0 #BBBBBB',
        padding: '0 10px',
        boxSizing: 'border-box',
      }}
    >
      {/* 1. Home Tab */}
      <button
        onClick={() => onSelectTab('home')}
        style={{
          display: 'flex',
          width: '68px',
          height: '68px',
          justifyContent: 'center',
          alignItems: 'center',
          borderRadius: '34px',
          background: activeTab === 'home' ? '#171717' : 'transparent',
          transition: 'background-color 0.15s ease',
          padding: 0,
        }}
        title="Home"
      >
        <Home
          size={26}
          strokeWidth={1.8}
          color={activeTab === 'home' ? '#FFFFFF' : '#111111'}
        />
      </button>

      {/* 2. Market / Group Shopping Tab */}
      <button
        onClick={() => onSelectTab('market')}
        style={{
          display: 'flex',
          width: '68px',
          height: '68px',
          justifyContent: 'center',
          alignItems: 'center',
          borderRadius: '34px',
          background: activeTab === 'market' ? '#171717' : 'transparent',
          transition: 'background-color 0.15s ease',
          padding: 0,
        }}
        title="Market"
      >
        <ShoppingBag
          size={26}
          strokeWidth={1.8}
          color={activeTab === 'market' ? '#FFFFFF' : '#111111'}
        />
      </button>

      {/* 3. Center AI Orb Button (Fixed dimensions, no transform scale) */}
      <button
        onClick={() => onSelectTab('ai')}
        style={{
          display: 'flex',
          width: '68px',
          height: '68px',
          justifyContent: 'center',
          alignItems: 'center',
          borderRadius: '34px',
          padding: 0,
        }}
        title="The Operator"
      >
        <img
          src="https://api.builder.io/api/v1/image/assets/TEMP/2a4a11e007e53740216645412a721ef97d1c88a0?width=136"
          alt="AI Agent"
          style={{
            width: '64px',
            height: '64px',
            objectFit: 'contain',
          }}
        />
      </button>

      {/* 4. Cards Tab */}
      <button
        onClick={() => onSelectTab('cards')}
        style={{
          display: 'flex',
          width: '68px',
          height: '68px',
          justifyContent: 'center',
          alignItems: 'center',
          borderRadius: '34px',
          background: activeTab === 'cards' ? '#171717' : 'transparent',
          transition: 'background-color 0.15s ease',
          padding: 0,
        }}
        title="Cards"
      >
        <Wallet
          size={26}
          strokeWidth={1.8}
          color={activeTab === 'cards' ? '#FFFFFF' : '#111111'}
        />
      </button>

      {/* 5. Members Tab */}
      <button
        onClick={() => onSelectTab('settings')}
        style={{
          display: 'flex',
          width: '68px',
          height: '68px',
          justifyContent: 'center',
          alignItems: 'center',
          borderRadius: '34px',
          background: activeTab === 'settings' ? '#171717' : 'transparent',
          transition: 'background-color 0.15s ease',
          padding: 0,
        }}
        title="Members"
      >
        <Users
          size={26}
          strokeWidth={1.8}
          color={activeTab === 'settings' ? '#FFFFFF' : '#111111'}
        />
      </button>
    </div>
  );
};
