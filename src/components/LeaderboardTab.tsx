import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import coinImg from "@/assets/coin-3d.png";
import { getCurrentLevel } from "./ReferralTab";

interface LeaderboardUser {
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  photo_url: string | null;
  coins: number;
}

const LeaderboardTab = () => {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const { data } = await supabase
        .from("users")
        .select("telegram_id, username, first_name, photo_url, coins")
        .order("coins", { ascending: false })
        .limit(30);

      if (data) setUsers(data as LeaderboardUser[]);
      setLoading(false);
    };
    fetchLeaderboard();
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return "text-amber-500";
      case 2: return "text-gray-400";
      case 3: return "text-orange-600";
      default: return "text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <div className="px-4 pt-8 text-center">
        <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>
      </div>
    );
  }

  const top3 = users.slice(0, 3);
  const rest = users.slice(3);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="px-4 pt-4 pb-6 space-y-4"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
          <Trophy className="w-5 h-5 text-primary-foreground" strokeWidth={2.5} />
        </div>
        <div>
          <h2 className="text-lg font-extrabold text-foreground">Liderboard</h2>
          <p className="text-xs text-muted-foreground">Top foydalanuvchilar</p>
        </div>
      </motion.div>

      {/* Top 3 */}
      {top3.length > 0 && (
        <motion.div variants={itemVariants} className="flex items-end justify-center gap-3 pt-2 pb-2">
          {top3.length >= 2 && <TopCard entry={top3[1]} rank={2} />}
          <TopCard entry={top3[0]} rank={1} isFirst />
          {top3.length >= 3 && <TopCard entry={top3[2]} rank={3} />}
        </motion.div>
      )}

      {/* Rest */}
      <div className="space-y-1.5">
        {rest.map((entry, i) => {
          const rank = i + 4;
          return (
            <motion.div
              key={entry.telegram_id}
              variants={itemVariants}
              className="card-3d p-2.5 flex items-center gap-2.5"
            >
              <span className={`w-6 text-center font-extrabold text-xs ${getRankColor(rank)}`}>
                {rank}
              </span>
              <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-base flex-shrink-0 overflow-hidden">
                {entry.photo_url ? (
                  <img src={entry.photo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  "🧑‍💻"
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-bold text-foreground text-sm truncate block">
                  {entry.first_name || entry.username || "Foydalanuvchi"}
                </span>
                <p className="text-[11px] text-muted-foreground truncate">
                  ID: {entry.telegram_id}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <img src={coinImg} alt="coin" className="w-3.5 h-3.5" />
                <span className="text-xs font-bold text-coin">{entry.coins.toLocaleString()}</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {users.length === 0 && (
        <div className="text-center text-sm text-muted-foreground py-8">
          Hozircha foydalanuvchilar yo'q
        </div>
      )}
    </motion.div>
  );
};

interface TopCardProps {
  entry: LeaderboardUser;
  rank: number;
  isFirst?: boolean;
}

const TopCard = ({ entry, rank, isFirst }: TopCardProps) => {
  const crownEmoji = rank === 1 ? "👑" : rank === 2 ? "🥈" : "🥉";

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, delay: rank === 1 ? 0.2 : rank === 2 ? 0.1 : 0.3 }}
      className={`flex flex-col items-center ${isFirst ? "order-first md:order-none -mt-4" : ""}`}
    >
      {/* Crown/Medal - positioned higher for first place */}
      <span className={`${isFirst ? "text-3xl mb-2" : "text-xl mb-1"}`}>{crownEmoji}</span>
      
      {/* Avatar */}
      <div
        className={`${isFirst ? "w-20 h-20" : "w-14 h-14"} rounded-full flex items-center justify-center text-xl overflow-hidden shadow-lg ${
          rank === 1
            ? "ring-4 ring-amber-400 bg-gradient-to-br from-amber-100 to-amber-200"
            : rank === 2
            ? "ring-3 ring-gray-300 bg-gradient-to-br from-gray-100 to-gray-200"
            : "ring-3 ring-orange-300 bg-gradient-to-br from-orange-100 to-orange-200"
        }`}
      >
        {entry.photo_url ? (
          <img src={entry.photo_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className={isFirst ? "text-2xl" : "text-lg"}>🧑‍💻</span>
        )}
      </div>
      
      {/* Name and details */}
      <span className={`font-extrabold text-foreground mt-2 truncate max-w-[80px] ${isFirst ? "text-sm" : "text-xs"}`}>
        {entry.first_name || entry.username || "User"}
      </span>
      <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">
        ID: {entry.telegram_id}
      </span>
      <div className="flex items-center gap-0.5 mt-1">
        <img src={coinImg} alt="" className={isFirst ? "w-4 h-4" : "w-3 h-3"} />
        <span className={`font-bold text-coin ${isFirst ? "text-xs" : "text-[10px]"}`}>
          {entry.coins.toLocaleString()}
        </span>
      </div>
    </motion.div>
  );
};

export default LeaderboardTab;
