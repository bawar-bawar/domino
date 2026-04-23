'use client';

import { useEffect, useState } from 'react';

const AVATARS = ['🦊', '🐻', '🦉', '🐢', '🐰', '🐼', '🦁', '🐺'];

export default function Lobby({ socket, room, onStart, onCreateRoom, onJoinRoom, onLeaveRoom, isConnected }) {
  const [mode, setMode] = useState('home'); // home | create | join
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [seats, setSeats] = useState(2);
  const [points, setPoints] = useState(100);
  const [joinErr, setJoinErr] = useState('');

  // Hydrate name + avatar from localStorage
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('bonepile.player') || 'null');
      if (saved?.name) setName(saved.name);
      if (saved?.avatar && AVATARS.includes(saved.avatar)) setAvatar(saved.avatar);
    } catch (e) {}
  }, []);

  // Persist name + avatar
  useEffect(() => {
    try { localStorage.setItem('bonepile.player', JSON.stringify({ name, avatar })); } catch (e) {}
  }, [name, avatar]);

  // When we land in a created/joined room, switch to create view (shared layout)
  useEffect(() => {
    if (room && mode === 'home') setMode('create');
  }, [room, mode]);

  const trimmedName = name.trim();
  const hasName = trimmedName.length > 0;

  function createRoom(nSeats = seats) {
    if (!hasName) return;
    setSeats(nSeats);
    onCreateRoom?.({ name: trimmedName, avatar, seats: nSeats, points });
    setMode('create');
  }

  function joinWith(code) {
    if (!hasName) { setJoinErr('Enter your name first'); return; }
    setJoinErr('');
    onJoinRoom?.({ code, name: trimmedName, avatar }, (res) => {
      if (!res?.ok) setJoinErr(res?.error || 'Could not join');
      else setMode('create');
    });
  }

  function backToHome() {
    if (room) onLeaveRoom?.();
    setMode('home');
  }

  const allReady = room && room.members.length === room.seats && room.members.every((m) => m.ready);
  const isHost = room && socket && room.hostId === socket.id;

  return (
    <div className="min-h-screen">
      <WoodFrame>
        <div className="px-[34px] pt-7 pb-[34px] bg-felt min-h-[calc(100vh-48px)]">
          <div className="flex items-center gap-3.5 mb-7">
            <LogoMark />
            <div>
              <div className="font-display font-black text-[32px] text-cream leading-none -tracking-[0.5px]">dominos</div>
              <div className="text-[13px] text-cream/60 mt-0.5 italic">Multiplayer dominoes, the long way ’round.</div>
            </div>
            <div className="ml-auto flex gap-2.5 items-center">
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: '#7fd599', boxShadow: '0 0 8px #7fd599' }}
              />
              <span className="text-cream/80 text-[13px]">
                {isConnected ? '3,148 players on benches' : 'connecting…'}
              </span>
            </div>
          </div>

          {mode === 'home' && (
            <>
              <PlayingAsBar
                name={name} setName={setName}
                avatar={avatar} setAvatar={setAvatar}
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-[18px] mt-[18px]">
                <BigCard
                  title="Create a room"
                  body="Set house rules, invite up to 3 friends with a short code."
                  cta="New room"
                  onClick={() => createRoom(seats)}
                  tone="brass"
                  disabled={!hasName}
                />
                <BigCard
                  title="Join a room"
                  body="Got a 4-letter code from a friend? Drop in."
                  cta="Enter code"
                  onClick={() => setMode('join')}
                  tone="ivory"
                  disabled={!hasName}
                />
                <div
                  className="p-[22px] rounded-[14px] text-cream border"
                  style={{ background: '#0a0503', borderColor: '#c88a4c33' }}
                >
                  <div className="font-display font-bold text-xl mb-2.5">Quick play</div>
                  <div className="flex gap-2">
                    {[2, 3, 4].map((n) => (
                      <button
                        key={n}
                        onClick={() => createRoom(n)}
                        disabled={!hasName}
                        className="flex-1 rounded-[10px] text-cream"
                        style={{
                          padding: '10px 6px', background: '#2a1a0a', border: '1px solid #c88a4c55',
                          opacity: hasName ? 1 : 0.5,
                          cursor: hasName ? 'pointer' : 'not-allowed',
                        }}
                      >
                        <div className="text-[22px] font-display font-bold">{n}</div>
                        <div className="text-[11px] tracking-wider uppercase opacity-70">players</div>
                      </button>
                    ))}
                  </div>
                  <div className="h-3" />
                  <StatRow label="Your rank" value="Bone-carver · 612" />
                  <StatRow label="Games played" value="84" />
                  <StatRow label="Longest streak" value="6 wins" />
                </div>
              </div>
              {!hasName && (
                <div className="text-cream/60 text-[13px] mt-3 italic">
                  Tell us your name to pull up a chair.
                </div>
              )}
            </>
          )}

          {mode === 'join' && (
            <JoinPanel
              onBack={() => setMode('home')}
              onJoin={joinWith}
              error={joinErr}
              name={name}
            />
          )}

          {mode === 'create' && (
            <CreatePanel
              socket={socket}
              name={name} setName={setName}
              avatar={avatar} setAvatar={setAvatar}
              seats={seats} setSeats={setSeats}
              points={points} setPoints={setPoints}
              onBack={backToHome}
              onCreate={() => onCreateRoom?.({ name, avatar, seats, points })}
              room={room}
              allReady={allReady}
              isHost={isHost}
              onStart={onStart}
            />
          )}
        </div>
      </WoodFrame>
    </div>
  );
}

