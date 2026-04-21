'use client';

import { DominoPiece as DominoPieceType } from '@/types/game';

interface DominoPieceProps {
  piece: DominoPieceType;
  isPlayable?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  rotation?: number;
  size?: 'sm' | 'md' | 'lg';
  faceDown?: boolean;
  forceVertical?: boolean;
  boardTile?: boolean;
}

export default function DominoPiece({
  piece,
  isPlayable = false,
  isSelected = false,
  onClick,
  rotation = 0,
  size = 'md',
  faceDown = false,
  forceVertical = false,
  boardTile = false,
}: DominoPieceProps) {
  const isDouble = piece.left === piece.right;
  const isHorizontal = !isDouble && !faceDown && !forceVertical;

  const sizeClasses = {
    sm: isHorizontal ? 'w-16 h-8 text-xs' : 'w-8 h-16 text-xs',
    md: isHorizontal ? 'w-24 h-12 text-sm' : 'w-12 h-24 text-sm',
    lg: isHorizontal ? 'w-32 h-16 text-base' : 'w-16 h-32 text-base',
  };

  const dotSizeClasses = {
    sm: 'w-1 h-1',
    md: 'w-1.5 h-1.5',
    lg: 'w-2 h-2',
  };

  const gapClasses = {
    sm: 'gap-0.5',
    md: 'gap-1',
    lg: 'gap-1.5',
  };

  const renderDots = (count: number) => {
    const positions: Record<number, Array<{ row: number; col: number }>> = {
      0: [],
      1: [{ row: 1, col: 1 }],
      2: [
        { row: 0, col: 0 },
        { row: 2, col: 2 },
      ],
      3: [
        { row: 0, col: 0 },
        { row: 1, col: 1 },
        { row: 2, col: 2 },
      ],
      4: [
        { row: 0, col: 0 },
        { row: 0, col: 2 },
        { row: 2, col: 0 },
        { row: 2, col: 2 },
      ],
      5: [
        { row: 0, col: 0 },
        { row: 0, col: 2 },
        { row: 1, col: 1 },
        { row: 2, col: 0 },
        { row: 2, col: 2 },
      ],
      6: [
        { row: 0, col: 0 },
        { row: 0, col: 2 },
        { row: 1, col: 0 },
        { row: 1, col: 2 },
        { row: 2, col: 0 },
        { row: 2, col: 2 },
      ],
    };

    const dotClass = dotSizeClasses[size];

    if (count === 6 && !isDouble && boardTile) {
      return (
        <div className={`grid grid-cols-3 grid-rows-2 w-full h-full p-1 ${gapClasses[size]}`}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center justify-center">
              <div className={`${dotClass} rounded-full bg-gray-800`} />
            </div>
          ))}
        </div>
      );
    }

    const dots = positions[count] || [];

    return (
      <div className={`grid grid-cols-3 grid-rows-3 w-full h-full p-1 ${gapClasses[size]}`}>
        {[0, 1, 2].map((row) =>
          [0, 1, 2].map((col) => {
            const hasDot = dots.some((d) => d.row === row && d.col === col);
            return (
              <div
                key={`${row}-${col}`}
                className={`flex items-center justify-center ${
                  hasDot ? '' : ''
                }`}
              >
                {hasDot && (
                  <div className={`${dotClass} rounded-full bg-gray-800`} />
                )}
              </div>
            );
          })
        )}
      </div>
    );
  };

  if (faceDown) {
    return (
      <div
        className={`${sizeClasses[size]} bg-amber-800 rounded-lg shadow-md border-2 border-amber-900 flex items-center justify-center cursor-default`}
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        <div className="w-3/4 h-3/4 border-2 border-amber-700 rounded" />
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`
        ${sizeClasses[size]}
        bg-white rounded-lg shadow-md border-2
        flex ${isHorizontal ? 'flex-row' : 'flex-col'}
        transition-all duration-200
        ${isPlayable ? 'cursor-pointer hover:shadow-lg hover:-translate-y-1 border-green-500' : 'cursor-default'}
        ${isSelected ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-400'}
      `}
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <div className={`flex-1 flex items-center justify-center ${isHorizontal ? 'border-r' : 'border-b'} border-gray-300`}>
        {renderDots(piece.left)}
      </div>
      <div className={`${isHorizontal ? 'w-0.5 h-full' : 'h-0.5 w-full'} bg-gray-400`} />
      <div className="flex-1 flex items-center justify-center">
        {renderDots(piece.right)}
      </div>
    </div>
  );
}
