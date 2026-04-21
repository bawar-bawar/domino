const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const os = require('os');

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const games = new Map();

function generateDominoSet() {
  const pieces = [];
  for (let i = 0; i <= 6; i++) {
    for (let j = i; j <= 6; j++) {
      pieces.push({
        left: i,
        right: j,
        id: `${i}-${j}`,
      });
    }
  }
  return shuffleArray(pieces);
}

function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

function createGame(gameId, hostId) {
  return {
    id: gameId,
    players: [],
    board: [],
    stock: [],
    currentPlayerIndex: 0,
    status: 'lobby',
    winner: null,
    startedAt: new Date(),
    hostId,
  };
}

function addPlayerToGame(game, playerId, playerName, isHost) {
  const player = {
    id: playerId,
    name: playerName,
    hand: [],
    pieceCount: 7,
    isReady: false,
    isHost,
  };

  game.players.push(player);
  return player;
}

function dealCards(game) {
  const allPieces = generateDominoSet();
  console.log('dealCards: total pieces:', allPieces.length, 'players:', game.players.length);
  game.players.forEach((player, index) => {
    const startIndex = index * 7;
    player.hand = allPieces.slice(startIndex, startIndex + 7);
    player.pieceCount = player.hand.length;
    console.log('  Player', index, 'hand:', player.hand.length);
  });
  game.stock = allPieces.slice(game.players.length * 7);
  console.log('  Stock after deal:', game.stock.length);

  // Classic rule: player with the highest double goes first
  let highestDouble = -1;
  let firstPlayerIndex = 0;
  game.players.forEach((player, index) => {
    for (let d = 6; d >= 0; d--) {
      if (d > highestDouble && player.hand.some((p) => p.left === d && p.right === d)) {
        highestDouble = d;
        firstPlayerIndex = index;
        break;
      }
    }
  });
  game.currentPlayerIndex = firstPlayerIndex;
}

// Board array is always kept in visual left-to-right order:
// board[0] = leftmost piece, board[last] = rightmost piece.
// Left placements use unshift(), right placements use push().
function getBoardEnds(board) {
  if (board.length === 0) return null;
  return {
    left: board[0].left,
    right: board[board.length - 1].right,
  };
}

function isBlocked(game) {
  return game.players.every(
    (p) => !p.hand.some((piece) => canPlayPiece(piece, game.board))
  ) && game.stock.length === 0;
}

function canPlayPiece(piece, board) {
  if (board.length === 0) return true;

  const ends = getBoardEnds(board);
  if (!ends) return true;

  return (
    piece.left === ends.left ||
    piece.right === ends.left ||
    piece.left === ends.right ||
    piece.right === ends.right
  );
}

function playPiece(game, playerId, pieceId, position) {
  const player = game.players.find((p) => p.id === playerId);
  if (!player) return { success: false, error: 'Player not found' };

  const playerIndex = game.players.findIndex((p) => p.id === playerId);
  if (playerIndex !== game.currentPlayerIndex) {
    return { success: false, error: 'Not your turn' };
  }

  const pieceIndex = player.hand.findIndex((p) => p.id === pieceId);
  if (pieceIndex === -1) return { success: false, error: 'Piece not in hand' };

  const piece = player.hand[pieceIndex];

  if (!canPlayPiece(piece, game.board)) {
    return { success: false, error: 'Cannot play this piece' };
  }

  const ends = getBoardEnds(game.board);
  let placedPiece;

  if (game.board.length === 0) {
    placedPiece = { ...piece, x: 0, y: 0, rotation: 0 };
    game.board.push(placedPiece);
  } else {
    // Auto-correct position if client sent wrong side
    const canLeft = piece.left === ends.left || piece.right === ends.left;
    const canRight = piece.left === ends.right || piece.right === ends.right;
    if (position === 'right' && !canRight && canLeft) position = 'left';
    if (position === 'left' && !canLeft && canRight) position = 'right';

    const targetValue = position === 'left' ? ends.left : ends.right;
    let newLeft = piece.left;
    let newRight = piece.right;

    if (position === 'left') {
      if (piece.right !== targetValue) [newLeft, newRight] = [newRight, newLeft];
      placedPiece = { ...piece, left: newLeft, right: newRight, x: game.board[0].x - 60, y: 0, rotation: 0 };
      game.board.unshift(placedPiece);
    } else {
      if (piece.left !== targetValue) [newLeft, newRight] = [newRight, newLeft];
      placedPiece = { ...piece, left: newLeft, right: newRight, x: game.board[game.board.length - 1].x + 60, y: 0, rotation: 0 };
      game.board.push(placedPiece);
    }
  }

  player.hand.splice(pieceIndex, 1);
  player.pieceCount = player.hand.length;

  if (player.hand.length === 0) {
    game.status = 'finished';
    game.winner = playerId;
    return { success: true };
  }

  game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;

  return { success: true };
}

function drawPiece(game, playerId) {
  const player = game.players.find((p) => p.id === playerId);
  if (!player) return { success: false, error: 'Player not found' };

  const playerIndex = game.players.findIndex((p) => p.id === playerId);
  if (playerIndex !== game.currentPlayerIndex) {
    return { success: false, error: 'Not your turn' };
  }

  if (game.stock.length === 0) {
    console.log('drawPiece: stock is empty');
    return { success: false, error: 'Stock is empty' };
  }

  const piece = game.stock.pop();
  player.hand.push(piece);
  player.pieceCount = player.hand.length;
  console.log('drawPiece: drawn 1 tile, stock now:', game.stock.length);

  const canPlay = player.hand.some((p) => canPlayPiece(p, game.board));
  if (!canPlay && game.stock.length === 0) {
    game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
  }

  return { success: true, piece, pieceCount: player.pieceCount };
}

