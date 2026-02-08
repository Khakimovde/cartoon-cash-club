import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BarChart3, Users, Tv, TrendingUp, Clock, Check, X,
  Plus, Trash2, Settings, Hash, Wallet, RefreshCw,
} from "lucide-react";

interface AdminPanelProps {
  invokeAdmin: (action: string, params?: Record<string, any>) => Promise<any>;
}

type Section = "stats" | "withdrawals" | "channels" | "settings";

const AdminPanel = ({ invokeAdmin }: AdminPanelProps) => {
  const [section, setSection] = useState<Section>("stats");

  const sections: { id: Section; label: string; icon: typeof BarChart3 }[] = [
    { id: "stats", label: "Statistika", icon: BarChart3 },
    { id: "withdrawals", label: "So'rovlar", icon: Wallet },
    { id: "channels", label: "Kanallar", icon: Hash },
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
      {section === "withdrawals" && <WithdrawalsSection invokeAdmin={invokeAdmin} />}
      {section === "channels" && <ChannelsSection invokeAdmin={invokeAdmin} />}
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

// ─── Withdrawals ───────────────────────────────────
const WithdrawalsSection = ({ invokeAdmin }: { invokeAdmin: AdminPanelProps["invokeAdmin"] }) => {
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWithdrawals = async () => {
    setLoading(true);
    const data = await invokeAdmin("get_withdrawals");
    if (data) setWithdrawals(data.withdrawals || []);
    setLoading(false);
  };

  useEffect(() => { fetchWithdrawals(); }, []);

  const handleProcess = async (id: string, status: string) => {
    await invokeAdmin("process_withdrawal", { withdrawal_id: id, status });
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
        withdrawals.map((w) => (
          <div key={w.id} className="card-3d p-3">
            <div className="flex items-center justify-between mb-1">
              <div>
                <span className="font-bold text-sm text-foreground">
                  {w.user?.first_name || w.user?.username || `ID: ${w.user_telegram_id}`}
                </span>
                <span className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  w.status === "pending"
                    ? "bg-accent/20 text-accent-foreground"
                    : w.status === "approved"
                    ? "bg-success/20 text-success"
                    : "bg-destructive/20 text-destructive"
                }`}>
                  {w.status === "pending" ? "Kutilmoqda" : w.status === "approved" ? "Tasdiqlangan" : "Rad etilgan"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
              <span>{w.amount_coins?.toLocaleString()} tanga</span>
              <span>{w.amount_som?.toLocaleString()} so'm</span>
              {w.card_number && <span>💳 {w.card_number}</span>}
            </div>
            <div className="text-[10px] text-muted-foreground mb-2">
              {new Date(w.created_at).toLocaleString("uz-UZ")}
            </div>
            {w.status === "pending" && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleProcess(w.id, "approved")}
                  className="flex-1 py-1.5 rounded-lg bg-success/10 text-success text-xs font-bold flex items-center justify-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" /> Tasdiqlash
                </button>
                <button
                  onClick={() => handleProcess(w.id, "rejected")}
                  className="flex-1 py-1.5 rounded-lg bg-destructive/10 text-destructive text-xs font-bold flex items-center justify-center gap-1"
                >
                  <X className="w-3.5 h-3.5" /> Rad etish
                </button>
              </div>
            )}
          </div>
        ))
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
      // Settings are public readable
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

export default AdminPanel;
