import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Sparkles, ChevronRight, Clock } from "lucide-react";
import coinImg from "@/assets/coin-3d.png";
import { openRotatingDirectLink, markAdOpened } from "@/lib/monetag";

interface BonusDayTabProps {
  bonusCoins: number;
  invokeAction: (action: string, params?: Record<string, any>) => Promise<any>;
  refreshUser: () => Promise<void>;
}

const AD_VIEW_SECONDS = 7;
const BONUS_PER_AD = 2;
const MAX_ADS_PER_WINDOW = 5;
const WINDOW_MINUTES = 10;

// Get current 10-min window start and seconds remaining until next window
function getWindowInfo() {
  const now = new Date();
  const minutes = now.getMinutes();
  const windowStart = Math.floor(minutes / WINDOW_MINUTES) * WINDOW_MINUTES;
  const nextWindow = windowStart + WINDOW_MINUTES;
  const nextWindowTime = new Date(now);
  nextWindowTime.setMinutes(nextWindow, 0, 0);
  if (nextWindow >= 60) {
    nextWindowTime.setHours(nextWindowTime.getHours() + 1);
    nextWindowTime.setMinutes(0, 0, 0);
  }
  const secondsRemaining = Math.max(0, Math.floor((nextWindowTime.getTime() - now.getTime()) / 1000));
  return { secondsRemaining };
}

