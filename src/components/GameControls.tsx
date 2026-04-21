'use client';

interface GameControlsProps {
  stockCount: number;
  onDraw: () => void;
  onPass: () => void;
  canDraw: boolean;
  canPass: boolean;
}

export default function GameControls({
  stockCount,
  onDraw,
  onPass,
  canDraw,
  canPass,
}: GameControlsProps) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-md border border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <span className="text-2xl font-bold text-amber-700">{stockCount}</span>
            <p className="text-sm text-gray-500">Pieces in Stock</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onDraw}
            disabled={!canDraw}
            className={`
              px-4 py-2 rounded-lg font-medium transition-colors
              ${
                canDraw
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            Draw
          </button>
          <button
            onClick={onPass}
            disabled={!canPass}
            className={`
              px-4 py-2 rounded-lg font-medium transition-colors
              ${
                canPass
                  ? 'bg-gray-600 hover:bg-gray-700 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            Pass
          </button>
        </div>
      </div>
    </div>
  );
}
