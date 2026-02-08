import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Wallet, Users, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import coinImg from "@/assets/coin-3d.png";
import { getCurrentLevel, getNextLevel } from "./ReferralTab";
import type { UserData } from "@/hooks/useTelegram";

interface ProfileTabProps {
  coins: number;
  referralCount: number;
  user: UserData | null;
  telegramId: number;
  referralEarnings?: number;
  invokeAction: (action: string, params?: Record<string, any>) => Promise<any>;
  refreshUser: () => Promise<void>;
}

const ProfileTab = ({
  coins, referralCount, user, telegramId, referralEarnings = 0,
  invokeAction, refreshUser,
}: ProfileTabProps) => {
  const currentLevel = getCurrentLevel(referralCount);
  const nextLevel = getNextLevel(referralCount);
  const [minWithdrawal, setMinWithdrawal] = useState(5000);
  const [exchangeCoins, setExchangeCoins] = useState(5000);
  const [exchangeSom, setExchangeSom] = useState(10000);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawResult, setWithdrawResult] = useState<string | null>(null);

  const progressToNext = nextLevel
    ? ((referralCount - currentLevel.minReferrals) / (nextLevel.minReferrals - currentLevel.minReferrals)) * 100
    : 100;

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from("app_settings").select("*");
      if (data) {
        const get = (key: string) => data.find((s: any) => s.key === key)?.value;
        setMinWithdrawal(parseInt(get("min_withdrawal_coins") || "5000"));
        setExchangeCoins(parseInt(get("exchange_rate_coins") || "5000"));
        setExchangeSom(parseInt(get("exchange_rate_som") || "10000"));
      }
    };
    fetchSettings();
  }, []);

  const handleWithdraw = async () => {
    const amount = parseInt(withdrawAmount);
    if (!amount || amount < minWithdrawal) {
      setWithdrawResult(`Minimal: ${minWithdrawal.toLocaleString()} tanga`);
      return;
    }
    if (amount > coins) {
      setWithdrawResult("Tangalar yetarli emas");
      return;
    }

    setWithdrawing(true);
    setWithdrawResult(null);
    const result = await invokeAction("request_withdrawal", {
      amount_coins: amount,
      card_number: cardNumber,
    });

    if (result?.success) {
      setWithdrawResult(`✅ So'rov yuborildi: ${result.amount_som?.toLocaleString()} so'm`);
      setWithdrawAmount("");
      setCardNumber("");
    } else {
      setWithdrawResult(`❌ ${result?.error || "Xatolik yuz berdi"}`);
    }
    setWithdrawing(false);
  };

  const estimatedSom = withdrawAmount
    ? Math.floor((parseInt(withdrawAmount) / exchangeCoins) * exchangeSom)
    : 0;

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
      {/* Profile Header */}
      <motion.div variants={itemVariants} className="card-3d p-4 flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-2xl flex-shrink-0 ring-3 ring-primary/20 overflow-hidden">
          {user?.photo_url ? (
            <img src={user.photo_url} alt="" className="w-full h-full object-cover" />
          ) : (
            "🧑‍💻"
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-extrabold text-foreground">
            {user?.first_name || user?.username || "Foydalanuvchi"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {user?.username ? `@${user.username}` : ""} · ID: {telegramId}
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-xs">{currentLevel.emoji}</span>
            <span className="text-xs font-bold text-primary">{currentLevel.name}</span>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 gap-2">
        <div className="card-3d p-2.5 text-center">
          <img src={coinImg} alt="coin" className="w-5 h-5 mx-auto mb-0.5" />
          <p className="text-base font-extrabold text-foreground">{coins.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground font-medium">Tangalar</p>
        </div>
        <div className="card-3d p-2.5 text-center">
          <Users className="w-5 h-5 text-primary mx-auto mb-0.5" />
          <p className="text-base font-extrabold text-foreground">{referralCount}</p>
          <p className="text-[10px] text-muted-foreground font-medium">Referallar</p>
        </div>
      </motion.div>
      
      {/* Referral Earnings Card */}
      <motion.div variants={itemVariants} className="card-3d p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Referal daromadi</p>
              <p className="text-sm font-bold text-foreground">Do'stlaringizdan</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <img src={coinImg} alt="coin" className="w-5 h-5" />
            <span className="text-lg font-extrabold text-coin">{referralEarnings.toLocaleString()}</span>
          </div>
        </div>
      </motion.div>

      {/* Level Progress */}
      <motion.div variants={itemVariants} className="card-3d p-3">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="font-bold text-sm text-foreground">Daraja taraqqiyoti</span>
          </div>
          {nextLevel && (
            <span className="text-xs text-muted-foreground">
              {nextLevel.emoji} {nextLevel.name}
            </span>
          )}
        </div>
        <div className="progress-bar-3d">
          <div className="fill" style={{ width: `${progressToNext}%` }} />
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[11px] text-muted-foreground">
            {currentLevel.emoji} Lv.{currentLevel.level}
          </span>
          {nextLevel ? (
            <span className="text-[11px] text-muted-foreground">
              {referralCount}/{nextLevel.minReferrals} referal
            </span>
          ) : (
            <span className="text-[11px] text-success font-bold">MAX ✓</span>
          )}
        </div>
      </motion.div>

      {/* Withdraw Section */}
      <motion.div variants={itemVariants} className="card-3d p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center">
            <Wallet className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-foreground">Pul yechish</h3>
            <p className="text-[10px] text-muted-foreground">
              {exchangeCoins.toLocaleString()} tanga = {exchangeSom.toLocaleString()} so'm
            </p>
          </div>
        </div>

        <div className="space-y-2 mb-3">
          <input
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            placeholder={`Tanga miqdori (min: ${minWithdrawal.toLocaleString()})`}
            type="number"
            className="w-full px-3 py-2 rounded-lg bg-secondary text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          {estimatedSom > 0 && (
            <p className="text-xs text-primary font-bold">≈ {estimatedSom.toLocaleString()} so'm</p>
          )}
          <input
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value)}
            placeholder="Karta raqami (ixtiyoriy)"
            className="w-full px-3 py-2 rounded-lg bg-secondary text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
        </div>

        <button
          onClick={handleWithdraw}
          disabled={withdrawing}
          className="w-full py-2.5 rounded-xl text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
          style={{
            background: "var(--gradient-primary)",
            color: "hsl(var(--primary-foreground))",
            boxShadow: "0 2px 10px hsla(215, 90%, 55%, 0.3)",
          }}
        >
          <Wallet className="w-4 h-4" />
          {withdrawing ? "Yuborilmoqda..." : "Pul yechish"}
        </button>

        {withdrawResult && (
          <p className={`text-xs font-bold mt-2 text-center ${
            withdrawResult.startsWith("✅") ? "text-success" : "text-destructive"
          }`}>
            {withdrawResult}
          </p>
        )}

        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          📅 To'lovlar har juma kuni amalga oshiriladi
        </p>
      </motion.div>
    </motion.div>
  );
};

export default ProfileTab;