function WoodFrame({ children }) {
  return (
    <div className="min-h-screen p-6 bg-wood-grain">
      <div
        className="rounded-[14px] overflow-hidden"
        style={{ boxShadow: '0 30px 80px rgba(0,0,0,.6), inset 0 0 0 2px #2a1a0a, inset 0 0 0 5px #c88a4c44' }}
      >
        {children}
      </div>
    </div>
  );
}

function LogoMark() {
  return (
    <div
      className="w-14 h-14 rounded-xl grid place-items-center"
      style={{
        background: 'linear-gradient(180deg,#0e5a3a,#073a25)',
        border: '2px solid #c88a4c',
        boxShadow: '0 6px 0 #3d230f, 0 10px 24px rgba(0,0,0,.45)',
      }}
    >
      <svg width="36" height="36" viewBox="0 0 100 100">
        <rect x="8" y="28" width="84" height="44" rx="8" fill="#f7efde" stroke="#1a1410" strokeWidth="2" transform="rotate(-12 50 50)" />
        <line x1="50" y1="22" x2="50" y2="78" stroke="#1a1410" strokeWidth="2" transform="rotate(-12 50 50)" />
        <circle cx="30" cy="50" r="5" fill="#1a1410" transform="rotate(-12 50 50)" />
        <circle cx="66" cy="42" r="5" fill="#1a1410" transform="rotate(-12 50 50)" />
        <circle cx="74" cy="58" r="5" fill="#1a1410" transform="rotate(-12 50 50)" />
      </svg>
    </div>
  );
}

