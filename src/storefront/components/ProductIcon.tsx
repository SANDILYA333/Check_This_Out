import React from 'react';

interface ProductIconProps {
  iconType: string;
  size?: number;
  className?: string;
}

export const ProductIcon: React.FC<ProductIconProps> = ({ iconType, size = 120, className = '' }) => {
  switch (iconType) {
    case 'cooker':
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Stainless steel pressure cooker">
          <rect width="100" height="100" rx="16" fill="#F1F5F9" />
          {/* Lid & Handle */}
          <rect x="18" y="28" width="64" height="10" rx="4" fill="#64748B" />
          <path d="M50 18 L50 28" stroke="#334155" strokeWidth="5" strokeLinecap="round" />
          <circle cx="50" cy="16" r="4" fill="#0F172A" />
          <rect x="70" y="30" width="22" height="6" rx="3" fill="#0F172A" />
          {/* Body */}
          <path d="M22 38 L25 76 C25 82 32 86 50 86 C68 86 75 82 75 76 L78 38 Z" fill="#94A3B8" />
          {/* Metallic highlight */}
          <path d="M30 40 L32 78 C33 81 38 84 48 84 C46 84 42 81 41 78 L39 40 Z" fill="#CBD5E1" opacity="0.6" />
          <rect x="8" y="42" width="16" height="5" rx="2" fill="#0F172A" />
          {/* Pressure regulator weight */}
          <rect x="46" y="10" width="8" height="6" rx="2" fill="#DC2626" />
        </svg>
      );
    case 'headphones':
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Wireless Headphones">
          <rect width="100" height="100" rx="16" fill="#EFF6FF" />
          {/* Headband */}
          <path d="M25 55 C25 30 75 30 75 55" stroke="#1E293B" strokeWidth="6" strokeLinecap="round" fill="none" />
          <path d="M30 42 C30 34 70 34 70 42" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" fill="none" />
          {/* Left Ear cup */}
          <rect x="18" y="50" width="14" height="24" rx="7" fill="#1D4ED8" />
          <rect x="22" y="54" width="6" height="16" rx="3" fill="#93C5FD" opacity="0.8" />
          {/* Right Ear cup */}
          <rect x="68" y="50" width="14" height="24" rx="7" fill="#1D4ED8" />
          <rect x="72" y="54" width="6" height="16" rx="3" fill="#93C5FD" opacity="0.8" />
        </svg>
      );
    case 'smartwatch':
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Smartwatch">
          <rect width="100" height="100" rx="16" fill="#F0FDF4" />
          {/* Strap */}
          <rect x="38" y="10" width="24" height="22" rx="4" fill="#334155" />
          <rect x="38" y="68" width="24" height="22" rx="4" fill="#334155" />
          {/* Dial Case */}
          <rect x="30" y="26" width="40" height="48" rx="12" fill="#0F172A" stroke="#22C55E" strokeWidth="2" />
          {/* Screen Display */}
          <rect x="34" y="30" width="32" height="40" rx="8" fill="#1E293B" />
          {/* Time & Heart Graphic */}
          <text x="50" y="48" fontSize="10" fontWeight="bold" fill="#F8FAFC" textAnchor="middle" fontFamily="sans-serif">10:45</text>
          <path d="M46 56 C46 54 48 53 50 55 C52 53 54 54 54 56 C54 59 50 61 50 61 C50 61 46 59 46 56 Z" fill="#EF4444" />
        </svg>
      );
    case 'powerbank':
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Power Bank">
          <rect width="100" height="100" rx="16" fill="#F8FAFC" />
          <rect x="32" y="20" width="36" height="60" rx="8" fill="#1E293B" />
          <rect x="36" y="24" width="28" height="6" rx="2" fill="#0F172A" />
          <circle cx="42" cy="27" r="1.5" fill="#10B981" />
          <circle cx="47" cy="27" r="1.5" fill="#10B981" />
          <circle cx="52" cy="27" r="1.5" fill="#10B981" />
          <circle cx="57" cy="27" r="1.5" fill="#64748B" />
          {/* Fast charge icon */}
          <polygon points="50,42 45,54 50,54 48,66 57,51 52,51" fill="#F59E0B" />
        </svg>
      );
    case 'induction':
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Induction Cooktop">
          <rect width="100" height="100" rx="16" fill="#FEF2F2" />
          <rect x="20" y="25" width="60" height="50" rx="6" fill="#18181B" />
          {/* Coil Rings */}
          <circle cx="44" cy="50" r="18" stroke="#EF4444" strokeWidth="2" strokeDasharray="3 3" fill="none" />
          <circle cx="44" cy="50" r="12" stroke="#DC2626" strokeWidth="2" fill="none" />
          <circle cx="44" cy="50" r="4" fill="#B91C1C" />
          {/* Touch buttons on side */}
          <rect x="68" y="35" width="8" height="30" rx="3" fill="#27272A" />
          <circle cx="72" cy="40" r="2" fill="#38BDF8" />
          <circle cx="72" cy="50" r="2" fill="#F97316" />
        </svg>
      );
    case 'flask':
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Stainless steel flask">
          <rect width="100" height="100" rx="16" fill="#F0FDFA" />
          {/* Cap */}
          <rect x="42" y="14" width="16" height="10" rx="3" fill="#0D9488" />
          <rect x="38" y="22" width="24" height="6" rx="2" fill="#115E59" />
          {/* Flask Body */}
          <rect x="34" y="28" width="32" height="56" rx="6" fill="#0F766E" />
          <path d="M38 32 L38 80" stroke="#2DD4BF" strokeWidth="3" opacity="0.6" strokeLinecap="round" />
        </svg>
      );
    case 'kurta':
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Ethnic Kurta">
          <rect width="100" height="100" rx="16" fill="#FFFBEB" />
          {/* Shoulders & Sleeves */}
          <path d="M32 24 L20 40 L30 46 L34 38 L34 84 L66 84 L66 38 L70 46 L80 40 L68 24 Z" fill="#D97706" />
          {/* Collar & Buttons */}
          <path d="M44 24 L50 34 L56 24" fill="#FEF3C7" />
          <line x1="50" y1="34" x2="50" y2="52" stroke="#78350F" strokeWidth="2" strokeDasharray="2 3" />
        </svg>
      );
    case 'shoes':
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Running Shoes">
          <rect width="100" height="100" rx="16" fill="#FAF5FF" />
          {/* Shoe Profile */}
          <path d="M16 64 C22 64 26 58 34 50 C44 42 58 40 68 46 L82 52 C86 54 86 64 80 66 L18 66 Z" fill="#7C3AED" />
          {/* Sole */}
          <path d="M14 66 L84 66 C86 66 86 74 82 74 L16 74 C14 74 12 70 14 66 Z" fill="#C4B5FD" />
          <path d="M38 48 L46 62" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case 'book':
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Book">
          <rect width="100" height="100" rx="16" fill="#FDF2F8" />
          {/* Book Spine & Cover */}
          <rect x="28" y="20" width="44" height="60" rx="4" fill="#DB2777" />
          <rect x="32" y="24" width="36" height="52" rx="2" fill="#FCE7F3" />
          {/* Title Lines */}
          <line x1="38" y1="36" x2="62" y2="36" stroke="#9D174D" strokeWidth="3" strokeLinecap="round" />
          <line x1="42" y1="44" x2="58" y2="44" stroke="#9D174D" strokeWidth="2" strokeLinecap="round" />
          <circle cx="50" cy="56" r="5" fill="#F472B6" />
        </svg>
      );
    case 'bands':
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Workout Bands">
          <rect width="100" height="100" rx="16" fill="#F0FDF4" />
          <ellipse cx="50" cy="40" rx="30" ry="12" stroke="#16A34A" strokeWidth="5" fill="none" />
          <ellipse cx="50" cy="52" rx="30" ry="12" stroke="#2563EB" strokeWidth="5" fill="none" />
          <ellipse cx="50" cy="64" rx="30" ry="12" stroke="#DC2626" strokeWidth="5" fill="none" />
        </svg>
      );
    case 'mat':
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Yoga Mat">
          <rect width="100" height="100" rx="16" fill="#F5F3FF" />
          {/* Rolled Mat */}
          <ellipse cx="26" cy="50" rx="10" ry="18" fill="#8B5CF6" />
          <ellipse cx="26" cy="50" rx="6" ry="12" fill="#6D28D9" />
          <circle cx="26" cy="50" r="3" fill="#4C1D95" />
          <rect x="26" y="32" width="50" height="36" fill="#7C3AED" />
          <ellipse cx="76" cy="50" rx="8" ry="18" fill="#8B5CF6" />
          <line x1="42" y1="32" x2="42" y2="68" stroke="#FBBF24" strokeWidth="3" />
          <line x1="60" y1="32" x2="60" y2="68" stroke="#FBBF24" strokeWidth="3" />
        </svg>
      );
    case 'honey':
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Honey Jar">
          <rect width="100" height="100" rx="16" fill="#FFFBEB" />
          {/* Lid */}
          <rect x="36" y="20" width="28" height="8" rx="3" fill="#B45309" />
          {/* Glass Jar */}
          <path d="M32 28 L68 28 C72 28 74 34 74 40 L70 76 C70 80 66 82 62 82 L38 82 C34 82 30 80 30 76 L26 40 C26 34 28 28 32 28 Z" fill="#F59E0B" />
          {/* Label */}
          <rect x="34" y="44" width="32" height="24" rx="4" fill="#FEF3C7" />
          <text x="50" y="58" fontSize="8" fontWeight="bold" fill="#78350F" textAnchor="middle" fontFamily="sans-serif">HONEY</text>
          <circle cx="50" cy="63" r="2" fill="#D97706" />
        </svg>
      );
    case 'tea':
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Tea Pack">
          <rect width="100" height="100" rx="16" fill="#FEF3C7" />
          {/* Tea Pouch */}
          <polygon points="30,22 70,22 76,82 24,82" fill="#B45309" />
          {/* Gold Seal Header */}
          <polygon points="28,20 72,20 70,30 30,30" fill="#F59E0B" />
          {/* Royal Seal */}
          <circle cx="50" cy="52" r="14" fill="#FDE68A" />
          <text x="50" y="55" fontSize="8" fontWeight="bold" fill="#78350F" textAnchor="middle" fontFamily="sans-serif">GOLD</text>
          {/* Leaf */}
          <path d="M46 68 C46 64 54 64 54 68 C54 72 46 72 46 68 Z" fill="#15803D" />
        </svg>
      );
    default:
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Product">
          <rect width="100" height="100" rx="16" fill="#F1F5F9" />
          <rect x="30" y="30" width="40" height="40" rx="8" fill="#94A3B8" />
          <circle cx="50" cy="50" r="10" fill="#64748B" />
        </svg>
      );
  }
};
