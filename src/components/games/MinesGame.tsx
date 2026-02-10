import { useState, useCallback } from "react";
import GameLayout from "./GameLayout";
import type { GameSetting } from "../GamesTab";

interface Props {
  game: GameSetting;
  coins: number;
  onResult: (won: boolean) => Promise<any>;
  onBack: () => void;
}

const GRID_SIZE = 5;
const GRID_ROWS = 5;
const MINE_COUNT = 5;
const SAFE_TO_WIN = 5;

const MinesGame = ({ game, coins, onResult, onBack }: Props) => {
  const [mines] = useState(() => {
    const positions = new Set<number>();
    while (positions.size < MINE_COUNT) {
      positions.add(Math.floor(Math.random() * GRID_SIZE * GRID_ROWS));
    }
    return positions;
  });

  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [processing, setProcessing] = useState(false);

  const safeRevealed = [...revealed].filter((i) => !mines.has(i)).length;

  const handleReveal = useCallback(
    async (index: number) => {
      if (gameOver || revealed.has(index) || processing) return;

      const newRevealed = new Set(revealed);
      newRevealed.add(index);
      setRevealed(newRevealed);

      if (mines.has(index)) {
        // Hit a mine
        setGameOver(true);
        setWon(false);
        setProcessing(true);
        await onResult(false);
        setProcessing(false);
      } else {
        const newSafe = [...newRevealed].filter((i) => !mines.has(i)).length;
        if (newSafe >= SAFE_TO_WIN) {
          setGameOver(true);
          setWon(true);
          setProcessing(true);
          await onResult(true);
          setProcessing(false);
        }
      }
    },
    [revealed, gameOver, mines, onResult, processing]
  );

  const handleCollect = async () => {
    if (processing || safeRevealed === 0) return;
    setGameOver(true);
    setWon(true);
    setProcessing(true);
    await onResult(true);
    setProcessing(false);
  };

  return (
    <GameLayout
      game={game}
      coins={coins}
      onBack={onBack}
      header={
        <div className="text-center">
          <span className="text-xs text-muted-foreground">Xavfsiz: </span>
          <span className="text-sm font-bold text-primary">{safeRevealed}/{SAFE_TO_WIN}</span>
        </div>
      }
    >
      <div className="text-center space-y-4">
        <p className="text-sm text-muted-foreground">
          {SAFE_TO_WIN} ta xavfsiz katakni toping!
        </p>

        {/* Grid */}
        <div className="grid grid-cols-5 gap-2 max-w-xs mx-auto">
          {Array.from({ length: GRID_SIZE * GRID_ROWS }).map((_, i) => {
            const isRevealed = revealed.has(i);
            const isMine = mines.has(i);
            const showMine = gameOver && isMine;

            return (
              <button
                key={i}
                onClick={() => handleReveal(i)}
                disabled={isRevealed || gameOver}
                className={`aspect-square rounded-xl text-xl font-bold transition-all ${
                  isRevealed
                    ? isMine
                      ? "bg-destructive/20 ring-2 ring-destructive"
                      : "bg-primary/15 ring-2 ring-primary"
                    : showMine
                    ? "bg-destructive/10"
                    : "bg-secondary hover:bg-muted active:scale-95"
                }`}
              >
                {isRevealed ? (isMine ? "💥" : "💎") : showMine ? "💣" : "?"}
              </button>
            );
          })}
        </div>

        {/* Collect button */}
        {!gameOver && safeRevealed > 0 && (
          <button
            onClick={handleCollect}
            className="w-full py-3 rounded-2xl font-bold text-base"
            style={{ background: "var(--gradient-success)", color: "hsl(var(--success-foreground))" }}
          >
            Yig'ib olish ({game.reward_amount} 🪙)
          </button>
        )}

        {/* Game over */}
        {gameOver && (
          <div className={`card-3d p-4 ${won ? "ring-2 ring-green-400" : "ring-2 ring-destructive"}`}>
            <p className="text-lg font-extrabold">
              {won ? "🎉 Tabriklaymiz!" : "💥 Minaga tegdingiz!"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {won ? `+${game.reward_amount} tanga` : `-${game.bet_amount} tanga`}
            </p>
            <button
              onClick={onBack}
              className="mt-3 px-6 py-2 rounded-xl font-bold text-sm"
              style={{ background: "var(--gradient-primary)", color: "hsl(var(--primary-foreground))" }}
            >
              Ortga
            </button>
          </div>
        )}
      </div>
    </GameLayout>
  );
};

export default MinesGame;
