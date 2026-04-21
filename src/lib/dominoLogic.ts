import { DominoPiece, PlacedPiece, Player, GameState, MAX_PIPS, PIECES_PER_PLAYER } from '@/types/game';

export function generateDominoSet(): DominoPiece[] {
  const pieces: DominoPiece[] = [];
  for (let i = 0; i <= MAX_PIPS; i++) {
    for (let j = i; j <= MAX_PIPS; j++) {
      pieces.push({
        left: i,
        right: j,
        id: `${i}-${j}`,
      });
    }
  }
  return shuffleArray(pieces);
}

function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export function createGame(gameId: string): GameState {
  const allPieces = generateDominoSet();
  const stock = allPieces.slice(0, allPieces.length - PIECES_PER_PLAYER * 2);

  return {
    id: gameId,
    players: [],
    board: [],
    stock,
    currentPlayerIndex: 0,
    status: 'lobby',
    winner: null,
    startedAt: new Date(),
    hostId: '',
  };
}

export function addPlayerToGame(game: GameState, playerId: string, playerName: string): Player {
  const allPieces = generateDominoSet();
  const startIndex = game.players.length * PIECES_PER_PLAYER;
  const hand = allPieces.slice(startIndex, startIndex + PIECES_PER_PLAYER);

  const player: Player = {
    id: playerId,
    name: playerName,
    hand,
    pieceCount: hand.length,
    isReady: false,
    isHost: false,
  };

  game.players.push(player);
  return player;
}

export function getBoardEnds(board: PlacedPiece[]): { left: number; right: number } | null {
  if (board.length === 0) return null;
  return {
    left: board[0].left,
    right: board[board.length - 1].right,
  };
}

export function canPlayPiece(piece: DominoPiece, board: PlacedPiece[]): boolean {
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

export function playPiece(
  game: GameState,
  playerId: string,
  pieceId: string,
  position: 'left' | 'right'
): { success: boolean; error?: string } {
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
  let placedPiece: PlacedPiece;

  if (game.board.length === 0) {
    placedPiece = { ...piece, x: 0, y: 0, rotation: 0 };
    game.board.push(placedPiece);
  } else {
    const canLeft = piece.left === ends!.left || piece.right === ends!.left;
    const canRight = piece.left === ends!.right || piece.right === ends!.right;
    if (position === 'right' && !canRight && canLeft) position = 'left';
    if (position === 'left' && !canLeft && canRight) position = 'right';

    const targetValue = position === 'left' ? ends!.left : ends!.right;
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

export function drawPiece(game: GameState, playerId: string): { success: boolean; piece?: DominoPiece; error?: string } {
  const player = game.players.find((p) => p.id === playerId);
  if (!player) return { success: false, error: 'Player not found' };

  const playerIndex = game.players.findIndex((p) => p.id === playerId);
  if (playerIndex !== game.currentPlayerIndex) {
    return { success: false, error: 'Not your turn' };
  }

  if (game.stock.length === 0) {
    return { success: false, error: 'Stock is empty' };
  }

  const piece = game.stock.pop()!;
  player.hand.push(piece);
  player.pieceCount = player.hand.length;

  const canPlay = player.hand.some((p) => canPlayPiece(p, game.board));
  if (!canPlay && game.stock.length === 0) {
    game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
  }

  return { success: true, piece };
}

export function getPlayablePieces(playerHand: DominoPiece[], board: PlacedPiece[]): DominoPiece[] {
  return playerHand.filter((piece) => canPlayPiece(piece, board));
}
