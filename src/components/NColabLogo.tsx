import React from 'react';

interface NColabLogoProps {
  height?: number;
  textColor?: string;
  iconColor?: string;
}

export const NColabLogo: React.FC<NColabLogoProps> = ({
  height = 32,
  textColor = '#FFFFFF',
  iconColor = '#FFFFFF',
}) => {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '9px',
        userSelect: 'none',
        height: `${height}px`,
      }}
    >
      {/* Geometric Monogram Icon matching Finova style */}
      <svg
        width={Math.round(height * 1.05)}
        height={height}
        viewBox="0 0 38 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        {/* Top geometric tab */}
        <path
          d="M2 7.5C2 4.46 4.46 2 7.5 2H22L15.5 12.5H7.5C4.46 12.5 2 10.04 2 7.5Z"
          fill={iconColor}
        />
        {/* Bottom geometric tab */}
        <path
          d="M16 19.5L22.5 30H30.5C33.54 30 36 27.54 36 24.5C36 21.46 33.54 19.5 30.5 19.5H16Z"
          fill={iconColor}
        />
        {/* Angled Connecting Slash forming the 'N' */}
        <polygon points="12.5,4 20,4 12,28 4.5,28" fill={iconColor} />
      </svg>

      {/* Bold Modern NColab Typography */}
      <span
        style={{
          color: textColor,
          fontSize: `${Math.round(height * 0.76)}px`,
          fontWeight: 800,
          fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          letterSpacing: '-0.6px',
          lineHeight: 1,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        NColab
      </span>
    </div>
  );
};
