import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  subtitle?: string;
  className?: string;
  variant?: 'default' | 'light' | 'print';
}

export const LogoBelajarKhot: React.FC<LogoProps> = ({
  size = 'md',
  showText = true,
  subtitle = 'Jurnal Akademik',
  className = '',
  variant = 'default',
}) => {
  const dimensions = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  }[size];

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

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      <div
        className={`${dimensions} relative flex items-center justify-center rounded-xl bg-[#19432D] text-[#A3D1B3] shadow-sm border border-[#315B43] shrink-0`}
        aria-hidden="true"
      >
        {/* Islamic Rub el Hizb 8-pointed star geometric frame + Qalam nib + Arabic Khaa (خ) monogram */}
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full p-1.5"
        >
          {/* Outer Octagram (Geometric Islamic Star) */}
          <rect
            x="12"
            y="12"
            width="40"
            height="40"
            rx="3"
            stroke="#A3D1B3"
            strokeWidth="2"
            strokeOpacity="0.45"
          />
          <rect
            x="12"
            y="12"
            width="40"
            height="40"
            rx="3"
            transform="rotate(45 32 32)"
            stroke="#A3D1B3"
            strokeWidth="2"
          />
          {/* Subtle Qalam Pen Nib Diagonal Accent */}
          <path
            d="M44 16L48 20L24 44L18 46L20 40L44 16Z"
            fill="#315B43"
            stroke="#A3D1B3"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          {/* Arabic Letter Khaa (خ) Calligraphic Monogram in Center */}
          <text
            x="32"
            y="39"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="24"
            fontWeight="700"
            fontFamily="serif"
          >
            خ
          </text>
          {/* Diamond Nuqthah (Mizan Dot of Khaa) */}
          <polygon points="32,17 35,20 32,23 29,20" fill="#A3D1B3" />
        </svg>
      </div>
      {showText && (
        <div className="flex flex-col leading-tight">
          <span className={`font-bold tracking-tight whitespace-nowrap ${textColors} ${size === 'xl' ? 'text-xl' : size === 'lg' ? 'text-lg' : 'text-base'}`}>
            BELAJAR KHOT
          </span>
          {subtitle && (
            <span className={`text-xs font-medium whitespace-nowrap ${subTextColors}`}>
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
