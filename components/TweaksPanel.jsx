'use client';

export default function TweaksPanel({ tweaks, setTweaks, visible }) {
  if (!visible) return null;
  return (
    <div
      className="fixed right-5 bottom-5 z-[999] text-cream text-[13px]"
      style={{
        background: 'rgba(10,5,3,.93)', border: '1px solid #c88a4c55',
        borderRadius: 14, padding: 16, width: 280,
        backdropFilter: 'blur(8px)',
        boxShadow: '0 20px 50px rgba(0,0,0,.6)',
      }}
    >
      <div className="font-display font-black text-lg mb-2.5">Tweaks</div>

      <Row label="Felt color">
        <Pills value={tweaks.felt} onChange={(v) => setTweaks({ felt: v })}
          opts={[['forest', 'Forest'], ['midnight', 'Midnight'], ['clay', 'Clay']]} />
      </Row>

      <Row label="Tile style">
        <Pills value={tweaks.tile} onChange={(v) => setTweaks({ tile: v })}
          opts={[['ivory', 'Ivory'], ['porcelain', 'Porcelain']]} />
      </Row>

      <Row label="Board zoom">
        <input
          type="range" min="0.7" max="1.3" step="0.05"
          value={tweaks.zoom}
          onChange={(e) => setTweaks({ zoom: Number(e.target.value) })}
          className="w-full"
        />
        <div className="text-right font-mono text-[11px] opacity-70">{tweaks.zoom.toFixed(2)}×</div>
      </Row>

      <Row label="Opponent difficulty">
        <Pills value={tweaks.difficulty} onChange={(v) => setTweaks({ difficulty: v })}
          opts={[['easy', 'Easy'], ['normal', 'Normal'], ['sharp', 'Sharp']]} />
      </Row>

      <Row label="Show chat">
        <Toggle on={tweaks.chat} onChange={(v) => setTweaks({ chat: v })} />
      </Row>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="mt-3">
      <div className="text-[10px] uppercase tracking-wider text-brass font-bold mb-1.5">{label}</div>
      {children}
    </div>
  );
}

function Pills({ value, onChange, opts }) {
  return (
    <div className="flex gap-1">
      {opts.map(([v, l]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className="flex-1 font-bold text-[12px]"
          style={{
            padding: '6px 8px', borderRadius: 8,
            background: value === v ? '#e8b86b' : '#2a1a0a',
            color: value === v ? '#2a1a0a' : '#f5ead2',
            border: value === v ? '1px solid #7a4a24' : '1px solid #c88a4c33',
          }}
        >{l}</button>
      ))}
    </div>
  );
}

function Toggle({ on, onChange }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className="block relative"
      style={{
        width: 46, height: 24, borderRadius: 999,
        background: on ? '#e8b86b' : '#2a1a0a',
        border: '1px solid #c88a4c55',
      }}
    >
      <span
        className="absolute"
        style={{
          top: 2, left: on ? 24 : 2,
          width: 18, height: 18, borderRadius: '50%',
          background: '#f5ead2', transition: 'left .15s',
        }}
      />
    </button>
  );
}
