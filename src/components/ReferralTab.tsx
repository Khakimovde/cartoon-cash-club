import { motion } from "framer-motion";
import { Copy, Share2, TrendingUp } from "lucide-react";
import referralFriendsIcon from "@/assets/referral-friends-icon.png";
import coinImg from "@/assets/coin-3d.png";

interface ReferralTabProps {
  referralCount: number;
  coins: number;
  referralCode: string;
  referralEarnings?: number;
}

interface Level {
  level: number;
  name: string;
  minReferrals: number;
  bonus: number;
  emoji: string;
}

const LEVELS: Level[] = [
  { level: 1, name: "Yangi a'zo", minReferrals: 0, bonus: 5, emoji: "🌱" },
  { level: 2, name: "Ishtirokchi", minReferrals: 10, bonus: 7, emoji: "⭐" },
  { level: 3, name: "Mutaxassis", minReferrals: 20, bonus: 15, emoji: "🔥" },
  { level: 4, name: "Ekspert", minReferrals: 50, bonus: 20, emoji: "💎" },
  { level: 5, name: "Elita", minReferrals: 100, bonus: 25, emoji: "👑" },
];

export const getCurrentLevel = (referralCount: number): Level => {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (referralCount >= LEVELS[i].minReferrals) {
      return LEVELS[i];
    }
  }
  return LEVELS[0];
};

export const getNextLevel = (referralCount: number): Level | null => {
  const current = getCurrentLevel(referralCount);
  const nextIndex = LEVELS.findIndex((l) => l.level === current.level) + 1;
  return nextIndex < LEVELS.length ? LEVELS[nextIndex] : null;
};

const ReferralTab = ({ referralCount, coins, referralCode, referralEarnings = 0 }: ReferralTabProps) => {
  const currentLevel = getCurrentLevel(referralCount);
  const nextLevel = getNextLevel(referralCount);
  const referralLink = `https://t.me/AdoraPay_robot?start=${referralCode}`;

  const progressToNext = nextLevel
    ? ((referralCount - currentLevel.minReferrals) / (nextLevel.minReferrals - currentLevel.minReferrals)) * 100
    : 100;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
  };

  const handleShare = () => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      tg.openTelegramLink(
        `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent("Do'stingizni taklif qiling!")}`
      );
    } else if (navigator.share) {
      navigator.share({ title: "Do'stingizni taklif qiling!", url: referralLink });
    }
  };

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
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center gap-3 mb-1">
        <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0">
          <img src={referralFriendsIcon} alt="Referral" className="w-full h-full object-cover" />
        </div>
        <div>
          <h2 className="text-lg font-extrabold text-foreground">Referal dasturi</h2>
          <p className="text-xs text-muted-foreground">Do'stlaringiz ishlaganidan foiz oling</p>
        </div>
      </motion.div>

      {/* Stats - compact grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-3 gap-2">
        <div className="card-3d p-2.5 text-center">
          <p className="text-lg font-extrabold text-foreground">{referralCount}</p>
          <p className="text-[10px] text-muted-foreground">Do'stlar</p>
        </div>
        <div className="card-3d p-2.5 text-center">
          <p className="text-lg font-extrabold text-primary">{currentLevel.bonus}%</p>
          <p className="text-[10px] text-muted-foreground">Foiz</p>
        </div>
        <div className="card-3d p-2.5 text-center">
          <div className="flex items-center justify-center gap-1">
            <img src={coinImg} alt="coin" className="w-4 h-4" />
            <span className="text-lg font-extrabold text-coin">{referralEarnings}</span>
          </div>
          <p className="text-[10px] text-muted-foreground">Daromad</p>
        </div>
      </motion.div>

      {/* How it works - Simple explanation */}
      <motion.div variants={itemVariants} className="card-3d p-3">
        <h4 className="font-bold text-sm text-foreground mb-2">📖 Qanday ishlaydi?</h4>
        <div className="space-y-1.5 text-xs text-muted-foreground">
          <p>1️⃣ Do'stingizni taklif qiling</p>
          <p>2️⃣ U pul ishlaganda sizga <span className="text-primary font-bold">{currentLevel.bonus}%</span> beriladi</p>
          <p>3️⃣ Ko'proq taklif = yuqori foiz (25% gacha)</p>
        </div>
      </motion.div>

      {/* Share Link Card */}
      <motion.div variants={itemVariants} className="card-3d p-3">
        <p className="text-xs font-bold text-foreground mb-2">Referal havolangiz</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-secondary rounded-lg px-2.5 py-2 text-xs text-muted-foreground truncate">
            {referralLink}
          </div>
          <button
            onClick={handleCopy}
            className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-foreground hover:bg-muted transition-colors"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={handleShare}
          className="w-full mt-2 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2"
          style={{
            background: "var(--gradient-primary)",
            color: "hsl(var(--primary-foreground))",
            boxShadow: "0 2px 8px hsla(215, 90%, 55%, 0.3)",
          }}
        >
          <Share2 className="w-4 h-4" />
          Do'stlarni taklif qilish
        </button>
      </motion.div>

      {/* Level Progress */}
      <motion.div variants={itemVariants} className="card-3d p-3">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <span className="font-bold text-sm text-foreground">Darajangiz: {currentLevel.emoji} {currentLevel.name}</span>
        </div>
        {nextLevel ? (
          <>
            <div className="progress-bar-3d mb-2">
              <div className="fill" style={{ width: `${progressToNext}%` }} />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Yana {nextLevel.minReferrals - referralCount} ta do'st = {nextLevel.bonus}% bonus
            </p>
          </>
        ) : (
          <div className="text-center text-xs text-success font-bold py-1">
            🎉 Maksimal darajaga yetdingiz!
          </div>
        )}
      </motion.div>

      {/* Levels List - Compact */}
      <motion.div variants={itemVariants}>
        <h3 className="font-bold text-sm text-foreground px-1 mb-2">Darajalar</h3>
        <div className="grid grid-cols-5 gap-1.5">
          {LEVELS.map((level) => {
            const isUnlocked = referralCount >= level.minReferrals;
            const isCurrent = currentLevel.level === level.level;
            return (
              <div
                key={level.level}
                className={`card-3d p-2 text-center ${isCurrent ? "ring-2 ring-primary" : ""} ${
                  !isUnlocked ? "opacity-50" : ""
                }`}
              >
                <span className="text-lg block">{level.emoji}</span>
                <span className="text-[10px] font-bold text-foreground">{level.bonus}%</span>
                <span className="text-[9px] text-muted-foreground block">{level.minReferrals}+</span>
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ReferralTab;
