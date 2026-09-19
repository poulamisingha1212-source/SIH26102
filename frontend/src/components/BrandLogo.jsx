import React from 'react';

/**
 * Jannidhi Portal Brand Logo - Modernized Identity
 * 
 * Follows gstack and UI-UX-Pro-Max Anti-Slop Design Doctrine:
 * - Sovereign Geometric Emblem: 3 Citizen Arch of Unity ("Jan"), Dawn of Transparency,
 *   Sustainable Growth Tri-Leaf Sprout, and Public Treasury Vessel ("Nidhi") with ₹ Glyph.
 * - Colors: Sovereign Sapphire/Navy (#0F172A, #0284C7), Growth Emerald (#0D9488, #10B981),
 *   Dawn Amber Gold (#F59E0B, #FBBF24).
 * - Typography: Satoshi 900 / 600 wordmark reading "Jannidhi Portal", paired with
 *   Devanagari "जननिधि पोर्टल" and JetBrains Mono descriptor.
 * - Scalable pure vector rendering with zero pixelation at any resolution.
 */
export default function BrandLogo({
  className = '',
  size = 'default',
  showTagline = true,
  variant = 'horizontal', // 'horizontal' | 'stacked' | 'icon-only'
}) {
  const isCompact = size === 'compact';
  const isLarge = size === 'large';

  // Standalone Icon Only
  if (variant === 'icon-only') {
    return (
      <div className={`relative inline-flex items-center justify-center select-none ${className}`}>
        <EmblemIcon isCompact={isCompact} isLarge={isLarge} />
      </div>
    );
  }

  // Stacked Layout (e.g. for modals, centered headers, documents)
  if (variant === 'stacked') {
    return (
      <div
        className={`flex flex-col items-center text-center select-none group ${className}`}
        role="img"
        aria-label="Jannidhi Portal - National Public Fund Sentinel"
      >
        <div className="relative mb-3">
          <div className="absolute -inset-1.5 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-sky-500/15 to-emerald-500/20 blur-xs opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          <EmblemIcon isCompact={false} isLarge={true} />
        </div>

        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5 leading-none">
            <span className="font-['Satoshi',sans-serif] font-black tracking-[-0.03em] text-2xl text-slate-900 dark:text-white">
              Jan<span className="text-teal-600 dark:text-teal-400">nidhi</span>
            </span>
            <span className="font-['Satoshi',sans-serif] font-medium tracking-[-0.02em] text-2xl text-slate-700 dark:text-slate-200 ml-1">
              Portal
            </span>
          </div>

          <span className="mt-2 inline-flex items-center px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/25 text-[11px] font-bold text-amber-700 dark:text-amber-300 font-['DM_Sans',sans-serif]">
            जननिधि पोर्टल
          </span>

          {showTagline && (
            <span className="mt-2 font-mono text-[9.5px] font-bold tracking-[0.14em] text-slate-500 dark:text-slate-400 uppercase">
              NATIONAL PUBLIC FUND SENTINEL • MoSPI
            </span>
          )}
        </div>
      </div>
    );
  }

  // Default Horizontal Primary Layout
  return (
    <div
      className={`inline-flex items-center gap-2.5 sm:gap-3.5 select-none transition-all duration-200 group ${className}`}
      role="img"
      aria-label="Jannidhi Portal - National Public Fund Sentinel"
    >
      {/* Precision Vector Emblem Roundel */}
      <div className="relative shrink-0 flex items-center justify-center">
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-sky-500/15 to-emerald-500/20 blur-xs opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        <EmblemIcon isCompact={isCompact} isLarge={isLarge} />
      </div>

      {/* Brand Wordmark & Official Metadata */}
      <div className="flex flex-col justify-center">
        {/* Main Tier: Jannidhi Portal + Devanagari Badge */}
        <div className="flex items-center gap-1.5 sm:gap-2 leading-none">
          <span className={`font-['Satoshi',sans-serif] tracking-[-0.03em] text-slate-900 dark:text-white transition-colors ${
            isCompact ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl'
          }`}>
            <span className="font-black">Jan</span>
            <span className="font-black text-teal-600 dark:text-teal-400">nidhi</span>
            <span className="font-medium text-slate-700 dark:text-slate-200 ml-1.5">Portal</span>
          </span>

          {/* Devanagari Complementary Pill */}
          <span className="hidden xs:inline-flex items-center px-1.5 py-0.5 rounded-sm bg-amber-500/10 border border-amber-500/25 text-[10px] sm:text-[11px] font-bold text-amber-700 dark:text-amber-300 font-['DM_Sans',sans-serif] tracking-wide">
            जननिधि पोर्टल
          </span>
        </div>

        {/* Subtitle Tier: MPLADS AI Sentinel • MoSPI */}
        {showTagline && (
          <div className="flex items-center gap-1.5 mt-0.5 sm:mt-1">
            {/* National Tricolor Mini Bar */}
            <div className="hidden xs:flex flex-col gap-0.5 shrink-0 opacity-80" aria-hidden="true">
              <span className="w-1.5 h-0.5 rounded-xs bg-[#F59E0B]" />
              <span className="w-1.5 h-0.5 rounded-xs bg-slate-300 dark:bg-slate-500" />
              <span className="w-1.5 h-0.5 rounded-xs bg-[#10B981]" />
            </div>

            <span className="font-mono text-[9px] sm:text-[9.5px] font-bold tracking-[0.14em] text-slate-500 dark:text-slate-400 uppercase whitespace-nowrap">
              MPLADS AI SENTINEL
            </span>

            <span className="text-slate-300 dark:text-slate-600 text-[10px]" aria-hidden="true">•</span>

            <span className="font-['Satoshi',sans-serif] text-[9.5px] sm:text-[10px] font-extrabold text-blue-700 dark:text-blue-400 tracking-wide uppercase whitespace-nowrap">
              MoSPI
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Modernized Vector Emblem Icon
 */
function EmblemIcon({ isCompact = false, isLarge = false }) {
  const dimension = isCompact ? 'w-8 h-8' : isLarge ? 'w-14 h-14' : 'w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11';

  return (
    <svg
      viewBox="0 0 64 64"
      className={`${dimension} drop-shadow-xs transition-transform duration-200 group-hover:scale-[1.04] shrink-0`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="emblemBgGradMod" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0F172A" />
          <stop offset="60%" stopColor="#0B132B" />
          <stop offset="100%" stopColor="#030712" />
        </linearGradient>

        <linearGradient id="emblemBorderMod" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.9" />
          <stop offset="35%" stopColor="#D97706" stopOpacity="0.6" />
          <stop offset="70%" stopColor="#0284C7" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#10B981" stopOpacity="0.9" />
        </linearGradient>

        <linearGradient id="sunDawnMod" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.3" />
          <stop offset="60%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#FDE047" />
        </linearGradient>

        <linearGradient id="citizensArchMod" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="40%" stopColor="#38BDF8" />
          <stop offset="80%" stopColor="#2DD4BF" />
          <stop offset="100%" stopColor="#34D399" />
        </linearGradient>

        <linearGradient id="sproutGradMod" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="100%" stopColor="#34D399" />
        </linearGradient>

        <linearGradient id="nidhiVesselMod" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0284C7" />
          <stop offset="50%" stopColor="#0369A1" />
          <stop offset="100%" stopColor="#0F766E" />
        </linearGradient>

        <radialGradient id="centerAuraMod" cx="50%" cy="45%" r="45%">
          <stop offset="0%" stopColor="#0284C7" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#0284C7" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Squircle Base Frame */}
      <rect
        x="2"
        y="2"
        width="60"
        height="60"
        rx="15"
        fill="url(#emblemBgGradMod)"
        stroke="url(#emblemBorderMod)"
        strokeWidth="1.5"
      />

      {/* Ambient Internal Glow */}
      <circle cx="32" cy="30" r="22" fill="url(#centerAuraMod)" />

      {/* Modern Centered Emblem Coordinates */}
      <g transform="translate(32, 32) scale(0.92) translate(-35, -35)">
        {/* 1. Solar Corona (5 Precision Beams) */}
        <g stroke="url(#sunDawnMod)" strokeLinecap="round">
          <line x1="35" y1="16" x2="35" y2="10" strokeWidth="2.4" />
          <line x1="28" y1="17.5" x2="22.5" y2="12" strokeWidth="2.0" />
          <line x1="42" y1="17.5" x2="47.5" y2="12" strokeWidth="2.0" />
          <line x1="22.5" y1="21" x2="15.5" y2="17.5" strokeWidth="1.8" />
          <line x1="47.5" y1="21" x2="54.5" y2="17.5" strokeWidth="1.8" />
        </g>

        {/* 2. Three Citizens ("Jan") */}
        <circle cx="35" cy="18.5" r="4" fill="#38BDF8" stroke="#0B132B" strokeWidth="0.8" />
        <circle cx="23" cy="24" r="3.4" fill="#60A5FA" stroke="#0B132B" strokeWidth="0.8" />
        <circle cx="47" cy="24" r="3.4" fill="#34D399" stroke="#0B132B" strokeWidth="0.8" />

        {/* Protective Civic Arch */}
        <path
          d="M 16.5 33.5 C 16.5 26.5, 24 23.5, 35 23.5 C 46 23.5, 53.5 26.5, 53.5 33.5 C 49 29.5, 43 27.2, 35 27.2 C 27 27.2, 21 29.5, 16.5 33.5 Z"
          fill="url(#citizensArchMod)"
        />

        {/* 3. Sprouting Growth Leaves */}
        <path d="M 35 27.5 C 32.5 33, 33.5 38.5, 35 40.5 C 36.5 38.5, 37.5 33, 35 27.5 Z" fill="url(#sproutGradMod)" />
        <path d="M 33.5 36.5 C 28 33.5, 24 33.5, 22 35.5 C 25 39, 29.5 39.5, 33.5 37.5 Z" fill="#34D399" />
        <path d="M 36.5 36.5 C 42 33.5, 46 33.5, 48 35.5 C 45 39, 40.5 39.5, 36.5 37.5 Z" fill="#10B981" />

        {/* 4. Treasury Vessel ("Nidhi") */}
        <ellipse cx="35" cy="40.5" rx="16.5" ry="2.2" fill="#38BDF8" fillOpacity="0.5" stroke="#38BDF8" strokeWidth="0.8" />
        <path
          d="M 18.5 41 C 18.5 52, 51.5 52, 51.5 41 C 51.5 40, 18.5 40, 18.5 41 Z"
          fill="url(#nidhiVesselMod)"
          stroke="#38BDF8"
          strokeWidth="0.8"
        />
        <path d="M 27.5 52 L 42.5 52 L 40 55 L 30 55 Z" fill="#0369A1" />

        {/* 5. Indian Rupee Symbol (₹) */}
        <g transform="translate(35, 46.5) scale(0.62)">
          <line x1="-5.5" y1="-5" x2="5.5" y2="-5" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
          <line x1="-5.5" y1="-2" x2="3.8" y2="-2" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
          <path
            d="M -1.8 -5 L -1.8 1 C 1.8 1, 4.4 0, 4.4 -2 C 4.4 -3.8, 2.2 -4.8, -1.8 -4.8"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line x1="-0.8" y1="0.5" x2="4.5" y2="6.5" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
        </g>
      </g>

      {/* Sentinel Micro Dots */}
      <circle cx="8" cy="8" r="1.2" fill="#F59E0B" opacity="0.8" />
      <circle cx="56" cy="8" r="1.2" fill="#10B981" opacity="0.8" />
      <circle cx="56" cy="56" r="1.2" fill="#38BDF8" opacity="0.8" />
      <circle cx="8" cy="56" r="1.2" fill="#F59E0B" opacity="0.8" />
    </svg>
  );
}
