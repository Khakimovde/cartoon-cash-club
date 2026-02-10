import { useState, useCallback } from "react";
import GameLayout from "./GameLayout";
import type { GameSetting } from "../GamesTab";

interface Props {
  game: GameSetting;
  coins: number;
  onResult: (won: boolean) => Promise<any>;
  onBack: () => void;
}

const UZBEK_WORDS = [
  "KITOB", "OLMA", "MAKTAB", "DARYO", "QUYOSH", "BAHOR", "GULLAR",
  "SHAHAR", "DENGIZ", "HAYVON", "BOZOR", "ODAM", "BOLALAR", "OVQAT",
  "SUROV", "DUNYO", "TABIAT", "MASHINA", "KOMPYUTER", "TELEFON",
  "BAYRAM", "MUZEY", "KUTUBXONA", "SAYOHAT", "FUTBOL",
];

const HangmanGame = ({ game, coins, onResult, onBack }: Props) => {
  const [word] = useState(() => UZBEK_WORDS[Math.floor(Math.random() * UZBEK_WORDS.length)]);
  const [guessed, setGuessed] = useState<Set<string>>(new Set());
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [processing, setProcessing] = useState(false);

  const wrongGuesses = [...guessed].filter((l) => !word.includes(l)).length;
  const maxWrong = 7;

  const handleGuess = useCallback(
    async (letter: string) => {
      if (gameOver || guessed.has(letter) || processing) return;

      const newGuessed = new Set(guessed);
      newGuessed.add(letter);
      setGuessed(newGuessed);

      const newWrong = [...newGuessed].filter((l) => !word.includes(l)).length;
      const wordComplete = [...word].every((l) => newGuessed.has(l));

      if (wordComplete) {
        setGameOver(true);
        setWon(true);
        setProcessing(true);
        await onResult(true);
        setProcessing(false);
      } else if (newWrong >= maxWrong) {
        setGameOver(true);
        setWon(false);
        setProcessing(true);
        await onResult(false);
        setProcessing(false);
      }
    },
    [guessed, gameOver, word, onResult, processing]
  );

  const keyboard = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  const HangmanDrawing = () => (
    <svg viewBox="0 0 200 240" className="w-44 h-44 mx-auto">
      {/* Base */}
      <line x1="20" y1="220" x2="100" y2="220" stroke="hsl(var(--foreground))" strokeWidth="4" strokeLinecap="round" />
      {/* Pole */}
      <line x1="60" y1="220" x2="60" y2="20" stroke="hsl(var(--foreground))" strokeWidth="4" strokeLinecap="round" />
      {/* Top bar */}
      <line x1="60" y1="20" x2="140" y2="20" stroke="hsl(var(--foreground))" strokeWidth="4" strokeLinecap="round" />
      {/* Rope */}
      <line x1="140" y1="20" x2="140" y2="50" stroke="hsl(var(--foreground))" strokeWidth="3" strokeLinecap="round" />
      {/* Head */}
      {wrongGuesses >= 1 && (
        <circle cx="140" cy="65" r="15" stroke="hsl(var(--destructive))" strokeWidth="3" fill="none" />
      )}
      {/* Body */}
      {wrongGuesses >= 2 && (
        <line x1="140" y1="80" x2="140" y2="135" stroke="hsl(var(--destructive))" strokeWidth="3" strokeLinecap="round" />
      )}
      {/* Left arm */}
      {wrongGuesses >= 3 && (
        <line x1="140" y1="95" x2="115" y2="120" stroke="hsl(var(--destructive))" strokeWidth="3" strokeLinecap="round" />
      )}
      {/* Right arm */}
      {wrongGuesses >= 4 && (
        <line x1="140" y1="95" x2="165" y2="120" stroke="hsl(var(--destructive))" strokeWidth="3" strokeLinecap="round" />
      )}
      {/* Left leg */}
      {wrongGuesses >= 5 && (
        <line x1="140" y1="135" x2="115" y2="170" stroke="hsl(var(--destructive))" strokeWidth="3" strokeLinecap="round" />
      )}
      {/* Right leg */}
      {wrongGuesses >= 6 && (
        <line x1="140" y1="135" x2="165" y2="170" stroke="hsl(var(--destructive))" strokeWidth="3" strokeLinecap="round" />
      )}
      {/* Hat (7th wrong) */}
      {wrongGuesses >= 7 && (
        <>
          <line x1="125" y1="50" x2="155" y2="50" stroke="hsl(var(--destructive))" strokeWidth="3" strokeLinecap="round" />
          <rect x="130" y="35" width="20" height="15" fill="hsl(var(--destructive))" rx="2" />
        </>
      )}
    </svg>
  );

  return (
    <GameLayout
      game={game}
      coins={coins}
      onBack={onBack}
      header={<span className="text-sm font-bold text-destructive">{wrongGuesses}/{maxWrong} xato</span>}
    >
      <div className="text-center space-y-3">
        <HangmanDrawing />

        {/* Word display */}
        <div className="flex justify-center gap-2 flex-wrap">
          {[...word].map((letter, i) => (
            <div
              key={i}
              className={`w-9 h-11 rounded-xl flex items-center justify-center text-lg font-extrabold border-2 ${
                guessed.has(letter)
                  ? "bg-primary/10 border-primary text-primary"
                  : gameOver
                  ? "bg-destructive/10 border-destructive text-destructive"
                  : "bg-secondary border-border text-transparent"
              }`}
            >
              {guessed.has(letter) || gameOver ? letter : "_"}
            </div>
          ))}
        </div>

        {/* Game over */}
        {gameOver && (
          <div className={`card-3d p-4 ${won ? "ring-2 ring-green-400" : "ring-2 ring-destructive"}`}>
            <p className="text-lg font-extrabold">
              {won ? "🎉 Tabriklaymiz!" : `😔 So'z: ${word}`}
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

        {/* Keyboard */}
        {!gameOver && (
          <div className="grid grid-cols-7 gap-1.5 max-w-xs mx-auto">
            {keyboard.map((letter) => {
              const isGuessed = guessed.has(letter);
              const isWrong = isGuessed && !word.includes(letter);
              const isCorrect = isGuessed && word.includes(letter);
              return (
                <button
                  key={letter}
                  onClick={() => handleGuess(letter)}
                  disabled={isGuessed || gameOver}
                  className={`h-11 rounded-xl text-sm font-bold transition-all ${
                    isCorrect
                      ? "bg-primary/20 text-primary"
                      : isWrong
                      ? "bg-destructive/20 text-destructive"
                      : "bg-secondary text-foreground hover:bg-muted active:scale-95"
                  } disabled:opacity-40`}
                >
                  {letter}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </GameLayout>
  );
};

export default HangmanGame;
