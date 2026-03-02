import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TelegramUser {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
}

export interface UserData {
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  photo_url: string | null;
  coins: number;
  referral_code: string;
  referral_count: number;
  referred_by: number | null;
  referral_earnings: number;
}

export function useTelegram() {
  const [user, setUser] = useState<UserData | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);
  const [subscribedChannels, setSubscribedChannels] = useState<string[]>([]);
  const [adsToday, setAdsToday] = useState(0);
  const [todayReferrals, setTodayReferrals] = useState(0);
  const [dailyReferralClaimed, setDailyReferralClaimed] = useState(false);
  const [isTelegram, setIsTelegram] = useState(false);

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    const tgUser = tg?.initDataUnsafe?.user;

    // Only allow Telegram WebApp access
    if (!tgUser) {
      setIsTelegram(false);
      setLoading(false);
      return;
    }

    setIsTelegram(true);

    const userData: TelegramUser = {
      id: tgUser.id,
      username: tgUser.username,
      first_name: tgUser.first_name,
      last_name: tgUser.last_name,
      photo_url: tgUser.photo_url,
    };

    setTelegramUser(userData);

    // Expand Telegram WebApp
    tg.expand();
    tg.ready();

    // Get ref code from Telegram start_param or URL query parameter (fallback for inline button)
    const startParam = tg?.initDataUnsafe?.start_param 
      || new URLSearchParams(window.location.search).get('ref')
      || undefined;
    authenticate(userData, startParam);
  }, []);

  const authenticate = async (tgUser: TelegramUser, refCode?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("telegram-auth", {
        body: {
          telegram_id: tgUser.id,
          username: tgUser.username,
          first_name: tgUser.first_name,
          last_name: tgUser.last_name,
          photo_url: tgUser.photo_url,
          ref_code: refCode,
        },
      });

      if (error) throw error;

      setUser(data.user);
      setIsAdmin(data.isAdmin);
      setSubscribedChannels(data.subscribedChannels || []);
      setAdsToday(data.adsToday || 0);
      setTodayReferrals(data.todayReferrals || 0);
      setDailyReferralClaimed(data.dailyReferralClaimed || false);
    } catch (err) {
      console.error("Auth error:", err);
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = useCallback(async () => {
    if (!telegramUser) return;
    try {
      const { data, error } = await supabase.functions.invoke("telegram-auth", {
        body: {
          telegram_id: telegramUser.id,
          username: telegramUser.username,
          first_name: telegramUser.first_name,
          last_name: telegramUser.last_name,
          photo_url: telegramUser.photo_url,
        },
      });

      if (error) throw error;

      setUser(data.user);
      setIsAdmin(data.isAdmin);
      setSubscribedChannels(data.subscribedChannels || []);
      setAdsToday(data.adsToday || 0);
      setTodayReferrals(data.todayReferrals || 0);
      setDailyReferralClaimed(data.dailyReferralClaimed || false);
    } catch (err) {
      console.error("Refresh error:", err);
    }
  }, [telegramUser]);

  const invokeAction = useCallback(
    async (action: string, params: Record<string, any> = {}) => {
      if (!telegramUser) return null;
      try {
        const { data, error } = await supabase.functions.invoke("user-action", {
          body: { action, telegram_id: telegramUser.id, ...params },
        });
        if (error) throw error;
        await refreshUser();
        return data;
      } catch (err) {
        console.error("Action error:", err);
        return null;
      }
    },
    [telegramUser, refreshUser]
  );

  const invokeAdmin = useCallback(
    async (action: string, params: Record<string, any> = {}) => {
      if (!telegramUser || !isAdmin) return null;
      try {
        const { data, error } = await supabase.functions.invoke("admin-action", {
          body: { action, telegram_id: telegramUser.id, ...params },
        });
        if (error) throw error;
        return data;
      } catch (err) {
        console.error("Admin error:", err);
        return null;
      }
    },
    [telegramUser, isAdmin]
  );

  return {
    user,
    isAdmin,
    loading,
    telegramUser,
    subscribedChannels,
    adsToday,
    todayReferrals,
    dailyReferralClaimed,
    isTelegram,
    refreshUser,
    invokeAction,
    invokeAdmin,
  };
}
