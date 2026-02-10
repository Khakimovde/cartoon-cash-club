import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, ChevronRight, Clock, ListChecks } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showAd } from "@/lib/monetag";
import coinImg from "@/assets/coin-3d.png";
import videoAdIcon from "@/assets/video-ad-icon.png";
import megaphoneIcon from "@/assets/megaphone-icon.png";
import AdWatchDrawer from "./AdWatchDrawer";
import ChannelSubscribeDrawer from "./ChannelSubscribeDrawer";
import { toast } from "sonner";

interface TasksTabProps {
  coins: number;
  telegramId: number;
  adsToday: number;
  subscribedChannels: string[];
  invokeAction: (action: string, params?: Record<string, any>) => Promise<any>;
  refreshUser: () => Promise<void>;
}

interface ChannelTask {
  id: string;
  name: string;
  username: string;
  reward: number;
  active: boolean;
}

// Per-user cooldown key
const getCooldownKey = (tgId: number) => `ad_cooldown_end_${tgId}`;

// Calculate next 6-hour boundary (00:00, 06:00, 12:00, 18:00)
const getNextSixHourBoundary = (): number => {
  const now = new Date();
  const hour = now.getHours();
  const nextWindow = Math.ceil((hour + 1) / 6) * 6;
  const next = new Date(now);
  if (nextWindow >= 24) {
    next.setDate(next.getDate() + 1);
    next.setHours(0, 0, 0, 0);
  } else {
    next.setHours(nextWindow, 0, 0, 0);
  }
  return next.getTime();
};

