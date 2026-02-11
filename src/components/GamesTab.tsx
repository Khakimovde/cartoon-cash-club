import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Gamepad2, ArrowLeft, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import coinImg from "@/assets/coin-3d.png";
import { toast } from "sonner";
import { showAd } from "@/lib/monetag";

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
  sort_order?: number;
}

const GAME_EMOJIS: Record<string, string> = {
  viselitsa: "🎯",
  mines: "💣",
  sandiq: "🎁",
  raqam_topish: "🔢",
  tez_hisob: "🧮",
  xotira: "🧠",
};

const GAME_RULES: Record<string, string> = {
  viselitsa: "Yashirin so'zni topish uchun harflarni tanlang. 7 ta xato qilsangiz — osilasiz va mag'lub bo'lasiz!",
  mines: "Bomba sonini tanlang va xavfsiz katakchalarni oching. Bombaga tegsangiz — yutqizasiz!",
  sandiq: "9 ta sandiqdan birini tanlang. Ichida sovg'a bo'lsa — mukofot olasiz!",
  raqam_topish: "1 dan 100 gacha raqamni 7 ta urinishda toping. Har safar ko'rsatma beriladi!",
  tez_hisob: "10 ta matematik savolga 30 soniyada javob bering. 7+ to'g'ri javob — g'alaba!",
  xotira: "Juft kartalarni toping! 25 ta harakatda barcha juftlarni topish kerak.",
};

const GamesTab = ({ coins, telegramId, invokeAction, refreshUser }: GamesTabProps) => {
  const [games, setGames] = useState<GameSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [showingAd, setShowingAd] = useState(false);

  useEffect(() => {
    const fetchGames = async () => {
      const { data } = await supabase
        .from("game_settings")
        .select("*")
        .eq("active", true)
        .order("created_at");
      if (data) {
        // Sort by sort_order if available
        const sorted = (data as GameSetting[]).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        setGames(sorted);
      }
      setLoading(false);
    };
    fetchGames();
  }, []);

  const handleGameResult = async (gameId: string, won: boolean) => {
    const game = games.find((g) => g.id === gameId);
    if (!game) return;

    // Bet already deducted on start. Only process reward if won.
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
    if (!game) return;

    if (coins < game.bet_amount) {
      toast.error(`Tangalar yetarli emas! ${game.bet_amount} tanga kerak`);
      return;
    }

    // Deduct bet immediately before ad
    const deductResult = await invokeAction("game_bet_deduct", {
      game_id: gameId,
      bet_amount: game.bet_amount,
    });

    if (!deductResult?.success) {
      toast.error(deductResult?.error || "Xatolik yuz berdi");
      return;
    }

    await refreshUser();

    // Show ad before game starts
    setShowingAd(true);
    try {
      await showAd();
    } catch (e) {
      // Ad failed, still allow game
    }
    setShowingAd(false);

    setActiveGame(gameId);
    setSelectedGame(null);
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

  // Game start screen
  if (selectedGame) {
    const game = games.find((g) => g.id === selectedGame)!;
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="px-4 pt-4 pb-6 space-y-5"
      >
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelectedGame(null)}
            className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex items-center gap-1">
            <img src={coinImg} alt="coin" className="w-4 h-4" />
            <span className="text-sm font-bold text-coin">{coins.toLocaleString()}</span>
          </div>
        </div>

        <div className="card-3d p-6 text-center space-y-4">
          <div className="text-5xl">{GAME_EMOJIS[game.id] || game.emoji}</div>
          <h2 className="text-2xl font-extrabold text-foreground">{game.name}</h2>
          <p className="text-sm text-muted-foreground">{GAME_RULES[game.id] || game.description}</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-secondary rounded-2xl p-3">
              <p className="text-xs text-muted-foreground">Tikish</p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <img src={coinImg} alt="coin" className="w-4 h-4" />
                <span className="text-lg font-extrabold text-destructive">{game.bet_amount}</span>
              </div>
            </div>
            <div className="bg-secondary rounded-2xl p-3">
              <p className="text-xs text-muted-foreground">Mukofot</p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <img src={coinImg} alt="coin" className="w-4 h-4" />
                <span className="text-lg font-extrabold text-primary">{game.reward_amount}</span>
              </div>
            </div>
          </div>

          <div className="bg-destructive/10 rounded-xl p-3">
            <p className="text-xs text-destructive font-bold">
              ⚠️ Mag'lubiyatda -{game.bet_amount} tanga yo'qotasiz
            </p>
          </div>

          <button
            onClick={() => handleStartGame(game.id)}
            disabled={coins < game.bet_amount || showingAd}
            className="w-full py-4 rounded-2xl font-extrabold text-base flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: "var(--gradient-primary)", color: "hsl(var(--primary-foreground))" }}
          >
            {showingAd ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Reklama...
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Boshlash
              </>
            )}
          </button>

          {coins < game.bet_amount && (
            <p className="text-xs text-destructive font-bold">Tangalar yetarli emas!</p>
          )}
        </div>
      </motion.div>
    );
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
            onClick={() => setSelectedGame(game.id)}
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
