import { motion, AnimatePresence } from "framer-motion";
import BottomNav, { type TabType } from "@/components/BottomNav";
import TasksTab from "@/components/TasksTab";
import PromoTab from "@/components/PromoTab";
import ReferralTab from "@/components/ReferralTab";
import LeaderboardTab from "@/components/LeaderboardTab";
import ProfileTab from "@/components/ProfileTab";
import AdminPanel from "@/components/AdminPanel";
import BonusDayTab from "@/components/BonusDayTab";
import { useTelegram } from "@/hooks/useTelegram";
import coinImg from "@/assets/coin-3d.png";
import { useState } from "react";

const ADMIN_PASSWORD = "Azizbek335161606";

const Index = () => {
  const {
    user, isAdmin, loading, telegramUser, isTelegram,
    subscribedChannels, adsToday, todayReferrals, dailyReferralClaimed,
    bonusDayActive,
    refreshUser, invokeAction, invokeAdmin,
  } = useTelegram();

  const [activeTab, setActiveTab] = useState<TabType>("tasks");
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [adminPasswordError, setAdminPasswordError] = useState(false);

  // Not Telegram - show blocked screen
  if (!loading && !isTelegram) {
    return (
      <div className="min-h-screen bg-background max-w-md mx-auto flex items-center justify-center px-6">
        <div className="text-center space-y-4">
          <div className="text-5xl">🔒</div>
          <h1 className="text-xl font-extrabold text-foreground">Faqat Telegram orqali</h1>
          <p className="text-sm text-muted-foreground">
            Bu ilova faqat Telegram Mini App sifatida ishlaydi.
            Iltimos, Telegram orqali oching.
          </p>
          <a
            href="https://t.me/AdoraPay_robot"
            className="inline-block px-6 py-3 rounded-xl text-sm font-bold"
            style={{
              background: "var(--gradient-primary)",
              color: "hsl(var(--primary-foreground))",
            }}
          >
            Telegram botni ochish
          </a>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background max-w-md mx-auto flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full gradient-primary mx-auto mb-3 animate-pulse-glow" />
          <p className="text-sm font-bold text-muted-foreground">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  const coins = user?.coins || 0;
  const bonusCoins = user?.bonus_coins || 0;
  const referralCount = user?.referral_count || 0;
  const referralEarnings = user?.referral_earnings || 0;
  const displayName = user?.first_name || user?.username || "Foydalanuvchi";
  const telegramId = user?.telegram_id || telegramUser?.id || 0;

  // Admin tab requires password
  const handleAdminTabChange = (tab: TabType) => {
    if (tab === "admin" && !adminUnlocked) {
      setActiveTab("admin");
      return;
    }
    setActiveTab(tab);
  };

  const handleAdminLogin = () => {
    if (adminPasswordInput === ADMIN_PASSWORD) {
      setAdminUnlocked(true);
      setAdminPasswordError(false);
    } else {
      setAdminPasswordError(true);
    }
  };

  const renderTab = () => {
    switch (activeTab) {
      case "tasks":
        return (
          <TasksTab
            coins={coins}
            telegramId={telegramId}
            adsToday={adsToday}
            subscribedChannels={subscribedChannels}
            invokeAction={invokeAction}
            refreshUser={refreshUser}
            todayReferrals={todayReferrals}
            dailyReferralClaimed={dailyReferralClaimed}
            referralCode={user?.referral_code || ""}
          />
        );
      case "bonusday":
        return (
          <BonusDayTab
            bonusCoins={bonusCoins}
            invokeAction={invokeAction}
            refreshUser={refreshUser}
          />
        );
      case "promo":
        return (
          <PromoTab
            coins={coins}
            telegramId={telegramId}
            refreshUser={refreshUser}
          />
        );
      case "referral":
        return (
          <ReferralTab
            referralCount={referralCount}
            coins={coins}
            referralCode={user?.referral_code || ""}
            referralEarnings={referralEarnings}
          />
        );
      case "leaderboard":
        return <LeaderboardTab />;
      case "profile":
        return (
          <ProfileTab
            coins={coins}
            referralCount={referralCount}
            user={user}
            telegramId={telegramId}
            referralEarnings={referralEarnings}
            invokeAction={invokeAction}
            refreshUser={refreshUser}
          />
        );
      case "admin":
        if (!adminUnlocked) {
          return (
            <div className="px-4 pt-8 pb-6">
              <div className="card-3d p-6 text-center space-y-4">
                <div className="text-4xl">🔐</div>
                <h2 className="text-lg font-extrabold text-foreground">Admin Panel</h2>
                <p className="text-sm text-muted-foreground">Parolni kiriting</p>
                <input
                  type="password"
                  value={adminPasswordInput}
                  onChange={(e) => {
                    setAdminPasswordInput(e.target.value);
                    setAdminPasswordError(false);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
                  placeholder="Parol"
                  className="w-full px-4 py-3 rounded-xl bg-secondary text-sm text-foreground placeholder:text-muted-foreground outline-none text-center font-bold"
                />
                {adminPasswordError && (
                  <p className="text-xs text-destructive font-bold">Noto'g'ri parol!</p>
                )}
                <button
                  onClick={handleAdminLogin}
                  className="w-full py-3 rounded-xl text-sm font-bold"
                  style={{
                    background: "var(--gradient-primary)",
                    color: "hsl(var(--primary-foreground))",
                  }}
                >
                  Kirish
                </button>
              </div>
            </div>
          );
        }
        return <AdminPanel invokeAdmin={invokeAdmin} refreshUser={refreshUser} />;
    }
  };

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto relative">
      {/* Top Header */}
      <header
        className="sticky top-0 z-40 px-4 py-3 flex items-center justify-between"
        style={{ background: "hsla(38, 35%, 96%, 0.9)", backdropFilter: "blur(16px)" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-xl ring-2 ring-primary/20">
            {user?.photo_url ? (
              <img src={user.photo_url} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              "🧑‍💻"
            )}
          </div>
          <div>
            <p className="font-bold text-sm text-foreground leading-tight">{displayName}</p>
            <p className="text-xs text-muted-foreground">ID: {telegramId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {bonusDayActive && bonusCoins > 0 && (
            <div className="coin-badge" style={{ background: "hsla(40, 90%, 50%, 0.15)" }}>
              <span className="text-xs">⭐</span>
              <span style={{ color: "hsl(40, 90%, 45%)" }}>{bonusCoins.toLocaleString()}</span>
            </div>
          )}
          <div className="coin-badge">
            <img src={coinImg} alt="coin" className="w-5 h-5" />
            <span>{coins.toLocaleString()}</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2, ease: "easeOut" as const }}
          >
            {renderTab()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={handleAdminTabChange} isAdmin={isAdmin} bonusDayActive={bonusDayActive} />
    </div>
  );
};

export default Index;
