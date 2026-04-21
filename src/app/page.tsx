'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { DominoPiece, PlacedPiece } from '@/types/game';
import GameBoard from '@/components/GameBoard';
import PlayerHand from '@/components/PlayerHand';
import GameControls from '@/components/GameControls';
import PlayerInfo from '@/components/PlayerInfo';
import { canPlayPiece, getPlayablePieces, getBoardEnds } from '@/lib/dominoLogic';

interface Player {
  id: string;
  name: string;
  pieceCount: number;
  isReady: boolean;
  isHost: boolean;
}

interface GameState {
  gameId: string;
  players: Player[];
  board: PlacedPiece[];
  currentPlayer: string;
  stockCount: number;
  status: 'lobby' | 'playing' | 'finished';
  winner: string | null;
}

type ViewMode = 'menu' | 'create' | 'join' | 'lobby';

function generateGameId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function Home() {
  const socketRef = useRef<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myHand, setMyHand] = useState<DominoPiece[]>([]);
  const [myId, setMyId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [gameId, setGameId] = useState('');
  const [joinGameId, setJoinGameId] = useState('');
  const [selectedPiece, setSelectedPiece] = useState<DominoPiece | null>(null);
  const [pendingPiece, setPendingPiece] = useState<DominoPiece | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('menu');
  const [isHost, setIsHost] = useState(false);
  const [lobbyPlayers, setLobbyPlayers] = useState<Player[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    const newSocket = io(window.location.origin, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('Connected to server, socket id:', newSocket.id);
      setMyId(newSocket.id);
    });

    newSocket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      setError('Connection failed. Please refresh.');
    });

    newSocket.on('gameCreated', ({ playerId, gameId: gid }: { playerId: string; gameId: string }) => {
      setMyId(playerId);
      setIsHost(true);
      setGameId(gid);
      setViewMode('lobby');
    });

    newSocket.on('gameJoined', ({ playerId, gameId: gid }: { playerId: string; gameId: string }) => {
      setMyId(playerId);
      setIsHost(false);
      setGameId(gid);
      setViewMode('lobby');
    });

    newSocket.on('lobbyUpdate', ({ players }: { players: Player[] }) => {
      setLobbyPlayers(players);
      const me = players.find((p) => p.id === newSocket.id);
      if (me) {
        setIsReady(me.isReady);
      }
    });

    newSocket.on('gameStarted', (state: { gameId: string; players: Player[]; currentPlayer: string; hand: DominoPiece[]; stockCount: number }) => {
      setGameState({
        gameId: state.gameId,
        players: state.players,
        board: [],
        currentPlayer: state.currentPlayer,
        stockCount: state.stockCount,
        status: 'playing',
        winner: null,
      });
      setMyHand(state.hand);
      setViewMode('playing' as ViewMode);
    });

    newSocket.on('piecePlayed', ({ playerId, pieceId, board, nextPlayer, stockCount }: { playerId: string; pieceId: string; board: PlacedPiece[]; nextPlayer: string; stockCount: number }) => {
      setGameState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          board,
          currentPlayer: nextPlayer,
          stockCount,
          players: prev.players.map((p) =>
            p.id === playerId ? { ...p, pieceCount: p.pieceCount - 1 } : p
          ),
        };
      });

      if (playerId === newSocket.id) {
        setMyHand((prev) => prev.filter((p) => p.id !== pieceId));
        setSelectedPiece(null);
        setPendingPiece(null);
      }
    });

    newSocket.on('pieceDrawn', ({ piece }: { piece: DominoPiece }) => {
      setMyHand((prev) => [...prev, piece]);
    });

    newSocket.on('turnChanged', ({ nextPlayer, stockCount, drawerId, drawerPieceCount }: { nextPlayer: string; stockCount: number; drawerId?: string; drawerPieceCount?: number }) => {
      setGameState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          currentPlayer: nextPlayer,
          stockCount,
          players: drawerId && drawerPieceCount !== undefined
            ? prev.players.map((p) => p.id === drawerId ? { ...p, pieceCount: drawerPieceCount } : p)
            : prev.players,
        };
      });
    });

    newSocket.on('gameEnded', ({ winner }: { winner: string | null }) => {
      setGameState((prev) => {
        if (!prev) return prev;
        return { ...prev, status: 'finished', winner };
      });
    });

    newSocket.on('error', ({ message }: { message: string }) => {
      setError(message);
      setTimeout(() => setError(null), 3000);
    });

    newSocket.on('playerLeft', () => {
      setError('Opponent left the game');
      setViewMode('menu');
    });

    socketRef.current = newSocket;

    return () => {
      newSocket.close();
    };
  }, []);

  const playablePieces = useMemo(
    () => gameState ? getPlayablePieces(myHand, gameState.board) : [],
    [myHand, gameState]
  );

  const handleCreateGame = useCallback(() => {
    const newGameId = generateGameId();
    setGameId(newGameId);
    if (socketRef.current && playerName) {
      socketRef.current.emit('createGame', { gameId: newGameId, playerName });
    }
  }, [playerName]);

  const handleJoinGame = useCallback(() => {
    const trimmedGameId = joinGameId.trim().toUpperCase();
    console.log('Joining game:', trimmedGameId, 'Socket connected:', socketRef.current?.connected);
    if (socketRef.current && socketRef.current.connected && playerName && trimmedGameId) {
      setIsJoining(true);
      socketRef.current.emit('joinGame', { gameId: trimmedGameId, playerName });
      setTimeout(() => setIsJoining(false), 5000);
    } else if (!socketRef.current?.connected) {
      setError('Not connected to server. Please refresh.');
    } else {
      setError('Please fill in all fields');
    }
  }, [playerName, joinGameId]);

  const handleToggleReady = useCallback(() => {
    if (socketRef.current && gameId) {
      const newReadyState = !isReady;
      setIsReady(newReadyState);
      socketRef.current.emit('setReady', { gameId, isReady: newReadyState });
    }
  }, [gameId, isReady]);

  const handleStartGame = useCallback(() => {
    if (socketRef.current && gameId && isHost) {
      socketRef.current.emit('startGame', { gameId });
    }
  }, [gameId, isHost]);

  const handlePieceClick = useCallback((piece: DominoPiece) => {
    if (!gameState || gameState.currentPlayer !== myId) return;

    if (selectedPiece?.id === piece.id) {
      const ends = getBoardEnds(gameState.board);

      if (!ends) {
        socketRef.current?.emit('playPiece', { gameId, pieceId: piece.id, position: 'left' });
        setSelectedPiece(null);
        return;
      }

      const canPlayLeft = piece.left === ends.left || piece.right === ends.left;
      const canPlayRight = piece.left === ends.right || piece.right === ends.right;

      if (canPlayLeft && canPlayRight && ends.left !== ends.right) {
        setPendingPiece(piece);
        setSelectedPiece(null);
      } else {
        const position: 'left' | 'right' = canPlayRight ? 'right' : 'left';
        socketRef.current?.emit('playPiece', { gameId, pieceId: piece.id, position });
        setSelectedPiece(null);
      }
    } else if (canPlayPiece(piece, gameState.board)) {
      setPendingPiece(null);
      setSelectedPiece(piece);
    }
  }, [selectedPiece, gameState, myId, gameId]);

  const handlePlayPosition = useCallback((position: 'left' | 'right') => {
    if (!pendingPiece) return;
    socketRef.current?.emit('playPiece', { gameId, pieceId: pendingPiece.id, position });
    setPendingPiece(null);
  }, [pendingPiece, gameId]);

  const handleDraw = useCallback(() => {
    if (socketRef.current && gameId && gameState?.currentPlayer === myId) {
      socketRef.current.emit('drawPiece', { gameId });
    }
  }, [gameId, gameState, myId]);

  const handlePass = useCallback(() => {
    if (socketRef.current && gameId && gameState?.currentPlayer === myId) {
      socketRef.current.emit('passTurn', { gameId });
    }
  }, [gameId, gameState, myId]);

  // Menu View
  if (viewMode === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">Domino Game</h1>
          <p className="text-gray-500 text-center mb-8">Play Dominoes online with friends!</p>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">{error}</div>
          )}

          <div className="space-y-3">
            <button
              onClick={() => setViewMode('create')}
              className="w-full py-4 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-colors text-lg"
            >
              Create New Game
            </button>
            <button
              onClick={() => setViewMode('join')}
              className="w-full py-4 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors text-lg"
            >
              Join Game
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Create Game View
  if (viewMode === 'create') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">Create Game</h1>
          <p className="text-gray-500 text-center mb-8">Create a room and invite friends!</p>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">{error}</div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-gray-900 placeholder-gray-400 bg-white"
                placeholder="Enter your name"
              />
            </div>
            <button
              onClick={handleCreateGame}
              disabled={!playerName}
              className="w-full py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              Create Game Room
            </button>
            <button
              onClick={() => setViewMode('menu')}
              className="w-full py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Back to Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Join Game View
  if (viewMode === 'join') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">Join Game</h1>
          <p className="text-gray-500 text-center mb-8">Enter room code to join</p>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">{error}</div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-gray-900 placeholder-gray-400 bg-white"
                placeholder="Enter your name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Room Code</label>
              <input
                type="text"
                value={joinGameId}
                onChange={(e) => {
                  setJoinGameId(e.target.value.trim().toUpperCase());
                  if (error) setError(null);
                }}
                onPaste={(e) => {
                  const pasted = e.clipboardData.getData('text');
                  setJoinGameId(pasted.trim().toUpperCase());
                  if (error) setError(null);
                  e.preventDefault();
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-gray-900 placeholder-gray-400 bg-white uppercase tracking-widest font-mono text-center text-lg"
                placeholder="XXXXXX"
                maxLength={6}
              />
            </div>
            <button
              onClick={handleJoinGame}
              disabled={!playerName || !joinGameId || isJoining}
              className="w-full py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              {isJoining ? 'Joining...' : 'Join Game'}
            </button>
            <button
              onClick={() => setViewMode('menu')}
              className="w-full py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Back to Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Lobby View
  if (viewMode === 'lobby') {
    const allPlayersReady = lobbyPlayers.length >= 1 && lobbyPlayers.every((p) => p.isReady);
    const canStart = isHost && allPlayersReady && lobbyPlayers.length === 2;

    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">Game Lobby</h1>

          <div className="bg-gray-100 rounded-lg p-4 mb-6 text-center">
            <p className="text-sm text-gray-500 mb-1">Room Code:</p>
            <p className="text-3xl font-mono font-bold text-amber-700 tracking-widest">{gameId}</p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(gameId);
                setError('Copied to clipboard!');
                setTimeout(() => setError(null), 2000);
              }}
              className="mt-2 px-3 py-1 bg-gray-200 carsor-pointer hover:bg-gray-300 rounded text-sm text-black"
            >
              Copy Code
            </button>
          </div>

          {error === 'Copied to clipboard!' ? (
            <p className="mb-4 text-center text-green-600 text-sm">{error}</p>
          ) : error ? (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">{error}</div>
          ) : null}

          <div className="space-y-3 mb-6">
            <h3 className="font-semibold text-gray-700">Players ({lobbyPlayers.length}/2):</h3>
            {lobbyPlayers.map((player) => (
              <div
                key={player.id}
                className={`flex items-center justify-between p-3 rounded-lg border-2 ${
                  player.isReady ? 'bg-green-50 border-green-500' : 'bg-gray-50 border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-800">{player.name}</span>
                  {player.isHost && (
                    <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded">Host</span>
                  )}
                  {player.id === myId && (
                    <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded">You</span>
                  )}
                </div>
                <span
                  className={`text-sm font-medium ${
                    player.isReady ? 'text-green-600' : 'text-gray-400'
                  }`}
                >
                  {player.isReady ? '✓ Ready' : 'Not Ready'}
                </span>
              </div>
            ))}
            {lobbyPlayers.length < 2 && (
              <div className="p-3 bg-gray-100 rounded-lg text-center text-gray-500 italic">
                Waiting for another player...
              </div>
            )}
          </div>

          <div className="space-y-3">
            <button
              onClick={handleToggleReady}
              className={`w-full py-3 font-semibold rounded-lg transition-colors ${
                isReady
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
              }`}
            >
              {isReady ? '✓ Ready' : 'Click to Ready'}
            </button>

            {isHost && (
              <button
                onClick={handleStartGame}
                disabled={!canStart}
                className={`w-full py-3 font-semibold rounded-lg transition-colors ${
                  canStart
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {lobbyPlayers.length < 2
                  ? 'Waiting for players...'
                  : !allPlayersReady
                  ? 'Waiting for players to be ready...'
                  : 'Start Game'}
              </button>
            )}

            <button
              onClick={() => window.location.reload()}
              className="w-full py-2 text-red-600 hover:text-red-800 transition-colors"
            >
              Leave Room
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Game Finished
  if (gameState?.status === 'finished') {
    const isWinner = gameState.winner === myId;
    const opponent = gameState.players.find((p) => p.id !== myId);

    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md w-full">
          <h2 className={`text-4xl font-bold mb-4 ${isWinner ? 'text-green-600' : 'text-red-600'}`}>
            {isWinner ? '🎉 You Won!' : opponent?.id === gameState.winner ? '😔 You Lost!' : "🤝 It's a Draw!"}
          </h2>
          <p className="text-gray-600 mb-6">Thanks for playing!</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-colors"
          >
            Play Again
          </button>
        </div>
      </div>
    );
  }

  // Game Playing View
  const opponent = gameState?.players.find((p) => p.id !== myId);
  const me = gameState?.players.find((p) => p.id === myId);
  const isMyTurn = gameState?.currentPlayer === myId;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-100 to-amber-200 p-4">
      <div className="max-w-5xl mx-auto space-y-4">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Domino Game</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 font-mono">Room: {gameId}</span>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg text-red-700 font-bold"
            >
              Leave
            </button>
          </div>
        </header>

        {error && (
          <div className="p-3 bg-red-100 text-red-700 rounded-lg">{error}</div>
        )}

        {opponent && (
          <PlayerInfo
            playerName={opponent.name}
            pieceCount={opponent.pieceCount}
            isCurrentPlayer={gameState?.currentPlayer === opponent.id}
            isOpponent
          />
        )}

        <GameBoard board={gameState?.board || []} />

        {pendingPiece && (
          <div className="flex items-center justify-center gap-4 p-4 bg-white rounded-xl border-2 border-amber-400 shadow-md">
            <span className="text-gray-700 font-medium">Choose which side to play:</span>
            <button
              onClick={() => handlePlayPosition('left')}
              className="px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors"
            >
              ← Left
            </button>
            <button
              onClick={() => handlePlayPosition('right')}
              className="px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors"
            >
              Right →
            </button>
            <button
              onClick={() => setPendingPiece(null)}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        <GameControls
          stockCount={gameState?.stockCount || 0}
          onDraw={handleDraw}
          onPass={handlePass}
          canDraw={isMyTurn && playablePieces.length === 0 && (gameState?.stockCount || 0) > 0}
          canPass={isMyTurn && playablePieces.length === 0 && (gameState?.stockCount || 0) === 0}
        />

        {me && (
          <PlayerInfo
            playerName={me.name}
            pieceCount={me.pieceCount}
            isCurrentPlayer={isMyTurn}
          />
        )}

        <PlayerHand
          hand={myHand}
          playablePieces={playablePieces}
          selectedPiece={selectedPiece}
          onPieceClick={handlePieceClick}
          isCurrentPlayer={isMyTurn}
        />
      </div>
    </div>
  );
}