const BonusDayTab = ({ bonusCoins, invokeAction, refreshUser }: BonusDayTabProps) => {
  const [countdown, setCountdown] = useState(0);
  const [waitingForReturn, setWaitingForReturn] = useState(false);
  const [isWatching, setIsWatching] = useState(false);
  const [localBonusCoins, setLocalBonusCoins] = useState(bonusCoins);
  const [windowAdsCount, setWindowAdsCount] = useState(0);
  const [windowCooldown, setWindowCooldown] = useState(0);
  const adOpenTimeRef = useRef<number>(0);

  useEffect(() => {
    setLocalBonusCoins(bonusCoins);
  }, [bonusCoins]);

  // Load window ad count from backend
  useEffect(() => {
    loadWindowStatus();
  }, []);

  const loadWindowStatus = async () => {
    const result = await invokeAction("get_bonus_window_status");
    if (result?.success) {
      setWindowAdsCount(result.window_ads_count || 0);
    }
    // Calculate cooldown
    const { secondsRemaining } = getWindowInfo();
    setWindowCooldown(secondsRemaining);
  };

  // Window cooldown timer
  useEffect(() => {
    if (windowAdsCount < MAX_ADS_PER_WINDOW) {
      setWindowCooldown(0);
      return;
    }
    const { secondsRemaining } = getWindowInfo();
    setWindowCooldown(secondsRemaining);

    const interval = setInterval(() => {
      const { secondsRemaining: remaining } = getWindowInfo();
      if (remaining <= 0) {
        setWindowCooldown(0);
        setWindowAdsCount(0);
        clearInterval(interval);
      } else {
        setWindowCooldown(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [windowAdsCount]);

  // Ad view countdown timer - visual only
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleAdComplete = useCallback(async () => {
    setIsWatching(true);
    const result = await invokeAction("watch_bonus_ad");
    if (result?.success) {
      setLocalBonusCoins(result.bonus_coins ?? localBonusCoins + BONUS_PER_AD);
      setWindowAdsCount(result.window_ads_count ?? windowAdsCount + 1);
    } else if (result?.error === 'Bonus window limit') {
      setWindowAdsCount(MAX_ADS_PER_WINDOW);
    }
    await refreshUser();
    setIsWatching(false);
  }, [invokeAction, refreshUser, localBonusCoins, windowAdsCount]);

  // Listen for user returning to app
  useEffect(() => {
    if (!waitingForReturn) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && waitingForReturn) {
        const elapsed = Math.floor((Date.now() - adOpenTimeRef.current) / 1000);
        if (elapsed >= AD_VIEW_SECONDS) {
          setWaitingForReturn(false);
          setCountdown(0);
          handleAdComplete();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [waitingForReturn, handleAdComplete]);

  // Check when countdown reaches 0
  useEffect(() => {
    if (countdown === 0 && waitingForReturn) {
      const elapsed = Math.floor((Date.now() - adOpenTimeRef.current) / 1000);
      if (elapsed >= AD_VIEW_SECONDS) {
        setWaitingForReturn(false);
        handleAdComplete();
      }
    }
  }, [countdown, waitingForReturn, handleAdComplete]);

  const handleWatchClick = useCallback(() => {
    if (waitingForReturn || isWatching || windowAdsCount >= MAX_ADS_PER_WINDOW) return;
    adOpenTimeRef.current = Date.now();
    markAdOpened();
    openRotatingDirectLink();
    setWaitingForReturn(true);
    setCountdown(AD_VIEW_SECONDS);
  }, [waitingForReturn, isWatching, windowAdsCount]);

  const isProcessing = waitingForReturn || isWatching;
  const isLimitReached = windowAdsCount >= MAX_ADS_PER_WINDOW;
  const progress = MAX_ADS_PER_WINDOW > 0 ? (windowAdsCount / MAX_ADS_PER_WINDOW) * 100 : 0;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

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
          <span className="text-sm font-extrabold text-foreground">Bonus tanga</span>
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

      {/* Ad reward info + progress */}
      <div className="card-3d p-3">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <span className="text-xl">📺</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">Reklama ko'rish</p>
            <p className="text-xs text-muted-foreground">
              Har bir reklama = <span className="font-bold text-yellow-500">{BONUS_PER_AD} bonus tanga</span>
            </p>
            <p className="text-[10px] text-muted-foreground">Har 10 daqiqada {MAX_ADS_PER_WINDOW} ta reklama</p>
          </div>
          <img src={coinImg} alt="coin" className="w-8 h-8" />
        </div>

        {/* Progress bar */}
        <div className="mb-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Jarayon</span>
            <span className="font-bold">{windowAdsCount}/{MAX_ADS_PER_WINDOW}</span>
          </div>
          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: "var(--gradient-primary)" }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>

      {/* Waiting indicator */}
      {waitingForReturn && (
        <div className="flex items-center gap-2 py-3 px-3 rounded-xl bg-yellow-500/15 border border-yellow-500/30">
          <span className="text-lg">⚠️</span>
          <div>
            <p className="text-xs font-bold text-yellow-600 dark:text-yellow-400">Kamida 7 soniya ko'rishingiz kerak</p>
            {countdown > 0 && (
              <p className="text-[10px] text-yellow-600/70 dark:text-yellow-400/70">{countdown} soniya qoldi</p>
            )}
          </div>
        </div>
      )}

      {/* Window limit reached */}
      {isLimitReached && windowCooldown > 0 && (
        <div className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-muted">
          <Clock className="w-4 h-4 text-primary animate-pulse" />
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground">Keyingi oynagacha</p>
            <p className="text-lg font-extrabold text-primary">{formatTime(windowCooldown)}</p>
            <p className="text-[10px] text-muted-foreground">dan keyin yangilanadi</p>
          </div>
        </div>
      )}

      {/* Watch button */}
      <button
        onClick={handleWatchClick}
        disabled={isLimitReached || isProcessing}
        className="w-full py-4 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 active:scale-[0.98]"
        style={{
          background: isLimitReached ? "hsl(var(--muted))" : "var(--gradient-primary)",
          color: isLimitReached ? "hsl(var(--muted-foreground))" : "hsl(var(--primary-foreground))",
          boxShadow: isLimitReached ? "none" : "0 4px 14px hsla(215, 90%, 55%, 0.3)",
          opacity: isProcessing ? 0.7 : 1,
        }}
      >
        {isProcessing ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Tasdiqlanmoqda...
          </>
        ) : isLimitReached ? (
          <>
            <Clock className="w-4 h-4" />
            Limit tugadi
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
