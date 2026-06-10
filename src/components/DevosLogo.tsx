export default function DevosLogo({ className = "" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" className={className}>
      <defs>
        <linearGradient id="devos-g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>

      <circle cx="220" cy="360" r="28" fill="url(#devos-g)" />
      <circle cx="220" cy="760" r="28" fill="url(#devos-g)" />
      <circle cx="560" cy="560" r="52" fill="url(#devos-g)" />

      <path
        d="M360 280 H680 A180 180 0 0 1 860 460"
        fill="none"
        stroke="url(#devos-g)"
        strokeWidth="60"
        strokeLinecap="round"
      />

      <path
        d="M360 440 H620 A120 120 0 0 1 740 560 A120 120 0 0 1 620 680 H360"
        fill="none"
        stroke="url(#devos-g)"
        strokeWidth="60"
        strokeLinecap="round"
      />

      <path
        d="M180 560 H470"
        fill="none"
        stroke="url(#devos-g)"
        strokeWidth="60"
        strokeLinecap="round"
      />

      <path
        d="M360 760 H680 A180 180 0 0 0 860 580"
        fill="none"
        stroke="url(#devos-g)"
        strokeWidth="60"
        strokeLinecap="round"
      />
    </svg>
  );
}
