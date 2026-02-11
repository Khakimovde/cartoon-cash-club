import { useState } from "react";
import { motion } from "framer-motion";
import GameLayout from "./GameLayout";
import type { GameSetting } from "../GamesTab";

interface Props {
  game: GameSetting;
  coins: number;
  onResult: (won: boolean) => Promise<any>;
  onBack: () => void;
}

type BoxContent = { type: "empty" } | { type: "prize" };

function generateBoxes(): BoxContent[] {
  // 90% chance all boxes are empty (user loses)
  // 10% chance: 3 winning boxes randomly placed
  const isWinnable = Math.random() < 0.10;
  const boxes: BoxContent[] = Array.from({ length: 9 }, () => ({ type: "empty" as const }));
  if (isWinnable) {
    const indices = new Set<number>();
    while (indices.size < 3) {
      indices.add(Math.floor(Math.random() * 9));
    }
    indices.forEach((idx) => {
      boxes[idx] = { type: "prize" };
    });
  }
  return boxes;
}

const TreasureGame = ({ game, coins, onResult, onBack }: Props) => {
  const [boxes] = useState(generateBoxes);
  const [opened, setOpened] = useState<number | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [processing, setProcessing] = useState(false);
  const handleOpen = async (index: number) => {
    if (gameOver || opened !== null || processing) return;
    setOpened(index);
    setProcessing(true);

    const box = boxes[index];
    const isWin = box.type === "prize";
    setWon(isWin);
    setGameOver(true);
    await onResult(isWin);
    setProcessing(false);
  };

  return (
    <GameLayout game={game} coins={coins} onBack={onBack}>
      <div className="text-center space-y-4">
        <p className="text-sm text-muted-foreground">
          9 ta sovg'adan birini tanlang! G'alaba qutisi topsangiz — mukofot! 🎁
        </p>

        {/* 3x3 grid */}
        <div className="grid grid-cols-3 gap-4 max-w-[300px] mx-auto">
          {boxes.map((box, i) => {
            const isOpened = opened === i;
            const showAll = gameOver;
            const isPrize = box.type === "prize";

            return (
              <motion.button
                key={i}
                onClick={() => handleOpen(i)}
                disabled={gameOver}
                whileTap={{ scale: 0.9 }}
                animate={isOpened ? { rotateY: 180, scale: 1.1 } : {}}
                transition={{ duration: 0.4 }}
                className={`aspect-square rounded-2xl text-4xl transition-all flex flex-col items-center justify-center gap-1 ${
                  isOpened
                    ? isPrize
                      ? "bg-primary/15 ring-2 ring-primary"
                      : "bg-destructive/10 ring-2 ring-destructive"
                    : showAll && isPrize
                    ? "bg-primary/10 ring-1 ring-primary/50"
                    : "bg-secondary hover:bg-muted active:scale-95"
                }`}
              >
                {isOpened ? (
                  isPrize ? (
                    <>
                      <span>🏆</span>
                      <span className="text-[10px] font-extrabold text-primary">G'alaba!</span>
                    </>
                  ) : (
                    <>
                      <span>💨</span>
                      <span className="text-[10px] font-bold text-destructive">Bo'sh</span>
                    </>
                  )
                ) : showAll && isPrize ? (
                  <>
                    <span>🏆</span>
                    <span className="text-[10px] font-bold text-primary/70">G'alaba</span>
                  </>
                ) : (
                  <span>🎁</span>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Game over */}
        {gameOver && (
          <div className={`card-3d p-4 ${won ? "ring-2 ring-green-400" : "ring-2 ring-destructive"}`}>
            <p className="text-lg font-extrabold">
              {won ? "🏆 G'alaba! Mukofot!" : "💨 Bo'sh sandiq!"}
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
