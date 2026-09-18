import { useState } from 'react';
import { PhoneFrame } from './components/PhoneFrame';
import { HomeScreen } from './components/HomeScreen';
import { AiOperatorScreen } from './components/AiOperatorScreen';
import { CardsScreen } from './components/CardsScreen';
import { MarketScreen } from './components/MarketScreen';
import { MembersScreen } from './components/MembersScreen';
import { BottomNavBar, type NavTab } from './components/BottomNavBar';

export function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [previousTab, setPreviousTab] = useState<NavTab>('home');

  const handleTabSelect = (tab: NavTab) => {
    if (activeTab !== 'ai') {
      setPreviousTab(activeTab);
    }
    setActiveTab(tab);
  };

  const handleCloseAi = () => {
    setActiveTab(previousTab || 'home');
  };

  return (
    <main
      style={{
        width: '100%',
        minHeight: '100vh',
        background: '#0B0B0E',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px 14px',
        boxSizing: 'border-box',
      }}
    >
      {/* ── Single Phone View (جوال واحد ثابت) ── */}
      <div style={{ width: '100%', maxWidth: '566px' }}>
        <PhoneFrame
          showGradient={true}
          bottomNav={
            <BottomNavBar
              activeTab={activeTab}
              onSelectTab={handleTabSelect}
            />
          }
        >
          <div
            key={activeTab}
            className="screen-motion-enter"
            style={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}
          >
            {/* 1. Home Screen (AI Group Vault & Goal) */}
            {activeTab === 'home' && (
              <HomeScreen
                onOpenAiOperator={() => handleTabSelect('ai')}
                onNavigateToCards={() => handleTabSelect('cards')}
              />
            )}

            {/* 2. Market Screen (AI Shopping Assistant & Group Buying) */}
            {activeTab === 'market' && (
              <MarketScreen onOpenAiOperator={() => handleTabSelect('ai')} />
            )}

            {/* 3. The Operator AI Agent Screen */}
            {activeTab === 'ai' && (
              <AiOperatorScreen
                onClose={handleCloseAi}
                onSelectAction={() => {}}
              />
            )}

            {/* 4. Cards Screen (Shared Group Vault Card) */}
            {activeTab === 'cards' && (
              <CardsScreen onAddCard={() => {}} />
            )}

            {/* 5. Members & Goals Screen */}
            {activeTab === 'settings' && (
              <MembersScreen />
            )}
          </div>
        </PhoneFrame>
      </div>
    </main>
  );
}

export default App;
