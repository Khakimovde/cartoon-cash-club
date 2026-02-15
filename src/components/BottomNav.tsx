import { motion } from "framer-motion";
import { ListChecks, Users, Trophy, User, Settings, Gift } from "lucide-react";

export type TabType = "tasks" | "promo" | "referral" | "leaderboard" | "profile" | "admin";

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  isAdmin?: boolean;
}

const BottomNav = ({ activeTab, onTabChange, isAdmin }: BottomNavProps) => {
  const tabs: { id: TabType; label: string; icon: typeof ListChecks }[] = [
    { id: "tasks", label: "Vazifalar", icon: ListChecks },
    { id: "promo", label: "Promo", icon: Gift },
    { id: "referral", label: "Referal", icon: Users },
    { id: "leaderboard", label: "Top", icon: Trophy },
    { id: "profile", label: "Profil", icon: User },
    ...(isAdmin ? [{ id: "admin" as TabType, label: "Admin", icon: Settings }] : []),
  ];

  return (
    <nav className="bottom-nav">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`bottom-nav-item ${isActive ? "active" : ""}`}
          >
            <div className="relative">
              <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="nav-indicator mt-0.5"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </div>
            <span className={`text-[10px] ${isActive ? "font-bold" : "font-medium"}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;
