import { Server as NetServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { NextApiResponse } from 'next';
import { GameState, Player, GameEvent } from '@/types/game';
import {
  createGame,
  addPlayerToGame,
  playPiece,
  drawPiece,
  canPlayPiece,
  getPlayablePieces,
} from './dominoLogic';

export type NextApiResponseServerIO = NextApiResponse & {
  socket: {
    server: NetServer & {
      io?: SocketIOServer;
    };
  };
};

const games = new Map<string, GameState>();

export function getGame(gameId: string): GameState | undefined {
  return games.get(gameId);
}

export function createNewGame(gameId: string): GameState {
  const game = createGame(gameId);
  games.set(gameId, game);
  return game;
}

export function initSocketServer(server: NetServer): SocketIOServer {
  const io = new SocketIOServer(server, {
    path: '/api/socket',
    addTrailingSlash: false,
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('joinGame', ({ gameId, playerName }: { gameId: string; playerName: string }) => {
      let game = games.get(gameId);
      if (!game) {
        game = createNewGame(gameId);
      }

      if (game.players.length >= 2) {
        socket.emit('error', { message: 'Game is full' });
        return;
      }

      const player = addPlayerToGame(game, socket.id, playerName);
      socket.join(gameId);

      socket.emit('gameJoined', {
        playerId: socket.id,
        gameId,
        hand: player.hand,
      });

      socket.to(gameId).emit('playerJoined', {
        playerId: socket.id,
        playerName,
        playerCount: game.players.length,
      });

      if (game.players.length === 2) {
        game.status = 'playing';
        io.to(gameId).emit('gameStarted', {
          gameId,
          players: game.players.map((p) => ({ id: p.id, name: p.name, pieceCount: p.pieceCount })),
          currentPlayer: game.players[game.currentPlayerIndex].id,
        });
      }
    });

    socket.on('playPiece', ({ gameId, pieceId, position }: { gameId: string; pieceId: string; position: 'left' | 'right' }) => {
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
      });

      if (game.status === 'finished') {
        io.to(gameId).emit('gameEnded', { winner: game.winner });
      }
    });

    socket.on('drawPiece', ({ gameId }: { gameId: string }) => {
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

      socket.emit('pieceDrawn', { piece: result.piece });

      const currentPlayer = game.players[game.currentPlayerIndex];
      io.to(gameId).emit('turnChanged', {
        nextPlayer: currentPlayer.id,
        stockCount: game.stock.length,
      });
    });

    socket.on('getValidMoves', ({ gameId }: { gameId: string }) => {
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

      const playablePieces = getPlayablePieces(player.hand, game.board);
      socket.emit('validMoves', { playablePieces });
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      for (const [gameId, game] of games.entries()) {
        const playerIndex = game.players.findIndex((p) => p.id === socket.id);
        if (playerIndex !== -1) {
          game.players.splice(playerIndex, 1);
          socket.to(gameId).emit('playerLeft', { playerId: socket.id });
          if (game.players.length === 0) {
            games.delete(gameId);
          }
          break;
        }
      }
    });
  });

  return io;
}
