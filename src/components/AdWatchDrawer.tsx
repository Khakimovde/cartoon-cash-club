import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, Clock } from "lucide-react";
import coinImg from "@/assets/coin-3d.png";
import videoAdIcon from "@/assets/video-ad-icon.png";
import { openDirectLink, markAdOpened } from "@/lib/monetag";

interface AdWatchDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  watchedAds: number;
  maxAds: number;
  adReward: number;
  cooldownRemaining: number;
  onWatchAd: () => Promise<void>;
  isWatching: boolean;
}

const AD_VIEW_SECONDS = 7;

const AdWatchDrawer = ({
  isOpen,
  onClose,
  watchedAds,
  maxAds,
  adReward,
  cooldownRemaining,
  onWatchAd,
  isWatching,
}: AdWatchDrawerProps) => {
  const [waitingForAd, setWaitingForAd] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const isOnCooldown = cooldownRemaining > 0;
  const isMaxReached = watchedAds >= maxAds;
  const progress = maxAds > 0 ? (watchedAds / maxAds) * 100 : 0;

  const handleWatchClick = useCallback(() => {
    if (isMaxReached || isWatching || isOnCooldown || waitingForAd) return;
    
    markAdOpened();
    openDirectLink();
    setWaitingForAd(true);
    setShowWarning(false);

    // Clear any existing timer
    if (timerRef.current) clearTimeout(timerRef.current);

    // After 7 seconds, auto-confirm
    timerRef.current = setTimeout(() => {
      setWaitingForAd(false);
      setShowWarning(false);
      onWatchAd();
    }, AD_VIEW_SECONDS * 1000);
  }, [isMaxReached, isWatching, isOnCooldown, waitingForAd, onWatchAd]);

  const isProcessing = waitingForAd || isWatching;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-[60]"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 350 }}
            className="fixed bottom-0 left-0 right-0 bg-card rounded-t-3xl z-[60] shadow-2xl max-w-md mx-auto"
          >
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full" />
            </div>
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted flex items-center justify-center"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>

            <div className="px-4 pb-5 max-h-[70vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0">
                  <img src={videoAdIcon} alt="Reklama" className="w-8 h-8 object-contain" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-foreground">Reklama ko'rish</h3>
                  <p className="text-xs text-muted-foreground">
                    {watchedAds}/{maxAds} ta ko'rildi
                  </p>
                </div>
              </div>

              {/* Reward display */}
              <div className="bg-gradient-to-r from-coin/10 to-coin/5 rounded-xl p-3 mb-3">
                <div className="flex items-center justify-center gap-2">
                  <img src={coinImg} alt="coin" className="w-8 h-8" />
                  <div className="text-center">
                    <p className="text-2xl font-extrabold text-coin">{adReward * maxAds}</p>
                    <p className="text-[10px] text-muted-foreground">Jami tanga</p>
                  </div>
                </div>
                <p className="text-center text-xs text-muted-foreground mt-1">
                  Har bir reklama = <span className="font-bold text-coin">{adReward}</span> tanga
                </p>
              </div>

              {/* Progress */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                  <span>Jarayon</span>
                  <span className="font-bold">{watchedAds}/{maxAds}</span>
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

              {/* Warning - shown only if user came back too early */}
              {showWarning && (
                <div className="flex items-center gap-2 mb-3 py-3 px-3 rounded-lg bg-yellow-500/15 border border-yellow-500/30">
                  <span className="text-lg">⚠️</span>
                  <p className="text-xs font-bold text-yellow-600 dark:text-yellow-400">Kamida 7 soniya ko'rishingiz kerak</p>
                </div>
              )}

              {/* Cooldown / limit info */}
              {isMaxReached && (
                <div className="flex items-center justify-center gap-2 mb-3 py-2 px-3 rounded-lg bg-muted">
                  <Clock className="w-4 h-4 text-primary animate-pulse" />
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground">Bu oyna uchun limit tugadi</p>
                    <p className="text-lg font-extrabold text-primary">{formatTime(cooldownRemaining)}</p>
                    <p className="text-[10px] text-muted-foreground">dan keyin yangilanadi</p>
                  </div>
                </div>
              )}

              {/* Watch button */}
              <button
                onClick={handleWatchClick}
                disabled={isMaxReached || isProcessing || isOnCooldown}
                className="w-full py-3 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 active:scale-[0.98] disabled:active:scale-100"
                style={{
                  background: isMaxReached || isOnCooldown
                    ? "hsl(var(--muted))"
                    : "var(--gradient-primary)",
                  color: isMaxReached || isOnCooldown
                    ? "hsl(var(--muted-foreground))"
                    : "hsl(var(--primary-foreground))",
                  boxShadow:
                    isMaxReached || isOnCooldown
                      ? "none"
                      : "0 4px 14px hsla(215, 90%, 55%, 0.3)",
                  opacity: isProcessing ? 0.7 : 1,
                }}
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Tasdiqlanmoqda...
                  </>
                ) : isMaxReached ? (
                  <>
                    <Clock className="w-4 h-4" />
                    Limit tugadi
                  </>
                ) : isOnCooldown ? (
                  <>
                    <Clock className="w-4 h-4" />
                    Kutish kerak
                  </>
                ) : (
                  <>
                    Ko'rish
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AdWatchDrawer;
