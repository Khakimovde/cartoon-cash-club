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
const GRID_TOTAL = GRID_SIZE * GRID_SIZE;

const BOMB_OPTIONS = [
  { count: 3, label: "3 💣", startKf: 1.08 },
  { count: 5, label: "5 💣", startKf: 1.15 },
  { count: 8, label: "8 💣", startKf: 1.30 },
  { count: 12, label: "12 💣", startKf: 1.55 },
];

function getMultiplier(bombCount: number, safeOpened: number): number {
  if (safeOpened === 0) return 1;
  const opt = BOMB_OPTIONS.find(o => o.count === bombCount);
  const startKf = opt?.startKf || 1.08;
  // Slow progressive growth: small additive increments
  let kf = startKf;
  for (let i = 1; i < safeOpened; i++) {
    kf += 0.04 + i * 0.01;
  }
  return Math.round(kf * 100) / 100;
}

// Dynamic bomb probability: after 2 safe reveals, each next cell has increasing bomb chance
function shouldBeBomb(bombCount: number, safeOpened: number, minesHit: number, totalMines: number, remainingCells: number): boolean {
  if (safeOpened < 2) {
    // First 2 clicks: use actual bomb ratio
    return Math.random() < (totalMines / remainingCells);
  }
  // After 2 safe: high loss probability, scales with safe count
  const baseLoss = 0.55; // 55% base bomb chance after 2 safe
  const increment = 0.07; // +7% per additional safe reveal
  const bombChance = Math.min(0.92, baseLoss + (safeOpened - 2) * increment);
  return Math.random() < bombChance;
}

const MinesGame = ({ game, coins, onResult, onBack }: Props) => {
  const [bombOption, setBombOption] = useState<number | null>(null);
  const [mines, setMines] = useState<Set<number>>(new Set());
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [displayBombs, setDisplayBombs] = useState<Set<number>>(new Set());

  const selectedOption = bombOption !== null ? BOMB_OPTIONS[bombOption] : null;
  const safeRevealed = [...revealed].filter((i) => !mines.has(i)).length;
  const currentKf = selectedOption ? getMultiplier(selectedOption.count, safeRevealed) : 1;
  const nextKf = selectedOption ? getMultiplier(selectedOption.count, safeRevealed + 1) : 1;
  const winAmount = Math.floor(game.bet_amount * currentKf);

  const startWithBombs = (optionIndex: number) => {
    // Don't pre-place all bombs; use dynamic generation
    setMines(new Set());
    setBombOption(optionIndex);
  };

  const handleReveal = useCallback(
    async (index: number) => {
      if (gameOver || revealed.has(index) || processing || !selectedOption) return;

      const newRevealed = new Set(revealed);
      newRevealed.add(index);

      const currentSafe = [...revealed].filter((i) => !mines.has(i)).length;
      const remainingCells = GRID_TOTAL - revealed.size;

      // Dynamically decide if this cell is a bomb
      const isBomb = shouldBeBomb(selectedOption.count, currentSafe, mines.size, selectedOption.count, remainingCells);

      if (isBomb) {
        const newMines = new Set(mines);
        newMines.add(index);
        setMines(newMines);
        setRevealed(newRevealed);
        // Generate random bomb positions for remaining unrevealed cells
        const unrevealed = Array.from({ length: GRID_TOTAL }, (_, i) => i)
          .filter(i => !newRevealed.has(i));
        const bombsToShow = new Set(newMines);
        const shuffled = unrevealed.sort(() => Math.random() - 0.5);
        for (let j = 0; j < Math.min(selectedOption.count - newMines.size, shuffled.length); j++) {
          bombsToShow.add(shuffled[j]);
        }
        setDisplayBombs(bombsToShow);
        setGameOver(true);
        setWon(false);
        setProcessing(true);
        await onResult(false);
        setProcessing(false);
      } else {
        setRevealed(newRevealed);
      }
    },
    [revealed, gameOver, mines, onResult, processing, selectedOption]
  );

  const handleCollect = async () => {
    if (processing || safeRevealed === 0) return;
    setGameOver(true);
    setWon(true);
    setProcessing(true);
    await onResult(true);
    setProcessing(false);
  };

  // Bomb selection screen
  if (bombOption === null) {
    return (
      <GameLayout game={game} coins={coins} onBack={onBack}>
        <div className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">Bomba sonini tanlang</p>
          <div className="grid grid-cols-2 gap-2">
            {BOMB_OPTIONS.map((opt, i) => (
              <button
                key={i}
                onClick={() => startWithBombs(i)}
                className="card-3d p-4 flex flex-col items-center gap-1 hover:ring-2 hover:ring-primary transition-all active:scale-95"
              >
                <span className="text-2xl">💣</span>
                <span className="font-extrabold text-foreground text-lg">{opt.count}</span>
                <span className="text-xs text-muted-foreground">bomba</span>
                <span className="text-xs font-bold text-primary">x{opt.startKf.toFixed(2)} dan</span>
              </button>
            ))}
          </div>
        </div>
      </GameLayout>
    );
  }

  return (
    <GameLayout
      game={game}
      coins={coins}
      onBack={onBack}
      header={
        <div className="text-center">
          <span className="text-xs text-muted-foreground">KF: </span>
          <span className="text-sm font-extrabold text-primary">{currentKf.toFixed(2)}x</span>
        </div>
      }
    >
      <div className="text-center space-y-3">
        {/* Current multiplier display */}
        <div className="card-3d p-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Hozirgi yutug'</p>
            <p className="text-lg font-extrabold text-primary">{winAmount} 🪙</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Keyingi KF</p>
            <p className="text-lg font-extrabold text-foreground">{nextKf.toFixed(2)}x</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Ochilgan</p>
            <p className="text-lg font-extrabold text-foreground">{safeRevealed}</p>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-5 gap-1.5 max-w-[280px] mx-auto">
          {Array.from({ length: GRID_TOTAL }).map((_, i) => {
            const isRevealed = revealed.has(i);
            const isMine = mines.has(i);
            const isDisplayBomb = gameOver && displayBombs.has(i) && !isRevealed;

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
                    : isDisplayBomb
                    ? "bg-destructive/10"
                    : "bg-secondary hover:bg-muted active:scale-95"
                }`}
              >
                {isRevealed ? (isMine ? "💥" : "💎") : isDisplayBomb ? "💣" : "?"}
              </button>
            );
          })}
        </div>

        {/* Collect button */}
        {!gameOver && safeRevealed > 0 && (
          <button
            onClick={handleCollect}
            className="w-full py-3 rounded-2xl font-extrabold text-base animate-pulse"
            style={{ background: "var(--gradient-primary)", color: "hsl(var(--primary-foreground))" }}
          >
            💰 Yig'ib olish — {winAmount} tanga ({currentKf.toFixed(2)}x)
          </button>
        )}

        {/* Game over */}
        {gameOver && (
          <div className={`card-3d p-4 ${won ? "ring-2 ring-green-400" : "ring-2 ring-destructive"}`}>
            <p className="text-lg font-extrabold">
              {won ? `🎉 ${currentKf.toFixed(2)}x Yutdingiz!` : "💥 Minaga tegdingiz!"}
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

export default MinesGame;
