import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// Get start of current 6-hour window in Tashkent time (UTC+5)
function getSixHourBoundary(): string {
  const now = new Date()
  const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000
  const tashkentTime = new Date(now.getTime() + TASHKENT_OFFSET_MS)
  const hour = tashkentTime.getUTCHours()
  const windowStart = Math.floor(hour / 6) * 6
  const boundary = new Date(tashkentTime)
  boundary.setUTCHours(windowStart, 0, 0, 0)
  const utcBoundary = new Date(boundary.getTime() - TASHKENT_OFFSET_MS)
  return utcBoundary.toISOString()
}

// Get start of today in Tashkent time (UTC+5)
function getTashkentDayStart(): string {
  const now = new Date()
  const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000
  const tashkentTime = new Date(now.getTime() + TASHKENT_OFFSET_MS)
  const dayStart = new Date(tashkentTime)
  dayStart.setUTCHours(0, 0, 0, 0)
  const utcDayStart = new Date(dayStart.getTime() - TASHKENT_OFFSET_MS)
  return utcDayStart.toISOString()
}

// Referral bonus percentages based on referral count
function getReferralBonusPercent(referralCount: number): number {
  if (referralCount >= 100) return 25
  if (referralCount >= 60) return 20
  if (referralCount >= 30) return 15
  if (referralCount >= 15) return 7
  return 5
}

// Give referrer their percentage bonus when a referred user earns coins
async function processReferralBonus(supabase: any, userId: number, coinsEarned: number) {
  if (coinsEarned <= 0) return

  const { data: user } = await supabase
    .from('users')
    .select('referred_by')
    .eq('telegram_id', userId)
    .single()

  if (!user?.referred_by) return

  const { data: referrer } = await supabase
    .from('users')
    .select('telegram_id, referral_count, referral_earnings, coins')
    .eq('telegram_id', user.referred_by)
    .single()

  if (!referrer) return

  const bonusPercent = getReferralBonusPercent(referrer.referral_count || 0)
  const bonusCoins = Math.floor(coinsEarned * bonusPercent / 100)

  if (bonusCoins <= 0) return

  await supabase.from('users')
    .update({
      coins: (referrer.coins || 0) + bonusCoins,
      referral_earnings: (referrer.referral_earnings || 0) + bonusCoins,
    })
    .eq('telegram_id', referrer.telegram_id)
}

