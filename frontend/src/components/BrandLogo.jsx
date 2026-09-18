import React from 'react';

/**
 * JanNidhi Brand Logo
 * 
 * Follows gstack and UI-UX-Pro-Max Anti-Slop Design Doctrine:
 * - Geometric squircle seal with 3-citizen unity arch ("Jan"),
 *   growth sprout leaves, and the Nidhi public treasury vessel with ₹ glyph.
 * - Saffron-to-emerald tricolor accents with deep India navy authority base.
 * - Satoshi 900 typography paired with Devanagari "जन निधि" and JetBrains Mono descriptor.
 * - Pure scalable vector rendering for zero-latency, razor-sharp HiDPI display.
 */
export default function BrandLogo({ className = '', size = 'default', showTagline = true }) {
  const isCompact = size === 'compact';

  return (
    <div
      className={`inline-flex items-center gap-2.5 sm:gap-3 select-none transition-all duration-200 group ${className}`}
      role="img"
      aria-label="JanNidhi - National MPLADS AI Sentinel Portal"
    >
      {/* Precision Vector Emblem Roundel / Squircle */}
      <div className="relative shrink-0 flex items-center justify-center">
        {/* Subtle Ambient Hover Glow */}
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-sky-500/15 to-emerald-500/20 blur-xs opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        
        <svg
          viewBox="0 0 64 64"
          className={`${
            isCompact ? 'w-8 h-8' : 'w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11'
          } drop-shadow-xs transition-transform duration-200 group-hover:scale-[1.04]`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="emblemBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0F172A" />
              <stop offset="60%" stopColor="#0B132B" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            <linearGradient id="emblemRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.9" />
              <stop offset="35%" stopColor="#D97706" stopOpacity="0.6" />
              <stop offset="70%" stopColor="#0284C7" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.9" />
            </linearGradient>

            <linearGradient id="sunDawnGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#FBBF24" stopOpacity="1" />
            </linearGradient>

            <linearGradient id="citizensArchGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0284C7" />
              <stop offset="50%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>

            <linearGradient id="nidhiVesselGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0369A1" />
              <stop offset="60%" stopColor="#0284C7" />
              <stop offset="100%" stopColor="#0F766E" />
            </linearGradient>

            <radialGradient id="centerAura" cx="50%" cy="45%" r="45%">
              <stop offset="0%" stopColor="#0284C7" stopOpacity="0.3" />
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
            fill="url(#emblemBgGrad)"
            stroke="url(#emblemRingGrad)"
            strokeWidth="1.5"
          />

          {/* Ambient Internal Glow */}
          <circle cx="32" cy="30" r="22" fill="url(#centerAura)" />

          {/* Solar Corona / Rays of Transparency */}
          <g className="transition-transform duration-300 group-hover:scale-105 origin-center">
            <line x1="32" y1="16" x2="32" y2="10" stroke="url(#sunDawnGrad)" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="26" y1="18" x2="20" y2="12" stroke="url(#sunDawnGrad)" strokeWidth="1.6" strokeLinecap="round" />
            <line x1="21" y1="21.5" x2="14" y2="17.5" stroke="url(#sunDawnGrad)" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="18" y1="26" x2="10" y2="25" stroke="url(#sunDawnGrad)" strokeWidth="1.4" strokeLinecap="round" />
            <line x1="38" y1="18" x2="44" y2="12" stroke="url(#sunDawnGrad)" strokeWidth="1.6" strokeLinecap="round" />
            <line x1="43" y1="21.5" x2="50" y2="17.5" stroke="url(#sunDawnGrad)" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="46" y1="26" x2="54" y2="25" stroke="url(#sunDawnGrad)" strokeWidth="1.4" strokeLinecap="round" />
          </g>

          {/* 3 Citizen Guardians ("Jan") */}
          <circle cx="32" cy="18.5" r="3.4" fill="#38BDF8" stroke="#0B132B" strokeWidth="0.8" />
          <circle cx="21" cy="23.5" r="2.9" fill="#60A5FA" stroke="#0B132B" strokeWidth="0.8" />
          <circle cx="43" cy="23.5" r="2.9" fill="#34D399" stroke="#0B132B" strokeWidth="0.8" />

          {/* Protective Civic Arch */}
          <path
            d="M 16 31.5 C 16 26.5, 23 23.5, 32 23.5 C 41 23.5, 48 26.5, 48 31.5 C 44 28.2, 39 26.6, 32 26.6 C 25 26.6, 20 28.2, 16 31.5 Z"
            fill="url(#citizensArchGrad)"
            opacity="0.95"
          />

          {/* Sprouting Growth Leaves */}
          <path d="M 31 35.5 C 26 32.5, 23 32.5, 21 34.5 C 23.5 38, 27.5 38.5, 31 36.5 Z" fill="#10B981" />
          <path d="M 33 35.5 C 38 32.5, 41 32.5, 43 34.5 C 40.5 38, 36.5 38.5, 33 36.5 Z" fill="#059669" />
          <path d="M 32 27.5 C 29.5 32.5, 30.5 37.5, 32 39 C 33.5 37.5, 34.5 32.5, 32 27.5 Z" fill="#34D399" />

          {/* Treasury Vessel ("Nidhi") */}
          <path
            d="M 18 39.5 C 18 48.5, 46 48.5, 46 39.5 C 46 38.5, 18 38.5, 18 39.5 Z"
            fill="url(#nidhiVesselGrad)"
            stroke="#38BDF8"
            strokeWidth="0.8"
          />
          <ellipse cx="32" cy="39.2" rx="14" ry="1.8" fill="#38BDF8" opacity="0.6" />
          <path d="M 26 48.5 L 38 48.5 L 36 51.5 L 28 51.5 Z" fill="#0369A1" />

          {/* Indian Rupee Symbol (₹) */}
          <g transform="translate(32, 44.8) scale(0.65)">
            <line x1="-5.5" y1="-5.5" x2="5.5" y2="-5.5" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="-5.5" y1="-2.5" x2="4" y2="-2.5" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" />
            <path
              d="M -1.8 -5.5 L -1.8 1 C 2 1, 4.8 0, 4.8 -2 C 4.8 -4, 2.5 -5, -1.8 -5"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <line x1="-0.8" y1="0.5" x2="4.5" y2="6.5" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
          </g>
        </svg>
      </div>

      {/* Brand Wordmark & Metadata */}
      <div className="flex flex-col justify-center">
        {/* Top Tier: JanNidhi + Devanagari Pill */}
        <div className="flex items-center gap-1.5 sm:gap-2 leading-none">
          <span className="font-['Satoshi',sans-serif] font-black tracking-[-0.03em] text-lg sm:text-xl md:text-2xl text-slate-900 dark:text-white transition-colors">
            Jan<span className="text-emerald-600 dark:text-emerald-400">Nidhi</span>
          </span>

          {/* Devanagari Script Complement */}
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm bg-amber-500/10 border border-amber-500/25 text-[10px] sm:text-[11px] font-bold text-amber-700 dark:text-amber-300 font-['DM_Sans',sans-serif] tracking-wide">
            जन निधि
          </span>
        </div>

        {/* Bottom Tier: MPLADS AI Sentinel • MoSPI */}
        {showTagline && (
          <div className="flex items-center gap-1.5 mt-0.5 sm:mt-1">
            {/* Micro National Tricolor Accent Pip */}
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
