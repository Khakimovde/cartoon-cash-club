import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Sparkles, ChevronRight } from "lucide-react";
import coinImg from "@/assets/coin-3d.png";
import { openDirectLink } from "@/lib/monetag";

interface BonusDayTabProps {
  bonusCoins: number;
  invokeAction: (action: string, params?: Record<string, any>) => Promise<any>;
  refreshUser: () => Promise<void>;
}

const AD_VIEW_SECONDS = 7;
const BONUS_PER_AD = 2;

const BonusDayTab = ({ bonusCoins, invokeAction, refreshUser }: BonusDayTabProps) => {
  const [countdown, setCountdown] = useState(0);
  const [waitingForReturn, setWaitingForReturn] = useState(false);
  const [isWatching, setIsWatching] = useState(false);
  const [localBonusCoins, setLocalBonusCoins] = useState(bonusCoins);

  useEffect(() => {
    setLocalBonusCoins(bonusCoins);
  }, [bonusCoins]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setWaitingForReturn(false);
          handleAdComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleAdComplete = async () => {
    setIsWatching(true);
    const result = await invokeAction("watch_bonus_ad");
    if (result?.success) {
      setLocalBonusCoins(result.bonus_coins ?? localBonusCoins + BONUS_PER_AD);
    }
    await refreshUser();
    setIsWatching(false);
  };

  const handleWatchClick = useCallback(() => {
    if (waitingForReturn || isWatching) return;
    openDirectLink();
    setWaitingForReturn(true);
    setCountdown(AD_VIEW_SECONDS);
  }, [waitingForReturn, isWatching]);

  const isProcessing = waitingForReturn || isWatching;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="px-4 pt-4 pb-6 space-y-4"
    >
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-yellow-500/20 to-orange-500/20">
          <Sparkles className="w-5 h-5 text-yellow-500" />
          <span className="text-sm font-extrabold text-foreground">Bonus Day</span>
          <Sparkles className="w-5 h-5 text-yellow-500" />
        </div>
        <p className="text-xs text-muted-foreground">
          Reklama ko'ring va bonus tanga yig'ing!
        </p>
      </div>

      {/* Bonus balance */}
      <div className="card-3d p-4">
        <div className="flex items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/10 flex items-center justify-center">
            <span className="text-2xl">⭐</span>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Bonus balans</p>
            <p className="text-2xl font-extrabold text-foreground">{localBonusCoins.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">bonus tanga</p>
          </div>
        </div>
      </div>

      {/* Ad reward info */}
      <div className="card-3d p-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <span className="text-xl">📺</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">Reklama ko'rish</p>
            <p className="text-xs text-muted-foreground">
              Har bir reklama = <span className="font-bold text-yellow-500">{BONUS_PER_AD} bonus tanga</span>
            </p>
            <p className="text-[10px] text-muted-foreground">Cheksiz ko'rish mumkin!</p>
          </div>
          <img src={coinImg} alt="coin" className="w-8 h-8" />
        </div>
      </div>

      {/* Waiting indicator */}
      {waitingForReturn && (
        <div className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-primary/10">
          <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-xs font-bold text-foreground">Kamida 5 soniya ko'rishingiz kerak</p>
        </div>
      )}

      {/* Watch button */}
      <button
        onClick={handleWatchClick}
        disabled={isProcessing}
        className="w-full py-4 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 active:scale-[0.98]"
        style={{
          background: "var(--gradient-primary)",
          color: "hsl(var(--primary-foreground))",
          boxShadow: "0 4px 14px hsla(215, 90%, 55%, 0.3)",
          opacity: isProcessing ? 0.7 : 1,
        }}
      >
        {isProcessing ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Tasdiqlanmoqda...
          </>
        ) : (
          <>
            Reklama ko'rish (+{BONUS_PER_AD} bonus)
            <ChevronRight className="w-4 h-4" />
          </>
        )}
      </button>

      {/* Info */}
      <div className="text-center space-y-1">
        <p className="text-[10px] text-muted-foreground">
          ℹ️ Bonus tangalar alohida balansda saqlanadi
        </p>
        <p className="text-[10px] text-muted-foreground">
          Admin tomonidan asosiy tangaga o'zgartiriladi
        </p>
      </div>
    </motion.div>
  );
};

export default BonusDayTab;
