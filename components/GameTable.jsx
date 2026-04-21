'use client';

import { useEffect, useRef, useState } from 'react';
import Tile from './Tile';
import { canPlay, chainEnds, handHasMove } from '@/lib/domino-engine';

export default function GameTable({
  socket,
  room,
  state,
  chatLog,
  showChat,
  onExit,
  zoom = 1,
}) {
  const { code, points } = room;
  const players = state.players;
  const chain = state.chain;
  const turn = state.turn;
  const you = state.myIdx;
  const myHand = state.myHand || [];
  const ends = chainEnds(chain);
  const myTurn = turn === you;
  const boneyardCount = state.boneyardCount;

  const [selected, setSelected] = useState(null);
  const [sideChoice, setSideChoice] = useState(null);
  const [chatOpen, setChatOpen] = useState(true);
  const [chatDraft, setChatDraft] = useState('');
  const [timer, setTimer] = useState(25);

  useEffect(() => {
    setTimer(25);
    const id = setInterval(() => setTimer((t) => Math.max(0, t - 1)), 1000);
    return () => clearInterval(id);
  }, [turn]);

  function playTile(tile, side) {
    if (!socket) return;
    socket.emit('playTile', { tileId: tile.id, side });
    setSelected(null);
    setSideChoice(null);
  }
  function drawTile() { socket?.emit('drawTile'); }
  function passTurn() { socket?.emit('passTurn'); }

  function onTileClick(tile) {
    if (!myTurn) return;
    const p = canPlay(tile, chain);
    if (!p.left && !p.right) return;
    if (!chain.length) { playTile(tile, 'right'); return; }
    if (p.left && p.right) {
      setSelected(tile.id); setSideChoice('both'); return;
    }
    playTile(tile, p.right ? 'right' : 'left');
  }

  function sendChat() {
    if (!chatDraft.trim()) return;
    socket?.emit('chat', { text: chatDraft.trim() });
    setChatDraft('');
  }

  const canAct = myTurn && myHand.some((t) => { const p = canPlay(t, chain); return p.left || p.right; });
  const mustDraw = myTurn && !canAct && boneyardCount > 0;
  const mustPass = myTurn && !canAct && boneyardCount === 0;

  const turnName = players[turn]?.name;

  const felt = {
    position: 'relative',
    margin: '18px 18px 0',
    borderRadius: 16,
    border: '4px solid #3d230f',
    boxShadow: 'inset 0 0 0 2px #c88a4c33, inset 0 0 60px rgba(0,0,0,.5), 0 20px 50px rgba(0,0,0,.5)',
    overflow: 'hidden',
    minHeight: 'calc(100vh - 260px)',
  };

  return (
    <div className="min-h-screen relative bg-wood-grain pt-[60px] pb-[170px]">
      <TopBar
        code={code}
        points={points}
        onExit={onExit}
        turnName={turnName}
        myTurn={myTurn}
        timer={timer}
        boneyardCount={boneyardCount}
      />
      <div style={felt}>
        <FeltBackground />
        <OpponentSeats
          players={players}
          handCounts={state.handCounts}
          turn={turn}
          you={you}
        />
        <BoardChain chain={chain} zoom={zoom} />
        <BoneyardBadge count={boneyardCount} />
        {sideChoice && selected && (
          <SideChooser
            onCancel={() => { setSelected(null); setSideChoice(null); }}
            onLeft={() => playTile(myHand.find((t) => t.id === selected), 'left')}
            onRight={() => playTile(myHand.find((t) => t.id === selected), 'right')}
            ends={ends}
          />
        )}
      </div>

      <YourHand
        hand={myHand}
        chain={chain}
        selectedId={selected}
        myTurn={myTurn}
        onTile={onTileClick}
        onDraw={drawTile}
        onPass={passTurn}
        mustDraw={mustDraw}
        mustPass={mustPass}
        you={players[you]}
        showChat={showChat}
      />

      {showChat && (
        <ChatDock
          open={chatOpen}
          setOpen={setChatOpen}
          chat={chatLog}
          log={state.log || []}
          draft={chatDraft}
          setDraft={setChatDraft}
          onSend={sendChat}
        />
      )}
    </div>
  );
}

