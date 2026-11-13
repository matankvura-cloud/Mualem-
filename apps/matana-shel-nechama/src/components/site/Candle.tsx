export function Candle({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 92" aria-hidden="true" className={className}>
      <defs><radialGradient id="candle-glow" cx="50%" cy="30%" r="60%"><stop offset="0" stopColor="#F3D58A" stopOpacity=".9" /><stop offset="1" stopColor="#F3D58A" stopOpacity="0" /></radialGradient></defs>
      <circle cx="32" cy="26" r="26" fill="url(#candle-glow)" />
      <path className="flame" d="M32 10c6 8 8 13 4 19-2 3-6 3-8 0-4-6-2-11 4-19z" fill="#F0C65E" />
      <path className="flame" d="M32 18c3 4 4 7 2 10-1 1.5-3 1.5-4 0-2-3-1-6 2-10z" fill="#FFF3D1" />
      <rect x="24" y="30" width="16" height="4" rx="1" fill="#F7F2E8" opacity=".85" />
      <rect x="20" y="34" width="24" height="52" rx="3" fill="#F7F2E8" opacity=".92" />
      <rect x="20" y="78" width="24" height="8" rx="3" fill="#E4DCCB" />
    </svg>
  );
}
