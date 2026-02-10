import { useState } from "react";
import GameLayout from "./GameLayout";
import type { GameSetting } from "../GamesTab";

interface Props {
  game: GameSetting;
  coins: number;
  onResult: (won: boolean) => Promise<any>;
  onBack: () => void;
}

type BoxContent = { type: "empty" } | { type: "prize"; multiplier: number; label: string };

function generateBoxes(): BoxContent[] {
  const boxes: BoxContent[] = Array.from({ length: 9 }, () => ({ type: "empty" as const }));
  // Randomly place prizes: 1x, 1.5x, 2x
  const prizes = [
    { multiplier: 1, label: "1x" },
    { multiplier: 1.5, label: "1.5x" },
    { multiplier: 2, label: "2x" },
  ];
  const indices = new Set<number>();
  while (indices.size < prizes.length) {
    indices.add(Math.floor(Math.random() * 9));
  }
  const idxArr = [...indices];
  prizes.forEach((p, i) => {
    boxes[idxArr[i]] = { type: "prize", ...p };
  });
  return boxes;
}

const BOX_EMOJIS_CLOSED = ["🎁", "🎀", "📦", "🎁", "🎀", "📦", "🎁", "🎀", "📦"];
const EMPTY_EMOJIS = ["💨", "🍃", "😔"];

const TreasureGame = ({ game, coins, onResult, onBack }: Props) => {
  const [boxes] = useState(generateBoxes);
  const [opened, setOpened] = useState<number | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [prizeMult, setPrizeMult] = useState(0);

  const handleOpen = async (index: number) => {
    if (gameOver || opened !== null || processing) return;
    setOpened(index);
    setProcessing(true);

    const box = boxes[index];
    const isWin = box.type === "prize";
    if (isWin) setPrizeMult(box.multiplier);
    setWon(isWin);
    setGameOver(true);
    await onResult(isWin);
    setProcessing(false);
  };

  const winAmount = Math.floor(game.bet_amount * prizeMult);

  return (
    <GameLayout game={game} coins={coins} onBack={onBack}>
      <div className="text-center space-y-4">
        <p className="text-sm text-muted-foreground">
          9 ta sandiqdan birini tanlang! 3 tasida mukofot bor 🎁
        </p>
        <div className="flex justify-center gap-3 text-xs text-muted-foreground">
          <span className="bg-secondary px-2 py-1 rounded-lg">🥉 1x</span>
          <span className="bg-secondary px-2 py-1 rounded-lg">🥈 1.5x</span>
          <span className="bg-secondary px-2 py-1 rounded-lg">🥇 2x</span>
        </div>

        {/* 3x3 grid */}
        <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto">
          {boxes.map((box, i) => {
            const isOpened = opened === i;
            const showAll = gameOver;
            const isPrize = box.type === "prize";

            return (
              <button
                key={i}
                onClick={() => handleOpen(i)}
                disabled={gameOver}
                className={`aspect-square rounded-2xl text-3xl transition-all flex flex-col items-center justify-center gap-0.5 ${
                  isOpened
                    ? isPrize
                      ? "bg-primary/15 ring-2 ring-primary scale-110"
                      : "bg-destructive/10 ring-2 ring-destructive"
                    : showAll && isPrize
                    ? "bg-primary/10 ring-1 ring-primary/50"
                    : "bg-secondary hover:bg-muted active:scale-95 hover:scale-105"
                }`}
              >
                {isOpened ? (
                  isPrize ? (
                    <>
                      <span>🏆</span>
                      <span className="text-xs font-extrabold text-primary">{box.label}</span>
                    </>
                  ) : (
                    <span>{EMPTY_EMOJIS[i % 3]}</span>
                  )
                ) : showAll && isPrize ? (
                  <>
                    <span>🏆</span>
                    <span className="text-xs font-bold text-primary/70">{box.label}</span>
                  </>
                ) : (
                  <span>{BOX_EMOJIS_CLOSED[i]}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Game over */}
        {gameOver && (
          <div className={`card-3d p-4 ${won ? "ring-2 ring-green-400" : "ring-2 ring-destructive"}`}>
            <p className="text-lg font-extrabold">
              {won ? `🏆 ${prizeMult}x Mukofot!` : "💨 Bo'sh sandiq!"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {won ? `+${winAmount} tanga` : `-${game.bet_amount} tanga`}
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
