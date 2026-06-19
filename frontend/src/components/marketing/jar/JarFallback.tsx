// Static SVG jar — the default visual and the Suspense fallback for JarScene.
// Matches the 3D composition (same box/aspect) so swapping is CLS-free.
const COIN_SPOTS = [
  { x: 90, y: 196 },
  { x: 116, y: 196 },
  { x: 103, y: 196 },
  { x: 97, y: 180 },
  { x: 121, y: 180 },
  { x: 109, y: 165 },
];

function Coin({ x, y, drop }: { x: number; y: number; drop?: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`} className={drop ? "jar-coin-drop" : undefined}>
      <circle r="13" fill="#3BAE6E" stroke="#00582A" strokeWidth="2" />
      <text textAnchor="middle" y="5" fontSize="13" fontWeight="600" fill="#00582A">₫</text>
    </g>
  );
}

export function JarFallback({ coins = 3 }: { coins?: number }) {
  const n = Math.max(0, Math.min(COIN_SPOTS.length, coins));
  return (
    <svg viewBox="0 0 220 240" className="h-[230px] w-auto sm:h-[280px]" role="img" aria-label="Hũ chi tiêu Penny">
      <ellipse cx="110" cy="224" rx="64" ry="10" fill="#0F6E56" opacity="0.12" />
      {/* rim */}
      <circle cx="110" cy="34" r="12" fill="none" stroke="#3BAE6E" strokeWidth="3" />
      <text x="110" y="39" textAnchor="middle" fontSize="14" fontWeight="600" fill="#0F6E56">₫</text>
      <rect x="66" y="46" width="88" height="13" rx="5" fill="#1A6B4A" opacity="0.55" />
      {/* glass body */}
      <path
        d="M62 62 Q62 56 68 56 L152 56 Q158 56 158 62 L166 206 Q166 218 154 218 L66 218 Q54 218 54 206 Z"
        fill="#5DCAA5" opacity="0.26" stroke="#1A6B4A" strokeWidth="2"
      />
      {/* contents shade */}
      <path d="M70 158 L150 158 L156 204 Q156 210 150 210 L70 210 Q64 210 64 204 Z" fill="#1A6B4A" opacity="0.14" />
      {COIN_SPOTS.slice(0, n).map((s, i) => (
        <Coin key={i} x={s.x} y={s.y} drop={i === n - 1} />
      ))}
    </svg>
  );
}
