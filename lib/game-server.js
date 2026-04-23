import {
  buildBoneyard,
  canPlay,
  handHasMove,
  attachTile,
  tilePips,
} from './domino-engine.js';

const AVATARS = ['🦊', '🐻', '🦉', '🐢', '🐰', '🐼', '🦁', '🐺'];

const rooms = new Map();

function pickRoomCode() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let s;
  do {
    s = '';
    for (let i = 0; i < 4; i++) s += letters[Math.floor(Math.random() * letters.length)];
  } while (rooms.has(s));
  return s;
}

function publicMembers(room) {
  return room.members.map((m) => ({
    id: m.id,
    name: m.name,
    avatar: m.avatar,
    host: !!m.host,
    ready: !!m.ready,
    bot: !!m.bot,
  }));
}

function broadcastRoomUpdate(io, room) {
  io.to(room.code).emit('roomUpdate', {
    code: room.code,
    seats: room.seats,
    points: room.points,
    members: publicMembers(room),
    hostId: room.hostId,
    started: !!room.started,
  });
}

function broadcastState(io, room) {
  if (!room.game) return;
  const g = room.game;
  const players = room.members.map((m) => ({
    id: m.id, name: m.name, avatar: m.avatar, bot: !!m.bot,
  }));
  room.members.forEach((m, idx) => {
    if (m.bot || !m.socketId) return;
    io.to(m.socketId).emit('stateUpdate', {
      players,
      myIdx: idx,
      myHand: g.hands[idx],
      handCounts: g.hands.map((h) => h.length),
      chain: g.chain,
      turn: g.turn,
      boneyardCount: g.bone.length,
      log: g.log.slice(-40),
      totals: [...room.totals],
      pointsTarget: room.points,
    });
  });
}

function startRound(io, room) {
  const bone = buildBoneyard();
  const handSize = room.members.length <= 2 ? 7 : 6;
  const hands = room.members.map(() => []);
  for (let i = 0; i < handSize; i++) {
    for (let p = 0; p < room.members.length; p++) {
      hands[p].push(bone.pop());
    }
  }
  let starter = 0;
  let bestDouble = -1;
  hands.forEach((h, i) => {
    h.forEach((t) => {
      if (t.a === t.b && t.a > bestDouble) {
        bestDouble = t.a;
        starter = i;
      }
    });
  });
  room.game = {
    hands,
    bone,
    chain: [],
    turn: starter,
    lastPass: 0,
    ended: false,
    log: [{ who: 'dealer', text: `Dealt ${handSize} tiles each. ${room.members[starter].name} opens.` }],
  };
  room.round = (room.round || 0) + 1;
  io.to(room.code).emit('gameStart', { round: room.round });
  broadcastRoomUpdate(io, room);
  broadcastState(io, room);
  scheduleNextTurn(io, room);
}

function startGame(io, room) {
  if (room.started) return;
  const needed = room.seats - room.members.length;
  for (let i = 0; i < needed; i++) {
    const usedA = new Set(room.members.map((m) => m.avatar));
    const name = `Bot ${i + 1}`;
    const avatar = AVATARS.find((a) => !usedA.has(a)) || '🐼';
    room.members.push({
      id: `bot_${i}_${Date.now()}`,
      socketId: null,
      name,
      avatar,
      host: false,
      ready: true,
      bot: true,
    });
  }
  room.started = true;
  room.totals = room.members.map(() => 0);
  room.round = 0;
  startRound(io, room);
}

function scheduleNextTurn(io, room) {
  if (!room.game || room.game.ended) return;
  clearTimeout(room._botTimer);
  const cur = room.members[room.game.turn];
  if (cur && cur.bot) {
    room._botTimer = setTimeout(() => botTakeTurn(io, room), 1400 + Math.random() * 900);
  }
}