function BigCard({ title, body, cta, onClick, tone, disabled }) {
  const isB = tone === 'brass';
  const base = {
    background: isB ? 'linear-gradient(180deg,#e8b86b,#b1813f)' : 'linear-gradient(180deg,#f5ead2,#efe1bf)',
    border: isB ? '2px solid #7a4a24' : '2px solid #b1813f',
  };
  const shadow = isB
    ? '0 6px 0 #7a4a24, 0 14px 24px rgba(0,0,0,.35)'
    : '0 6px 0 #b1813f, 0 14px 24px rgba(0,0,0,.35)';
  const pressed = isB ? '0 3px 0 #7a4a24' : '0 3px 0 #b1813f';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="text-left rounded-[14px] relative"
      style={{
        padding: '26px 26px 22px',
        color: '#2a1a0a',
        transition: 'transform .12s, box-shadow .12s',
        boxShadow: shadow,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...base,
      }}
      onMouseDown={(e) => { if (disabled) return; e.currentTarget.style.transform = 'translateY(3px)'; e.currentTarget.style.boxShadow = pressed; }}
      onMouseUp={(e) => { if (disabled) return; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = shadow; }}
      onMouseLeave={(e) => { if (disabled) return; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = shadow; }}
    >
      <div className="font-display font-black text-[30px] leading-[1.05]">{title}</div>
      <div className="mt-2 text-sm opacity-80 max-w-[280px]">{body}</div>
      <div
        className="mt-4 inline-flex items-center gap-2 rounded-full font-semibold text-[13px] tracking-wide"
        style={{ background: '#2a1a0a', color: '#f5ead2', padding: '8px 14px' }}
      >
        {cta} <span aria-hidden>→</span>
      </div>
    </button>
  );
}

function PlayingAsBar({ name, setName, avatar, setAvatar }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  return (
    <div
      className="flex items-center gap-3 mt-2 rounded-[14px]"
      style={{
        padding: '14px 16px',
        background: 'rgba(10,5,3,.55)',
        border: '1px solid #c88a4c33',
      }}
    >
      <div className="text-[11px] tracking-widest uppercase text-brass font-bold shrink-0">Playing as</div>
      <div className="relative shrink-0">
        <button
          onClick={() => setPickerOpen((v) => !v)}
          aria-label="Change avatar"
          className="grid place-items-center rounded-full"
          style={{
            width: 44, height: 44, fontSize: 24,
            background: 'linear-gradient(180deg,#f5ead2,#d6c28d)',
            border: '2px solid #b1813f',
            boxShadow: '0 3px 0 #7a4a24',
          }}
        >{avatar}</button>
        {pickerOpen && (
          <div
            className="absolute z-10 flex flex-wrap gap-1.5"
            style={{
              top: 52, left: 0, width: 220, padding: 8,
              background: '#0a0503', border: '1px solid #c88a4c55',
              borderRadius: 10, boxShadow: '0 10px 24px rgba(0,0,0,.5)',
            }}
          >
            {AVATARS.map((a) => (
              <button
                key={a}
                onClick={() => { setAvatar(a); setPickerOpen(false); }}
                style={{
                  width: 38, height: 38, borderRadius: 8, fontSize: 20,
                  background: avatar === a ? '#e8b86b' : '#2a1a0a',
                  border: avatar === a ? '2px solid #7a4a24' : '1px solid #c88a4c55',
                }}
              >{a}</button>
            ))}
          </div>
        )}
      </div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value.slice(0, 16))}
        placeholder="Your name"
        className="flex-1 font-semibold"
        style={{
          background: '#0a0503', color: '#f5ead2',
          border: '1px solid #c88a4c55', borderRadius: 10,
          padding: '10px 14px', fontSize: 15,
        }}
      />
    </div>
  );
}

function StatRow({ label, value }) {
  return (
    <div className="flex justify-between text-[13px] py-2 text-cream/80" style={{ borderTop: '1px dashed #c88a4c22' }}>
      <span>{label}</span><b>{value}</b>
    </div>
  );
}

