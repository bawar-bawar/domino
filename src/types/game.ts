export interface DominoPiece {
  left: number;
  right: number;
  id: string;
}

export interface Player {
  id: string;
  name: string;
  hand: DominoPiece[];
  pieceCount: number;
  isReady: boolean;
  isHost: boolean;
}

export interface PlacedPiece extends DominoPiece {
  x: number;
  y: number;
  rotation: number;
}

export type GameStatus = 'lobby' | 'playing' | 'finished';

export interface GameState {
  id: string;
  players: Player[];
  board: PlacedPiece[];
  stock: DominoPiece[];
  currentPlayerIndex: number;
  status: GameStatus;
  winner: string | null;
  startedAt: Date;
  hostId: string;
}

export type GameEvent =
  | { type: 'playerJoined'; player: Player }
  | { type: 'playerLeft'; playerId: string }
  | { type: 'playerReady'; playerId: string; isReady: boolean }
  | { type: 'gameStarted'; state: GameState }
  | { type: 'piecePlayed'; piece: PlacedPiece; playerId: string }
  | { type: 'pieceDrawn'; playerId: string }
  | { type: 'turnChanged'; playerIndex: number }
  | { type: 'gameEnded'; winner: string | null };

export const MAX_PIPS = 6;
export const PIECES_PER_PLAYER = 7;
