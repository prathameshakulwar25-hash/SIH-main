import React from 'react';

/**
 * JeevanLogoIcon Component
 * Premium vector mark featuring:
 * - Top: Radiant Teal-Cyan Heart with white medical cross (+)
 * - Left: Lush Dual AYUSH Herbal Green Leaves (Upper vibrant spring-emerald, Lower deep forest)
 * - Right: Dual Allopathic Clinical Blue Leaves (Upper ocean cyan-blue, Lower royal sapphire-navy)
 * - Transparent background without any box/enclosure for modern, sleek embedding.
 */
export const JeevanLogoIcon = ({ className = "w-10 h-10", idPrefix = "jeevan-logo" }) => {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} transition-transform duration-300 hover:scale-105 select-none`}
      style={{ filter: 'drop-shadow(0 2px 8px rgba(13, 148, 136, 0.15))' }}
      aria-label="Jeevan Health Logo"
    >
      <defs>
        {/* Heart Gradient (Vibrant Teal to Cyan) */}
        <linearGradient id={`${idPrefix}-heart-grad`} x1="43" y1="8" x2="77" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="50%" stopColor="#0d9488" />
          <stop offset="100%" stopColor="#0f766e" />
        </linearGradient>

        {/* Upper-Left Herbal Leaf (Sprout Lime to Vivid Emerald) */}
        <linearGradient id={`${idPrefix}-leaf-tl`} x1="14" y1="18" x2="57" y2="102" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#86efac" />
          <stop offset="35%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#15803d" />
        </linearGradient>

        {/* Lower-Left Herbal Leaf (Rich Forest Green) */}
        <linearGradient id={`${idPrefix}-leaf-bl`} x1="7" y1="60" x2="58" y2="108" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="50%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#064e3b" />
        </linearGradient>

        {/* Upper-Right Clinical Leaf (Sky Cyan to Deep Clinical Blue) */}
        <linearGradient id={`${idPrefix}-leaf-tr`} x1="106" y1="18" x2="63" y2="102" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#67e8f9" />
          <stop offset="40%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#1e40af" />
        </linearGradient>

        {/* Lower-Right Clinical Leaf (Deep Ocean to Royal Navy) */}
        <linearGradient id={`${idPrefix}-leaf-br`} x1="113" y1="60" x2="62" y2="108" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="45%" stopColor="#1d4ed8" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>

        {/* Subtle Shimmer Overlay for Leaves */}
        <linearGradient id={`${idPrefix}-shimmer`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Top Heart with Medical Cross */}
      <g className="transition-transform duration-300">
        <path
          d="M 60 36.5 C 58 34.5 43 23.5 43 14 C 43 7.5 48 3.5 54.5 3.5 C 57.5 3.5 59.2 5.2 60 7 C 60.8 5.2 62.5 3.5 65.5 3.5 C 72 3.5 77 7.5 77 14 C 77 23.5 62 34.5 60 36.5 Z"
          fill={`url(#${idPrefix}-heart-grad)`}
        />
        {/* Heart Top-Left Subtle Highlight */}
        <path
          d="M 46 11.5 C 47.5 8 50.5 5.5 54 5.2"
          stroke="rgba(255,255,255,0.45)"
          strokeWidth="1.2"
          strokeLinecap="round"
          fill="none"
        />
        {/* Medical Cross inside Heart */}
        <g fill="#FFFFFF">
          <rect x="58" y="11" width="4" height="12" rx="1.2" />
          <rect x="54" y="15" width="12" height="4" rx="1.2" />
        </g>
      </g>

      {/* Left Herbal AYUSH Leaves */}
      <g>
        {/* Upper-Left Leaf */}
        <path
          d="M 56.5 98 C 54 74 36 46 14 18 C 9 36 9 62 25 79 C 34 88.5 46 95.5 56.5 98 Z"
          fill={`url(#${idPrefix}-leaf-tl)`}
        />
        {/* Upper-Left Leaf Vein / Spine Accent */}
        <path
          d="M 54.5 95 C 44 76 30 52 17 23"
          stroke={`url(#${idPrefix}-shimmer)`}
          strokeWidth="1.2"
          strokeLinecap="round"
          fill="none"
        />

        {/* Lower-Left Leaf */}
        <path
          d="M 58 107 C 52 98 34 86 7 60 C 8 80 20 98 48 106.5 C 52.5 107.8 55.8 107.4 58 107 Z"
          fill={`url(#${idPrefix}-leaf-bl)`}
        />
        {/* Lower-Left Leaf Vein Accent */}
        <path
          d="M 55 104 C 42 94 26 82 12 66"
          stroke={`url(#${idPrefix}-shimmer)`}
          strokeWidth="1"
          strokeLinecap="round"
          fill="none"
        />
      </g>

      {/* Right Clinical Allopathic Leaves */}
      <g>
        {/* Upper-Right Leaf */}
        <path
          d="M 63.5 98 C 66 74 84 46 106 18 C 111 36 111 62 95 79 C 86 88.5 74 95.5 63.5 98 Z"
          fill={`url(#${idPrefix}-leaf-tr)`}
        />
        {/* Upper-Right Leaf Vein / Spine Accent */}
        <path
          d="M 65.5 95 C 76 76 90 52 103 23"
          stroke={`url(#${idPrefix}-shimmer)`}
          strokeWidth="1.2"
          strokeLinecap="round"
          fill="none"
        />

        {/* Lower-Right Leaf */}
        <path
          d="M 62 107 C 68 98 86 86 113 60 C 112 80 100 98 72 106.5 C 67.5 107.8 64.2 107.4 62 107 Z"
          fill={`url(#${idPrefix}-leaf-br)`}
        />
        {/* Lower-Right Leaf Vein Accent */}
        <path
          d="M 65 104 C 78 94 94 82 108 66"
          stroke={`url(#${idPrefix}-shimmer)`}
          strokeWidth="1"
          strokeLinecap="round"
          fill="none"
        />
      </g>
    </svg>
  );
};

