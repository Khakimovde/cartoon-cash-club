import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, Clock, Copy, CheckCircle2, Ticket, ChevronRight, History, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showAd } from "@/lib/monetag";
import coinImg from "@/assets/coin-3d.png";
import videoAdIcon from "@/assets/video-ad-icon.png";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

interface PromoTabProps {
  coins: number;
  telegramId: number;
  refreshUser: () => Promise<void>;
}

// Get next :00 or :30 boundary
function getNextBoundary(): number {
  const now = new Date();
  const nextMinutes = now.getMinutes() >= 30 ? 0 : 30;
  const nextHour = now.getMinutes() >= 30 ? now.getHours() + 1 : now.getHours();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), nextHour, nextMinutes, 0, 0).getTime();
}

const PromoTab = ({ coins, telegramId, refreshUser }: PromoTabProps) => {
  const [adsCount, setAdsCount] = useState(0);
  const [isWatching, setIsWatching] = useState(false);
  const [cooldownEnd, setCooldownEnd] = useState(0);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [activePromo, setActivePromo] = useState<{ code: string; coins_reward: number; expires_at: string } | null>(null);
  const [promoInput, setPromoInput] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const maxAds = 10;

  useEffect(() => {
    fetchStatus();
  }, [telegramId]);

  const fetchStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("promo-action", {
        body: { action: "get_promo_status", telegram_id: telegramId },
      });
      if (error) throw error;
      setAdsCount(data.ads_count || 0);
      setCooldownEnd(data.cooldown_end || 0);
      setActivePromo(data.active_promo || null);
    } catch (err) {
      console.error("Promo status error:", err);
    }
  };

  // Cooldown timer
  useEffect(() => {
    if (!cooldownEnd || cooldownEnd <= Date.now()) {
      setCooldownRemaining(0);
      return;
    }
    setCooldownRemaining(Math.ceil((cooldownEnd - Date.now()) / 1000));
    const interval = setInterval(() => {
      const remaining = Math.ceil((cooldownEnd - Date.now()) / 1000);
      if (remaining <= 0) {
        setCooldownRemaining(0);
        setAdsCount(0);
        setCooldownEnd(0);
        clearInterval(interval);
      } else {
        setCooldownRemaining(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownEnd]);

  const handleWatchAd = useCallback(async () => {
    if (adsCount >= maxAds || isWatching || cooldownRemaining > 0) return;
    setIsWatching(true);
    try {
      const adShown = await showAd();
      if (adShown) {
        const { data, error } = await supabase.functions.invoke("promo-action", {
          body: { action: "watch_promo_ad", telegram_id: telegramId },
        });
        if (error) throw error;
        if (data?.success) {
          setAdsCount(data.ads_count);
          if (data.completed && data.promo_code) {
            toast.success("Promokod yaratildi! 🎉");
            await fetchStatus();
          } else {
            toast.success(`Reklama ko'rildi! ${data.ads_count}/${maxAds}`);
          }
        } else if (data?.error) {
          if (data.error === 'Limit tugadi') {
            setCooldownEnd(getNextBoundary());
            setAdsCount(maxAds);
          }
          toast.error(data.error);
        }
      } else {
        toast.error("Reklama yuklanmadi");
      }
    } catch (err) {
      console.error("Promo ad error:", err);
      toast.error("Xatolik yuz berdi");
    } finally {
      setIsWatching(false);
    }
  }, [adsCount, isWatching, cooldownRemaining, telegramId]);

  const handleRedeem = async () => {
    const code = promoInput.trim();
    if (!code || isRedeeming) return;
    setIsRedeeming(true);
    try {
      const { data, error } = await supabase.functions.invoke("promo-action", {
        body: { action: "redeem_promo", telegram_id: telegramId, code },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success(`+${data.coins_earned} tanga qo'shildi! 🎉`);
        setPromoInput("");
        await refreshUser();
        await fetchStatus();
      } else {
        toast.error(data?.error || "Xatolik");
      }
    } catch (err) {
      console.error("Redeem error:", err);
      toast.error("Xatolik yuz berdi");
    } finally {
      setIsRedeeming(false);
    }
  };

  const copyCode = () => {
    if (activePromo?.code) {
      navigator.clipboard.writeText(activePromo.code);
      setCopied(true);
      toast.success("Promokod nusxalandi!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("promo-action", {
        body: { action: "get_promo_history", telegram_id: telegramId },
      });
      if (error) throw error;
      setHistory(data.history || []);
    } catch (err) {
      console.error("History error:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const toggleHistory = () => {
    if (!showHistory) fetchHistory();
    setShowHistory(!showHistory);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = adsCount / maxAds;
  const isOnCooldown = cooldownRemaining > 0;
  const isMaxReached = adsCount >= maxAds;

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
      className="px-4 pt-4 pb-6 space-y-4"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
            <Gift className="w-5 h-5 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <h2 className="text-xl font-extrabold text-foreground">Promokod</h2>
          <button
            onClick={toggleHistory}
            className="ml-auto w-8 h-8 rounded-lg bg-secondary flex items-center justify-center"
          >
            <History className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground">10 ta reklama ko'rib promokod oling</p>
      </motion.div>

      {/* History overlay */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="card-3d p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-primary" />
                  <h3 className="font-bold text-sm text-foreground">Promokod tarixi</h3>
                </div>
                <button onClick={() => setShowHistory(false)} className="p-1 rounded-lg bg-secondary">
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
              {historyLoading ? (
                <div className="text-center py-4">
                  <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
                </div>
              ) : history.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Hali promokod ishlatilmagan</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {history.map((h) => (
                    <div key={h.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary">
                      <div>
                        <p className="text-xs font-bold text-foreground tracking-wider">{h.code}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(h.redeemed_at).toLocaleDateString("uz-UZ")}
                          {h.source === 'admin' && ' · Admin'}
                          {h.source === 'own' && ' · O\'zim'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <img src={coinImg} alt="coin" className="w-3.5 h-3.5" />
                        <span className="text-xs font-bold text-coin">+{h.coins_earned}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Watch Ads Card */}
      <motion.div variants={itemVariants} className="card-3d p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--gradient-video)" }}>
            <img src={videoAdIcon} alt="Reklama" className="w-8 h-8 object-contain" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-foreground">Promokod olish</h3>
            <p className="text-xs text-muted-foreground">{adsCount}/{maxAds} ta reklama ko'rildi</p>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span>Jarayon</span>
            <span className="font-bold">{adsCount}/{maxAds}</span>
          </div>
          <div className="progress-bar-3d">
            <div className="fill" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>

        {/* Cooldown info */}
        {isOnCooldown && (
          <div className="flex items-center justify-center gap-2 mb-3 py-2 px-3 rounded-lg bg-muted">
            <Clock className="w-4 h-4 text-primary animate-pulse" />
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground">Keyingi tura</p>
              <p className="text-lg font-extrabold text-primary">{formatTime(cooldownRemaining)}</p>
              <p className="text-[10px] text-muted-foreground">dan keyin yangilanadi</p>
            </div>
          </div>
        )}

        {/* Watch button */}
        <button
          onClick={handleWatchAd}
          disabled={isMaxReached || isWatching || isOnCooldown}
          className="w-full py-3 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 active:scale-[0.98] disabled:active:scale-100"
          style={{
            background: isMaxReached || isOnCooldown ? "hsl(var(--muted))" : "var(--gradient-primary)",
            color: isMaxReached || isOnCooldown ? "hsl(var(--muted-foreground))" : "hsl(var(--primary-foreground))",
            boxShadow: isMaxReached || isOnCooldown ? "none" : "0 4px 14px hsla(215, 90%, 55%, 0.3)",
            opacity: isWatching ? 0.7 : 1,
          }}
        >
          {isWatching ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Yuklanmoqda...
            </>
          ) : isMaxReached && !isOnCooldown ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Tayyor
            </>
          ) : isOnCooldown ? (
            <>
              <Clock className="w-4 h-4" />
              Kutish kerak
            </>
          ) : (
            <>
              Reklama ko'rish
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      </motion.div>

      {/* Generated Promo Code */}
      {activePromo && (
        <motion.div variants={itemVariants} className="card-3d p-4">
          <div className="flex items-center gap-2 mb-3">
            <Ticket className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-foreground">Sizning promokodingiz</h3>
          </div>
          <p className="text-[10px] text-muted-foreground mb-2">
            Bu kodni boshqalarga yuboring yoki o'zingiz ishlating. Faqat 1 marta ishlatiladi. 24 soat amal qiladi.
          </p>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 bg-muted rounded-xl px-4 py-3 text-center">
              <span className="text-lg font-extrabold tracking-widest text-foreground">{activePromo.code}</span>
            </div>
            <button
              onClick={copyCode}
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--gradient-primary)" }}
            >
              {copied ? (
                <CheckCircle2 className="w-5 h-5 text-primary-foreground" />
              ) : (
                <Copy className="w-5 h-5 text-primary-foreground" />
              )}
            </button>
          </div>
          <div className="flex items-center justify-center gap-1">
            <img src={coinImg} alt="coin" className="w-4 h-4" />
            <span className="text-xs text-muted-foreground">
              Mukofot: <span className="font-bold text-coin">10 — 100 tanga</span>
            </span>
          </div>
        </motion.div>
      )}

      {/* Redeem Promo Code */}
      <motion.div variants={itemVariants} className="card-3d p-4">
        <div className="flex items-center gap-2 mb-3">
          <Gift className="w-5 h-5 text-coin" />
          <h3 className="font-bold text-foreground">Promokod kiritish</h3>
        </div>
        <p className="text-[10px] text-muted-foreground mb-3">
          Promokodni kiriting va tanga yuting
        </p>
        <div className="flex gap-2">
          <Input
            value={promoInput}
            onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
            placeholder="XXXXXXXX"
            maxLength={8}
            className="flex-1 text-center font-bold tracking-widest uppercase"
          />
          <button
            onClick={handleRedeem}
            disabled={!promoInput.trim() || isRedeeming}
            className="px-4 py-2 rounded-xl text-sm font-bold flex-shrink-0 transition-all active:scale-[0.97] disabled:opacity-50"
            style={{
              background: promoInput.trim() ? "var(--gradient-primary)" : "hsl(var(--muted))",
              color: promoInput.trim() ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
            }}
          >
            {isRedeeming ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              "Yuborish"
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default PromoTab;
