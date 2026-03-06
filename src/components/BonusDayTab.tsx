import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Sparkles, ChevronRight, Clock } from "lucide-react";
import coinImg from "@/assets/coin-3d.png";
import { showInterstitialAd } from "@/lib/richads";
import { openRotatingDirectLink } from "@/lib/monetag";

interface BonusDayTabProps {
  bonusCoins: number;
  invokeAction: (action: string, params?: Record<string, any>) => Promise<any>;
  refreshUser: () => Promise<void>;
}

const AD_VIEW_SECONDS = 7;
const BONUS_PER_AD = 2;
const MAX_ADS_PER_WINDOW = 5;
const WINDOW_MINUTES = 10;

// Timezone-independent 10-minute window calculation using epoch
function getWindowSecondsRemaining(): number {
  const now = Date.now();
  const msPerWindow = WINDOW_MINUTES * 60 * 1000;
  const nextWindowStart = (Math.floor(now / msPerWindow) + 1) * msPerWindow;
  return Math.max(0, Math.ceil((nextWindowStart - now) / 1000));
}

const BonusDayTab = ({ bonusCoins, invokeAction, refreshUser }: BonusDayTabProps) => {
  const [waitingForAd, setWaitingForAd] = useState(false);
  const [isWatching, setIsWatching] = useState(false);
  const [localBonusCoins, setLocalBonusCoins] = useState(bonusCoins);
  const [windowAdsCount, setWindowAdsCount] = useState(0);
  const [windowCooldown, setWindowCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalBonusCoins(bonusCoins);
  }, [bonusCoins]);

  useEffect(() => {
    loadWindowStatus();
  }, []);

  const loadWindowStatus = async () => {
    const result = await invokeAction("get_bonus_window_status");
    if (result?.success) {
      setWindowAdsCount(result.window_ads_count || 0);
    }
  };

  // Window cooldown timer - only when limit reached
  useEffect(() => {
    if (windowAdsCount < MAX_ADS_PER_WINDOW) {
      setWindowCooldown(0);
      return;
    }
    setWindowCooldown(getWindowSecondsRemaining());

    const interval = setInterval(() => {
      const remaining = getWindowSecondsRemaining();
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

  const handleWatchClick = useCallback(async () => {
    if (waitingForAd || isWatching || windowAdsCount >= MAX_ADS_PER_WINDOW) return;
    
    setWaitingForAd(true);

    // Try RichAds interstitial first, fallback to rotating direct links
    const shown = await showInterstitialAd();
    if (!shown) {
      openRotatingDirectLink();
    }

    // Clear any existing timer
    if (timerRef.current) clearTimeout(timerRef.current);

    // After 7 seconds, auto-confirm
    timerRef.current = setTimeout(() => {
      setWaitingForAd(false);
      handleAdComplete();
    }, AD_VIEW_SECONDS * 1000);
  }, [waitingForAd, isWatching, windowAdsCount, handleAdComplete]);

  const isProcessing = waitingForAd || isWatching;
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
