import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BarChart3, Users, Tv, TrendingUp, Clock, Check, X,
  Plus, Trash2, Settings, Hash, Wallet, RefreshCw, Loader2, CheckCircle,
  Search, UserCog, Coins, ChevronDown, Gamepad2, Power, ArrowUp, ArrowDown,
  Gift, Ticket,
} from "lucide-react";
import { toast } from "sonner";
import { getCurrentLevel, getNextLevel } from "./ReferralTab";

interface AdminPanelProps {
  invokeAdmin: (action: string, params?: Record<string, any>) => Promise<any>;
  refreshUser: () => Promise<void>;
}

type Section = "stats" | "withdrawals" | "channels" | "settings" | "users" | "games" | "promo" | "bonusday";

const AdminPanel = ({ invokeAdmin, refreshUser }: AdminPanelProps) => {
  const [section, setSection] = useState<Section>("stats");

  const sections: { id: Section; label: string; icon: typeof BarChart3 }[] = [
    { id: "stats", label: "Statistika", icon: BarChart3 },
    { id: "users", label: "Foydalanuvchi", icon: UserCog },
    { id: "withdrawals", label: "So'rovlar", icon: Wallet },
    { id: "channels", label: "Kanallar", icon: Hash },
    { id: "games", label: "O'yinlar", icon: Gamepad2 },
    { id: "promo", label: "Promokod", icon: Gift },
    { id: "bonusday", label: "Bonus Day", icon: Coins },
    { id: "settings", label: "Sozlamalar", icon: Settings },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="px-4 pt-4 pb-6 space-y-3"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
          <Settings className="w-4 h-4 text-destructive" />
        </div>
        <h2 className="text-lg font-extrabold text-foreground">Admin Panel</h2>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {sections.map((s) => {
          const Icon = s.icon;
          const isActive = section === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {s.label}
            </button>
          );
        })}
      </div>

      {section === "stats" && <StatsSection invokeAdmin={invokeAdmin} />}
      {section === "users" && <UserManagementSection invokeAdmin={invokeAdmin} refreshUser={refreshUser} />}
      {section === "withdrawals" && <WithdrawalsSection invokeAdmin={invokeAdmin} />}
      {section === "channels" && <ChannelsSection invokeAdmin={invokeAdmin} />}
      {section === "games" && <GamesAdminSection invokeAdmin={invokeAdmin} />}
      {section === "promo" && <PromoAdminSection invokeAdmin={invokeAdmin} />}
      {section === "bonusday" && <BonusDayAdminSection invokeAdmin={invokeAdmin} />}
      {section === "settings" && <SettingsSection invokeAdmin={invokeAdmin} />}
    </motion.div>
  );
};