function getPlayablePieces(playerHand, board) {
  return playerHand.filter((piece) => canPlayPiece(piece, board));
}

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('createGame', ({ gameId, playerName }) => {
      console.log('Create game request:', gameId, 'from player:', playerName);
      let game = games.get(gameId);
      if (game) {
        socket.emit('error', { message: 'Game already exists' });
        return;
      }

      game = createGame(gameId, socket.id);
      games.set(gameId, game);
      console.log('Game created:', gameId, 'Total games:', games.size);

      const player = addPlayerToGame(game, socket.id, playerName, true);
      socket.join(gameId);

      socket.emit('gameCreated', {
        playerId: socket.id,
        gameId,
        isHost: true,
      });
    });

    socket.on('joinGame', ({ gameId, playerName }) => {
      console.log('Join game request:', gameId, 'from player:', playerName);
      console.log('Available games:', Array.from(games.keys()));
      const game = games.get(gameId);
      if (!game) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }

      if (game.players.length >= 2) {
        socket.emit('error', { message: 'Game is full' });
        return;
      }

      const player = addPlayerToGame(game, socket.id, playerName, false);
      socket.join(gameId);

      socket.emit('gameJoined', {
        playerId: socket.id,
        gameId,
        isHost: false,
      });

      io.to(gameId).emit('lobbyUpdate', {
        players: game.players.map((p) => ({
          id: p.id,
          name: p.name,
          isReady: p.isReady,
          isHost: p.isHost,
        })),
      });
    });

    socket.on('setReady', ({ gameId, isReady }) => {
      const game = games.get(gameId);
      if (!game) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }

      const player = game.players.find((p) => p.id === socket.id);
      if (!player) {
        socket.emit('error', { message: 'Player not found' });
        return;
      }

      player.isReady = isReady;

      io.to(gameId).emit('lobbyUpdate', {
        players: game.players.map((p) => ({
          id: p.id,
          name: p.name,
          isReady: p.isReady,
          isHost: p.isHost,
        })),
      });
    });

    socket.on('startGame', ({ gameId }) => {
      const game = games.get(gameId);
      if (!game) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }

      if (game.hostId !== socket.id) {
        socket.emit('error', { message: 'Only host can start the game' });
        return;
      }

      const allReady = game.players.every((p) => p.isReady);
      if (!allReady) {
        socket.emit('error', { message: 'Not all players are ready' });
        return;
      }

      dealCards(game);
      game.status = 'playing';
      console.log('Game started - players:', game.players.length, 'stock:', game.stock.length);

      game.players.forEach((player) => {
        io.to(player.id).emit('gameStarted', {
          gameId,
          players: game.players.map((p) => ({
            id: p.id,
            name: p.name,
            pieceCount: p.pieceCount,
          })),
          currentPlayer: game.players[game.currentPlayerIndex].id,
          hand: player.hand,
          stockCount: game.stock.length,
        });
      });
    });

    socket.on('playPiece', ({ gameId, pieceId, position }) => {
      const game = games.get(gameId);
      if (!game) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }

      const result = playPiece(game, socket.id, pieceId, position);
      if (!result.success) {
        socket.emit('error', { message: result.error });
        return;
      }

      const currentPlayer = game.players[game.currentPlayerIndex];

      io.to(gameId).emit('piecePlayed', {
        playerId: socket.id,
        pieceId,
        position,
        board: game.board,
        nextPlayer: currentPlayer.id,
        stockCount: game.stock.length,
      });

      if (game.status === 'finished') {
        io.to(gameId).emit('gameEnded', { winner: game.winner });
      } else if (isBlocked(game)) {
        // Classic rule: if blocked, player with lowest pip count wins
        const scores = game.players.map((p) => ({
          id: p.id,
          score: p.hand.reduce((sum, t) => sum + t.left + t.right, 0),
        }));
        const winner = scores.reduce((a, b) => (a.score <= b.score ? a : b));
        io.to(gameId).emit('gameEnded', { winner: winner.id, reason: 'blocked', scores });
      }
    });

    socket.on('drawPiece', ({ gameId }) => {
      const game = games.get(gameId);
      if (!game) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }

      const result = drawPiece(game, socket.id);
      if (!result.success) {
        socket.emit('error', { message: result.error });
        return;
      }

      socket.emit('pieceDrawn', { piece: result.piece, pieceCount: result.pieceCount });

      const currentPlayer = game.players[game.currentPlayerIndex];
      io.to(gameId).emit('turnChanged', {
        nextPlayer: currentPlayer.id,
        stockCount: game.stock.length,
        drawerId: socket.id,
        drawerPieceCount: result.pieceCount,
      });
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      for (const [gameId, game] of games.entries()) {
        const playerIndex = game.players.findIndex((p) => p.id === socket.id);
        if (playerIndex !== -1) {
          const player = game.players[playerIndex];
          game.players.splice(playerIndex, 1);

          // If host leaves, delete the game
          if (player.isHost) {
            io.to(gameId).emit('gameEnded', { winner: null, reason: 'Host left' });
            games.delete(gameId);
          } else {
            socket.to(gameId).emit('playerLeft', { playerId: socket.id });
          }

          if (game.players.length === 0 && games.has(gameId)) {
            games.delete(gameId);
          }
          break;
        }
      }
    });
  });

  server.listen(3000, '0.0.0.0', (err) => {
    if (err) throw err;
    const localIP = getLocalIP();
    console.log('> Ready on http://localhost:3000');
    console.log('> Network access: http://' + localIP + ':3000');
  });
});
