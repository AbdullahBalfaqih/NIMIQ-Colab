import React, { useState } from 'react';
import { ShieldAlert, ShieldCheck, Eye, KeyRound } from 'lucide-react';

interface CardsScreenProps {
  onAddCard?: () => void;
}

export const CardsScreen: React.FC<CardsScreenProps> = ({ onAddCard }) => {
  const [selectedTab, setSelectedTab] = useState<'personal' | 'team'>('personal');
  const [isBlocked, setIsBlocked] = useState(false);
  const [showPin, setShowPin] = useState(false);

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* ── Top Header ── */}
      <div
        style={{
          display: 'flex',
          width: '100%',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: '67px',
        }}
      >
        <h1
          style={{
            color: '#FFFFFF',
            fontSize: '33px',
            fontWeight: 600,
            lineHeight: 1,
            margin: 0,
          }}
        >
          Cards
        </h1>

        {/* Plus / Add Card Button */}
        <button
          onClick={onAddCard}
          style={{
            display: 'flex',
            width: '67px',
            height: '67px',
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: '33.5px',
            border: '1px solid rgba(255, 255, 255, 0.35)',
            color: '#FFFFFF',
            fontSize: '31px',
            lineHeight: 1,
          }}
          title="Add"
        >
          +
        </button>
      </div>

      {/* ── Segmented Tab Selector ("Your cards" vs "Team cards") ── */}
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '67px',
          borderRadius: '35px',
          border: '1px solid rgba(255, 255, 255, 0.24)',
          background: 'rgba(255, 255, 255, 0.13)',
          boxSizing: 'border-box',
        }}
      >
        <button
          onClick={() => setSelectedTab('personal')}
          style={{
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: '35px',
            background: selectedTab === 'personal' ? '#171717' : 'transparent',
            boxShadow: selectedTab === 'personal' ? '0 0 10px 0 #444444 inset' : 'none',
            color: '#FFFFFF',
            fontSize: '21px',
            fontWeight: 600,
          }}
        >
          Your cards
        </button>

        <button
          onClick={() => setSelectedTab('team')}
          style={{
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: '35px',
            background: selectedTab === 'team' ? '#171717' : 'transparent',
            boxShadow: selectedTab === 'team' ? '0 0 10px 0 #444444 inset' : 'none',
            color: '#FFFFFF',
            fontSize: '21px',
            fontWeight: 600,
          }}
        >
          Team cards
        </button>
      </div>

      {/* ── Virtual Card Display (Sleek Luxury Black Card) ── */}
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '286px',
          padding: '26px 28px',
          flexDirection: 'column',
          justifyContent: 'space-between',
          borderRadius: '36px',
          background: 'linear-gradient(135deg, #1D1E22 0%, #0E0F12 100%)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          boxShadow: '0 22px 48px rgba(0, 0, 0, 0.5)',
          position: 'relative',
          overflow: 'hidden',
          boxSizing: 'border-box',
          filter: isBlocked ? 'grayscale(0.85)' : 'none',
        }}
      >
        {/* Subtle Luxury Gloss Shimmer Effect */}
        <div
          style={{
            position: 'absolute',
            top: '-50%',
            right: '-20%',
            width: '280px',
            height: '280px',
            background: 'radial-gradient(circle, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0) 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Brand Header */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', position: 'relative', zIndex: 2 }}>
          <span
            style={{
              color: '#FFFFFF',
              fontSize: '28px',
              fontWeight: 700,
              letterSpacing: '-0.5px',
            }}
          >
            NColab
          </span>
        </div>

        {/* Balance Section */}
        <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 2 }}>
          <span
            style={{
              color: 'rgba(255, 255, 255, 0.65)',
              fontSize: '18px',
              fontWeight: 400,
            }}
          >
            Your balance
          </span>
          <span
            style={{
              color: '#FFFFFF',
              fontSize: '38px',
              fontWeight: 600,
              marginTop: '4px',
              letterSpacing: '-0.5px',
            }}
          >
            $145.00
          </span>
        </div>

        {/* Card Number & Mastercard Logo */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            width: '100%',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <div
            style={{
              color: 'rgba(255, 255, 255, 0.85)',
              fontSize: '19px',
              fontWeight: 500,
              letterSpacing: '1px',
            }}
          >
            •••• •••• 43267
          </div>

          {/* Mastercard interlocking circles */}
          <div style={{ display: 'flex', position: 'relative', width: '93px', height: '55px' }}>
            <div
              style={{
                width: '55px',
                height: '55px',
                borderRadius: '27.5px',
                background: '#FF3B30',
                position: 'absolute',
                left: 0,
              }}
            />
            <div
              style={{
                width: '55px',
                height: '55px',
                borderRadius: '27.5px',
                background: '#FFB300',
                position: 'absolute',
                left: '38px',
                opacity: 0.95,
              }}
            />
          </div>
        </div>
      </div>

      {/* ── 3 Action Buttons (Block, Details, PIN) ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          gap: '10px',
          width: '100%',
          height: '78px',
        }}
      >
        {/* Button 1: Block */}
        <button
          onClick={() => setIsBlocked(!isBlocked)}
          style={{
            display: 'flex',
            flex: 1,
            height: '78px',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '12px',
            borderRadius: '40px',
            background: isBlocked ? '#FFEBEB' : '#FFFFFF',
            boxShadow: '0 4px 12px 0 #E8E8E8',
          }}
        >
          <div
            style={{
              display: 'flex',
              width: '52px',
              height: '52px',
              justifyContent: 'center',
              alignItems: 'center',
              flexShrink: 0,
              borderRadius: '26px',
              border: '1px solid #EAEAEA',
              background: '#FAFAFA',
              color: isBlocked ? '#DD2222' : '#111111',
            }}
          >
            {isBlocked ? (
              <ShieldCheck size={24} strokeWidth={1.8} color="#DD2222" />
            ) : (
              <ShieldAlert size={24} strokeWidth={1.8} color="#111111" />
            )}
          </div>
          <span
            style={{
              color: isBlocked ? '#DD2222' : '#111111',
              fontSize: '20px',
              fontWeight: 400,
            }}
          >
            {isBlocked ? 'Blocked' : 'Block'}
          </span>
        </button>

        {/* Button 2: Details */}
        <button
          style={{
            display: 'flex',
            flex: 1,
            height: '78px',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '12px',
            borderRadius: '40px',
            background: '#FFFFFF',
            boxShadow: '0 4px 12px 0 #E8E8E8',
          }}
        >
          <div
            style={{
              display: 'flex',
              width: '52px',
              height: '52px',
              justifyContent: 'center',
              alignItems: 'center',
              flexShrink: 0,
              borderRadius: '26px',
              border: '1px solid #EAEAEA',
              background: '#FAFAFA',
              color: '#111111',
            }}
          >
            <Eye size={24} strokeWidth={1.8} color="#111111" />
          </div>
          <span
            style={{
              color: '#111111',
              fontSize: '20px',
              fontWeight: 400,
            }}
          >
            Details
          </span>
        </button>

        {/* Button 3: PIN */}
        <button
          onClick={() => setShowPin(!showPin)}
          style={{
            display: 'flex',
            flex: 1,
            height: '78px',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '12px',
            borderRadius: '40px',
            background: '#FFFFFF',
            boxShadow: '0 4px 12px 0 #E8E8E8',
          }}
        >
          <div
            style={{
              display: 'flex',
              width: '52px',
              height: '52px',
              justifyContent: 'center',
              alignItems: 'center',
              flexShrink: 0,
              borderRadius: '26px',
              border: '1px solid #EAEAEA',
              background: '#FAFAFA',
              color: '#111111',
            }}
          >
            <KeyRound size={24} strokeWidth={1.8} color="#111111" />
          </div>
          <span
            style={{
              color: '#111111',
              fontSize: '20px',
              fontWeight: 400,
            }}
          >
            {showPin ? '7291' : 'Pin'}
          </span>
        </button>
      </div>

      {/* ── Add to Apple Wallet Button ── */}
      <button
        style={{
          display: 'flex',
          width: '100%',
          height: '64px',
          justifyContent: 'center',
          alignItems: 'center',
          borderRadius: '33px',
          border: '1px solid #3B3B3B',
          background: '#151515',
          color: '#FFFFFF',
          fontSize: '23px',
          fontWeight: 500,
        }}
      >
        Add to Apple Wallet
      </button>

      {/* ── Payment Limits Card ── */}
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '199px',
          padding: '24px',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: '10px',
          borderRadius: '30px',
          background: '#FFFFFF',
          boxShadow: '0 3px 14px 0 #EEEEEE',
          boxSizing: 'border-box',
        }}
      >
        <span
          style={{
            color: '#111111',
            fontSize: '21px',
            fontWeight: 700,
          }}
        >
          Payment limits　›
        </span>

        {/* Monthly Progress Row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            marginTop: '16px',
          }}
        >
          <span
            style={{
              color: '#111111',
              fontSize: '15px',
              fontWeight: 700,
            }}
          >
            Monthly
          </span>
          <span
            style={{
              color: '#111111',
              fontSize: '15px',
              fontWeight: 700,
            }}
          >
            $145 / $200
          </span>
        </div>

        {/* Progress Bar */}
        <div
          style={{
            width: '100%',
            height: '11px',
            borderRadius: '8px',
            background: '#EEEEEE',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: '72.5%',
              height: '11px',
              borderRadius: '8px',
              background: '#FF5A08',
            }}
          />
        </div>

        {/* Available this month */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            marginTop: '2px',
          }}
        >
          <span
            style={{
              color: '#555555',
              fontSize: '14px',
              fontWeight: 400,
            }}
          >
            Available this month
          </span>
          <span
            style={{
              color: '#555555',
              fontSize: '14px',
              fontWeight: 400,
            }}
          >
            $55.00
          </span>
        </div>
      </div>
    </div>
  );
};