function JoinPanel({ onBack, onJoin, error, name }) {
  const [val, setVal] = useState('');
  const trimmed = (name || '').trim();
  const canJoin = val.length === 4 && trimmed.length > 0;
  return (
    <Panel>
      <BackButton onClick={onBack} />
      <div className="font-display font-black text-[36px] text-cream">Join a room</div>
      <div className="text-cream/60 text-sm max-w-[440px]">
        Enter the 4-letter code your host shared.
        {trimmed ? <> You’ll walk in as <b className="text-cream">{trimmed}</b>.</> : <> Set your name on the home screen first.</>}
      </div>

      <div className="flex gap-2.5 mt-[22px]">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="grid place-items-center font-display font-black"
            style={{
              width: 72, height: 92, borderRadius: 10,
              background: '#f5ead2', fontSize: 44, color: '#2a1a0a',
              boxShadow: '0 4px 0 #b1813f, inset 0 0 0 2px #b1813f',
            }}
          >{val[i] || ''}</div>
        ))}
      </div>
      <input
        autoFocus
        value={val}
        onChange={(e) => setVal(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4))}
        placeholder="Type code…"
        className="font-mono"
        style={{
          marginTop: 22, background: '#0a0503', color: '#f5ead2',
          border: '2px solid #c88a4c55', borderRadius: 10,
          padding: '12px 14px', width: 260, letterSpacing: 6, fontSize: 18,
        }}
      />
      {error && <div className="text-[#ff9d6c] text-[13px] mt-2">{error}</div>}
      <div>
        <button
          disabled={!canJoin}
          onClick={() => onJoin(val)}
          className="font-extrabold rounded-[12px]"
          style={{
            marginTop: 22, padding: '14px 22px',
            background: 'linear-gradient(180deg,#e8b86b,#b1813f)',
            color: '#2a1a0a', border: '2px solid #7a4a24',
            boxShadow: '0 5px 0 #7a4a24, 0 12px 20px rgba(0,0,0,.4)',
            fontSize: 16, letterSpacing: 0.3,
            opacity: canJoin ? 1 : 0.4,
            cursor: canJoin ? 'pointer' : 'not-allowed',
          }}
        >Walk in →</button>
      </div>
    </Panel>
  );
}

