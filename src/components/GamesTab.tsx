import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Gamepad2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import coinImg from "@/assets/coin-3d.png";
import { toast } from "sonner";

// Game components
import HangmanGame from "./games/HangmanGame";
import MinesGame from "./games/MinesGame";
import TreasureGame from "./games/TreasureGame";
import NumberGuessGame from "./games/NumberGuessGame";
import QuickMathGame from "./games/QuickMathGame";
import MemoryGame from "./games/MemoryGame";

interface GamesTabProps {
  coins: number;
  telegramId: number;
  invokeAction: (action: string, params?: Record<string, any>) => Promise<any>;
  refreshUser: () => Promise<void>;
}

export interface GameSetting {
  id: string;
  name: string;
  description: string;
  emoji: string;
  bet_amount: number;
  reward_amount: number;
  active: boolean;
}

const GAME_EMOJIS: Record<string, string> = {
  viselitsa: "🎯",
  mines: "💣",
  sandiq: "🎁",
  raqam_topish: "🔢",
  tez_hisob: "🧮",
  xotira: "🧠",
};

const GamesTab = ({ coins, telegramId, invokeAction, refreshUser }: GamesTabProps) => {
  const [games, setGames] = useState<GameSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeGame, setActiveGame] = useState<string | null>(null);

  useEffect(() => {
    const fetchGames = async () => {
      const { data } = await supabase
        .from("game_settings")
        .select("*")
        .eq("active", true)
        .order("created_at");
      if (data) setGames(data as GameSetting[]);
      setLoading(false);
    };
    fetchGames();
  }, []);

  const handleGameResult = async (gameId: string, won: boolean) => {
    const game = games.find((g) => g.id === gameId);
    if (!game) return;

    const result = await invokeAction("game_result", {
      game_id: gameId,
      won,
      bet_amount: game.bet_amount,
      reward_amount: game.reward_amount,
    });

    if (result?.success) {
      if (won) {
        toast.success(`🎉 Tabriklaymiz! +${game.reward_amount} tanga yutdingiz!`);
      } else {
        toast.error(`😔 Afsuski, -${game.bet_amount} tanga yo'qotdingiz`);
      }
      await refreshUser();
    } else {
      toast.error(result?.error || "Xatolik yuz berdi");
    }

    return result;
  };

  const handleStartGame = async (gameId: string) => {
    const game = games.find((g) => g.id === gameId);
    if (!game) return false;

    if (coins < game.bet_amount) {
      toast.error(`Tangalar yetarli emas! ${game.bet_amount} tanga kerak`);
      return false;
    }

    setActiveGame(gameId);
    return true;
  };

  if (activeGame) {
    const game = games.find((g) => g.id === activeGame)!;
    const gameProps = {
      game,
      coins,
      onResult: (won: boolean) => handleGameResult(activeGame, won),
      onBack: () => setActiveGame(null),
    };

    switch (activeGame) {
      case "viselitsa":
        return <HangmanGame {...gameProps} />;
      case "mines":
        return <MinesGame {...gameProps} />;
      case "sandiq":
        return <TreasureGame {...gameProps} />;
      case "raqam_topish":
        return <NumberGuessGame {...gameProps} />;
      case "tez_hisob":
        return <QuickMathGame {...gameProps} />;
      case "xotira":
        return <MemoryGame {...gameProps} />;
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="px-4 pt-4 pb-6 space-y-3"
    >
      <motion.div variants={itemVariants} className="text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
            <Gamepad2 className="w-5 h-5 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <h2 className="text-xl font-extrabold text-foreground">Mini O'yinlar</h2>
        </div>
        <p className="text-sm text-muted-foreground">Tanga tikib, o'ynang va yuting!</p>
      </motion.div>

      {loading ? (
        <div className="text-center text-sm text-muted-foreground py-8">Yuklanmoqda...</div>
      ) : games.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground py-8">O'yinlar hozircha yo'q</div>
      ) : (
        games.map((game) => (
          <motion.div
            key={game.id}
            variants={itemVariants}
            className="task-card cursor-pointer"
            onClick={() => handleStartGame(game.id)}
          >
            <div className="task-card-icon" style={{ background: "var(--gradient-video)" }}>
              <span className="text-3xl">{GAME_EMOJIS[game.id] || game.emoji}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-foreground">{game.name}</h3>
              <p className="text-sm text-muted-foreground">{game.description}</p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <img src={coinImg} alt="coin" className="w-4 h-4" />
              <span className="text-sm font-bold text-coin">{game.bet_amount}</span>
            </div>
          </motion.div>
        ))
      )}
    </motion.div>
  );
};

export default GamesTab;
