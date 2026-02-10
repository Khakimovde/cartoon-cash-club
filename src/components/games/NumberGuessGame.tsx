import { useState } from "react";
import GameLayout from "./GameLayout";
import type { GameSetting } from "../GamesTab";

interface Props {
  game: GameSetting;
  coins: number;
  onResult: (won: boolean) => Promise<any>;
  onBack: () => void;
}

const MAX_ATTEMPTS = 7;

const NumberGuessGame = ({ game, coins, onResult, onBack }: Props) => {
  const [target] = useState(() => Math.floor(Math.random() * 100) + 1);
  const [guess, setGuess] = useState("");
  const [attempts, setAttempts] = useState<{ num: number; hint: string }[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleGuess = async () => {
    const num = parseInt(guess.trim());
    if (isNaN(num) || num < 1 || num > 100 || gameOver || processing) return;

    let hint = "";
    if (num === target) {
      hint = "🎯 To'g'ri!";
    } else if (num < target) {
      hint = "⬆️ Kattaroq";
    } else {
      hint = "⬇️ Kichikroq";
    }

    const newAttempts = [...attempts, { num, hint }];
    setAttempts(newAttempts);
    setGuess("");

    if (num === target) {
      setGameOver(true);
      setWon(true);
      setProcessing(true);
      await onResult(true);
      setProcessing(false);
    } else if (newAttempts.length >= MAX_ATTEMPTS) {
      setGameOver(true);
      setWon(false);
      setProcessing(true);
      await onResult(false);
      setProcessing(false);
    }
  };

  return (
    <GameLayout
      game={game}
      coins={coins}
      onBack={onBack}
      header={
        <span className="text-sm font-bold text-foreground">
          {attempts.length}/{MAX_ATTEMPTS} urinish
        </span>
      }
    >
      <div className="space-y-4">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">1 dan 100 gacha raqamni toping!</p>
        </div>

        {/* Attempts history */}
        {attempts.length > 0 && (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {attempts.map((a, i) => (
              <div
                key={i}
                className={`card-3d p-2.5 flex items-center justify-between ${
                  a.num === target ? "ring-2 ring-primary" : ""
                }`}
              >
                <span className="font-bold text-sm">{a.num}</span>
                <span className="text-xs text-muted-foreground">{a.hint}</span>
              </div>
            ))}
          </div>
        )}

        {/* Input */}
        {!gameOver && (
          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              max={100}
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGuess()}
              placeholder="Raqam kiriting..."
              className="flex-1 px-4 py-3 rounded-xl bg-secondary text-foreground font-bold text-center text-lg outline-none"
            />
            <button
              onClick={handleGuess}
              disabled={!guess.trim() || processing}
              className="px-6 py-3 rounded-xl font-bold text-sm disabled:opacity-50"
              style={{ background: "var(--gradient-primary)", color: "hsl(var(--primary-foreground))" }}
            >
              ✓
            </button>
          </div>
        )}

        {/* Game over */}
        {gameOver && (
          <div className={`card-3d p-4 text-center ${won ? "ring-2 ring-green-400" : "ring-2 ring-destructive"}`}>
            <p className="text-lg font-extrabold">
              {won ? "🎯 Topdingiz!" : `😔 Javob: ${target}`}
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

export default NumberGuessGame;
