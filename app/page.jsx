'use client';

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import Lobby from '@/components/Lobby';
import GameTable from '@/components/GameTable';
import EndScreen from '@/components/EndScreen';
import TweaksPanel from '@/components/TweaksPanel';

const TWEAK_DEFAULTS = {
  felt: 'forest',
  tile: 'ivory',
  zoom: 1.0,
  difficulty: 'normal',
  chat: true,
};

const FELT_VARS = {
  forest: ['#14704a', '#0a4a30', '#052416'],
  midnight: ['#1a2d4a', '#0d1a2e', '#050a18'],
  clay: ['#8a4a2a', '#5c2f18', '#2a1408'],
};

export default function HomePage() {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [screen, setScreen] = useState('lobby');
  const [room, setRoom] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [roundResult, setRoundResult] = useState(null);
  const [chatLog, setChatLog] = useState([]);
  const [tweaks, setTweaks] = useState(TWEAK_DEFAULTS);
  const [tweaksVisible, setTweaksVisible] = useState(false);

  // Hydrate tweaks from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('bonepile.tweaks');
      if (saved) setTweaks((t) => ({ ...t, ...JSON.parse(saved) }));
    } catch (e) {}
  }, []);

  // Persist tweaks + apply felt colors
  useEffect(() => {
    try { localStorage.setItem('bonepile.tweaks', JSON.stringify(tweaks)); } catch (e) {}
    const f = FELT_VARS[tweaks.felt] || FELT_VARS.forest;
    document.documentElement.style.setProperty('--felt-a', f[0]);
    document.documentElement.style.setProperty('--felt-b', f[1]);
    document.documentElement.style.setProperty('--felt-c', f[2]);
  }, [tweaks]);

  // Connect socket
  useEffect(() => {
    const s = io({ path: '/api/socket' });
    setSocket(s);
    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));
    s.on('roomUpdate', (r) => setRoom(r));
    s.on('gameStart', () => {
      setRoundResult(null);
      setChatLog((prev) => [...prev, { who: 'system', text: 'Round started.' }]);
      setScreen('game');
    });
    s.on('stateUpdate', (state) => setGameState(state));
    s.on('chat', (msg) => setChatLog((l) => [...l, msg]));
    s.on('roundOver', (res) => {
      setRoundResult(res);
      setScreen('end');
    });
    return () => { s.disconnect(); };
  }, []);

  function updateTweaks(patch) {
    setTweaks((t) => ({ ...t, ...patch }));
  }

  function onCreateRoom(cfg) {
    if (!socket) return;
    socket.emit('createRoom', cfg);
  }
  function onJoinRoom(cfg, cb) {
    if (!socket) return;
    socket.emit('joinRoom', cfg, cb);
  }
  function onStart() { socket?.emit('startGame'); }
  function onRematch() {
    if (!socket) return;
    const newMatch = !!roundResult?.matchWinner;
    socket.emit('nextRound', { newMatch });
  }
  function onLeave() {
    socket?.emit('leaveRoom');
    setRoom(null);
    setGameState(null);
    setRoundResult(null);
    setChatLog([]);
    setScreen('lobby');
  }

  const isHost = !!(room && socket && room.hostId === socket.id);

  return (
    <>
      {screen === 'lobby' && (
        <Lobby
          socket={socket}
          room={room}
          isConnected={connected}
          onCreateRoom={onCreateRoom}
          onJoinRoom={onJoinRoom}
          onLeaveRoom={onLeave}
          onStart={onStart}
        />
      )}
      {screen === 'game' && gameState && room && (
        <GameTable
          socket={socket}
          room={room}
          state={gameState}
          chatLog={chatLog}
          showChat={tweaks.chat}
          onExit={onLeave}
          zoom={tweaks.zoom}
        />
      )}
      {screen === 'end' && roundResult && (
        <EndScreen
          result={roundResult}
          room={room}
          onRematch={onRematch}
          onLobby={onLeave}
          canRematch={isHost}
        />
      )}
      <TweaksPanel tweaks={tweaks} setTweaks={updateTweaks} visible={tweaksVisible} />
      <button
        onClick={() => setTweaksVisible((v) => !v)}
        aria-label="Toggle tweaks"
        className="fixed bottom-4 left-4 z-[998] w-10 h-10 rounded-full text-[18px] grid place-items-center"
        style={{
          background: 'rgba(10,5,3,.93)', border: '1px solid #c88a4c55', color: '#e8b86b',
        }}
      >⚙</button>
    </>
  );
}
