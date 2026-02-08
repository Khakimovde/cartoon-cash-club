import { motion, AnimatePresence } from "framer-motion";
import BottomNav, { type TabType } from "@/components/BottomNav";
import TasksTab from "@/components/TasksTab";
import ReferralTab from "@/components/ReferralTab";
import LeaderboardTab from "@/components/LeaderboardTab";
import ProfileTab from "@/components/ProfileTab";
import AdminPanel from "@/components/AdminPanel";
import { useTelegram } from "@/hooks/useTelegram";
import coinImg from "@/assets/coin-3d.png";
import { useState } from "react";

const Index = () => {
  const {
    user, isAdmin, loading, telegramUser,
    subscribedChannels, adsToday,
    refreshUser, invokeAction, invokeAdmin,
  } = useTelegram();

  const [activeTab, setActiveTab] = useState<TabType>("tasks");

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
  const referralCount = user?.referral_count || 0;
  const referralEarnings = user?.referral_earnings || 0;
  const displayName = user?.first_name || user?.username || "Foydalanuvchi";
  const telegramId = user?.telegram_id || telegramUser?.id || 0;

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
        <div className="coin-badge">
          <img src={coinImg} alt="coin" className="w-5 h-5" />
          <span>{coins.toLocaleString()}</span>
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
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} isAdmin={isAdmin} />
    </div>
  );
};

export default Index;
