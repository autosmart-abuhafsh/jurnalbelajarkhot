import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { LogoConfig, TemaConfig } from '../types';

interface LoadingOverlayProps {
  visible: boolean;
  title?: string;
  subtitle?: string;
  lembagaName?: string;
  logoConfig?: LogoConfig;
  temaConfig?: TemaConfig;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  title = 'Memuat Jurnal Akademik...',
  subtitle = 'Menyiapkan data pembelajaran, absensi, dan evaluasi khot santri',
  lembagaName = 'BELAJAR KHOT',
  logoConfig,
  temaConfig,
}) => {
  const prefersReducedMotion = useReducedMotion();

  const primary = temaConfig?.warnaUtama || '#19432D';
  const secondary = temaConfig?.warnaGradasi || '#315B43';
  const accent = temaConfig?.warnaAksen || '#A3D1B3';
  const nibColor = logoConfig?.nibColor || '#E5B84B';
  const symbol = (logoConfig?.arabicSymbol || 'خ').trim() || 'خ';
  const isCustomImage = logoConfig?.mode === 'image' && Boolean(logoConfig?.imageUrl);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="bk-loading-overlay"
          data-testid="loading-overlay"
          role="status"
          aria-live="polite"
          aria-busy="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0.1 : 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 bg-[#FAFCF9]/95 dark:bg-[#0D1510]/95 backdrop-blur-md select-none"
        >
          {/* Ambient radial glow matching theme */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-20 dark:opacity-25"
            style={{
              background: `radial-gradient(circle at 50% 45%, ${accent}40 0%, transparent 58%)`,
            }}
          />

          <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: -6 }}
            transition={{ duration: prefersReducedMotion ? 0.1 : 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex flex-col items-center max-w-sm w-full text-center"
          >
            {/* Geometric Orbital Frame + Central Qalam Crest */}
            <div className="relative w-32 h-32 flex items-center justify-center mb-6">
              {/* Rotating 8-point Rub el Hizb geometric ring */}
              <motion.svg
                viewBox="0 0 120 120"
                fill="none"
                aria-hidden="true"
                className="absolute inset-0 w-full h-full"
                animate={prefersReducedMotion ? undefined : { rotate: 360 }}
                transition={{
                  repeat: Infinity,
                  duration: 20,
                  ease: 'linear',
                }}
              >
                <rect
                  x="22"
                  y="22"
                  width="76"
                  height="76"
                  rx="16"
                  stroke={primary}
                  strokeOpacity="0.22"
                  strokeWidth="1.5"
                />
                <rect
                  x="22"
                  y="22"
                  width="76"
                  height="76"
                  rx="16"
                  transform="rotate(45 60 60)"
                  stroke={nibColor}
                  strokeOpacity="0.4"
                  strokeWidth="1.5"
                />
              </motion.svg>

              {/* Soft breathing ring */}
              <motion.div
                aria-hidden="true"
                className="absolute w-24 h-24 rounded-3xl border"
                style={{ borderColor: `${nibColor}66` }}
                animate={
                  prefersReducedMotion
                    ? undefined
                    : {
                        scale: [1, 1.09, 1],
                        opacity: [0.45, 0.15, 0.45],
                      }
                }
                transition={{
                  repeat: Infinity,
                  duration: 2.2,
                  ease: 'easeInOut',
                }}
              />

              {/* Central Crest Container */}
              <motion.div
                className="relative w-20 h-20 rounded-2xl shadow-lg flex items-center justify-center overflow-hidden border border-white/25"
                style={{
                  background: `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`,
                }}
                animate={
                  prefersReducedMotion
                    ? undefined
                    : {
                        y: [0, -3, 0],
                      }
                }
                transition={{
                  repeat: Infinity,
                  duration: 2.6,
                  ease: 'easeInOut',
                }}
              >
                {isCustomImage ? (
                  <img
                    src={logoConfig!.imageUrl}
                    alt={lembagaName}
                    className="w-full h-full object-contain p-1.5"
                  />
                ) : (
                  <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
                    <rect
                      x="3.5"
                      y="3.5"
                      width="57"
                      height="57"
                      rx="13"
                      stroke="#FFFFFF"
                      strokeOpacity="0.28"
                      strokeWidth="1.2"
                    />
                    <motion.path
                      d="M32 8.5L43.5 25L39.5 44.5H24.5L20.5 25L32 8.5Z"
                      fill="#FFFFFF"
                      fillOpacity="0.08"
                      stroke={nibColor}
                      strokeWidth="2.2"
                      strokeLinejoin="round"
                      initial={prefersReducedMotion ? undefined : { pathLength: 0.15, opacity: 0.7 }}
                      animate={
                        prefersReducedMotion
                          ? undefined
                          : { pathLength: [0.2, 1, 1], opacity: [0.7, 1, 0.85] }
                      }
                      transition={{
                        repeat: Infinity,
                        duration: 2.2,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                    />
                    <line
                      x1="32"
                      y1="9.5"
                      x2="32"
                      y2="20.5"
                      stroke={nibColor}
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                    <circle cx="32" cy="22" r="2" fill={nibColor} />
                    {symbol === 'خ' ? (
                      <g>
                        <polygon points="32,25.2 34.4,27.5 32,29.8 29.6,27.5" fill="#FFFFFF" />
                        <motion.path
                          d="M25.5 33.2C27.5 31.4 31.2 31.2 36.8 32.2C37.6 32.3 37.8 33.3 37 33.7C33.4 35.1 28.2 37.2 28.2 41.2C28.2 44.3 31.8 45.8 36.8 44.3"
                          stroke="#FFFFFF"
                          strokeWidth="3.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          initial={prefersReducedMotion ? undefined : { pathLength: 0 }}
                          animate={prefersReducedMotion ? undefined : { pathLength: [0, 1, 1] }}
                          transition={{
                            repeat: Infinity,
                            duration: 2.2,
                            ease: 'easeInOut',
                          }}
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
                    <path
                      d="M15.5 49C21 46.2 26.8 46.5 32 49.2C37.2 46.5 43 46.2 48.5 49"
                      stroke={accent}
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M21 53C25 50.8 28.8 51 32 53C35.2 51 39 50.8 43 53"
                      stroke={nibColor}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </motion.div>
            </div>

            {/* Brand & Dynamic Status Typography */}
            <p
              className="text-[11px] font-bold tracking-[0.18em] uppercase"
              style={{ color: nibColor }}
            >
              {lembagaName}
            </p>
            <h2 className="mt-1.5 text-lg sm:text-xl font-bold text-[#19432D] dark:text-[#ECF3EE] tracking-tight">
              {title}
            </h2>
            <p className="mt-1 text-xs text-[#6B776D] dark:text-[#A3D1B3]/85 leading-relaxed max-w-xs">
              {subtitle}
            </p>

            {/* Smooth Calligraphic Ink Progress Track (compositor-only transform) */}
            <div className="mt-6 w-52 h-1.5 rounded-full bg-[#E3EAE3] dark:bg-[#1B2B22] overflow-hidden relative">
              <motion.div
                className="absolute inset-y-0 left-0 w-1/2 rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${primary} 0%, ${nibColor} 60%, ${accent} 100%)`,
                }}
                animate={
                  prefersReducedMotion
                    ? { x: '50%' }
                    : {
                        x: ['-100%', '200%'],
                      }
                }
                transition={{
                  repeat: Infinity,
                  duration: 1.35,
                  ease: [0.4, 0, 0.2, 1],
                }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const InlineProcessLoader: React.FC<{
  label?: string;
  primaryColor?: string;
  nibColor?: string;
}> = ({
  label = 'Memproses...',
  primaryColor = '#19432D',
  nibColor = '#E5B84B',
}) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div
      role="status"
      aria-live="polite"
      className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[#F3F7F2] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C] text-xs font-semibold text-[#19432D] dark:text-[#A3D1B3] shrink-0"
    >
      <motion.span
        aria-hidden="true"
        className="w-4 h-4 rounded-md flex items-center justify-center shrink-0"
        style={{ backgroundColor: primaryColor }}
        animate={prefersReducedMotion ? undefined : { rotate: [0, 12, -12, 0] }}
        transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
      >
        <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3">
          <path
            d="M12 3L17 10L15 19H9L7 10L12 3Z"
            stroke={nibColor}
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="10" r="1.2" fill={nibColor} />
        </svg>
      </motion.span>
      <span className="whitespace-nowrap">{label}</span>
    </div>
  );
};