/**
 * JeevanBrand Component
 * Clean, modern branding lockup with NO enclosing white box or border.
 * Features the standalone pure botanical leaf mark and elegant typography.
 */
export const JeevanBrand = ({
  size = "md", // "sm" | "md" | "lg"
  showSubtitle = true,
  subtitleText = "Digital Care of Every Life",
  badgeText = null,
  className = ""
}) => {
  const iconSizes = {
    sm: "w-8 h-8",
    md: "w-10 h-10 sm:w-11 sm:h-11",
    lg: "w-14 h-14 sm:w-16 sm:h-16"
  };

  const titleSizes = {
    sm: "text-lg",
    md: "text-2xl sm:text-3xl",
    lg: "text-3xl sm:text-4xl"
  };

  const badgeSizes = {
    sm: "text-[9px] px-1.5 py-0.2",
    md: "text-xs px-2 py-0.5",
    lg: "text-xs px-2.5 py-0.5"
  };

  return (
    <div className={`flex items-center gap-2.5 sm:gap-3 group select-none ${className}`}>
      {/* Pure leaf mark — no white background box, cleanly floating with subtle glow */}
      <div className="shrink-0 flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
        <JeevanLogoIcon className={iconSizes[size] || iconSizes.md} idPrefix="brand-lockup" />
      </div>

      <div>
        <div className="flex items-center gap-2">
          <span className={`${titleSizes[size] || titleSizes.md} font-black text-slate-900 tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-teal-900 bg-clip-text text-transparent`}>
            Jeevan
          </span>
          {badgeText && (
            <span className={`${badgeSizes[size] || badgeSizes.md} rounded-full font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs`}>
              {badgeText}
            </span>
          )}
        </div>
        {showSubtitle && (
          <span className="text-[11px] font-semibold text-slate-400 block -mt-0.5 tracking-wide">
            {subtitleText}
          </span>
        )}
      </div>
    </div>
  );
};

export default JeevanLogoIcon;
