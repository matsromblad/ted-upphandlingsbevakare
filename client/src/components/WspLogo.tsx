import React from 'react';

export type WspLogoConcept = 'corporate' | 'isometric' | 'radar' | 'truss' | 'shield';

interface WspLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'icon' | 'full' | 'mark-only';
  concept?: WspLogoConcept;
  showSubtext?: boolean;
}

/**
 * WSP TED Bevakare Logo Component
 * Offers 5 refined, professional design concepts tailored to WSP's brand identity (Pantone Warm Red #F1503C).
 */
export const WspLogo: React.FC<WspLogoProps> = ({
  className = '',
  size = 'md',
  variant = 'icon',
  concept = 'radar',
  showSubtext = true
}) => {
  const sizeMap = {
    sm: { box: 'w-7 h-7', svg: 'w-4 h-4', text: 'text-sm', badge: 'text-[8px]', sub: 'text-[10px]' },
    md: { box: 'w-10 h-10', svg: 'w-6 h-6', text: 'text-base sm:text-lg', badge: 'text-[9px]', sub: 'text-[11px]' },
    lg: { box: 'w-12 h-12', svg: 'w-7 h-7', text: 'text-xl sm:text-2xl', badge: 'text-[10px]', sub: 'text-xs' },
    xl: { box: 'w-16 h-16', svg: 'w-9 h-9', text: 'text-2xl sm:text-3xl', badge: 'text-xs', sub: 'text-sm' }
  };

  const currentSize = sizeMap[size];

  // Render SVG based on selected concept
  const renderConceptSvg = () => {
    switch (concept) {
      // CONCEPT 3: Precision Radar & Crosshair (Intelligence & Bevakning - DEFAULT)
      case 'radar':
      default:
        return (
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${currentSize.svg} relative z-10 transition-transform duration-300 group-hover:scale-105`}>
            {/* Concentric Radar Rings */}
            <circle cx="50" cy="50" r="34" stroke="#ffffff" strokeWidth="4.5" strokeOpacity="0.4" strokeDasharray="6 4" />
            <circle cx="50" cy="50" r="22" stroke="#ffffff" strokeWidth="6" />
            <circle cx="50" cy="50" r="10" stroke="#ffffff" strokeWidth="4.5" />
            {/* Crosshair Coordinates */}
            <path d="M50 12V24M50 76V88M12 50H24M76 50H88" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
            {/* Active Radar Signal Blip */}
            <circle cx="66" cy="34" r="6" fill="#f59e0b" />
            <circle cx="66" cy="34" r="9" stroke="#f59e0b" strokeWidth="2" opacity="0.6" strokeDasharray="2 2" />
          </svg>
        );

      // CONCEPT 1: Pure WSP Bold Corporate Monogram
      case 'corporate':
        return (
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${currentSize.svg} relative z-10 transition-transform duration-300 group-hover:scale-105`}>
            {/* W */}
            <path
              d="M14 32L24 72L34 38L44 72L54 32"
              stroke="#ffffff"
              strokeWidth="9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* S */}
            <path
              d="M74 36C74 33 70 31 66 31C60 31 58 35 58 39C58 46 74 47 74 55C74 61 68 65 62 65C56 65 52 61 52 57"
              stroke="#ffffff"
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* P */}
            <path
              d="M80 65V31H88C94 31 97 34 97 40C97 46 94 49 88 49H80"
              stroke="#ffffff"
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Subtle Gold Beacon Dot in Upper Right */}
            <circle cx="86" cy="18" r="4.5" fill="#f59e0b" />
          </svg>
        );

      // CONCEPT 2: Isometric Architectural Prism (Structure & Engineering)
      case 'isometric':
        return (
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${currentSize.svg} relative z-10 transition-transform duration-300 group-hover:scale-105`}>
            {/* Top Face */}
            <path d="M50 18L82 34L50 50L18 34L50 18Z" fill="#ffffff" />
            {/* Left Face */}
            <path d="M18 34L50 50V82L18 66V34Z" fill="#fecaca" />
            {/* Right Face */}
            <path d="M50 50L82 34V66L50 82V50Z" fill="#fee2e2" />
            {/* Golden Core Star */}
            <path d="M50 40L52.5 47L60 49.5L52.5 52L50 59L47.5 52L40 49.5L47.5 47L50 40Z" fill="#f59e0b" />
          </svg>
        );

      // CONCEPT 4: Structural Truss / Modern Geometric Chevron
      case 'truss':
        return (
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${currentSize.svg} relative z-10 transition-transform duration-300 group-hover:scale-105`}>
            {/* Interlocking Structural Beams forming W */}
            <path d="M16 68L36 28L56 68" stroke="#ffffff" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M44 68L64 28L84 68" stroke="#ffffff" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
            {/* Horizontal Tie Beam */}
            <path d="M26 48H74" stroke="#fecaca" strokeWidth="5.5" strokeLinecap="round" />
            {/* Gold Summit Node */}
            <circle cx="50" cy="22" r="5" fill="#f59e0b" />
          </svg>
        );

      // CONCEPT 5: Tender Vault / Verified Shield
      case 'shield':
        return (
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${currentSize.svg} relative z-10 transition-transform duration-300 group-hover:scale-105`}>
            {/* Shield Outline */}
            <path
              d="M50 16L80 28V52C80 68 66 80 50 86C34 80 20 68 20 52V28L50 16Z"
              fill="#ffffff"
              fillOpacity="0.15"
              stroke="#ffffff"
              strokeWidth="6"
              strokeLinejoin="round"
            />
            {/* Stylized W Inside Shield */}
            <path
              d="M32 38L40 64L50 48L60 64L68 38"
              stroke="#ffffff"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Gold Star at Crest */}
            <circle cx="50" cy="24" r="4.5" fill="#f59e0b" />
          </svg>
        );
    }
  };

  // Pure SVG icon mark container
  const iconElement = (
    <div
      className={`${currentSize.box} rounded-xl bg-gradient-to-br from-[#F1503C] via-[#E03C28] to-[#B91C1C] flex items-center justify-center text-white shadow-md shadow-[#F1503C]/25 flex-shrink-0 relative overflow-hidden group select-none ${className}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] opacity-10 [background-size:6px_6px] pointer-events-none" />
      {renderConceptSvg()}
    </div>
  );

  if (variant === 'icon') {
    return iconElement;
  }

  // Official-style WSP Pure Text Wordmark
  const wspWordmark = (
    <span className="font-black tracking-tighter text-[#F1503C] uppercase text-xl leading-none">
      WSP
    </span>
  );

  if (variant === 'mark-only') {
    return wspWordmark;
  }

  // Full Brand Lockup with Title & Subtext
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {iconElement}
      <div className="flex flex-col justify-center min-w-0">
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className={`font-extrabold ${currentSize.text} text-slate-900 dark:text-white tracking-tight leading-tight flex items-center gap-1.5`}>
            <span className="text-[#F1503C] font-black">WSP</span>
            <span>TED Bevakare</span>
          </span>
          <span className={`${currentSize.badge} uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-red-50 text-[#F1503C] dark:bg-red-950/80 dark:text-red-300 border border-red-200 dark:border-red-900/60 leading-none flex-shrink-0`}>
            EU & Sverige
          </span>
        </div>
        {showSubtext && (
          <p className={`${currentSize.sub} text-slate-500 dark:text-slate-400 whitespace-nowrap leading-tight mt-0.5 hidden sm:block font-medium`}>
            Tenders Electronic Daily Monitor • WSP Sverige
          </p>
        )}
      </div>
    </div>
  );
};

export default WspLogo;
