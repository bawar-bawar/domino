'use client';

import { PlacedPiece } from '@/types/game';
import DominoPiece from './DominoPiece';

interface GameBoardProps {
  board: PlacedPiece[];
}

export default function GameBoard({ board }: GameBoardProps) {
  if (board.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-amber-50 rounded-xl border-2 border-dashed border-amber-200">
        <p className="text-amber-400 text-lg">Board is empty - play the first piece!</p>
      </div>
    );
  }

  return (
    <div className="relative h-48 bg-amber-50 rounded-xl border-2 border-amber-200 overflow-hidden overflow-x-auto">
      <div className="flex items-center justify-center min-w-full h-full px-8">
        <div className="flex items-center" style={{ gap: '5px' }}>
          {board.map((piece, index) => (
            <div key={`${piece.id}-${index}`} className="shrink-0">
              <DominoPiece piece={piece} rotation={piece.rotation} boardTile />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