const TasksTab = ({
  coins,
  telegramId,
  adsToday,
  subscribedChannels,
  invokeAction,
  refreshUser,
}: TasksTabProps) => {
  const [watchedAds, setWatchedAds] = useState(adsToday);
  const [isWatching, setIsWatching] = useState(false);
  const [channels, setChannels] = useState<ChannelTask[]>([]);
  const [maxAds, setMaxAds] = useState(10);
  const [adReward, setAdReward] = useState(13);
  const [cooldownMinutes, setCooldownMinutes] = useState(30);
  const [localSubscribed, setLocalSubscribed] = useState<string[]>(subscribedChannels);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [isAdDrawerOpen, setIsAdDrawerOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<ChannelTask | null>(null);
  const cooldownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const cooldownKey = getCooldownKey(telegramId);

  useEffect(() => {
    setWatchedAds(adsToday);
  }, [adsToday]);

  useEffect(() => {
    setLocalSubscribed(subscribedChannels);
  }, [subscribedChannels]);

  // Check and manage cooldown timer (per-user, aligned to :00/:30)
  useEffect(() => {
    const checkCooldown = () => {
      const cooldownEnd = localStorage.getItem(cooldownKey);
      if (cooldownEnd) {
        const endTime = parseInt(cooldownEnd, 10);
        const now = Date.now();
        if (endTime > now) {
          setCooldownRemaining(Math.ceil((endTime - now) / 1000));
        } else {
          // Cooldown expired - reset everything
          localStorage.removeItem(cooldownKey);
          setCooldownRemaining(0);
          setWatchedAds(0);
          refreshUser();
        }
      } else {
        // No cooldown set - check if we need to auto-set one
        // If ads are maxed but no cooldown (e.g. cleared localStorage or new device)
        if (watchedAds >= maxAds && maxAds > 0) {
          const endTime = getNextSixHourBoundary();
          const now = Date.now();
          if (endTime > now) {
            // Still within the current window, set cooldown
            localStorage.setItem(cooldownKey, endTime.toString());
            setCooldownRemaining(Math.ceil((endTime - now) / 1000));
          } else {
            // Already past the boundary, reset
            setWatchedAds(0);
            refreshUser();
          }
        } else {
          setCooldownRemaining(0);
        }
      }
    };

    checkCooldown();

    cooldownIntervalRef.current = setInterval(() => {
      const cooldownEnd = localStorage.getItem(cooldownKey);
      if (cooldownEnd) {
        const endTime = parseInt(cooldownEnd, 10);
        const now = Date.now();
        if (endTime > now) {
          setCooldownRemaining(Math.ceil((endTime - now) / 1000));
        } else {
          // Cooldown expired
          localStorage.removeItem(cooldownKey);
          setCooldownRemaining(0);
          setWatchedAds(0);
          refreshUser();
        }
      } else {
        setCooldownRemaining(0);
      }
    }, 1000);

    return () => {
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
      }
    };
  }, [cooldownKey, refreshUser, watchedAds, maxAds]);

  // Fetch channels and settings
  useEffect(() => {
    const fetchData = async () => {
      const [channelsRes, settingsRes] = await Promise.all([
        supabase.from("channel_tasks").select("*").eq("active", true),
        supabase.from("app_settings").select("*"),
      ]);

      if (channelsRes.data) setChannels(channelsRes.data as ChannelTask[]);
      if (settingsRes.data) {
        const get = (key: string) => settingsRes.data.find((s: any) => s.key === key)?.value;
        setMaxAds(parseInt(get("max_ads_per_session") || "10"));
        setAdReward(parseInt(get("ad_reward_coins") || "13"));
        setCooldownMinutes(parseInt(get("cooldown_minutes") || "40"));
      }
    };
    fetchData();
  }, []);

  // Start cooldown aligned to next 6-hour boundary (00, 06, 12, 18)
  const startCooldown = useCallback(() => {
    const endTime = getNextSixHourBoundary();
    localStorage.setItem(cooldownKey, endTime.toString());
    setCooldownRemaining(Math.ceil((endTime - Date.now()) / 1000));
  }, [cooldownKey]);

  const handleWatchAd = useCallback(async () => {
    if (watchedAds >= maxAds || isWatching || cooldownRemaining > 0) return;
    setIsWatching(true);

    try {
      const adShown = await showAd();
      if (adShown) {
        const result = await invokeAction("watch_ad");
        if (result?.success) {
          const newAdsCount = result.ads_today;
          setWatchedAds(newAdsCount);
          toast.success(`Reklama ko'rildi! ${result.completed ? `+${result.coins_earned} tanga` : `${newAdsCount}/${maxAds}`}`);
          if (result.completed) {
            startCooldown();
            await refreshUser();
          }
        } else if (result?.error) {
          toast.error(result.error);
        }
      } else {
        toast.error("Reklama yuklanmadi, qayta urinib ko'ring");
      }
    } catch (error) {
      console.error("Ad error:", error);
      toast.error("Xatolik yuz berdi");
    } finally {
      setIsWatching(false);
    }
  }, [watchedAds, isWatching, maxAds, invokeAction, cooldownRemaining, startCooldown]);

  const handleChannelSuccess = (channelId: string, coinsEarned: number) => {
    setLocalSubscribed((prev) => [...prev, channelId]);
    refreshUser();
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = watchedAds / maxAds;
  const isOnCooldown = cooldownRemaining > 0;
  const isMaxReached = watchedAds >= maxAds;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
  };

  return (
    <>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="px-4 pt-4 pb-6 space-y-4"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <ListChecksIcon />
            <h2 className="text-xl font-extrabold text-foreground">Vazifalar</h2>
          </div>
          <p className="text-sm text-muted-foreground">Vazifalarni bajaring va tanga yig'ing</p>
        </motion.div>

        {/* Watch Ads Card */}
        <motion.div
          variants={itemVariants}
          className="task-card cursor-pointer"
          onClick={() => setIsAdDrawerOpen(true)}
        >
          <div className="task-card-icon task-card-icon-video">
            <img src={videoAdIcon} alt="Reklama" className="w-10 h-10 object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-foreground">Reklama ko'rish</h3>
            <p className="text-sm text-muted-foreground">
              {watchedAds}/{maxAds} ta reklama ko'ring
            </p>
            <div className="flex items-center gap-1 mt-1">
              <img src={coinImg} alt="coin" className="w-4 h-4" />
              <span className="text-sm font-bold text-coin">{adReward * maxAds} Tanga</span>
            </div>
            <div className="progress-bar-3d mt-2">
              <div className="fill" style={{ width: `${progress * 100}%` }} />
            </div>
            {isOnCooldown && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  Keyingi: <span className="font-bold text-primary">{formatTime(cooldownRemaining)}</span>
                </span>
              </div>
            )}
          </div>
          <div className="flex-shrink-0">
            {isMaxReached && !isOnCooldown ? (
              <span className="flex items-center gap-1 text-sm font-bold text-success">
                <CheckCircle2 className="w-4 h-4" />
                Tayyor
              </span>
            ) : (
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
        </motion.div>

        {/* Channel Subscriptions - each card opens drawer */}
        {channels.map((channel) => {
          const isCompleted = localSubscribed.includes(channel.id);

          return (
            <motion.div
              key={channel.id}
              variants={itemVariants}
              className="task-card cursor-pointer"
              onClick={() => !isCompleted && setSelectedChannel(channel)}
            >
              <div className="task-card-icon task-card-icon-channel">
                <img src={megaphoneIcon} alt="Kanal" className="w-10 h-10 object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-foreground">{channel.name}</h3>
                <p className="text-sm text-muted-foreground">{channel.username}</p>
                <div className="flex items-center gap-1 mt-1">
                  <img src={coinImg} alt="coin" className="w-4 h-4" />
                  <span className="text-sm font-bold text-coin">{channel.reward} Tanga</span>
                </div>
              </div>

              {isCompleted ? (
                <span className="flex items-center gap-1 text-sm font-bold text-success flex-shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                  Bajarildi
                </span>
              ) : (
                <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              )}
            </motion.div>
          );
        })}
      </motion.div>

      {/* Ad Watch Drawer */}
      <AdWatchDrawer
        isOpen={isAdDrawerOpen}
        onClose={() => setIsAdDrawerOpen(false)}
        watchedAds={watchedAds}
        maxAds={maxAds}
        adReward={adReward}
        cooldownRemaining={cooldownRemaining}
        onWatchAd={handleWatchAd}
        isWatching={isWatching}
      />

      {/* Channel Subscribe Drawer */}
      <ChannelSubscribeDrawer
        isOpen={!!selectedChannel}
        onClose={() => setSelectedChannel(null)}
        channel={selectedChannel}
        isCompleted={selectedChannel ? localSubscribed.includes(selectedChannel.id) : false}
        invokeAction={invokeAction}
        onSuccess={handleChannelSuccess}
      />
    </>
  );
};

const ListChecksIcon = () => (
  <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
    <ListChecks className="w-5 h-5 text-primary-foreground" strokeWidth={2.5} />
  </div>
);

export default TasksTab;