function CreatePanel({
  socket,
  name, setName, avatar, setAvatar,
  seats, setSeats, points, setPoints,
  onBack, onCreate, room, allReady, isHost, onStart,
}) {
  const code = room?.code || '????';
  const members = room?.members || [];
  const hasRoom = !!room;
  const started = !!room?.started;
  const effSeats = room?.seats ?? seats;
  const effPoints = room?.points ?? points;
  const canEditSettings = !hasRoom || (isHost && !started);
  const canEditProfile = !started;

  // Debounced name emit while in a room
  useEffect(() => {
    if (!hasRoom || !socket) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    const t = setTimeout(() => {
      socket.emit('updateProfile', { name: trimmed });
    }, 350);
    return () => clearTimeout(t);
  }, [name, hasRoom, socket]);

  function pickAvatar(a) {
    setAvatar(a);
    if (hasRoom && socket) socket.emit('updateProfile', { avatar: a });
  }
  function pickSeats(n) {
    setSeats(n);
    if (hasRoom && socket) socket.emit('updateSettings', { seats: n });
  }
  function pickPoints(p) {
    setPoints(p);
    if (hasRoom && socket) socket.emit('updateSettings', { points: p });
  }

  return (
    <Panel>
      <BackButton onClick={onBack} />

      <div className="grid gap-7 items-start" style={{ gridTemplateColumns: '1.2fr 1fr' }}>
        <div>
          <div className="font-display font-black text-[40px] text-cream leading-none">Your room</div>
          <div className="text-cream/60 text-sm mt-1">Share this code. We’ll hold the seats.</div>

          <div className="flex gap-2.5 mt-[22px]">
            {code.split('').map((c, i) => (
              <div
                key={i}
                className="grid place-items-center font-display font-black"
                style={{
                  width: 80, height: 100, borderRadius: 10,
                  background: '#f5ead2', fontSize: 54, color: '#2a1a0a',
                  boxShadow: '0 4px 0 #b1813f, inset 0 0 0 2px #b1813f',
                }}
              >{c}</div>
            ))}
            {hasRoom && (
              <button
                onClick={() => navigator.clipboard?.writeText(code)}
                className="self-center font-semibold text-[13px] tracking-wide"
                style={{
                  marginLeft: 10, padding: '10px 14px', borderRadius: 10,
                  background: '#2a1a0a', color: '#f5ead2', border: '1px solid #c88a4c55',
                }}
              >📋 Copy</button>
            )}
          </div>

          <div className="mt-7">
            <Label>House rules</Label>
            <div className="grid grid-cols-3 gap-2.5 mt-2.5">
              <RuleChip label="Variant" value="Draw" />
              <RuleChip label="Deal" value={effSeats <= 2 ? '7 tiles' : '6 tiles'} />
              <RuleChip label="Set" value="Highest double" />
            </div>
            <div className="h-3" />
            <Label>Play to</Label>
            <div className="flex gap-2 mt-2.5">
              {[50, 100, 150, 250].map((p) => (
                <button
                  key={p}
                  disabled={!canEditSettings}
                  onClick={() => pickPoints(p)}
                  className="font-bold rounded-[10px]"
                  style={{
                    padding: '10px 14px',
                    background: effPoints === p ? '#e8b86b' : '#2a1a0a',
                    color: effPoints === p ? '#2a1a0a' : '#f5ead2',
                    border: effPoints === p ? '2px solid #7a4a24' : '1px solid #c88a4c55',
                    opacity: canEditSettings ? 1 : 0.6,
                  }}
                >{p} pts</button>
              ))}
            </div>

            <div className="h-4" />
            <Label>Seats</Label>
            <div className="flex gap-2 mt-2.5">
              {[2, 3, 4].map((n) => {
                const tooFew = hasRoom && n < members.length;
                const disabled = !canEditSettings || tooFew;
                return (
                  <button
                    key={n}
                    disabled={disabled}
                    title={tooFew ? 'Too many players seated' : undefined}
                    onClick={() => pickSeats(n)}
                    className="font-bold rounded-[10px]"
                    style={{
                      padding: '10px 16px',
                      background: effSeats === n ? '#e8b86b' : '#2a1a0a',
                      color: effSeats === n ? '#2a1a0a' : '#f5ead2',
                      border: effSeats === n ? '2px solid #7a4a24' : '1px solid #c88a4c55',
                      opacity: disabled ? 0.5 : 1,
                      cursor: disabled ? 'not-allowed' : 'pointer',
                    }}
                  >{n} players</button>
                );
              })}
            </div>
          </div>
        </div>

        <div>
          <Label>You</Label>
          <div className="flex gap-2.5 items-center mt-2.5">
            <AvatarBubble avatar={avatar} />
            <input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 16))}
              disabled={!canEditProfile}
              className="flex-1"
              style={{
                background: '#0a0503', color: '#f5ead2',
                border: '1px solid #c88a4c55', borderRadius: 10,
                padding: '12px 14px', fontSize: 16,
                opacity: canEditProfile ? 1 : 0.6,
              }}
            />
          </div>
          <div className="flex gap-1.5 mt-2.5 flex-wrap">
            {AVATARS.map((a) => (
              <button
                key={a}
                disabled={!canEditProfile}
                onClick={() => pickAvatar(a)}
                style={{
                  width: 42, height: 42, borderRadius: 10, fontSize: 22,
                  background: avatar === a ? '#e8b86b' : '#2a1a0a',
                  border: avatar === a ? '2px solid #7a4a24' : '1px solid #c88a4c55',
                  opacity: canEditProfile ? 1 : 0.6,
                  cursor: canEditProfile ? 'pointer' : 'not-allowed',
                }}
              >{a}</button>
            ))}
          </div>

          <div className="h-4" />
          <Label>At the table</Label>
          <div
            className="mt-2.5 overflow-hidden"
            style={{ background: '#0a0503', borderRadius: 12, border: '1px solid #c88a4c33' }}
          >
            {Array.from({ length: effSeats }).map((_, i) => {
              const m = members[i];
              return (
                <div
                  key={i}
                  className="flex items-center gap-3"
                  style={{
                    padding: '12px 14px',
                    borderTop: i === 0 ? 'none' : '1px solid #c88a4c22',
                    color: m ? '#f5ead2' : 'rgba(245,234,210,.27)',
                  }}
                >
                  {m ? <AvatarBubble avatar={m.avatar} size={34} /> : <EmptyBubble />}
                  <div className="flex-1">
                    <div className="font-semibold">{m ? m.name : 'Waiting…'}</div>
                    <div className="text-[11px] opacity-70 tracking-wider uppercase">
                      {m ? (m.host ? 'Host' : (m.ready ? 'Ready' : 'Connecting…')) : 'Empty seat'}
                    </div>
                  </div>
                  {m && m.ready && <span style={{ color: '#7fd599', fontSize: 13 }}>●</span>}
                  {m && !m.ready && <Spinner />}
                </div>
              );
            })}
          </div>

          {!hasRoom ? (
            <button
              onClick={onCreate}
              className="w-full font-extrabold rounded-[12px]"
              style={{
                marginTop: 18, padding: '14px 22px',
                background: 'linear-gradient(180deg,#e8b86b,#b1813f)',
                color: '#2a1a0a', border: '2px solid #7a4a24',
                boxShadow: '0 5px 0 #7a4a24, 0 12px 20px rgba(0,0,0,.4)',
                fontSize: 16, letterSpacing: 0.3,
              }}
            >Create room →</button>
          ) : (
            <button
              onClick={onStart}
              disabled={!isHost}
              className="w-full font-extrabold rounded-[12px]"
              style={{
                marginTop: 18, padding: '14px 22px',
                background: 'linear-gradient(180deg,#e8b86b,#b1813f)',
                color: '#2a1a0a', border: '2px solid #7a4a24',
                boxShadow: '0 5px 0 #7a4a24, 0 12px 20px rgba(0,0,0,.4)',
                fontSize: 16, letterSpacing: 0.3,
                opacity: isHost ? 1 : 0.5,
                cursor: isHost ? 'pointer' : 'not-allowed',
              }}
            >{isHost ? (allReady ? 'Start the round →' : 'Start now (fill with bots) →') : 'Waiting for host…'}</button>
          )}
        </div>
      </div>
    </Panel>
  );
}

