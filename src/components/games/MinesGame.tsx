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
  { count: 3, label: "3 💣", kf: "1.2x", safeToWin: 5 },
  { count: 5, label: "5 💣", kf: "1.5x", safeToWin: 5 },
  { count: 8, label: "8 💣", kf: "2x", safeToWin: 4 },
  { count: 12, label: "12 💣", kf: "3x", safeToWin: 3 },
];

const MinesGame = ({ game, coins, onResult, onBack }: Props) => {
  const [bombOption, setBombOption] = useState<number | null>(null);
  const [mines, setMines] = useState<Set<number>>(new Set());
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [processing, setProcessing] = useState(false);

  const selectedOption = bombOption !== null ? BOMB_OPTIONS[bombOption] : null;
  const safeRevealed = [...revealed].filter((i) => !mines.has(i)).length;

  const startWithBombs = (optionIndex: number) => {
    const opt = BOMB_OPTIONS[optionIndex];
    const positions = new Set<number>();
    // 70% loss rate: place mines strategically but randomly
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
      } else {
        const newSafe = [...newRevealed].filter((i) => !mines.has(i)).length;
        if (newSafe >= selectedOption.safeToWin) {
          setGameOver(true);
          setWon(true);
          setProcessing(true);
          await onResult(true);
          setProcessing(false);
        }
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
          <p className="text-sm text-muted-foreground">Bomba sonini tanlang — ko'p bomba = katta mukofot!</p>
          <div className="space-y-2">
            {BOMB_OPTIONS.map((opt, i) => (
              <button
                key={i}
                onClick={() => startWithBombs(i)}
                className="w-full card-3d p-4 flex items-center justify-between hover:ring-2 hover:ring-primary transition-all"
              >
                <span className="font-bold text-foreground">{opt.label}</span>
                <div className="text-right">
                  <span className="text-sm font-extrabold text-primary">{opt.kf}</span>
                  <p className="text-xs text-muted-foreground">{opt.safeToWin} xavfsiz topish</p>
                </div>
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
          <span className="text-xs text-muted-foreground">Xavfsiz: </span>
          <span className="text-sm font-bold text-primary">{safeRevealed}/{selectedOption!.safeToWin}</span>
        </div>
      }
    >
      <div className="text-center space-y-4">
        <p className="text-sm text-muted-foreground">
          {selectedOption!.safeToWin} ta xavfsiz katakni toping! ({selectedOption!.kf})
        </p>

        {/* Grid */}
        <div className="grid grid-cols-5 gap-2 max-w-xs mx-auto">
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
            className="w-full py-3 rounded-2xl font-bold text-base"
            style={{ background: "var(--gradient-primary)", color: "hsl(var(--primary-foreground))" }}
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
