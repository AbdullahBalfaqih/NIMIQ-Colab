import React from 'react';

interface PhoneFrameProps {
  children: React.ReactNode;
  bottomNav?: React.ReactNode;
  showGradient?: boolean;
}

export const PhoneFrame: React.FC<PhoneFrameProps> = ({
  children,
  bottomNav,
  showGradient = true,
}) => {
  return (
    <div
      style={{
        width: '566px',
        maxWidth: '100%',
        height: '1212px',
        borderRadius: '72px',
        border: 'none',
        background: '#FFFFFF',
        boxShadow: '0 25px 80px rgba(0, 0, 0, 0.55)',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        margin: '0 auto',
      }}
    >
      {/* ── Background Top Orange Gradient (Only when requested) ── */}
      {showGradient && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              'linear-gradient(180deg, #FF5A08 0%, #E35D1B 25%, #D06F3F 35%, #E3A98C 52%, #FFFFFF 67%)',
            zIndex: 0,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* ── Authentic Pixel-Perfect iPhone Status Bar ── */}
      <div
        style={{
          position: 'relative',
          zIndex: 30,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 42px 6px 42px',
          width: '100%',
          boxSizing: 'border-box',
          height: '52px',
        }}
      >
        {/* Left: Time in SF Pro / iOS Style (Shifted slightly right) */}
        <span
          style={{
            color: '#000000',
            fontSize: '16px',
            fontWeight: 700,
            letterSpacing: '-0.2px',
            marginLeft: '24px',
          }}
        >
          9:41
        </span>

        {/* Center: Dynamic Island Pill */}
        <div
          style={{
            width: '126px',
            height: '34px',
            borderRadius: '20px',
            background: '#000000',
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            top: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            paddingRight: '12px',
            boxSizing: 'border-box',
          }}
        >
          {/* Subtle camera lens reflection */}
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '5px',
              background: '#0d101a',
              border: '1px solid #1c2030',
            }}
          />
        </div>

        {/* Right: Authentic iOS Cellular, Wi-Fi & Battery */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {/* 1. Cellular Signal (4 solid rounded bars) */}
          <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
            <rect x="0" y="8.5" width="3.2" height="3.5" rx="0.8" fill="#000000" />
            <rect x="4.8" y="5.8" width="3.2" height="6.2" rx="0.8" fill="#000000" />
            <rect x="9.6" y="3" width="3.2" height="9" rx="0.8" fill="#000000" />
            <rect x="14.4" y="0.5" width="3.2" height="11.5" rx="0.8" fill="#000000" />
          </svg>

          {/* 2. Official iPhone Wi-Fi SVG */}
          <svg width="17" height="12" viewBox="0 0 17 12" fill="#000000">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M8.5 1.2C11.66 1.2 14.54 2.45 16.66 4.47C16.92 4.72 16.92 5.13 16.67 5.39C16.42 5.65 16.01 5.65 15.75 5.4C13.84 3.58 11.27 2.45 8.5 2.45C5.73 2.45 3.16 3.58 1.25 5.4C0.99 5.65 0.58 5.65 0.33 5.39C0.08 5.13 0.08 4.72 0.34 4.47C2.46 2.45 5.34 1.2 8.5 1.2Z"
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M8.5 4.8C10.7 4.8 12.7 5.67 14.17 7.08C14.43 7.33 14.43 7.74 14.18 8C13.93 8.26 13.52 8.26 13.26 8.01C12.01 6.81 10.33 6.05 8.5 6.05C6.67 6.05 4.99 6.81 3.74 8.01C3.48 8.26 3.07 8.26 2.82 8C2.57 7.74 2.57 7.33 2.83 7.08C4.3 5.67 6.3 4.8 8.5 4.8Z"
            />
            <circle cx="8.5" cy="10.4" r="1.4" />
          </svg>

          {/* 3. Official iPhone Battery */}
          <svg width="27" height="13" viewBox="0 0 27 13" fill="none">
            <rect
              x="0.75"
              y="0.75"
              width="22.5"
              height="11.5"
              rx="4"
              stroke="#000000"
              strokeWidth="1.3"
            />
            <rect
              x="2.3"
              y="2.3"
              width="15.5"
              height="8.4"
              rx="2.2"
              fill="#000000"
            />
            <path
              d="M24.7 4.6C25.4 5 25.8 5.7 25.8 6.5C25.8 7.3 25.4 8 24.7 8.4"
              stroke="#000000"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>

      {/* ── Scrollable Screen Content ── */}
      <div
        className="no-scrollbar"
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          padding: '16px 33px 130px 33px',
          overflowY: 'auto',
          boxSizing: 'border-box',
        }}
      >
        {children}
      </div>

      {/* ── Fixed Floating Bottom Navigation Bar ── */}
      {bottomNav && (
        <div
          style={{
            position: 'absolute',
            bottom: '36px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '454px',
            zIndex: 60,
          }}
        >
          {bottomNav}
        </div>
      )}

      {/* ── Bottom Home Indicator Bar ── */}
      <div
        style={{
          width: '196px',
          height: '7px',
          borderRadius: '5px',
          background: '#050505',
          position: 'absolute',
          bottom: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 70,
        }}
      />
    </div>
  );
};
