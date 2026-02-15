import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Gift, Clock, Copy, CheckCircle2, Ticket, ChevronRight } from "lucide-react";
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

const PromoTab = ({ coins, telegramId, refreshUser }: PromoTabProps) => {
  const [adsCount, setAdsCount] = useState(0);
  const [isWatching, setIsWatching] = useState(false);
  const [cooldownEnd, setCooldownEnd] = useState(0);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [activePromo, setActivePromo] = useState<{ code: string; coins_reward: number; expires_at: string } | null>(null);
  const [promoInput, setPromoInput] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [copied, setCopied] = useState(false);
  const maxAds = 10;

  // Fetch promo status on mount
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
        </div>
        <p className="text-sm text-muted-foreground">Reklama ko'ring va promokod oling</p>
      </motion.div>

      {/* Watch Ads Card */}
      <motion.div variants={itemVariants} className="card-3d p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--gradient-video)" }}>
            <img src={videoAdIcon} alt="Reklama" className="w-8 h-8 object-contain" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-foreground">Reklama ko'rish</h3>
            <p className="text-xs text-muted-foreground">{adsCount}/{maxAds} ta ko'rildi</p>
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
              Ko'rish
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
            Bu kodni boshqalarga yuboring. Faqat 1 kishi ishlata oladi. 24 soat amal qiladi.
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
          Do'stingizdan olgan promokodni kiriting va tanga yuting
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
