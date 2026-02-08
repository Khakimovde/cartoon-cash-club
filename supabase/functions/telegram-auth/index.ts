import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// Get start of current half-hour window (:00 or :30)
function getHalfHourBoundary(): string {
  const now = new Date()
  const minutes = now.getMinutes()
  const boundary = new Date(now)
  if (minutes >= 30) {
    boundary.setMinutes(30, 0, 0)
  } else {
    boundary.setMinutes(0, 0, 0)
  }
  return boundary.toISOString()
}

// Send Telegram bot message to a user
async function sendTelegramMessage(chatId: number, text: string) {
  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
  if (!botToken) {
    console.error('[Telegram] Bot token not configured, cannot send message')
    return
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    })
    const result = await response.json()
    console.log('[Telegram] Send message result:', JSON.stringify(result))
  } catch (e) {
    console.error('[Telegram] Failed to send message:', e)
  }
}

// Referral bonus percentages based on referral count
function getReferralBonusPercent(referralCount: number): number {
  if (referralCount >= 100) return 25
  if (referralCount >= 60) return 20
  if (referralCount >= 30) return 15
  if (referralCount >= 15) return 7
  return 5
}

// Process referral: record relationship, update counts, send notification
async function processReferral(supabase: any, refCode: string, newUserTelegramId: number, newUserName: string) {
  console.log(`[Referral] Processing ref_code: ${refCode} for user ${newUserTelegramId}`)

  const { data: referrer } = await supabase
    .from('users')
    .select('telegram_id, referral_count, first_name, username')
    .eq('referral_code', refCode)
    .maybeSingle()

  if (!referrer) {
    console.log(`[Referral] Referrer not found for code: ${refCode}`)
    return false
  }

  if (referrer.telegram_id === newUserTelegramId) {
    console.log(`[Referral] User tried to refer themselves`)
    return false
  }

  // Check if referral already exists
  const { data: existingRef } = await supabase
    .from('referrals')
    .select('id')
    .eq('referrer_telegram_id', referrer.telegram_id)
    .eq('referred_telegram_id', newUserTelegramId)
    .maybeSingle()

  if (existingRef) {
    console.log(`[Referral] Referral already exists`)
    return false
  }

  // Record referral relationship
  const { error: refError } = await supabase.from('referrals').insert({
    referrer_telegram_id: referrer.telegram_id,
    referred_telegram_id: newUserTelegramId,
    bonus_coins: 0,
  })

  if (refError) {
    console.error(`[Referral] Failed to insert referral:`, refError.message)
    return false
  }

  // Set referred_by on new user
  await supabase.from('users')
    .update({ referred_by: referrer.telegram_id })
    .eq('telegram_id', newUserTelegramId)

  // Increment referrer's referral_count
  const newCount = (referrer.referral_count || 0) + 1
  await supabase.from('users')
    .update({ referral_count: newCount })
    .eq('telegram_id', referrer.telegram_id)

  console.log(`[Referral] Success! Referrer ${referrer.telegram_id} now has ${newCount} referrals`)

  // Calculate bonus percent for notification
  const bonusPercent = getReferralBonusPercent(newCount)

  // Send Telegram notification to referrer
  const referredName = newUserName || `ID: ${newUserTelegramId}`
  const notificationText = `🎉 <b>Yangi referal!</b>\n\n` +
    `👤 <b>${referredName}</b> sizning referalingiz bo'ldi!\n\n` +
    `📊 Jami do'stlar: <b>${newCount}</b>\n` +
    `💰 Sizning foizingiz: <b>${bonusPercent}%</b>\n\n` +
    `U ishlagan barcha daromaddan <b>${bonusPercent}%</b> sizga beriladi! 🚀`

  await sendTelegramMessage(referrer.telegram_id, notificationText)

  return true
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

    const { telegram_id, username, first_name, last_name, photo_url, ref_code } = await req.json()

    if (!telegram_id) {
      return new Response(JSON.stringify({ error: 'telegram_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check if user exists
    let { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', telegram_id)
      .maybeSingle()

    if (!user) {
      // Create new user
      const referralCode = `ref_${telegram_id}_${Date.now().toString(36)}`

      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          telegram_id,
          username: username || null,
          first_name: first_name || null,
          last_name: last_name || null,
          photo_url: photo_url || null,
          referral_code: referralCode,
          coins: 0,
          referral_count: 0,
          referral_earnings: 0,
        })
        .select()
        .single()

      if (createError) throw new Error(`Create user failed: ${createError.message}`)
      user = newUser

      // Handle referral for new user
      if (ref_code) {
        const userName = first_name || username || ''
        await processReferral(supabase, ref_code, telegram_id, userName)
      }

      // Re-fetch user to get updated data (including referred_by)
      const { data: freshUser } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', telegram_id)
        .single()
      if (freshUser) user = freshUser
    } else {
      // Update existing user's info
      await supabase.from('users')
        .update({
          username: username || user.username,
          first_name: first_name || user.first_name,
          last_name: last_name || user.last_name,
          photo_url: photo_url || user.photo_url,
        })
        .eq('telegram_id', telegram_id)

      // Handle referral for EXISTING users who don't have a referrer yet
      if (ref_code && !user.referred_by) {
        console.log(`[Referral] Processing referral for existing user ${telegram_id}`)
        const userName = first_name || username || user.first_name || user.username || ''
        await processReferral(supabase, ref_code, telegram_id, userName)
      }

      const { data: updatedUser } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', telegram_id)
        .single()
      if (updatedUser) user = updatedUser
    }

    // Get accurate referral count from referrals table
    const { count: referralCount } = await supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_telegram_id', telegram_id)

    // Only increase referral_count, never decrease (admin may have set a higher value manually)
    const actualCount = referralCount || 0
    const currentCount = user.referral_count || 0
    if (actualCount > currentCount) {
      await supabase.from('users')
        .update({ referral_count: actualCount })
        .eq('telegram_id', telegram_id)
      user.referral_count = actualCount
    }

    // Get subscribed channels
    const { data: subscriptions } = await supabase
      .from('channel_subscriptions')
      .select('channel_task_id')
      .eq('user_telegram_id', telegram_id)

    // Get ad count for current half-hour window (not daily)
    const windowStart = getHalfHourBoundary()
    const { count: adsInWindow } = await supabase
      .from('ad_views')
      .select('*', { count: 'exact', head: true })
      .eq('user_telegram_id', telegram_id)
      .gte('viewed_at', windowStart)

    // Check admin
    const { data: adminCheck } = await supabase
      .from('admin_users')
      .select('telegram_id')
      .eq('telegram_id', telegram_id)
      .maybeSingle()

    return new Response(JSON.stringify({
      user: {
        ...user,
        referral_count: user.referral_count || 0,
      },
      isAdmin: !!adminCheck,
      subscribedChannels: subscriptions?.map(s => s.channel_task_id) || [],
      adsToday: adsInWindow || 0,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[telegram-auth] Error:', msg)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
