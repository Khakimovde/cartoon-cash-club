import { useState } from "react";
import GameLayout from "./GameLayout";
import type { GameSetting } from "../GamesTab";

interface Props {
  game: GameSetting;
  coins: number;
  onResult: (won: boolean) => Promise<any>;
  onBack: () => void;
}

const TreasureGame = ({ game, coins, onResult, onBack }: Props) => {
  const [winIndex] = useState(() => Math.floor(Math.random() * 9));
  const [opened, setOpened] = useState<number | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleOpen = async (index: number) => {
    if (gameOver || opened !== null || processing) return;
    setOpened(index);
    setProcessing(true);

    const isWin = index === winIndex;
    setWon(isWin);
    setGameOver(true);
    await onResult(isWin);
    setProcessing(false);
  };

  return (
    <GameLayout game={game} coins={coins} onBack={onBack}>
      <div className="text-center space-y-4">
        <p className="text-sm text-muted-foreground">
          9 ta sandiqdan birini tanlang! Birida mukofot bor 🎁
        </p>

        {/* 3x3 grid of treasure boxes */}
        <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto">
          {Array.from({ length: 9 }).map((_, i) => {
            const isOpened = opened === i;
            const isWinBox = i === winIndex;
            const showAll = gameOver;

            return (
              <button
                key={i}
                onClick={() => handleOpen(i)}
                disabled={gameOver}
                className={`aspect-square rounded-2xl text-3xl transition-all flex items-center justify-center ${
                  isOpened
                    ? isWinBox
                      ? "bg-primary/15 ring-2 ring-primary scale-110"
                      : "bg-destructive/10 ring-2 ring-destructive"
                    : showAll && isWinBox
                    ? "bg-primary/10 ring-2 ring-primary"
                    : "bg-secondary hover:bg-muted active:scale-95 hover:scale-105"
                }`}
              >
                {isOpened
                  ? isWinBox
                    ? "🎁"
                    : "💨"
                  : showAll && isWinBox
                  ? "🎁"
                  : "📦"}
              </button>
            );
          })}
        </div>

        {/* Game over */}
        {gameOver && (
          <div className={`card-3d p-4 ${won ? "ring-2 ring-green-400" : "ring-2 ring-destructive"}`}>
            <p className="text-lg font-extrabold">
              {won ? "🎁 Mukofotni topdingiz!" : "💨 Bo'sh sandiq!"}
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

export default TreasureGame;