function checkRoundEnd(io, room) {
  const g = room.game;
  const winnerByDomino = g.hands.findIndex((h) => h.length === 0);
  let result = null;
  if (winnerByDomino >= 0) {
    const pts = g.hands.reduce(
      (s, h, i) => (i === winnerByDomino ? s : s + h.reduce((ss, t) => ss + tilePips(t), 0)),
      0,
    );
    result = { winnerIdx: winnerByDomino, pts, reason: 'domino' };
  } else if (
    g.bone.length === 0 &&
    g.chain.length &&
    room.members.every((_, i) => !handHasMove(g.hands[i], g.chain))
  ) {
    const pipSums = g.hands.map((h) => h.reduce((s, t) => s + tilePips(t), 0));
    const min = Math.min(...pipSums);
    const widx = pipSums.indexOf(min);
    const pts = pipSums.reduce((a, b, i) => (i === widx ? a : a + b), 0);
    result = { winnerIdx: widx, pts, reason: 'blocked' };
  }
  if (!result) return false;

  g.ended = true;
  room.totals[result.winnerIdx] = (room.totals[result.winnerIdx] || 0) + result.pts;
  const matchWinnerIdx = room.totals.findIndex((v) => v >= room.points);
  const matchWinner =
    matchWinnerIdx >= 0
      ? {
          idx: matchWinnerIdx,
          name: room.members[matchWinnerIdx].name,
          avatar: room.members[matchWinnerIdx].avatar,
        }
      : null;

  io.to(room.code).emit('roundOver', {
    winnerIdx: result.winnerIdx,
    winnerName: room.members[result.winnerIdx].name,
    isYouMap: room.members.map((m) => !!m.socketId),
    pts: result.pts,
    reason: result.reason,
    totals: [...room.totals],
    pointsTarget: room.points,
    matchWinner,
    chain: g.chain,
    players: room.members.map((m) => ({
      id: m.id, name: m.name, avatar: m.avatar, bot: !!m.bot,
    })),
  });
  return true;
}

function botTakeTurn(io, room) {
  const g = room.game;
  if (!g || g.ended) return;
  const turn = g.turn;
  const hand = g.hands[turn];
  const chain = g.chain;
  const playable = hand
    .map((t) => ({ t, sides: canPlay(t, chain) }))
    .filter((x) => x.sides.left || x.sides.right);

  if (playable.length) {
    playable.sort((a, b) => tilePips(b.t) - tilePips(a.t));
    const pick = playable[0];
    const side = pick.sides.right ? 'right' : 'left';
    g.chain = attachTile({ ...pick.t, placedBy: turn }, chain, side);
    g.hands[turn] = hand.filter((x) => x.id !== pick.t.id);
    g.turn = (turn + 1) % room.members.length;
    g.lastPass = 0;
    g.log.push({ who: room.members[turn].name, text: `played ${pick.t.a}|${pick.t.b}` });
  } else {
    while (g.bone.length) {
      const drawn = g.bone.pop();
      g.hands[turn].push(drawn);
      const c = canPlay(drawn, chain);
      if (c.left || c.right) break;
    }
    const second = g.hands[turn]
      .map((t) => ({ t, sides: canPlay(t, chain) }))
      .filter((x) => x.sides.left || x.sides.right);
    if (second.length) {
      second.sort((a, b) => tilePips(b.t) - tilePips(a.t));
      const pick = second[0];
      const side = pick.sides.right ? 'right' : 'left';
      g.chain = attachTile({ ...pick.t, placedBy: turn }, chain, side);
      g.hands[turn] = g.hands[turn].filter((x) => x.id !== pick.t.id);
      g.turn = (turn + 1) % room.members.length;
      g.lastPass = 0;
      g.log.push({ who: room.members[turn].name, text: `drew & played ${pick.t.a}|${pick.t.b}` });
    } else {
      g.turn = (turn + 1) % room.members.length;
      g.lastPass += 1;
      g.log.push({ who: room.members[turn].name, text: 'passed' });
    }
  }
  broadcastState(io, room);
  if (!checkRoundEnd(io, room)) scheduleNextTurn(io, room);
}