// Check if user is member of a Telegram channel
async function checkChannelMembership(userId: number, channelUsername: string): Promise<boolean> {
  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
  if (!botToken) return false

  const cleanUsername = channelUsername.replace('@', '')
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=@${cleanUsername}&user_id=${userId}`
    )
    const data = await response.json()
    if (!data.ok) return false
    return ['member', 'administrator', 'creator'].includes(data.result?.status)
  } catch {
    return false
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const body = await req.json()
    const { action, telegram_id } = body

    if (!telegram_id || !action) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', telegram_id)
      .single()

    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: settings } = await supabase.from('app_settings').select('*')
    const getSetting = (key: string) => settings?.find((s: any) => s.key === key)?.value || '0'

    let result: Record<string, unknown> = { success: true }

    switch (action) {
      case 'watch_ad': {
        const adReward = parseInt(getSetting('ad_reward_coins') || '13')
        const maxAds = parseInt(getSetting('max_ads_per_session') || '10')

        const windowStart = getSixHourBoundary()
        const { count: windowAds } = await supabase
          .from('ad_views')
          .select('*', { count: 'exact', head: true })
          .eq('user_telegram_id', telegram_id)
          .gte('viewed_at', windowStart)

        if ((windowAds || 0) >= maxAds) {
          result = { success: false, error: 'Bu oyna uchun reklama limiti tugadi' }
          break
        }

        const newAdsCount = (windowAds || 0) + 1
        const isLastAd = newAdsCount >= maxAds
        const coinsToAdd = isLastAd ? (adReward * maxAds) : 0

        await supabase.from('ad_views').insert({
          user_telegram_id: telegram_id,
          coins_earned: isLastAd ? (adReward * maxAds) : 0,
        })

        if (isLastAd) {
          await supabase.from('users')
            .update({ coins: user.coins + coinsToAdd })
            .eq('telegram_id', telegram_id)
          await processReferralBonus(supabase, telegram_id, coinsToAdd)
        }

        result = {
          success: true,
          coins_earned: coinsToAdd,
          total_coins: isLastAd ? (user.coins + coinsToAdd) : user.coins,
          ads_today: newAdsCount,
          completed: isLastAd,
        }
        break
      }

      case 'claim_daily_referral_reward': {
        const DAILY_GOAL = 10
        const DAILY_REWARD = 400
        const dayStart = getTashkentDayStart()

        // Count today's referrals
        const { count: todayRefs } = await supabase
          .from('referrals')
          .select('*', { count: 'exact', head: true })
          .eq('referrer_telegram_id', telegram_id)
          .gte('created_at', dayStart)

        if ((todayRefs || 0) < DAILY_GOAL) {
          result = { success: false, error: `Bugun ${todayRefs || 0}/${DAILY_GOAL} ta referal. Yetarli emas!` }
          break
        }

        // Check if already claimed today
        const { data: alreadyClaimed } = await supabase
          .from('promo_history')
          .select('id')
          .eq('user_telegram_id', telegram_id)
          .eq('code', 'DAILY_REFERRAL')
          .gte('redeemed_at', dayStart)
          .maybeSingle()

        if (alreadyClaimed) {
          result = { success: false, error: 'Bugun allaqachon olingan!' }
          break
        }

        // Award coins
        await supabase.from('users')
          .update({ coins: (user.coins || 0) + DAILY_REWARD })
          .eq('telegram_id', telegram_id)

        // Record in promo_history
        await supabase.from('promo_history').insert({
          user_telegram_id: telegram_id,
          code: 'DAILY_REFERRAL',
          coins_earned: DAILY_REWARD,
          source: 'daily_referral',
        })

        await processReferralBonus(supabase, telegram_id, DAILY_REWARD)

        result = { success: true, coins_earned: DAILY_REWARD }
        break
      }

      case 'subscribe_channel': {
        const { channel_id } = body
        if (!channel_id) {
          result = { success: false, error: 'channel_id required' }
          break
        }

        const { data: existing } = await supabase
          .from('channel_subscriptions')
          .select('id')
          .eq('user_telegram_id', telegram_id)
          .eq('channel_task_id', channel_id)
          .maybeSingle()

        if (existing) {
          result = { success: false, error: 'Allaqachon obuna bo\'lgansiz' }
          break
        }

        const { data: channel } = await supabase
          .from('channel_tasks')
          .select('reward, username')
          .eq('id', channel_id)
          .single()

        if (!channel) {
          result = { success: false, error: 'Kanal topilmadi' }
          break
        }

        const isMember = await checkChannelMembership(telegram_id, channel.username)

        if (!isMember) {
          result = {
            success: false,
            error: 'Kanalga obuna bo\'lmagansiz! Iltimos, avval kanalga obuna bo\'ling.',
            need_subscribe: true
          }
          break
        }

        await supabase.from('channel_subscriptions').insert({
          user_telegram_id: telegram_id,
          channel_task_id: channel_id,
        })

        const channelReward = channel.reward || 0
        await supabase.from('users')
          .update({ coins: user.coins + channelReward })
          .eq('telegram_id', telegram_id)

        await processReferralBonus(supabase, telegram_id, channelReward)

        result = {
          success: true,
          coins_earned: channelReward,
          total_coins: user.coins + channelReward
        }
        break
      }

      case 'request_withdrawal': {
        const { amount_coins, card_number } = body
        const minCoins = parseInt(getSetting('min_withdrawal_coins') || '10000')
        const exchangeCoins = parseInt(getSetting('exchange_rate_coins'))
        const exchangeSom = parseInt(getSetting('exchange_rate_som'))

        if (!amount_coins || amount_coins < minCoins) {
          result = { success: false, error: `Minimum ${minCoins.toLocaleString()} tanga kerak` }
          break
        }

        if (user.coins < amount_coins) {
          result = { success: false, error: 'Tangalar yetarli emas' }
          break
        }

        if (!card_number || !/^\d{16}$/.test(String(card_number).replace(/\s/g, ''))) {
          result = { success: false, error: 'Karta raqami 16 ta raqamdan iborat bo\'lishi kerak' }
          break
        }

        const cleanCardNumber = String(card_number).replace(/\s/g, '')
        const amountSom = Math.floor((amount_coins / exchangeCoins) * exchangeSom)

        await supabase.from('withdrawal_requests').insert({
          user_telegram_id: telegram_id,
          amount_coins,
          amount_som: amountSom,
          card_number: cleanCardNumber,
        })

        await supabase.from('users')
          .update({ coins: user.coins - amount_coins })
          .eq('telegram_id', telegram_id)

        result = { success: true, amount_coins, amount_som: amountSom }
        break
      }

      case 'game_bet_deduct': {
        const { game_id } = body
        if (!game_id) {
          result = { success: false, error: 'Missing game_id' }
          break
        }

        const { data: gameSettings } = await supabase
          .from('game_settings')
          .select('*')
          .eq('id', game_id)
          .eq('active', true)
          .maybeSingle()

        if (!gameSettings) {
          result = { success: false, error: "O'yin topilmadi yoki o'chirilgan" }
          break
        }

        const actualBet = gameSettings.bet_amount
        if (user.coins < actualBet) {
          result = { success: false, error: `Tangalar yetarli emas! ${actualBet} tanga kerak` }
          break
        }

        await supabase.from('users')
          .update({ coins: user.coins - actualBet })
          .eq('telegram_id', telegram_id)

        result = { success: true, deducted: actualBet, remaining: user.coins - actualBet }
        break
      }

      case 'game_result': {
        const { game_id, won } = body
        if (!game_id) {
          result = { success: false, error: 'Missing game params' }
          break
        }

        const { data: gameSettings } = await supabase
          .from('game_settings')
          .select('*')
          .eq('id', game_id)
          .eq('active', true)
          .maybeSingle()

        if (!gameSettings) {
          result = { success: false, error: "O'yin topilmadi yoki o'chirilgan" }
          break
        }

        const { data: freshUser } = await supabase
          .from('users')
          .select('coins')
          .eq('telegram_id', telegram_id)
          .single()

        const currentCoins = freshUser?.coins || 0

        if (won) {
          const reward = gameSettings.reward_amount
          await supabase.from('users')
            .update({ coins: currentCoins + reward })
            .eq('telegram_id', telegram_id)

          const netGain = reward - gameSettings.bet_amount
          if (netGain > 0) {
            await processReferralBonus(supabase, telegram_id, netGain)
          }

          result = { success: true, won: true, coins_change: reward }
        } else {
          result = { success: true, won: false, coins_change: 0 }
        }
        break
      }

      default:
        result = { success: false, error: 'Unknown action' }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