function TopBar({ code, points, onExit, turnName, myTurn, timer, boneyardCount }) {
  return (
    <div
      className="fixed top-0 left-0 right-0 z-10 flex items-center justify-between px-[18px]"
      style={{
        height: 60,
        background: 'linear-gradient(180deg,#3d230f,#2a1a0a)',
        borderBottom: '2px solid #c88a4c55',
      }}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={onExit}
          className="font-semibold text-[13px] rounded-[10px]"
          style={{ padding: '8px 14px', background: '#0a0503', color: '#f5ead2', border: '1px solid #c88a4c55' }}
        >← Leave</button>
        <div className="font-display font-black text-[20px] text-brass -tracking-[0.3px]">Bonepile</div>
        <Pill>Room <b>{code}</b></Pill>
        <Pill>First to <b>{points}</b></Pill>
      </div>
      <div className="flex items-center gap-3">
        <div
          className="font-bold text-[13px] rounded-full"
          style={{
            padding: '7px 14px',
            background: myTurn ? 'linear-gradient(180deg,#e8b86b,#b1813f)' : '#2a1a0a',
            color: myTurn ? '#2a1a0a' : '#f5ead2',
            border: '1px solid #c88a4c55',
          }}
        >
          {myTurn ? 'Your turn' : `${turnName || ''}'s turn`}
        </div>
        <div className="font-mono text-[13px]" style={{ color: timer < 10 ? '#ff9d6c' : 'rgba(245,234,210,.8)' }}>
          ⏱ 0:{String(timer).padStart(2, '0')}
        </div>
        <div className="text-[13px] text-cream/80">🦴 {boneyardCount}</div>
      </div>
    </div>
  );
}

function Pill({ children }) {
  return (
    <div
      className="font-mono text-[12px] rounded-full"
      style={{ padding: '6px 12px', background: '#0a0503', color: 'rgba(245,234,210,.8)', border: '1px solid #c88a4c33' }}
    >{children}</div>
  );
}

function FeltBackground() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      preserveAspectRatio="none"
    >
      <defs>
        <radialGradient id="feltGrad" cx="50%" cy="40%" r="80%">
          <stop offset="0" stopColor="var(--felt-a)" />
          <stop offset=".55" stopColor="var(--felt-b)" />
          <stop offset="1" stopColor="var(--felt-c)" />
        </radialGradient>
        <pattern id="feltPat" width="6" height="6" patternUnits="userSpaceOnUse">
          <rect width="6" height="6" fill="transparent" />
          <circle cx="1" cy="1" r=".5" fill="#ffffff08" />
          <circle cx="4" cy="4" r=".5" fill="#00000018" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#feltGrad)" />
      <rect width="100%" height="100%" fill="url(#feltPat)" />
    </svg>
  );
}

function OpponentSeats({ players, handCounts, turn, you }) {
  const others = players
    .map((p, i) => ({ ...p, idx: i }))
    .filter((p) => p.idx !== you);
  const positions = {
    2: ['top'],
    3: ['topL', 'topR'],
    4: ['left', 'top', 'right'],
  };
  const layout = positions[players.length] || ['top'];
  return (
    <>
      {others.map((p, i) => (
        <OpponentBadge
          key={p.id}
          player={p}
          tileCount={handCounts[p.idx]}
          active={turn === p.idx}
          slot={layout[i]}
        />
      ))}
    </>
  );
}

function OpponentBadge({ player, tileCount, active, slot }) {
  const posStyles = {
    top: { top: 18, left: '50%', transform: 'translateX(-50%)' },
    topL: { top: 18, left: '30%', transform: 'translateX(-50%)' },
    topR: { top: 18, left: '70%', transform: 'translateX(-50%)' },
    left: { top: '45%', left: 18, transform: 'translateY(-50%)' },
    right: { top: '45%', right: 18, transform: 'translateY(-50%)' },
  };
  const vertical = slot === 'left' || slot === 'right';
  return (
    <div
      className="absolute z-[3] flex flex-col items-center gap-1.5"
      style={posStyles[slot]}
    >
      <div
        className="flex gap-0.5 justify-center"
        style={{ flexDirection: vertical ? 'column' : 'row' }}
      >
        {Array.from({ length: Math.min(tileCount, 9) }).map((_, i) => (
          <div
            key={i}
            style={{
              width: vertical ? 36 : 18,
              height: vertical ? 18 : 36,
              borderRadius: 3,
              background: 'linear-gradient(180deg,#6b4423,#4d2f15)',
              boxShadow: '0 2px 4px rgba(0,0,0,.4), inset 0 0 0 1px #2a1a0a',
            }}
          />
        ))}
        {tileCount > 9 && (
          <div className="text-cream/70 text-[11px] self-center ml-1">+{tileCount - 9}</div>
        )}
      </div>
      <div
        className="flex items-center gap-2 font-bold text-[13px] rounded-full"
        style={{
          padding: '6px 12px 6px 6px',
          background: active ? 'linear-gradient(180deg,#e8b86b,#b1813f)' : '#2a1a0a',
          color: active ? '#2a1a0a' : '#f5ead2',
          border: `2px solid ${active ? '#7a4a24' : '#c88a4c55'}`,
          boxShadow: active ? '0 0 18px rgba(232,184,107,.5)' : 'none',
        }}
      >
        <span
          className="grid place-items-center rounded-full"
          style={{
            width: 26, height: 26, fontSize: 14,
            background: 'linear-gradient(180deg,#f5ead2,#d6c28d)',
            border: '1px solid #b1813f',
          }}
        >{player.avatar}</span>
        {player.name}
        <span
          className="font-mono text-[11px] rounded-full"
          style={{
            padding: '2px 7px',
            background: active ? '#2a1a0a' : '#0a0503',
            color: active ? '#e8b86b' : 'rgba(245,234,210,.67)',
          }}
        >{tileCount}</span>
      </div>
    </div>
  );
}

