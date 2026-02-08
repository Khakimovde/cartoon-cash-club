import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, Clock, CheckCircle2 } from "lucide-react";
import coinImg from "@/assets/coin-3d.png";
import videoAdIcon from "@/assets/video-ad-icon.png";

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
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const isOnCooldown = cooldownRemaining > 0;
  const isMaxReached = watchedAds >= maxAds;
  const progress = maxAds > 0 ? (watchedAds / maxAds) * 100 : 0;

  const handleWatchClick = async () => {
    if (isMaxReached || isWatching || isOnCooldown) return;
    await onWatchAd();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-50"
          />

          {/* Drawer */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 350 }}
            className="fixed bottom-0 left-0 right-0 bg-card rounded-t-3xl z-50 shadow-2xl max-w-md mx-auto"
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full" />
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted flex items-center justify-center"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>

            <div className="px-5 pb-8">
              {/* Header */}
              <div className="flex items-center gap-4 mb-5">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <img src={videoAdIcon} alt="Reklama" className="w-11 h-11 object-contain" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-foreground">Reklama ko'rish</h3>
                  <p className="text-sm text-muted-foreground">
                    {watchedAds}/{maxAds} ta ko'rildi
                  </p>
                </div>
              </div>

              {/* Reward display */}
              <div className="bg-gradient-to-r from-coin/10 to-coin/5 rounded-2xl p-4 mb-5">
                <div className="flex items-center justify-center gap-3">
                  <img src={coinImg} alt="coin" className="w-10 h-10" />
                  <div className="text-center">
                    <p className="text-3xl font-extrabold text-coin">{adReward * maxAds}</p>
                    <p className="text-xs text-muted-foreground">Jami tanga</p>
                  </div>
                </div>
                <p className="text-center text-sm text-muted-foreground mt-2">
                  Har bir reklama uchun <span className="font-bold text-coin">{adReward}</span> tanga
                </p>
              </div>

              {/* Progress */}
              <div className="mb-5">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <span>Jarayon</span>
                  <span className="font-bold">{watchedAds}/{maxAds}</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: "var(--gradient-primary)" }}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>
              </div>

              {/* Cooldown timer */}
              {isOnCooldown && (
                <div className="flex items-center justify-center gap-3 mb-5 py-3 px-4 rounded-xl bg-muted">
                  <Clock className="w-5 h-5 text-primary animate-pulse" />
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Keyingi reklama</p>
                    <p className="text-xl font-extrabold text-primary">{formatTime(cooldownRemaining)}</p>
                  </div>
                </div>
              )}

              {/* Watch button */}
              <button
                onClick={handleWatchClick}
                disabled={isMaxReached || isWatching || isOnCooldown}
                className="w-full py-4 rounded-2xl text-base font-bold transition-all duration-300 flex items-center justify-center gap-2 active:scale-[0.98] disabled:active:scale-100"
                style={{
                  background: isMaxReached
                    ? "hsl(var(--success))"
                    : isOnCooldown
                    ? "hsl(var(--muted))"
                    : "var(--gradient-primary)",
                  color: isOnCooldown
                    ? "hsl(var(--muted-foreground))"
                    : "hsl(var(--primary-foreground))",
                  boxShadow:
                    isMaxReached || isOnCooldown
                      ? "none"
                      : "0 6px 20px hsla(215, 90%, 55%, 0.35)",
                  opacity: isWatching ? 0.7 : 1,
                }}
              >
                {isWatching ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Yuklanmoqda...
                  </>
                ) : isMaxReached ? (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Bajarildi!
                  </>
                ) : isOnCooldown ? (
                  <>
                    <Clock className="w-5 h-5" />
                    Kutish kerak
                  </>
                ) : (
                  <>
                    Ko'rish
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>

              {/* Help text */}
              {!isMaxReached && !isOnCooldown && !isWatching && (
                <p className="text-center text-xs text-muted-foreground mt-3">
                  Tugmani bosing va reklamani ko'ring
                </p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AdWatchDrawer;