export function registerGameHandlers(io) {
  io.on('connection', (socket) => {
    let currentRoom = null;

    socket.on('createRoom', ({ name, avatar, seats, points }, cb) => {
      const safeSeats = Math.max(2, Math.min(4, Number(seats) || 2));
      const safePts = [50, 100, 150, 250].includes(Number(points)) ? Number(points) : 100;
      const code = pickRoomCode();
      const member = {
        id: socket.id,
        socketId: socket.id,
        name: String(name || 'Player').slice(0, 16),
        avatar: avatar || AVATARS[0],
        host: true,
        ready: true,
        bot: false,
      };
      const room = {
        code,
        seats: safeSeats,
        points: safePts,
        members: [member],
        hostId: socket.id,
        started: false,
        totals: [],
        round: 0,
        game: null,
      };
      rooms.set(code, room);
      socket.join(code);
      currentRoom = room;
      cb?.({ ok: true, code, playerId: socket.id });
      broadcastRoomUpdate(io, room);
    });

    socket.on('joinRoom', ({ code, name, avatar }, cb) => {
      const room = rooms.get(String(code || '').toUpperCase());
      if (!room) return cb?.({ ok: false, error: 'Room not found' });
      if (room.started) return cb?.({ ok: false, error: 'Game already in progress' });
      if (room.members.length >= room.seats) return cb?.({ ok: false, error: 'Room is full' });
      const member = {
        id: socket.id,
        socketId: socket.id,
        name: String(name || 'Player').slice(0, 16),
        avatar: avatar || AVATARS[0],
        host: false,
        ready: true,
        bot: false,
      };
      room.members.push(member);
      socket.join(room.code);
      currentRoom = room;
      cb?.({ ok: true, code: room.code, playerId: socket.id });
      broadcastRoomUpdate(io, room);
    });

    socket.on('updateSettings', ({ seats, points }, cb) => {
      const room = currentRoom;
      if (!room) return cb?.({ ok: false, error: 'No room' });
      if (room.hostId !== socket.id) return cb?.({ ok: false, error: 'Host only' });
      if (room.started) return cb?.({ ok: false, error: 'Game already started' });
      if (seats !== undefined) {
        const n = Math.max(2, Math.min(4, Number(seats) || 2));
        if (n < room.members.length) return cb?.({ ok: false, error: 'Too many members for that seat count' });
        room.seats = n;
      }
      if (points !== undefined) {
        if (![50, 100, 150, 250].includes(Number(points))) return cb?.({ ok: false, error: 'Invalid points' });
        room.points = Number(points);
      }
      cb?.({ ok: true });
      broadcastRoomUpdate(io, room);
    });

    socket.on('updateProfile', ({ name, avatar }, cb) => {
      const room = currentRoom;
      if (!room) return cb?.({ ok: false, error: 'No room' });
      if (room.started) return cb?.({ ok: false, error: 'Game already started' });
      const me = room.members.find((m) => m.socketId === socket.id);
      if (!me) return cb?.({ ok: false, error: 'Not a member' });
      if (name !== undefined) me.name = String(name || 'Player').slice(0, 16) || 'Player';
      if (avatar !== undefined && AVATARS.includes(avatar)) me.avatar = avatar;
      cb?.({ ok: true });
      broadcastRoomUpdate(io, room);
    });

    socket.on('startGame', () => {
      const room = currentRoom;
      if (!room || room.hostId !== socket.id || room.started) return;
      startGame(io, room);
    });

    socket.on('playTile', ({ tileId, side }) => {
      const room = currentRoom;
      if (!room || !room.game || room.game.ended) return;
      const g = room.game;
      const myIdx = room.members.findIndex((m) => m.socketId === socket.id);
      if (myIdx < 0 || myIdx !== g.turn) return;
      const tile = g.hands[myIdx].find((t) => t.id === tileId);
      if (!tile) return;
      const p = canPlay(tile, g.chain);
      let chosen = side;
      if (!chosen) chosen = p.right ? 'right' : p.left ? 'left' : null;
      if (!chosen) return;
      if (chosen === 'left' && !p.left) return;
      if (chosen === 'right' && !p.right) return;
      g.chain = attachTile({ ...tile, placedBy: myIdx }, g.chain, chosen);
      g.hands[myIdx] = g.hands[myIdx].filter((t) => t.id !== tileId);
      g.turn = (myIdx + 1) % room.members.length;
      g.lastPass = 0;
      g.log.push({ who: room.members[myIdx].name, text: `played ${tile.a}|${tile.b}` });
      broadcastState(io, room);
      if (!checkRoundEnd(io, room)) scheduleNextTurn(io, room);
    });

    socket.on('drawTile', () => {
      const room = currentRoom;
      if (!room || !room.game || room.game.ended) return;
      const g = room.game;
      const myIdx = room.members.findIndex((m) => m.socketId === socket.id);
      if (myIdx < 0 || myIdx !== g.turn) return;
      if (!g.bone.length) return;
      while (g.bone.length) {
        const drawn = g.bone.pop();
        g.hands[myIdx].push(drawn);
        const c = canPlay(drawn, g.chain);
        if (c.left || c.right) break;
      }
      g.log.push({ who: room.members[myIdx].name, text: 'drew from boneyard' });
      broadcastState(io, room);
    });

    socket.on('passTurn', () => {
      const room = currentRoom;
      if (!room || !room.game || room.game.ended) return;
      const g = room.game;
      const myIdx = room.members.findIndex((m) => m.socketId === socket.id);
      if (myIdx < 0 || myIdx !== g.turn) return;
      if (handHasMove(g.hands[myIdx], g.chain)) return;
      g.turn = (myIdx + 1) % room.members.length;
      g.lastPass += 1;
      g.log.push({ who: room.members[myIdx].name, text: 'passed' });
      broadcastState(io, room);
      if (!checkRoundEnd(io, room)) scheduleNextTurn(io, room);
    });

    socket.on('chat', ({ text }) => {
      const room = currentRoom;
      if (!room) return;
      const me = room.members.find((m) => m.socketId === socket.id);
      if (!me) return;
      const msg = {
        who: me.name,
        avatar: me.avatar,
        text: String(text || '').slice(0, 300),
        ts: Date.now(),
      };
      if (!msg.text.trim()) return;
      io.to(room.code).emit('chat', msg);
    });

    socket.on('nextRound', ({ newMatch } = {}) => {
      const room = currentRoom;
      if (!room || !room.game || !room.game.ended) return;
      if (room.hostId !== socket.id) return;
      if (newMatch) {
        room.totals = room.members.map(() => 0);
        room.round = 0;
      }
      startRound(io, room);
    });

    socket.on('leaveRoom', () => cleanup());
    socket.on('disconnect', () => cleanup());

    function cleanup() {
      const room = currentRoom;
      if (!room) return;
      const idx = room.members.findIndex((m) => m.socketId === socket.id);
      if (idx < 0) {
        currentRoom = null;
        return;
      }
      if (room.game && !room.game.ended) {
        const m = room.members[idx];
        m.bot = true;
        m.socketId = null;
        if (!m.name.endsWith(' (bot)')) m.name = `${m.name} (bot)`;
        if (room.hostId === socket.id) {
          const newHost = room.members.find((x) => !x.bot);
          if (newHost) {
            room.hostId = newHost.socketId;
            newHost.host = true;
          }
        }
        const humansLeft = room.members.some((x) => !x.bot);
        if (!humansLeft) {
          clearTimeout(room._botTimer);
          rooms.delete(room.code);
          currentRoom = null;
          return;
        }
        broadcastRoomUpdate(io, room);
        broadcastState(io, room);
        if (room.game.turn === idx) scheduleNextTurn(io, room);
      } else {
        room.members.splice(idx, 1);
        if (!room.members.some((m) => !m.bot)) {
          rooms.delete(room.code);
        } else {
          if (room.hostId === socket.id) {
            const newHost = room.members.find((m) => !m.bot);
            if (newHost) {
              room.hostId = newHost.socketId;
              newHost.host = true;
            }
          }
          broadcastRoomUpdate(io, room);
        }
      }
      currentRoom = null;
    }
  });
}