// ─── Stats ─────────────────────────────────────────
const StatsSection = ({ invokeAdmin }: { invokeAdmin: AdminPanelProps["invokeAdmin"] }) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    const data = await invokeAdmin("get_stats");
    if (data) setStats(data);
    setLoading(false);
  };

  useEffect(() => { fetchStats(); }, []);

  if (loading) return <div className="text-center text-sm text-muted-foreground py-8">Yuklanmoqda...</div>;
  if (!stats) return <div className="text-center text-sm text-destructive py-8">Xatolik</div>;

  const items = [
    { label: "Jami foydalanuvchilar", value: stats.totalUsers, icon: Users, color: "text-primary" },
    { label: "Bugungi foydalanuvchilar", value: stats.todayUsers, icon: TrendingUp, color: "text-success" },
    { label: "Jami reklamalar", value: stats.totalAds, icon: Tv, color: "text-accent" },
    { label: "Bugungi reklamalar", value: stats.todayAds, icon: Tv, color: "text-coin" },
    { label: "Jami referallar", value: stats.totalReferrals, icon: Users, color: "text-primary" },
    { label: "Kutilayotgan so'rovlar", value: stats.pendingWithdrawals, icon: Clock, color: "text-destructive" },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-bold text-sm">Statistika</span>
        <button onClick={fetchStats} className="p-1.5 rounded-lg bg-secondary">
          <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="card-3d p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className={`w-3.5 h-3.5 ${item.color}`} />
                <span className="text-[10px] text-muted-foreground">{item.label}</span>
              </div>
              <p className="text-lg font-extrabold text-foreground">{item.value}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── User Management ──────────────────────────────
const LEVELS = [
  { level: 1, name: "Yangi a'zo", minReferrals: 0, bonus: 5, emoji: "🌱" },
  { level: 2, name: "Ishtirokchi", minReferrals: 15, bonus: 7, emoji: "⭐" },
  { level: 3, name: "Mutaxassis", minReferrals: 30, bonus: 15, emoji: "🔥" },
  { level: 4, name: "Ekspert", minReferrals: 60, bonus: 20, emoji: "💎" },
  { level: 5, name: "Elita", minReferrals: 100, bonus: 25, emoji: "👑" },
];

const UserManagementSection = ({ invokeAdmin, refreshUser }: { invokeAdmin: AdminPanelProps["invokeAdmin"]; refreshUser: () => Promise<void> }) => {
  const [searchId, setSearchId] = useState("");
  const [foundUser, setFoundUser] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [coinsAmount, setCoinsAmount] = useState("");
  const [coinsTarget, setCoinsTarget] = useState<"main" | "bonus">("main");
  const [processing, setProcessing] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [levelProcessing, setLevelProcessing] = useState(false);

  const handleSearch = async () => {
    const id = parseInt(searchId.trim());
    if (!id || isNaN(id)) {
      toast.error("Telegram ID raqam bo'lishi kerak");
      return;
    }
    setSearching(true);
    setNotFound(false);
    setFoundUser(null);
    const result = await invokeAdmin("find_user", { target_telegram_id: id });
    if (result?.user) {
      setFoundUser(result.user);
    } else {
      setNotFound(true);
    }
    setSearching(false);
  };

  const handleModifyCoins = async (action: "add" | "subtract") => {
    const amount = parseInt(coinsAmount.trim());
    if (!amount || amount <= 0) {
      toast.error("Tanga miqdorini kiriting");
      return;
    }
    if (!foundUser) return;

    setProcessing(true);
    const result = await invokeAdmin("modify_user_coins", {
      target_telegram_id: foundUser.telegram_id,
      amount,
      operation: action,
      target: coinsTarget,
    });

    if (result?.success) {
      const label = coinsTarget === "bonus" ? "bonus tanga" : "tanga";
      toast.success(
        action === "add"
          ? `+${amount} ${label} qo'shildi`
          : `-${amount} ${label} ayirildi`
      );
      setFoundUser(result.user);
      setCoinsAmount("");
      await refreshUser();
    } else {
      toast.error(result?.error || "Xatolik");
    }
    setProcessing(false);
  };

  const handleChangeLevel = async (targetLevel: typeof LEVELS[number]) => {
    if (!foundUser) return;
    setLevelProcessing(true);
    const result = await invokeAdmin("set_user_level", {
      target_telegram_id: foundUser.telegram_id,
      referral_count: targetLevel.minReferrals,
    });

    if (result?.success) {
      toast.success(`Daraja o'zgartirildi: ${targetLevel.emoji} ${targetLevel.name} (${targetLevel.bonus}%)`);
      setFoundUser(result.user);
      await refreshUser();
    } else {
      toast.error(result?.error || "Xatolik");
    }
    setLevelProcessing(false);
  };

  const userLevel = foundUser ? getCurrentLevel(foundUser.referral_count || 0) : null;

  return (
    <div className="space-y-3">
      <span className="font-bold text-sm">Foydalanuvchi boshqaruvi</span>

      {/* Search */}
      <div className="card-3d p-3 space-y-2">
        <div className="flex gap-2">
          <input
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            placeholder="Telegram ID kiriting"
            type="number"
            className="flex-1 px-3 py-2 rounded-lg bg-secondary text-sm text-foreground placeholder:text-muted-foreground outline-none"
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <button
            onClick={handleSearch}
            disabled={searching || !searchId.trim()}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold flex items-center gap-1 disabled:opacity-50"
          >
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Not found */}
      {notFound && (
        <div className="card-3d p-4 text-center">
          <p className="text-sm text-muted-foreground">Foydalanuvchi topilmadi</p>
        </div>
      )}

      {/* Found user */}
      {foundUser && (
        <div className="card-3d p-3 space-y-3">
          {/* User info */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-xl">
              {foundUser.photo_url ? (
                <img src={foundUser.photo_url} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                "🧑‍💻"
              )}
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm text-foreground">
                {foundUser.first_name || foundUser.username || "Noma'lum"}
                {foundUser.last_name ? ` ${foundUser.last_name}` : ""}
              </p>
              <p className="text-xs text-muted-foreground">@{foundUser.username || "—"}</p>
              <p className="text-xs text-muted-foreground">ID: {foundUser.telegram_id}</p>
            </div>
          </div>

          {/* Balance info */}
          <div className="grid grid-cols-2 gap-2">
            <div className="text-center p-2 rounded-lg bg-secondary">
              <p className="text-xs text-muted-foreground">💰 Asosiy</p>
              <p className="text-sm font-extrabold text-coin">{(foundUser.coins || 0).toLocaleString()}</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-secondary">
              <p className="text-xs text-muted-foreground">⭐ Bonus</p>
              <p className="text-sm font-extrabold text-yellow-500">{(foundUser.bonus_coins || 0).toLocaleString()}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="text-center p-2 rounded-lg bg-secondary">
              <p className="text-xs text-muted-foreground">Referallar</p>
              <p className="text-sm font-extrabold text-foreground">{foundUser.referral_count || 0}</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-secondary">
              <p className="text-xs text-muted-foreground">Ref. daromad</p>
              <p className="text-sm font-extrabold text-foreground">{(foundUser.referral_earnings || 0).toLocaleString()}</p>
            </div>
          </div>

          {/* Current level & change */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Daraja boshqaruvi</p>
            <div className="flex items-center gap-2 mb-2 p-2 rounded-lg bg-secondary">
              <span className="text-lg">{userLevel?.emoji}</span>
              <div className="flex-1">
                <p className="text-xs font-bold text-foreground">{userLevel?.name}</p>
                <p className="text-[10px] text-muted-foreground">Bonus: {userLevel?.bonus}%</p>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {LEVELS.map((level) => {
                const isCurrent = userLevel?.level === level.level;
                return (
                  <button
                    key={level.level}
                    onClick={() => !isCurrent && handleChangeLevel(level)}
                    disabled={isCurrent || levelProcessing}
                    className={`p-2 rounded-lg text-center transition-colors disabled:opacity-60 ${
                      isCurrent
                        ? "ring-2 ring-primary bg-primary/10"
                        : "bg-secondary hover:bg-muted"
                    }`}
                  >
                    <span className="text-lg block">{level.emoji}</span>
                    <span className="text-[10px] font-bold text-foreground block">{level.bonus}%</span>
                    <span className="text-[9px] text-muted-foreground block">{level.minReferrals}+</span>
                  </button>
                );
              })}
            </div>
            {levelProcessing && (
              <div className="flex items-center justify-center gap-1 mt-2 text-xs text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                O'zgartirilmoqda...
              </div>
            )}
          </div>

          {/* Modify coins */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Tanga qo'shish / ayirish</p>
            {/* Target selector */}
            <div className="flex gap-1.5 mb-2">
              <button
                onClick={() => setCoinsTarget("main")}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  coinsTarget === "main" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                }`}
              >
                💰 Asosiy tanga
              </button>
              <button
                onClick={() => setCoinsTarget("bonus")}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  coinsTarget === "bonus" ? "bg-yellow-500 text-white" : "bg-secondary text-muted-foreground"
                }`}
              >
                ⭐ Bonus tanga
              </button>
            </div>
            <div className="flex gap-2">
              <input
                value={coinsAmount}
                onChange={(e) => setCoinsAmount(e.target.value)}
                placeholder="Miqdor"
                type="number"
                className="flex-1 px-3 py-2 rounded-lg bg-secondary text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => handleModifyCoins("add")}
                disabled={processing || !coinsAmount.trim()}
                className="flex-1 py-2 rounded-lg bg-green-500/10 text-green-500 text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-50"
              >
                {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Qo'shish
              </button>
              <button
                onClick={() => handleModifyCoins("subtract")}
                disabled={processing || !coinsAmount.trim()}
                className="flex-1 py-2 rounded-lg bg-red-500/10 text-red-500 text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-50"
              >
                {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                Ayirish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Withdrawals ───────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  pending: { label: "So'rov yuborildi", color: "text-yellow-600", bgColor: "bg-yellow-500/15" },
  processing: { label: "O'tkazish jarayoni ketmoqda", color: "text-blue-500", bgColor: "bg-blue-500/15" },
  paid: { label: "To'landi", color: "text-green-500", bgColor: "bg-green-500/15" },
  rejected: { label: "Rad etildi", color: "text-red-500", bgColor: "bg-red-500/15" },
};

const WithdrawalsSection = ({ invokeAdmin }: { invokeAdmin: AdminPanelProps["invokeAdmin"] }) => {
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  const fetchWithdrawals = async () => {
    setLoading(true);
    const data = await invokeAdmin("get_withdrawals");
    if (data) setWithdrawals(data.withdrawals || []);
    setLoading(false);
  };

  useEffect(() => { fetchWithdrawals(); }, []);

  const handleApprove = async (id: string) => {
    setProcessingAction(id);
    await invokeAdmin("process_withdrawal", { withdrawal_id: id, status: "processing" });
    setProcessingAction(null);
    fetchWithdrawals();
  };

  const handleMarkPaid = async (id: string) => {
    setProcessingAction(id);
    await invokeAdmin("process_withdrawal", { withdrawal_id: id, status: "paid" });
    setProcessingAction(null);
    fetchWithdrawals();
  };

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) return;
    setProcessingAction(id);
    await invokeAdmin("process_withdrawal", {
      withdrawal_id: id,
      status: "rejected",
      rejection_reason: rejectReason.trim(),
    });
    setRejectingId(null);
    setRejectReason("");
    setProcessingAction(null);
    fetchWithdrawals();
  };

  if (loading) return <div className="text-center text-sm text-muted-foreground py-8">Yuklanmoqda...</div>;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-bold text-sm">Pul yechish so'rovlari</span>
        <button onClick={fetchWithdrawals} className="p-1.5 rounded-lg bg-secondary">
          <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>
      {withdrawals.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground py-8">So'rovlar yo'q</div>
      ) : (
        withdrawals.map((w) => {
          const config = STATUS_CONFIG[w.status] || STATUS_CONFIG.pending;
          const isProcessingThis = processingAction === w.id;

          return (
            <div key={w.id} className="card-3d p-3">
              {/* Status badge */}
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${config.bgColor} ${config.color}`}>
                  {config.label}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(w.created_at).toLocaleString("uz-UZ")}
                </span>
              </div>
              {/* User info */}
              <div className="flex items-center gap-2 mb-2 p-2 rounded-lg bg-secondary">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">
                    {w.user?.first_name || "Noma'lum"}
                    {w.user?.last_name ? ` ${w.user.last_name}` : ""}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    @{w.user?.username || "—"} · ID: {w.user_telegram_id}
                  </p>
                </div>
              </div>
              {/* Amount */}
              <div className="flex items-center gap-3 text-xs mb-1">
                <span className="font-bold text-foreground">{w.amount_coins?.toLocaleString()} tanga</span>
                <span className="text-muted-foreground">→</span>
                <span className="font-bold text-primary">{w.amount_som?.toLocaleString()} so'm</span>
              </div>
              {/* Card number */}
              {w.card_number && (
                <div className="text-xs text-foreground mb-2 font-medium">
                  💳 {w.card_number.replace(/(\d{4})/g, "$1 ").trim()}
                </div>
              )}

              {w.status === "rejected" && w.rejection_reason && (
                <div className="text-[10px] text-red-500 mb-2 p-1.5 rounded bg-red-500/10 font-medium">
                  📝 Sabab: {w.rejection_reason}
                </div>
              )}

              {w.status === "pending" && (
                <>
                  {rejectingId === w.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Rad etish sababini yozing..."
                        rows={2}
                        className="w-full px-3 py-2 rounded-lg bg-secondary text-xs text-foreground placeholder:text-muted-foreground outline-none resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReject(w.id)}
                          disabled={!rejectReason.trim() || isProcessingThis}
                          className="flex-1 py-1.5 rounded-lg bg-red-500/10 text-red-500 text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" />
                          {isProcessingThis ? "..." : "Rad etish"}
                        </button>
                        <button
                          onClick={() => { setRejectingId(null); setRejectReason(""); }}
                          className="flex-1 py-1.5 rounded-lg bg-secondary text-muted-foreground text-xs font-bold"
                        >
                          Bekor qilish
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(w.id)}
                        disabled={isProcessingThis}
                        className="flex-1 py-1.5 rounded-lg bg-blue-500/10 text-blue-500 text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        {isProcessingThis ? "..." : "Tasdiqlash"}
                      </button>
                      <button
                        onClick={() => setRejectingId(w.id)}
                        className="flex-1 py-1.5 rounded-lg bg-red-500/10 text-red-500 text-xs font-bold flex items-center justify-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" /> Rad etish
                      </button>
                    </div>
                  )}
                </>
              )}

              {w.status === "processing" && (
                <>
                  {rejectingId === w.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Rad etish sababini yozing..."
                        rows={2}
                        className="w-full px-3 py-2 rounded-lg bg-secondary text-xs text-foreground placeholder:text-muted-foreground outline-none resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReject(w.id)}
                          disabled={!rejectReason.trim() || isProcessingThis}
                          className="flex-1 py-1.5 rounded-lg bg-red-500/10 text-red-500 text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" />
                          {isProcessingThis ? "..." : "Rad etish"}
                        </button>
                        <button
                          onClick={() => { setRejectingId(null); setRejectReason(""); }}
                          className="flex-1 py-1.5 rounded-lg bg-secondary text-muted-foreground text-xs font-bold"
                        >
                          Bekor qilish
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleMarkPaid(w.id)}
                        disabled={isProcessingThis}
                        className="flex-1 py-1.5 rounded-lg bg-green-500/10 text-green-500 text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        {isProcessingThis ? "..." : "To'landi"}
                      </button>
                      <button
                        onClick={() => setRejectingId(w.id)}
                        className="flex-1 py-1.5 rounded-lg bg-red-500/10 text-red-500 text-xs font-bold flex items-center justify-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" /> Rad etish
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

// ─── Channels ──────────────────────────────────────
const ChannelsSection = ({ invokeAdmin }: { invokeAdmin: AdminPanelProps["invokeAdmin"] }) => {
  const [channels, setChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newChannel, setNewChannel] = useState({ name: "", username: "", reward: "100" });

  const fetchChannels = async () => {
    setLoading(true);
    const data = await invokeAdmin("get_channels");
    if (data) setChannels(data.channels || []);
    setLoading(false);
  };

  useEffect(() => { fetchChannels(); }, []);

  const handleAdd = async () => {
    if (!newChannel.name || !newChannel.username) return;
    await invokeAdmin("add_channel", {
      name: newChannel.name,
      username: newChannel.username,
      reward: parseInt(newChannel.reward) || 100,
    });
    setNewChannel({ name: "", username: "", reward: "100" });
    setShowAdd(false);
    fetchChannels();
  };

  const handleRemove = async (id: string) => {
    await invokeAdmin("remove_channel", { channel_id: id });
    fetchChannels();
  };

  if (loading) return <div className="text-center text-sm text-muted-foreground py-8">Yuklanmoqda...</div>;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-bold text-sm">Kanallar</span>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="p-1.5 rounded-lg bg-primary text-primary-foreground"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {showAdd && (
        <div className="card-3d p-3 space-y-2">
          <input
            value={newChannel.name}
            onChange={(e) => setNewChannel({ ...newChannel, name: e.target.value })}
            placeholder="Kanal nomi"
            className="w-full px-3 py-2 rounded-lg bg-secondary text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          <input
            value={newChannel.username}
            onChange={(e) => setNewChannel({ ...newChannel, username: e.target.value })}
            placeholder="@username"
            className="w-full px-3 py-2 rounded-lg bg-secondary text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          <input
            value={newChannel.reward}
            onChange={(e) => setNewChannel({ ...newChannel, reward: e.target.value })}
            placeholder="Mukofot (tanga)"
            type="number"
            className="w-full px-3 py-2 rounded-lg bg-secondary text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          <button
            onClick={handleAdd}
            className="w-full py-2 rounded-lg text-sm font-bold"
            style={{ background: "var(--gradient-primary)", color: "hsl(var(--primary-foreground))" }}
          >
            Qo'shish
          </button>
        </div>
      )}

      {channels.map((ch) => (
        <div key={ch.id} className="card-3d p-3 flex items-center gap-2">
          <div className="flex-1">
            <span className="font-bold text-sm text-foreground">{ch.name}</span>
            <p className="text-xs text-muted-foreground">{ch.username} · {ch.reward} tanga</p>
          </div>
          <button
            onClick={() => handleRemove(ch.id)}
            className="p-1.5 rounded-lg bg-destructive/10"
          >
            <Trash2 className="w-3.5 h-3.5 text-destructive" />
          </button>
        </div>
      ))}
    </div>
  );
};

// ─── Settings ──────────────────────────────────────
const SettingsSection = ({ invokeAdmin }: { invokeAdmin: AdminPanelProps["invokeAdmin"] }) => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase.from("app_settings").select("*");
      if (data) {
        const map: Record<string, string> = {};
        data.forEach((s: any) => { map[s.key] = s.value; });
        setSettings(map);
      }
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const handleSave = async (key: string, value: string) => {
    setSaving(true);
    await invokeAdmin("update_setting", { key, value });
    setSettings({ ...settings, [key]: value });
    setSaving(false);
  };

  if (loading) return <div className="text-center text-sm text-muted-foreground py-8">Yuklanmoqda...</div>;

  const settingsConfig = [
    { key: "exchange_rate_coins", label: "Almashuv kursi (tanga)", desc: "Nechta tanga" },
    { key: "exchange_rate_som", label: "Almashuv kursi (so'm)", desc: "Necha so'mga" },
    { key: "min_withdrawal_coins", label: "Minimal yechish (tanga)", desc: "Eng kam tanga" },
    { key: "ad_reward_coins", label: "Reklama mukofoti", desc: "Har bir reklama uchun" },
    { key: "max_ads_per_session", label: "Maks reklamalar", desc: "Kuniga nechta" },
    { key: "cooldown_minutes", label: "Kutish vaqti (daqiqa)", desc: "Reklamalar orasida" },
  ];

  return (
    <div className="space-y-2">
      <span className="font-bold text-sm">Sozlamalar</span>
      {settingsConfig.map((item) => (
        <div key={item.key} className="card-3d p-3">
          <div className="flex items-center justify-between mb-1">
            <div>
              <span className="font-bold text-xs text-foreground">{item.label}</span>
              <p className="text-[10px] text-muted-foreground">{item.desc}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={settings[item.key] || ""}
              onChange={(e) => setSettings({ ...settings, [item.key]: e.target.value })}
              type="number"
              className="flex-1 px-3 py-1.5 rounded-lg bg-secondary text-sm text-foreground outline-none"
            />
            <button
              onClick={() => handleSave(item.key, settings[item.key] || "0")}
              disabled={saving}
              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold"
            >
              Saqlash
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Games Admin ───────────────────────────────────
const GAME_EMOJIS: Record<string, string> = {
  viselitsa: "🎯", mines: "💣", sandiq: "🎁",
  raqam_topish: "🔢", tez_hisob: "🧮", xotira: "🧠",
};

const GamesAdminSection = ({ invokeAdmin }: { invokeAdmin: AdminPanelProps["invokeAdmin"] }) => {
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBet, setEditBet] = useState("");
  const [editReward, setEditReward] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchGames = async () => {
    setLoading(true);
    const data = await invokeAdmin("get_games");
    if (data) setGames(data.games || []);
    setLoading(false);
  };

  useEffect(() => { fetchGames(); }, []);

  const handleToggle = async (gameId: string, currentActive: boolean) => {
    setSaving(true);
    await invokeAdmin("update_game", { game_id: gameId, active: !currentActive });
    await fetchGames();
    setSaving(false);
    toast.success(currentActive ? "O'yin o'chirildi" : "O'yin yoqildi");
  };

  const handleSave = async (gameId: string) => {
    setSaving(true);
    await invokeAdmin("update_game", {
      game_id: gameId,
      bet_amount: editBet,
      reward_amount: editReward,
    });
    await fetchGames();
    setEditingId(null);
    setSaving(false);
    toast.success("O'yin sozlamalari saqlandi");
  };

  const handleReorder = async (gameId: string, direction: "up" | "down") => {
    setSaving(true);
    await invokeAdmin("reorder_game", { game_id: gameId, direction });
    await fetchGames();
    setSaving(false);
  };

  if (loading) return <div className="text-center text-sm text-muted-foreground py-8">Yuklanmoqda...</div>;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-bold text-sm">O'yinlar boshqaruvi</span>
        <button onClick={fetchGames} className="p-1.5 rounded-lg bg-secondary">
          <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      {games.map((game, idx) => {
        const isEditing = editingId === game.id;

        return (
          <div key={game.id} className="card-3d p-3 space-y-2">
            <div className="flex items-center gap-3">
              {/* Reorder buttons */}
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => handleReorder(game.id, "up")}
                  disabled={idx === 0 || saving}
                  className="p-1 rounded bg-secondary disabled:opacity-30"
                >
                  <ArrowUp className="w-3 h-3 text-muted-foreground" />
                </button>
                <button
                  onClick={() => handleReorder(game.id, "down")}
                  disabled={idx === games.length - 1 || saving}
                  className="p-1 rounded bg-secondary disabled:opacity-30"
                >
                  <ArrowDown className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>

              <span className="text-2xl">{GAME_EMOJIS[game.id] || game.emoji}</span>
              <div className="flex-1">
                <p className="font-bold text-sm text-foreground">{game.name}</p>
                <p className="text-[10px] text-muted-foreground">{game.description}</p>
              </div>
              {/* Toggle active */}
              <button
                onClick={() => handleToggle(game.id, game.active)}
                disabled={saving}
                className={`p-2 rounded-lg transition-colors ${
                  game.active
                    ? "bg-green-500/15 text-green-500"
                    : "bg-red-500/15 text-red-500"
                }`}
              >
                <Power className="w-4 h-4" />
              </button>
            </div>

            {/* Current settings */}
            <div className="flex gap-2 text-xs">
              <span className="px-2 py-1 rounded-lg bg-secondary text-muted-foreground">
                Tikish: <span className="font-bold text-foreground">{game.bet_amount}</span>
              </span>
              <span className="px-2 py-1 rounded-lg bg-secondary text-muted-foreground">
                Mukofot: <span className="font-bold text-foreground">{game.reward_amount}</span>
              </span>
              <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                game.active ? "bg-green-500/15 text-green-500" : "bg-red-500/15 text-red-500"
              }`}>
                {game.active ? "Yoqilgan" : "O'chirilgan"}
              </span>
            </div>

            {/* Edit button */}
            {!isEditing ? (
              <button
                onClick={() => {
                  setEditingId(game.id);
                  setEditBet(String(game.bet_amount));
                  setEditReward(String(game.reward_amount));
                }}
                className="w-full py-1.5 rounded-lg bg-secondary text-xs font-bold text-muted-foreground"
              >
                Tahrirlash
              </button>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] text-muted-foreground">Tikish (tanga)</label>
                    <input
                      value={editBet}
                      onChange={(e) => setEditBet(e.target.value)}
                      type="number"
                      className="w-full px-3 py-1.5 rounded-lg bg-secondary text-sm text-foreground outline-none"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-muted-foreground">Mukofot (tanga)</label>
                    <input
                      value={editReward}
                      onChange={(e) => setEditReward(e.target.value)}
                      type="number"
                      className="w-full px-3 py-1.5 rounded-lg bg-secondary text-sm text-foreground outline-none"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSave(game.id)}
                    disabled={saving}
                    className="flex-1 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold"
                  >
                    {saving ? "..." : "Saqlash"}
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="flex-1 py-1.5 rounded-lg bg-secondary text-muted-foreground text-xs font-bold"
                  >
                    Bekor
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ─── Promo Admin ──────────────────────────────────
const PromoAdminSection = ({ invokeAdmin }: { invokeAdmin: AdminPanelProps["invokeAdmin"] }) => {
  const [promos, setPromos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newPromo, setNewPromo] = useState({ code: "", coins_reward: "50", max_uses: "1", expires_hours: "24" });
  const [creating, setCreating] = useState(false);

  const fetchPromos = async () => {
    setLoading(true);
    const data = await invokeAdmin("get_admin_promos");
    if (data) setPromos(data.promos || []);
    setLoading(false);
  };

  useEffect(() => { fetchPromos(); }, []);

  const handleCreate = async () => {
    if (!newPromo.code.trim()) {
      toast.error("Promokod kiriting");
      return;
    }
    setCreating(true);
    const data = await invokeAdmin("create_admin_promo", {
      code: newPromo.code.trim().toUpperCase(),
      coins_reward: parseInt(newPromo.coins_reward) || 50,
      max_uses: parseInt(newPromo.max_uses) || 1,
      expires_hours: parseInt(newPromo.expires_hours) || 24,
    });
    if (data?.success) {
      toast.success("Promokod yaratildi!");
      setNewPromo({ code: "", coins_reward: "50", max_uses: "1", expires_hours: "24" });
      setShowAdd(false);
      fetchPromos();
    } else {
      toast.error(data?.error || "Xatolik");
    }
    setCreating(false);
  };

  const handleToggle = async (id: string, active: boolean) => {
    await invokeAdmin("toggle_admin_promo", { promo_id: id, active: !active });
    fetchPromos();
    toast.success(active ? "O'chirildi" : "Yoqildi");
  };

  const handleDelete = async (id: string) => {
    await invokeAdmin("delete_admin_promo", { promo_id: id });
    fetchPromos();
    toast.success("O'chirildi");
  };

  if (loading) return <div className="text-center text-sm text-muted-foreground py-8">Yuklanmoqda...</div>;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-bold text-sm">Admin promokodlar</span>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="p-1.5 rounded-lg bg-primary text-primary-foreground"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {showAdd && (
        <div className="card-3d p-3 space-y-2">
          <div>
            <label className="text-[10px] text-muted-foreground">Promokod</label>
            <input
              value={newPromo.code}
              onChange={(e) => setNewPromo({ ...newPromo, code: e.target.value.toUpperCase() })}
              placeholder="MAXSUS2024"
              maxLength={20}
              className="w-full px-3 py-2 rounded-lg bg-secondary text-sm text-foreground placeholder:text-muted-foreground outline-none uppercase tracking-wider font-bold"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] text-muted-foreground">Tanga</label>
              <input
                value={newPromo.coins_reward}
                onChange={(e) => setNewPromo({ ...newPromo, coins_reward: e.target.value })}
                type="number"
                className="w-full px-3 py-2 rounded-lg bg-secondary text-sm text-foreground outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">Necha kishi</label>
              <input
                value={newPromo.max_uses}
                onChange={(e) => setNewPromo({ ...newPromo, max_uses: e.target.value })}
                type="number"
                className="w-full px-3 py-2 rounded-lg bg-secondary text-sm text-foreground outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">Soat</label>
              <input
                value={newPromo.expires_hours}
                onChange={(e) => setNewPromo({ ...newPromo, expires_hours: e.target.value })}
                type="number"
                className="w-full px-3 py-2 rounded-lg bg-secondary text-sm text-foreground outline-none"
              />
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={creating || !newPromo.code.trim()}
            className="w-full py-2 rounded-lg text-sm font-bold disabled:opacity-50"
            style={{ background: "var(--gradient-primary)", color: "hsl(var(--primary-foreground))" }}
          >
            {creating ? "Yaratilmoqda..." : "Yaratish"}
          </button>
        </div>
      )}

      {promos.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground py-8">Promokodlar yo'q</div>
      ) : (
        promos.map((p) => {
          const isExpired = new Date(p.expires_at) < new Date();
          const isFull = p.used_count >= p.max_uses;
          return (
            <div key={p.id} className="card-3d p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Ticket className="w-4 h-4 text-primary" />
                <span className="font-bold text-sm text-foreground tracking-wider flex-1">{p.code}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  !p.active || isExpired ? "bg-red-500/15 text-red-500"
                  : isFull ? "bg-yellow-500/15 text-yellow-600"
                  : "bg-green-500/15 text-green-500"
                }`}>
                  {!p.active ? "O'chiq" : isExpired ? "Muddati o'tgan" : isFull ? "To'lgan" : "Faol"}
                </span>
              </div>
              <div className="flex gap-2 text-xs">
                <span className="px-2 py-1 rounded-lg bg-secondary text-muted-foreground">
                  💰 <span className="font-bold text-foreground">{p.coins_reward}</span> tanga
                </span>
                <span className="px-2 py-1 rounded-lg bg-secondary text-muted-foreground">
                  👥 <span className="font-bold text-foreground">{p.used_count}/{p.max_uses}</span>
                </span>
                <span className="px-2 py-1 rounded-lg bg-secondary text-muted-foreground">
                  ⏰ {new Date(p.expires_at).toLocaleDateString("uz-UZ")}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleToggle(p.id, p.active)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 ${
                    p.active ? "bg-yellow-500/10 text-yellow-600" : "bg-green-500/10 text-green-500"
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  {p.active ? "O'chirish" : "Yoqish"}
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="flex-1 py-1.5 rounded-lg bg-red-500/10 text-red-500 text-xs font-bold flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  O'chirish
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

// ─── Bonus Day Admin ──────────────────────────────
const BonusDayAdminSection = ({ invokeAdmin }: { invokeAdmin: AdminPanelProps["invokeAdmin"] }) => {
  const [bonusDayActive, setBonusDayActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [searchId, setSearchId] = useState("");
  const [foundUser, setFoundUser] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [convertAmount, setConvertAmount] = useState("");
  const [converting, setConverting] = useState(false);
  const [bonusUsers, setBonusUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "bonus_day_active")
        .maybeSingle();
      setBonusDayActive(data?.value === "true");
      setLoading(false);
    };
    fetchStatus();
    fetchBonusUsers();
  }, []);

  const fetchBonusUsers = async () => {
    setLoadingUsers(true);
    const result = await invokeAdmin("get_bonus_day_users");
    if (result?.users) setBonusUsers(result.users);
    setLoadingUsers(false);
  };

  const handleToggle = async () => {
    setToggling(true);
    const newState = !bonusDayActive;
    await invokeAdmin("toggle_bonus_day", { active: newState });
    setBonusDayActive(newState);
    setToggling(false);
    toast.success(newState ? "Bonus Day yoqildi!" : "Bonus Day o'chirildi!");
  };

  const handleSearch = async () => {
    const id = parseInt(searchId.trim());
    if (!id || isNaN(id)) {
      toast.error("Telegram ID kiriting");
      return;
    }
    setSearching(true);
    setFoundUser(null);
    const result = await invokeAdmin("find_user", { target_telegram_id: id });
    if (result?.user) {
      setFoundUser(result.user);
    } else {
      toast.error("Foydalanuvchi topilmadi");
    }
    setSearching(false);
  };

  const handleConvert = async () => {
    if (!foundUser || !convertAmount.trim()) return;
    const amount = parseInt(convertAmount);
    if (!amount || amount <= 0) {
      toast.error("Miqdor kiriting");
      return;
    }
    setConverting(true);
    const result = await invokeAdmin("convert_bonus_coins", {
      target_telegram_id: foundUser.telegram_id,
      amount,
    });
    if (result?.success) {
      toast.success(`${amount} bonus tanga → asosiy tangaga o'zgartirildi!`);
      setFoundUser(result.user);
      setConvertAmount("");
      fetchBonusUsers();
    } else {
      toast.error(result?.error || "Xatolik");
    }
    setConverting(false);
  };

  if (loading) return <div className="text-center text-sm text-muted-foreground py-8">Yuklanmoqda...</div>;

  return (
    <div className="space-y-3">
      <span className="font-bold text-sm">Bonus Day boshqaruvi</span>

      {/* Toggle */}
      <div className="card-3d p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-sm text-foreground">Bonus Day holati</p>
            <p className="text-xs text-muted-foreground">
              {bonusDayActive ? "Yoqilgan — foydalanuvchilarga ko'rinadi" : "O'chirilgan — yashirin"}
            </p>
          </div>
          <button
            onClick={handleToggle}
            disabled={toggling}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
              bonusDayActive
                ? "bg-green-500/15 text-green-500"
                : "bg-red-500/15 text-red-500"
            }`}
          >
            {toggling ? "..." : bonusDayActive ? "Yoqilgan ✓" : "O'chirilgan ✗"}
          </button>
        </div>
      </div>

      {/* Bonus day users list */}
      <div className="card-3d p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground font-bold">⭐ Bonus ishtirokchilari</p>
          <button onClick={fetchBonusUsers} className="p-1.5 rounded-lg bg-secondary">
            <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
        {loadingUsers ? (
          <div className="text-center py-3 text-xs text-muted-foreground">Yuklanmoqda...</div>
        ) : bonusUsers.length === 0 ? (
          <div className="text-center py-3 text-xs text-muted-foreground">Hali hech kim ishlamagan</div>
        ) : (
          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {bonusUsers.map((u, i) => (
              <div key={u.telegram_id} className="flex items-center gap-2 p-2 rounded-lg bg-secondary">
                <span className="text-[10px] text-muted-foreground w-5">{i + 1}.</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">
                    {u.first_name || u.username || "Noma'lum"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {u.username ? `@${u.username}` : "—"} · ID: {u.telegram_id}
                  </p>
                </div>
                <span className="text-xs font-extrabold text-yellow-500">⭐ {(u.bonus_coins || 0).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Convert bonus coins */}
      <div className="card-3d p-3 space-y-2">
        <p className="text-xs text-muted-foreground font-bold">Bonus tangani asosiy tangaga o'zgartirish</p>
        <div className="flex gap-2">
          <input
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            placeholder="Telegram ID"
            type="number"
            className="flex-1 px-3 py-2 rounded-lg bg-secondary text-sm text-foreground placeholder:text-muted-foreground outline-none"
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <button
            onClick={handleSearch}
            disabled={searching || !searchId.trim()}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50"
          >
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </button>
        </div>

        {foundUser && (
          <div className="space-y-2 p-3 rounded-lg bg-secondary">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">
                {foundUser.first_name || foundUser.username || "Noma'lum"}
              </span>
              <span className="text-xs text-muted-foreground">ID: {foundUser.telegram_id}</span>
            </div>
            <div className="flex gap-3 text-xs">
              <span>💰 Asosiy: <span className="font-bold text-foreground">{(foundUser.coins || 0).toLocaleString()}</span></span>
              <span>⭐ Bonus: <span className="font-bold text-foreground">{(foundUser.bonus_coins || 0).toLocaleString()}</span></span>
            </div>
            <div className="flex gap-2">
              <input
                value={convertAmount}
                onChange={(e) => setConvertAmount(e.target.value)}
                placeholder="Miqdor"
                type="number"
                className="flex-1 px-3 py-2 rounded-lg bg-background text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
              <button
                onClick={handleConvert}
                disabled={converting || !convertAmount.trim()}
                className="px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
                style={{ background: "var(--gradient-primary)", color: "hsl(var(--primary-foreground))" }}
              >
                {converting ? "..." : "O'zgartirish"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;