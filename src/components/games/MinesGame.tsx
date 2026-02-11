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
  // Progressive: each step multiplies by (startKf + step * 0.03)
  let kf = startKf;
  for (let i = 1; i < safeOpened; i++) {
    kf *= startKf + i * 0.03;
  }
  return Math.round(kf * 100) / 100;
}

const MinesGame = ({ game, coins, onResult, onBack }: Props) => {
  const [bombOption, setBombOption] = useState<number | null>(null);
  const [mines, setMines] = useState<Set<number>>(new Set());
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [processing, setProcessing] = useState(false);

  const selectedOption = bombOption !== null ? BOMB_OPTIONS[bombOption] : null;
  const safeRevealed = [...revealed].filter((i) => !mines.has(i)).length;
  const currentKf = selectedOption ? getMultiplier(selectedOption.count, safeRevealed) : 1;
  const nextKf = selectedOption ? getMultiplier(selectedOption.count, safeRevealed + 1) : 1;
  const winAmount = Math.floor(game.bet_amount * currentKf);

  const startWithBombs = (optionIndex: number) => {
    const opt = BOMB_OPTIONS[optionIndex];
    const positions = new Set<number>();
    while (positions.size < opt.count) {
      positions.add(Math.floor(Math.random() * GRID_TOTAL));
    }
    setMines(positions);
    setBombOption(optionIndex);
  };

  const handleReveal = useCallback(
    async (index: number) => {
      if (gameOver || revealed.has(index) || processing || !selectedOption) return;

      const newRevealed = new Set(revealed);
      newRevealed.add(index);
      setRevealed(newRevealed);

      if (mines.has(index)) {
        setGameOver(true);
        setWon(false);
        setProcessing(true);
        await onResult(false);
        setProcessing(false);
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
