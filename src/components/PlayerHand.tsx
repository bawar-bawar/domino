'use client';

import { DominoPiece } from '@/types/game';
import DominoPieceComponent from './DominoPiece';

interface PlayerHandProps {
  hand: DominoPiece[];
  playablePieces: DominoPiece[];
  selectedPiece: DominoPiece | null;
  onPieceClick: (piece: DominoPiece) => void;
  isCurrentPlayer: boolean;
}

export default function PlayerHand({
  hand,
  playablePieces,
  selectedPiece,
  onPieceClick,
  isCurrentPlayer,
}: PlayerHandProps) {
  const isPlayable = (piece: DominoPiece) => {
    if (!isCurrentPlayer) return false;
    return playablePieces.some((p) => p.id === piece.id);
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold">Your Hand ({hand.length} pieces)</h3>
        {!isCurrentPlayer && (
          <span className="text-gray-400 text-sm">Waiting for opponent...</span>
        )}
        {isCurrentPlayer && playablePieces.length === 0 && hand.length > 0 && (
          <span className="text-amber-400 text-sm">No playable pieces - draw from stock</span>
        )}
        {isCurrentPlayer && playablePieces.length > 0 && (
          <span className="text-green-400 text-sm">Your turn! Select a piece</span>
        )}
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        {hand.map((piece) => {
          const playable = isPlayable(piece);
          const dimmed = isCurrentPlayer && !playable;
          return (
            <div key={piece.id} className={dimmed ? 'opacity-35 grayscale' : ''}>
              <DominoPieceComponent
                piece={piece}
                isPlayable={playable}
                isSelected={selectedPiece?.id === piece.id}
                onClick={() => isCurrentPlayer && onPieceClick(piece)}
                forceVertical={true}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
