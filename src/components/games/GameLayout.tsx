import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import coinImg from "@/assets/coin-3d.png";
import type { GameSetting } from "../GamesTab";

interface GameLayoutProps {
  game: GameSetting;
  coins: number;
  onBack: () => void;
  children: React.ReactNode;
  header?: React.ReactNode;
}

const GameLayout = ({ game, coins, onBack, children, header }: GameLayoutProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="px-4 pt-3 pb-6"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        {header}
        <div className="flex items-center gap-1">
          <img src={coinImg} alt="coin" className="w-4 h-4" />
          <span className="text-sm font-bold text-coin">{coins.toLocaleString()}</span>
        </div>
      </div>

      {children}
    </motion.div>
  );
};

export default GameLayout;
