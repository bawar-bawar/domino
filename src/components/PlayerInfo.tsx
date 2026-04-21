'use client';

interface PlayerInfoProps {
  playerName: string;
  pieceCount: number;
  isCurrentPlayer: boolean;
  isOpponent?: boolean;
}

export default function PlayerInfo({
  playerName,
  pieceCount,
  isCurrentPlayer,
  isOpponent = false,
}: PlayerInfoProps) {
  return (
    <div
      className={`
        flex items-center gap-3 p-3 rounded-xl border-2 transition-colors
        ${
          isCurrentPlayer
            ? 'bg-green-100 border-green-500'
            : 'bg-gray-100 border-gray-300'
        }
      `}
    >
      <div className="flex flex-col">
        <span className="font-semibold text-gray-800">
          {playerName} {isOpponent ? '(Opponent)' : '(You)'}
        </span>
        <span className="text-sm text-gray-600">{pieceCount} pieces</span>
      </div>
      {isCurrentPlayer && (
        <span className="ml-auto text-xs font-bold text-green-600 bg-green-200 px-2 py-1 rounded">
          TURN
        </span>
      )}
    </div>
  );
}
