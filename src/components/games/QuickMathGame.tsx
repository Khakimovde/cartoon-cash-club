import { useState, useEffect, useCallback } from "react";
import GameLayout from "./GameLayout";
import type { GameSetting } from "../GamesTab";

interface Props {
  game: GameSetting;
  coins: number;
  onResult: (won: boolean) => Promise<any>;
  onBack: () => void;
}

const TOTAL_QUESTIONS = 10;
const TOTAL_TIME = 30; // 30 seconds for all 10 questions
const MIN_CORRECT_TO_WIN = 7;

function generateQuestion() {
  const ops = ["+", "-", "×"];
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a: number, b: number, answer: number;

  switch (op) {
    case "+":
      a = Math.floor(Math.random() * 50) + 1;
      b = Math.floor(Math.random() * 50) + 1;
      answer = a + b;
      break;
    case "-":
      a = Math.floor(Math.random() * 50) + 10;
      b = Math.floor(Math.random() * a) + 1;
      answer = a - b;
      break;
    case "×":
      a = Math.floor(Math.random() * 12) + 2;
      b = Math.floor(Math.random() * 12) + 2;
      answer = a * b;
      break;
    default:
      a = 1; b = 1; answer = 2;
  }

  const options = new Set<number>([answer]);
  while (options.size < 4) {
    const offset = Math.floor(Math.random() * 20) - 10;
    if (offset !== 0) options.add(answer + offset);
  }

  return {
    question: `${a} ${op} ${b} = ?`,
    answer,
    options: [...options].sort(() => Math.random() - 0.5),
  };
}

const QuickMathGame = ({ game, coins, onResult, onBack }: Props) => {
  const [questions] = useState(() => Array.from({ length: TOTAL_QUESTIONS }, generateQuestion));
  const [current, setCurrent] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);

  const finishGame = useCallback(async (finalCorrect: number) => {
    const didWin = finalCorrect >= MIN_CORRECT_TO_WIN;
    setWon(didWin);
    setGameOver(true);
    setProcessing(true);
    await onResult(didWin);
    setProcessing(false);
  }, [onResult]);

  useEffect(() => {
    if (gameOver) return;
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timer);
          finishGame(correct);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [gameOver, correct, finishGame]);

  const handleAnswer = (option: number) => {
    if (gameOver || selectedAnswer !== null) return;
    setSelectedAnswer(option);
    const isCorrect = option === questions[current].answer;
    const newCorrect = isCorrect ? correct + 1 : correct;
    if (isCorrect) setCorrect(newCorrect);

    setTimeout(() => {
      if (current + 1 >= TOTAL_QUESTIONS) {
        finishGame(newCorrect);
      } else {
        setCurrent(current + 1);
        setSelectedAnswer(null);
      }
    }, 400);
  };

  const q = questions[current];
  const timePercent = (timeLeft / TOTAL_TIME) * 100;

  return (
    <GameLayout
      game={game}
      coins={coins}
      onBack={onBack}
      header={
        <span className="text-sm font-bold text-foreground">
          {current + 1}/{TOTAL_QUESTIONS}
        </span>
      }
    >
      <div className="space-y-4">
        {!gameOver ? (
          <>
            {/* Global timer bar */}
            <div className="progress-bar-3d">
              <div
                className="fill"
                style={{
                  width: `${timePercent}%`,
                  background: timeLeft <= 5 ? "hsl(var(--destructive))" : undefined,
                  transition: "width 1s linear",
                }}
              />
            </div>
            <div className="text-center text-xs text-muted-foreground">
              ⏱ {timeLeft} soniya qoldi
            </div>

            {/* Question */}
            <div className="card-3d p-6 text-center">
              <p className="text-2xl font-extrabold text-foreground">{q.question}</p>
            </div>

            {/* Options */}
            <div className="grid grid-cols-2 gap-3">
              {q.options.map((option, i) => {
                const isSelected = selectedAnswer === option;
                const isCorrectAnswer = option === q.answer;
                const showResult = selectedAnswer !== null;

                return (
                  <button
                    key={i}
                    onClick={() => handleAnswer(option)}
                    disabled={selectedAnswer !== null}
                    className={`py-4 rounded-2xl text-lg font-extrabold transition-all ${
                      showResult && isCorrectAnswer
                        ? "bg-primary/20 ring-2 ring-primary text-primary"
                        : showResult && isSelected && !isCorrectAnswer
                        ? "bg-destructive/20 ring-2 ring-destructive text-destructive"
                        : "bg-secondary text-foreground hover:bg-muted active:scale-95"
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>

            {/* Score */}
            <div className="text-center text-xs text-muted-foreground">
              To'g'ri: {correct}/{MIN_CORRECT_TO_WIN} kerak
            </div>
          </>
        ) : (
          <div className={`card-3d p-4 text-center ${won ? "ring-2 ring-green-400" : "ring-2 ring-destructive"}`}>
            <p className="text-lg font-extrabold">
              {won ? "🧮 Ajoyib!" : "😔 Yetarli emas"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {correct}/{TOTAL_QUESTIONS} to'g'ri javob ({MIN_CORRECT_TO_WIN}+ kerak)
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

export default QuickMathGame;
