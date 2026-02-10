import { useState, useEffect, useCallback } from "react";
import GameLayout from "./GameLayout";
import type { GameSetting } from "../GamesTab";

interface Props {
  game: GameSetting;
  coins: number;
  onResult: (won: boolean) => Promise<any>;
  onBack: () => void;
}

const EMOJIS = ["🍎", "🌽", "🍇", "🍋", "🍓", "🥑", "🍊", "🫐"];
const PAIRS = 8;
const MAX_MOVES = 20;

function shuffleCards(): string[] {
  const selected = EMOJIS.slice(0, PAIRS);
  const cards = [...selected, ...selected];
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

const MemoryGame = ({ game, coins, onResult, onBack }: Props) => {
  const [cards] = useState(shuffleCards);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [moves, setMoves] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [checking, setChecking] = useState(false);

  const handleFlip = useCallback(
    async (index: number) => {
      if (gameOver || checking || flipped.includes(index) || matched.has(index) || processing) return;

      const newFlipped = [...flipped, index];
      setFlipped(newFlipped);

      if (newFlipped.length === 2) {
        setChecking(true);
        const newMoves = moves + 1;
        setMoves(newMoves);

        const [first, second] = newFlipped;
        if (cards[first] === cards[second]) {
          // Match found
          const newMatched = new Set(matched);
          newMatched.add(first);
          newMatched.add(second);
          setMatched(newMatched);
          setFlipped([]);
          setChecking(false);

          // Check win
          if (newMatched.size === cards.length) {
            setGameOver(true);
            setWon(true);
            setProcessing(true);
            await onResult(true);
            setProcessing(false);
          }
        } else {
          // No match - check if out of moves
          setTimeout(async () => {
            setFlipped([]);
            setChecking(false);

            if (newMoves >= MAX_MOVES) {
              setGameOver(true);
              setWon(false);
              setProcessing(true);
              await onResult(false);
              setProcessing(false);
            }
          }, 800);
        }
      }
    },
    [flipped, matched, moves, gameOver, cards, onResult, processing, checking]
  );

  return (
    <GameLayout
      game={game}
      coins={coins}
      onBack={onBack}
      header={
        <span className="text-sm font-bold text-foreground">
          {moves}/{MAX_MOVES} harakat
        </span>
      }
    >
      <div className="space-y-4">
        {/* Cards grid - 4x4 */}
        <div className="grid grid-cols-4 gap-2">
          {cards.map((emoji, i) => {
            const isFlipped = flipped.includes(i);
            const isMatched = matched.has(i);
            const showFace = isFlipped || isMatched;

            return (
              <button
                key={i}
                onClick={() => handleFlip(i)}
                disabled={showFace || gameOver}
                className={`aspect-square rounded-2xl text-2xl transition-all duration-300 flex items-center justify-center ${
                  isMatched
                    ? "bg-primary/10 ring-2 ring-primary"
                    : isFlipped
                    ? "bg-secondary ring-2 ring-accent"
                    : "bg-secondary hover:bg-muted active:scale-95"
                }`}
              >
                {showFace ? emoji : (
                  <span className="text-destructive font-extrabold text-xl">?</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Score */}
        <div className="text-center text-xs text-muted-foreground">
          Topilgan: {matched.size / 2}/{PAIRS} juft
        </div>

        {/* Game over */}
        {gameOver && (
          <div className={`card-3d p-4 text-center ${won ? "ring-2 ring-green-400" : "ring-2 ring-destructive"}`}>
            <p className="text-lg font-extrabold">
              {won ? "🧠 Ajoyib xotira!" : "😔 Harakatlar tugadi"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {matched.size / 2}/{PAIRS} juft topildi
            </p>
            <p className="text-sm text-muted-foreground">
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

export default MemoryGame;
