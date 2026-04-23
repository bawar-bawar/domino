'use client';

const PIP_POS = {
  0: [],
  1: [[0.5, 0.5]],
  2: [[0.28, 0.28], [0.72, 0.72]],
  3: [[0.28, 0.28], [0.5, 0.5], [0.72, 0.72]],
  4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
  5: [[0.28, 0.28], [0.72, 0.28], [0.5, 0.5], [0.28, 0.72], [0.72, 0.72]],
  6: [[0.28, 0.25], [0.72, 0.25], [0.28, 0.5], [0.72, 0.5], [0.28, 0.75], [0.72, 0.75]],
};

function Pips({ n, color = '#1a1410', orient = 'h' }) {
  let pos = PIP_POS[n] || [];
  if(n === 6 && orient === 'h') {
    pos = [[0.24, 0.25], [0.48, 0.25], [0.72, 0.25], [0.24, 0.75], [0.48, 0.75], [0.72, 0.75]];
  }
  return (
    <g>
      {pos.map(([x, y], i) => (
        <circle key={i} cx={x * 100} cy={y * 100} r={8} fill={color} />
      ))}
    </g>
  );
}

export default function Tile({
  a,
  b,
  orient = 'h',
  size = 40,
  faceDown = false,
  selected = false,
  playable = false,
  dim = false,
  onClick,
  style,
  title,
}) {
  const w = orient === 'h' ? size * 2 : size;
  const h = orient === 'h' ? size : size * 2;
  const vb = orient === 'h' ? '0 0 200 100' : '0 0 100 200';
  const gradId = `face-${a}-${b}-${orient}-${faceDown ? 'd' : 'u'}`;

  return (
    <div
      onClick={onClick}
      title={title}
      style={{
        width: w,
        height: h,
        display: 'inline-block',
        position: 'relative',
        cursor: onClick ? 'pointer' : 'default',
        filter: dim ? 'brightness(.7) saturate(.7)' : 'none',
        transition: 'transform .15s ease, filter .2s',
        transform: selected ? 'translateY(-10px)' : 'none',
        ...style,
      }}
    >
      <svg viewBox={vb} width={w} height={h} style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={faceDown ? '#6b4423' : '#fbf5e6'} />
            <stop offset="1" stopColor={faceDown ? '#4d2f15' : '#e8dcba'} />
          </linearGradient>
          <filter id="tileShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity=".35" />
          </filter>
        </defs>

        <rect
          x="1"
          y="1"
          width={orient === 'h' ? 198 : 98}
          height={orient === 'h' ? 98 : 198}
          rx="8"
          ry="8"
          fill={`url(#${gradId})`}
          stroke={faceDown ? '#2a1a0a' : '#8a7a55'}
          strokeWidth="1.2"
          filter="url(#tileShadow)"
        />

        {!faceDown && (
          <>
            {orient === 'h' ? (
              <line x1="100" y1="12" x2="100" y2="88" stroke="#1a1410" strokeWidth="2" strokeLinecap="round" />
            ) : (
              <line x1="12" y1="100" x2="88" y2="100" stroke="#1a1410" strokeWidth="2" strokeLinecap="round" />
            )}
            <g transform="translate(0,0)"><Pips n={a} orient={orient} /></g>
            <g transform={orient === 'h' ? 'translate(100,0)' : 'translate(0,100)'}><Pips n={b} orient={orient} /></g>
          </>
        )}

        {faceDown && (
          <g>
            <rect
              x={orient === 'h' ? 60 : 20}
              y={orient === 'h' ? 20 : 60}
              width={orient === 'h' ? 80 : 60}
              height={orient === 'h' ? 60 : 80}
              rx="6"
              fill="none"
              stroke="#c88a4c"
              strokeOpacity=".55"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
            <circle cx={orient === 'h' ? 100 : 50} cy={orient === 'h' ? 50 : 100} r="6" fill="#c88a4c" fillOpacity=".35" />
          </g>
        )}

        {playable && !faceDown && (
          <rect
            x="1"
            y="1"
            width={orient === 'h' ? 198 : 98}
            height={orient === 'h' ? 98 : 198}
            rx="8"
            ry="8"
            fill="none"
            stroke="#e8b86b"
            strokeWidth="3"
            opacity=".9"
          >
            <animate attributeName="opacity" values=".4;1;.4" dur="1.6s" repeatCount="indefinite" />
          </rect>
        )}
      </svg>
    </div>
  );
}
