import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// Referral bonus percentages based on referral count
function getReferralBonusPercent(referralCount: number): number {
  if (referralCount >= 100) return 25
  if (referralCount >= 50) return 20
  if (referralCount >= 20) return 15
  if (referralCount >= 10) return 7
  return 5
}

// Give referrer their percentage bonus when a referred user earns coins
async function processReferralBonus(supabase: any, userId: number, coinsEarned: number) {
  if (coinsEarned <= 0) return

  // Get user's referred_by
  const { data: user } = await supabase
    .from('users')
    .select('referred_by')
    .eq('telegram_id', userId)
    .single()

  if (!user?.referred_by) return

  // Get referrer info
  const { data: referrer } = await supabase
    .from('users')
    .select('telegram_id, referral_count, referral_earnings, coins')
    .eq('telegram_id', user.referred_by)
    .single()

  if (!referrer) return

  const bonusPercent = getReferralBonusPercent(referrer.referral_count || 0)
  const bonusCoins = Math.floor(coinsEarned * bonusPercent / 100)

  if (bonusCoins <= 0) return

  console.log(`[Referral] Giving ${bonusCoins} coins (${bonusPercent}%) to referrer ${referrer.telegram_id} from user ${userId} earning ${coinsEarned}`)

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
  if (!botToken) {
    console.error('[Telegram] Bot token not configured')
    return false
  }

  const cleanUsername = channelUsername.replace('@', '')
  
  try {
    console.log(`[Telegram] Checking membership for user ${userId} in channel @${cleanUsername}`)
    
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=@${cleanUsername}&user_id=${userId}`,
      { method: 'GET' }
    )
    
    const data = await response.json()
    console.log('[Telegram] API response:', JSON.stringify(data))
    
    if (!data.ok) {
      console.error('[Telegram] API error:', data.description)
      return false
    }
    
    const status = data.result?.status
    const validStatuses = ['member', 'administrator', 'creator']
    const isMember = validStatuses.includes(status)
    
    console.log(`[Telegram] User status: ${status}, isMember: ${isMember}`)
    return isMember
  } catch (error) {
    console.error('[Telegram] Error checking membership:', error)
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

        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const { count: todayAds } = await supabase
          .from('ad_views')
          .select('*', { count: 'exact', head: true })
          .eq('user_telegram_id', telegram_id)
          .gte('viewed_at', today.toISOString())

        if ((todayAds || 0) >= maxAds) {
          result = { success: false, error: 'Daily ad limit reached' }
          break
        }

        const newAdsCount = (todayAds || 0) + 1
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

          // Process referral bonus for the earned coins
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

        // Process referral bonus for channel subscription reward
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
        const minCoins = parseInt(getSetting('min_withdrawal_coins'))
        const exchangeCoins = parseInt(getSetting('exchange_rate_coins'))
        const exchangeSom = parseInt(getSetting('exchange_rate_som'))

        if (!amount_coins || amount_coins < minCoins) {
          result = { success: false, error: `Minimum ${minCoins} tanga kerak` }
          break
        }

        if (user.coins < amount_coins) {
          result = { success: false, error: 'Tangalar yetarli emas' }
          break
        }

        const amountSom = Math.floor((amount_coins / exchangeCoins) * exchangeSom)

        await supabase.from('withdrawal_requests').insert({
          user_telegram_id: telegram_id,
          amount_coins,
          amount_som: amountSom,
          card_number: card_number || null,
        })

        await supabase.from('users')
          .update({ coins: user.coins - amount_coins })
          .eq('telegram_id', telegram_id)

        result = { success: true, amount_coins, amount_som: amountSom }
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
