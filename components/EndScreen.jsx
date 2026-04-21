'use client';

export default function EndScreen({ result, room, onRematch, onLobby, canRematch }) {
  const { players } = result;
  const target = result.pointsTarget || room?.points || 100;
  const totals = result.totals || [];
  const matchWinner = result.matchWinner;
  const youIdx = result.isYouMap ? result.isYouMap.findIndex(Boolean) : -1;
  const iWon = result.winnerIdx === youIdx;

  return (
    <div className="min-h-screen p-7 bg-wood-grain">
      <div
        className="mx-auto text-cream"
        style={{
          maxWidth: 980,
          background: 'radial-gradient(ellipse at top, #0e5a3a 0%, #073a25 60%, #042418 100%)',
          borderRadius: 16,
          padding: '32px 36px 30px',
          border: '4px solid #3d230f',
          boxShadow: 'inset 0 0 0 2px #c88a4c33, 0 30px 80px rgba(0,0,0,.6)',
        }}
      >
        <div className="text-center mb-[26px]">
          <div
            className="inline-block rounded-full font-bold text-[11px] uppercase tracking-widest"
            style={{
              padding: '5px 14px',
              background: '#2a1a0a', color: '#e8b86b',
              border: '1px solid #c88a4c55',
            }}
          >{matchWinner ? 'Match won' : 'Round complete'}</div>
          <div
            className="font-display font-black mx-auto"
            style={{ fontSize: 42, marginTop: 12, lineHeight: 1.05, textWrap: 'pretty', maxWidth: 720 }}
          >
            {matchWinner
              ? (matchWinner.idx === youIdx ? 'You carried the table.' : `${matchWinner.name} takes the match.`)
              : (iWon ? 'Nice round. That’s yours.' : `${result.winnerName} took the round.`)}
          </div>
          <div className="text-cream/70 text-sm mt-2 max-w-[520px] mx-auto">
            {result.reason === 'domino' ? 'Dominoed — hand cleared first.' : 'Board blocked — lowest pip count wins.'}
            {' '}Scoring {result.pts} points from the other hands.
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-3">
            <div className="font-display font-black text-2xl">Scoreboard</div>
            <div className="text-[12px] text-cream/50 uppercase tracking-wider">First to {target}</div>
          </div>
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}
          >
            {players.map((p, i) => {
              const total = totals[i] || 0;
              const pct = Math.min(100, (total / target) * 100);
              const won = matchWinner && matchWinner.idx === i;
              return (
                <div
                  key={p.id}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 12,
                    background: won ? 'linear-gradient(180deg,#e8b86b,#b1813f)' : '#0a0503',
                    color: won ? '#2a1a0a' : '#f5ead2',
                    border: won ? '2px solid #7a4a24' : '1px solid #c88a4c33',
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="grid place-items-center rounded-full"
                      style={{
                        width: 36, height: 36, fontSize: 18,
                        background: 'linear-gradient(180deg,#f5ead2,#d6c28d)',
                        border: '2px solid #b1813f',
                      }}
                    >{p.avatar}</div>
                    <div className="flex-1">
                      <div className="font-bold">{i === youIdx ? 'You' : p.name}</div>
                      <div className="text-[11px] opacity-70">{i === youIdx ? 'Seat 1 · host' : `Seat ${i + 1}`}</div>
                    </div>
                    <div className="font-display font-black text-[28px]">{total}</div>
                  </div>
                  <div
                    className="mt-2.5 overflow-hidden"
                    style={{ height: 6, borderRadius: 4, background: won ? '#2a1a0a33' : '#c88a4c22' }}
                  >
                    <div
                      style={{
                        height: '100%', width: `${pct}%`,
                        background: won ? '#2a1a0a' : 'linear-gradient(90deg,#e8b86b,#b1813f)',
                        transition: 'width .8s cubic-bezier(.2,.9,.3,1)',
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] mt-1.5 opacity-75">
                    <span>{total}/{target}</span>
                    <span>{i === result.winnerIdx ? `+${result.pts} this round` : '—'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-[22px] grid grid-cols-4 gap-2.5">
          <StatTile label="Tiles played" value={result.chain?.length ?? '—'} />
          <StatTile label="Left end" value={result.chain?.length ? result.chain[0].left : '—'} />
          <StatTile label="Right end" value={result.chain?.length ? result.chain[result.chain.length - 1].right : '—'} />
          <StatTile label="Round result" value={result.reason === 'domino' ? 'Domino' : 'Blocked'} />
        </div>

        <div className="mt-7 flex gap-3 justify-end">
          <button
            onClick={onLobby}
            className="font-bold rounded-[12px]"
            style={{ padding: '12px 18px', background: '#0a0503', color: '#f5ead2', border: '1px solid #c88a4c55' }}
          >← Back to lobby</button>
          {canRematch && (
            <button
              onClick={onRematch}
              className="font-extrabold text-[15px] rounded-[12px]"
              style={{
                padding: '12px 22px',
                background: 'linear-gradient(180deg,#e8b86b,#b1813f)',
                color: '#2a1a0a', border: '2px solid #7a4a24',
                boxShadow: '0 4px 0 #7a4a24',
              }}
            >{matchWinner ? 'New match →' : 'Next round →'}</button>
          )}
        </div>
      </div>
    </div>
  );
}

function StatTile({ label, value }) {
  return (
    <div
      style={{
        padding: '14px 16px', borderRadius: 12,
        background: '#0a0503', border: '1px solid #c88a4c33', color: '#f5ead2',
      }}
    >
      <div className="text-[10px] uppercase tracking-wider text-brass">{label}</div>
      <div className="font-display font-bold text-[22px] mt-1">{value}</div>
    </div>
  );
}