function BoardChain({ chain, zoom }) {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    function fit() {
      if (!containerRef.current) return;
      const el = containerRef.current;
      const w = el.scrollWidth;
      const avail = el.parentElement.clientWidth - 60;
      setScale(w > avail ? Math.max(0.4, avail / w) : 1);
    }
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [chain]);

  return (
    <div className="absolute inset-0 grid place-items-center z-[2] pointer-events-none">
      {chain.length === 0 ? (
        <div
          className="font-display italic text-center"
          style={{
            color: 'rgba(245,234,210,.33)', fontSize: 20,
            background: 'rgba(0,0,0,.25)', padding: '18px 26px',
            borderRadius: 14, border: '1px dashed rgba(245,234,210,.2)',
          }}
        >Waiting for the opening double…</div>
      ) : (
        <div
          ref={containerRef}
          className="flex gap-0.5"
          style={{ transform: `scale(${scale * zoom})`, transition: 'transform .3s' }}
        >
          {chain.map((t, i) => {
            const isDouble = t.left === t.right;
            return (
              <div key={t.id || i} className={i === chain.length - 1 ? 'animate-tile-plop' : ''}>
                <Tile a={t.left} b={t.right} orient={isDouble ? 'v' : 'h'} size={44} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BoneyardBadge({ count }) {
  return (
    <div
      className="absolute bottom-[18px] left-[18px] z-[3] flex items-center gap-2 text-[13px] text-cream rounded-[12px]"
      style={{ padding: '8px 14px', background: '#2a1a0a', border: '1px solid #c88a4c55' }}
    >
      <span className="font-display font-bold text-base">Boneyard</span>
      <span className="font-mono">{count}</span>
    </div>
  );
}

function SideChooser({ onCancel, onLeft, onRight, ends }) {
  return (
    <div
      className="absolute inset-0 grid place-items-center z-10"
      style={{ background: 'rgba(0,0,0,.5)' }}
      onClick={onCancel}
    >
      <div
        className="text-center"
        style={{
          background: '#f5ead2', color: '#2a1a0a',
          padding: '22px 26px', borderRadius: 14, minWidth: 320,
          boxShadow: '0 20px 60px rgba(0,0,0,.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="font-display font-black text-[22px]">Which end?</div>
        <div className="text-[13px] opacity-70 mt-1">Your tile fits both sides.</div>
        <div className="flex gap-3.5 mt-[18px] justify-center">
          <button
            onClick={onLeft}
            className="font-bold rounded-[10px]"
            style={{ padding: '12px 18px', background: '#2a1a0a', color: '#f5ead2' }}
          >← Left end · <b>{ends.left}</b></button>
          <button
            onClick={onRight}
            className="font-bold rounded-[10px]"
            style={{ padding: '12px 18px', background: '#2a1a0a', color: '#f5ead2' }}
          >Right end · <b>{ends.right}</b> →</button>
        </div>
      </div>
    </div>
  );
}

function YourHand({ hand, chain, selectedId, myTurn, onTile, onDraw, onPass, mustDraw, mustPass, you, showChat }) {
  if (!you) return null;
  return (
    <div
      className="fixed bottom-[18px] left-[18px]"
      style={{
        right: showChat ? 338 : 18,
        padding: '14px 18px',
        background: 'linear-gradient(180deg, rgba(10,5,3,.9), rgba(10,5,3,.75))',
        border: '1px solid #c88a4c55',
        borderRadius: 14,
        backdropFilter: 'blur(6px)',
        zIndex: 12,
        maxHeight: 150,
        overflow: 'auto',
      }}
    >
      <div className="flex items-center gap-2.5 mb-2">
        <div
          className="grid place-items-center rounded-full"
          style={{
            width: 30, height: 30, fontSize: 16,
            background: 'linear-gradient(180deg,#f5ead2,#d6c28d)',
            border: '2px solid #b1813f',
          }}
        >{you.avatar}</div>
        <div className="text-cream font-bold text-sm">
          {you.name} <span className="text-cream/50 font-medium">· your hand</span>
        </div>
        <div className="flex-1" />
        {mustDraw && (
          <button
            onClick={onDraw}
            className="font-extrabold text-[13px] rounded-[10px]"
            style={{
              padding: '10px 16px',
              background: 'linear-gradient(180deg,#e8b86b,#b1813f)',
              color: '#2a1a0a', border: '2px solid #7a4a24',
              boxShadow: '0 3px 0 #7a4a24',
            }}
          >Draw from boneyard</button>
        )}
        {mustPass && (
          <button
            onClick={onPass}
            className="font-extrabold text-[13px] rounded-[10px]"
            style={{
              padding: '10px 16px',
              background: 'linear-gradient(180deg,#e8b86b,#b1813f)',
              color: '#2a1a0a', border: '2px solid #7a4a24',
              boxShadow: '0 3px 0 #7a4a24',
            }}
          >Pass</button>
        )}
      </div>
      <div className="flex gap-2 flex-wrap items-end justify-center">
        {hand.map((t) => {
          const p = canPlay(t, chain);
          const playable = myTurn && (p.left || p.right);
          return (
            <Tile
              key={t.id}
              a={t.a}
              b={t.b}
              size={52}
              selected={selectedId === t.id}
              playable={playable}
              dim={myTurn && !playable}
              onClick={() => onTile(t)}
              title={`${t.a}|${t.b}`}
            />
          );
        })}
      </div>
    </div>
  );
}

function ChatDock({ open, setOpen, chat, log, draft, setDraft, onSend }) {
  const scrollRef = useRef(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chat, log, open]);
  return (
    <div
      className="fixed right-[20px] flex flex-col overflow-hidden"
      style={{
        top: 78,
        bottom: open ? 130 : undefined,
        width: open ? 300 : 54,
        background: '#0f0805ee',
        border: '1px solid #c88a4c55',
        borderRadius: 14,
        color: '#f5ead2',
        backdropFilter: 'blur(6px)',
        zIndex: 15,
        transition: 'width .2s',
      }}
    >
      <div
        className="flex items-center gap-2"
        style={{
          padding: '10px 12px',
          borderBottom: open ? '1px solid #c88a4c33' : 'none',
        }}
      >
        <button onClick={() => setOpen(!open)} style={{ fontSize: 16, color: '#e8b86b' }}>
          {open ? '×' : '💬'}
        </button>
        {open && <div className="font-display font-bold">Table chat</div>}
      </div>
      {open && (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto text-[13px] leading-[1.4]" style={{ padding: '10px 12px' }}>
            {chat.map((c, i) => (
              <div key={i} className="mb-2 flex gap-2 items-start">
                {c.who === 'system' ? (
                  <div className="text-brass italic text-[12px]">· {c.text}</div>
                ) : (
                  <>
                    <div
                      className="grid place-items-center rounded-full shrink-0"
                      style={{
                        width: 22, height: 22, fontSize: 12,
                        background: 'linear-gradient(180deg,#f5ead2,#d6c28d)',
                      }}
                    >{c.avatar || '👤'}</div>
                    <div>
                      <div className="font-bold text-[12px] text-brass">{c.who}</div>
                      <div>{c.text}</div>
                    </div>
                  </>
                )}
              </div>
            ))}
            <div style={{ height: 1, borderTop: '1px dashed #c88a4c33', margin: '10px 0' }} />
            <div className="text-cream/40 text-[11px] uppercase tracking-wider mb-1.5">Game log</div>
            {log.slice(-8).map((l, i) => (
              <div key={i} className="text-cream/60 text-[12px] mb-0.5">
                <b className="text-cream/80">{l.who}</b> {l.text}
              </div>
            ))}
          </div>
          <div className="flex gap-1.5" style={{ padding: 10, borderTop: '1px solid #c88a4c33' }}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSend()}
              placeholder="Say something…"
              className="flex-1 text-[13px]"
              style={{
                background: '#000', color: '#f5ead2',
                border: '1px solid #c88a4c33', borderRadius: 8,
                padding: '8px 10px',
              }}
            />
            <button
              onClick={onSend}
              className="font-bold"
              style={{ padding: '8px 12px', borderRadius: 8, background: '#e8b86b', color: '#2a1a0a' }}
            >Send</button>
          </div>
        </>
      )}
    </div>
  );
}
