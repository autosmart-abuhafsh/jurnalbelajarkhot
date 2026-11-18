import React from 'react';
import { useApp } from '../context/AppContext';
import { LogoConfig, TemaConfig } from '../types';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  title?: string;
  subtitle?: string;
  className?: string;
  variant?: 'default' | 'light' | 'print';
  overrideLogoConfig?: LogoConfig;
  overrideTemaConfig?: TemaConfig;
}

export const LogoBelajarKhot: React.FC<LogoProps> = ({
  size = 'md',
  showText = true,
  title,
  subtitle = 'Jurnal Akademik',
  className = '',
  variant = 'default',
  overrideLogoConfig,
  overrideTemaConfig,
}) => {
  const { db } = useApp();

  const logoCfg: LogoConfig = overrideLogoConfig ||
    db.pengaturan.logoConfig || {
      mode: 'vector',
      imageUrl: '',
      arabicSymbol: 'خ',
      nibColor: '#E5B84B',
      showStarAndBook: true,
      frameShape: 'rounded',
    };

  const temaCfg: TemaConfig = overrideTemaConfig ||
    db.pengaturan.temaConfig || {
      presetId: 'hijau-hutan',
      warnaUtama: '#19432D',
      warnaGradasi: '#315B43',
      warnaAksen: '#A3D1B3',
    };

  const displayTitle = title || db.pengaturan.namaLembaga || 'BELAJAR KHOT';

  const dimensions = {
    sm: 'w-9 h-9',
    md: 'w-11 h-11',
    lg: 'w-13 h-13',
    xl: 'w-16 h-16',
  }[size];

  const shapeClass =
    logoCfg.frameShape === 'circle'
      ? 'rounded-full'
      : logoCfg.frameShape === 'square'
      ? 'rounded-lg'
      : 'rounded-2xl';

  const textColors = {
    default: 'text-[#19432D] dark:text-[#ECF3EE]',
    light: 'text-white',
    print: 'text-[#19432D]',
  }[variant];

  const subTextColors = {
    default: 'text-[#6B776D] dark:text-[#A3D1B3]',
    light: 'text-[#A3D1B3]',
    print: 'text-[#315B43]',
  }[variant];

  const nibStroke = logoCfg.nibColor || '#E5B84B';
  const showOrnament = logoCfg.showStarAndBook !== false;
  const symbol = (logoCfg.arabicSymbol || 'خ').trim() || 'خ';
  const isCustomImage = logoCfg.mode === 'image' && Boolean(logoCfg.imageUrl);

  return (
    <div className={`inline-flex items-center gap-3 select-none min-w-0 ${className}`}>
      <div
        className={`${dimensions} ${shapeClass} relative flex items-center justify-center shadow-sm shrink-0 overflow-hidden border border-white/20`}
        style={{
          background: `linear-gradient(135deg, ${temaCfg.warnaUtama} 0%, ${temaCfg.warnaGradasi} 100%)`,
        }}
        aria-hidden="true"
      >
        {isCustomImage ? (
          <img
            src={logoCfg.imageUrl}
            alt={displayTitle}
            className="w-full h-full object-contain p-0.5"
          />
        ) : (
          /* First Logo Design: Upright Golden Qalam Nib + Faint Rub el Hizb + Calligraphic Khaa (خ) + Open Kitab */
          <svg
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full"
          >
            {/* Outer Subtle Inner Rim */}
            <rect
              x="3.5"
              y="3.5"
              width="57"
              height="57"
              rx={logoCfg.frameShape === 'circle' ? 28.5 : logoCfg.frameShape === 'square' ? 6 : 13}
              stroke="#FFFFFF"
              strokeOpacity="0.28"
              strokeWidth="1.2"
            />

            {/* Background Rub el Hizb 8-Pointed Geometric Star */}
            {showOrnament && (
              <g opacity="0.22">
                <rect
                  x="15"
                  y="13"
                  width="34"
                  height="34"
                  rx="4"
                  stroke="#FFFFFF"
                  strokeWidth="1.4"
                />
                <rect
                  x="15"
                  y="13"
                  width="34"
                  height="34"
                  rx="4"
                  transform="rotate(45 32 30)"
                  stroke="#FFFFFF"
                  strokeWidth="1.4"
                />
              </g>
            )}

            {/* Upright Golden Qalam / Fountain Pen Nib */}
            <path
              d="M32 8.5L43.5 25L39.5 44.5H24.5L20.5 25L32 8.5Z"
              fill="#FFFFFF"
              fillOpacity="0.08"
              stroke={nibStroke}
              strokeWidth="2.2"
              strokeLinejoin="round"
            />

            {/* Pen Nib Vertical Slit & Breather Hole */}
            <line
              x1="32"
              y1="9.5"
              x2="32"
              y2="20.5"
              stroke={nibStroke}
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <circle cx="32" cy="22" r="2" fill={nibStroke} />

            {/* Center Calligraphic Arabic Letter Khaa (خ) or Custom Monogram */}
            {symbol === 'خ' ? (
              <g>
                {/* Diamond Nuqthah (Mizan Dot) */}
                <polygon points="32,25.2 34.4,27.5 32,29.8 29.6,27.5" fill="#FFFFFF" />
                {/* Precision Calligraphic Khaa (خ) Stroke matching First Logo */}
                <path
                  d="M25.5 33.2C27.5 31.4 31.2 31.2 36.8 32.2C37.6 32.3 37.8 33.3 37 33.7C33.4 35.1 28.2 37.2 28.2 41.2C28.2 44.3 31.8 45.8 36.8 44.3"
                  stroke="#FFFFFF"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            ) : (
              <text
                x="32"
                y="39"
                textAnchor="middle"
                fill="#FFFFFF"
                fontSize="20"
                fontWeight="700"
                fontFamily="serif"
              >
                {symbol}
              </text>
            )}

            {/* Open Kitab / Book Pages at Base */}
            {showOrnament && (
              <g>
                {/* Upper Open Pages (Light Accent / White) */}
                <path
                  d="M15.5 49C21 46.2 26.8 46.5 32 49.2C37.2 46.5 43 46.2 48.5 49"
                  stroke={temaCfg.warnaAksen || '#FFFFFF'}
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Lower Golden Book Cover Spine */}
                <path
                  d="M21 53C25 50.8 28.8 51 32 53C35.2 51 39 50.8 43 53"
                  stroke={nibStroke}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            )}
          </svg>
        )}
      </div>

      {showText && (
        <div className="flex flex-col leading-tight min-w-0">
          <span
            className={`font-bold tracking-tight truncate ${textColors} ${
              size === 'xl' ? 'text-xl' : size === 'lg' ? 'text-lg' : 'text-sm sm:text-base'
            }`}
          >
            {displayTitle}
          </span>
          {subtitle && (
            <span className={`text-[11px] sm:text-xs font-medium truncate ${subTextColors}`}>
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
