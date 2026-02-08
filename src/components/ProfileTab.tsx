import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Wallet, Users, TrendingUp, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
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

interface WithdrawalRequest {
  id: string;
  amount_coins: number;
  amount_som: number;
  card_number: string | null;
  status: string;
  rejection_reason: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: typeof Clock }> = {
  pending: { label: "So'rov yuborildi", color: "text-yellow-600", bgColor: "bg-yellow-500/15", icon: Clock },
  processing: { label: "Tasdiqlandi, to'lovni kuting", color: "text-blue-500", bgColor: "bg-blue-500/15", icon: Loader2 },
  paid: { label: "To'landi ✅", color: "text-green-500", bgColor: "bg-green-500/15", icon: CheckCircle },
  rejected: { label: "Rad etildi", color: "text-red-500", bgColor: "bg-red-500/15", icon: XCircle },
};

const ProfileTab = ({
  coins, referralCount, user, telegramId, referralEarnings = 0,
  invokeAction, refreshUser,
}: ProfileTabProps) => {
  const currentLevel = getCurrentLevel(referralCount);
  const nextLevel = getNextLevel(referralCount);
  const [minWithdrawal, setMinWithdrawal] = useState(10000);
  const [exchangeCoins, setExchangeCoins] = useState(5000);
  const [exchangeSom, setExchangeSom] = useState(10000);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardError, setCardError] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawResult, setWithdrawResult] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);

  const progressToNext = nextLevel
    ? ((referralCount - currentLevel.minReferrals) / (nextLevel.minReferrals - currentLevel.minReferrals)) * 100
    : 100;

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from("app_settings").select("*");
      if (data) {
        const get = (key: string) => data.find((s: any) => s.key === key)?.value;
        setMinWithdrawal(parseInt(get("min_withdrawal_coins") || "10000"));
        setExchangeCoins(parseInt(get("exchange_rate_coins") || "5000"));
        setExchangeSom(parseInt(get("exchange_rate_som") || "10000"));
      }
    };
    fetchSettings();
    fetchWithdrawals();
  }, [telegramId]);

  const fetchWithdrawals = async () => {
    const { data } = await supabase
      .from("withdrawal_requests")
      .select("*")
      .eq("user_telegram_id", telegramId)
      .order("created_at", { ascending: false })
      .limit(10);
    if (data) setWithdrawals(data as WithdrawalRequest[]);
  };

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
  };

  const handleCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 16);
    setCardNumber(raw);
    setCardError(null);
  };

  const handleWithdraw = async () => {
    const amount = parseInt(withdrawAmount);
    if (!amount || amount < minWithdrawal) {
      setWithdrawResult({ type: "error", message: `Minimal: ${minWithdrawal.toLocaleString()} tanga` });
      return;
    }
    if (amount > coins) {
      setWithdrawResult({ type: "error", message: "Tangalar yetarli emas" });
      return;
    }

    // Validate card number - must be exactly 16 digits
    if (!cardNumber || cardNumber.length !== 16) {
      setCardError("Karta raqami 16 ta raqamdan iborat bo'lishi kerak");
      return;
    }

    setWithdrawing(true);
    setWithdrawResult(null);
    setCardError(null);

    const result = await invokeAction("request_withdrawal", {
      amount_coins: amount,
      card_number: cardNumber,
    });

    if (result?.success) {
      setWithdrawResult({ type: "success", message: `So'rov yuborildi: ${result.amount_som?.toLocaleString()} so'm` });
      setWithdrawAmount("");
      setCardNumber("");
      fetchWithdrawals();
    } else {
      setWithdrawResult({ type: "error", message: result?.error || "Xatolik yuz berdi" });
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
          <div>
            <input
              value={formatCardNumber(cardNumber)}
              onChange={handleCardChange}
              placeholder="Karta raqami (16 ta raqam)"
              inputMode="numeric"
              maxLength={19}
              className={`w-full px-3 py-2 rounded-lg bg-secondary text-sm text-foreground placeholder:text-muted-foreground outline-none ${
                cardError ? "ring-2 ring-red-500/50" : ""
              }`}
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              💳 Uzcard va Humo kartalari qabul qilinadi
            </p>
            {cardError && (
              <p className="text-[10px] text-red-500 font-bold mt-0.5">{cardError}</p>
            )}
          </div>
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
          <div className={`mt-2 p-2 rounded-lg text-xs font-bold text-center ${
            withdrawResult.type === "success"
              ? "bg-yellow-500/15 text-yellow-600"
              : "bg-red-500/15 text-red-500"
          }`}>
            {withdrawResult.type === "success" ? "⏳" : "❌"} {withdrawResult.message}
          </div>
        )}

        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          📅 To'lovlar har juma kuni amalga oshiriladi
        </p>
      </motion.div>

      {/* Withdrawal History - always visible */}
      <motion.div variants={itemVariants} className="card-3d p-4">
        <h3 className="font-extrabold text-sm text-foreground mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          To'lovlar tarixi
        </h3>
        {withdrawals.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">
            Hali so'rov yuborilmagan
          </p>
        ) : (
          <div className="space-y-2">
            {withdrawals.map((w) => {
              const config = STATUS_CONFIG[w.status] || STATUS_CONFIG.pending;
              const StatusIcon = config.icon;
              const dateObj = new Date(w.created_at);
              const dateStr = dateObj.toLocaleDateString("uz-UZ");
              const timeStr = dateObj.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
              return (
                <div key={w.id} className={`p-3 rounded-xl border-l-4 ${config.bgColor}`} style={{
                  borderLeftColor: w.status === 'pending' ? '#eab308' : w.status === 'processing' ? '#3b82f6' : w.status === 'paid' ? '#22c55e' : '#ef4444'
                }}>
                  {/* Status & Date */}
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <StatusIcon className={`w-3.5 h-3.5 ${config.color} ${w.status === "processing" ? "animate-spin" : ""}`} />
                      <span className={`text-xs font-bold ${config.color}`}>{config.label}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {dateStr} · {timeStr}
                    </span>
                  </div>
                  {/* Amount */}
                  <div className="flex items-center gap-2 text-xs text-foreground mb-1">
                    <span className="font-bold">{w.amount_coins.toLocaleString()} tanga</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-bold text-primary">{w.amount_som.toLocaleString()} so'm</span>
                  </div>
                  {/* Card number */}
                  {w.card_number && (
                    <p className="text-[10px] text-muted-foreground">
                      💳 {w.card_number.replace(/(\d{4})/g, "$1 ").trim().replace(/(\d{4}) (\d{4}) (\d{4}) (\d{4})/, "$1 •••• •••• $4")}
                    </p>
                  )}
                  {/* Rejection reason */}
                  {w.status === "rejected" && w.rejection_reason && (
                    <div className="mt-1.5 p-2 rounded-lg bg-red-500/10">
                      <p className="text-[10px] text-red-500 font-bold">
                        ❌ Sabab: {w.rejection_reason}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default ProfileTab;