function Panel({ children }) {
  return (
    <div
      className="mt-2.5 rounded-[14px] p-[26px]"
      style={{ background: 'rgba(10,5,3,.35)', border: '1px solid #c88a4c22' }}
    >{children}</div>
  );
}
function BackButton({ onClick }) {
  return (
    <button onClick={onClick} className="text-[13px] text-cream/70 mb-3.5 py-1">← Back</button>
  );
}
function RuleChip({ label, value }) {
  return (
    <div style={{ background: '#0a0503', border: '1px solid #c88a4c33', borderRadius: 10, padding: '10px 12px' }}>
      <div className="text-[10px] tracking-wider uppercase text-cream/50">{label}</div>
      <div className="font-display font-bold text-lg text-cream">{value}</div>
    </div>
  );
}
function Label({ children }) {
  return <div className="text-[11px] tracking-widest uppercase text-brass font-bold">{children}</div>;
}
function AvatarBubble({ avatar, size = 44 }) {
  return (
    <div
      className="grid place-items-center rounded-full"
      style={{
        width: size, height: size, fontSize: size * 0.55,
        background: 'linear-gradient(180deg,#f5ead2,#d6c28d)',
        border: '2px solid #b1813f',
        boxShadow: '0 3px 0 #7a4a24',
      }}
    >{avatar}</div>
  );
}
function EmptyBubble() {
  return <div style={{ width: 34, height: 34, borderRadius: '50%', border: '2px dashed #c88a4c55' }} />;
}
function Spinner() {
  return (
    <div
      className="animate-spin"
      style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #c88a4c55', borderTopColor: '#e8b86b' }}
    />
  );
}
