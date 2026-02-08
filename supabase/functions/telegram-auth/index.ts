import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

    let isNewUser = false

    if (!user) {
      isNewUser = true
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

      // Handle referral - record the relationship
      if (ref_code) {
        console.log(`[Referral] Processing ref_code: ${ref_code} for user ${telegram_id}`)
        
        const { data: referrer } = await supabase
          .from('users')
          .select('telegram_id, referral_count')
          .eq('referral_code', ref_code)
          .maybeSingle()

        if (referrer && referrer.telegram_id !== telegram_id) {
          console.log(`[Referral] Found referrer: ${referrer.telegram_id}`)
          
          // Record referral relationship
          const { error: refError } = await supabase.from('referrals').insert({
            referrer_telegram_id: referrer.telegram_id,
            referred_telegram_id: telegram_id,
            bonus_coins: 0, // Earnings come from percentage system
          })
          
          if (!refError) {
            // Set referred_by on new user
            await supabase.from('users')
              .update({ referred_by: referrer.telegram_id })
              .eq('telegram_id', telegram_id)
            
            // Increment referrer's referral_count
            const newCount = (referrer.referral_count || 0) + 1
            await supabase.from('users')
              .update({ referral_count: newCount })
              .eq('telegram_id', referrer.telegram_id)
            
            console.log(`[Referral] Updated referrer ${referrer.telegram_id} count to ${newCount}`)
          }
        }
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

    // Update user's referral_count if different
    if (referralCount !== null && referralCount !== user.referral_count) {
      await supabase.from('users')
        .update({ referral_count: referralCount })
        .eq('telegram_id', telegram_id)
      user.referral_count = referralCount
    }

    // Get subscribed channels
    const { data: subscriptions } = await supabase
      .from('channel_subscriptions')
      .select('channel_task_id')
      .eq('user_telegram_id', telegram_id)

    // Get today's ad count
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const { count: adsToday } = await supabase
      .from('ad_views')
      .select('*', { count: 'exact', head: true })
      .eq('user_telegram_id', telegram_id)
      .gte('viewed_at', today.toISOString())

    // Check admin
    const { data: adminCheck } = await supabase
      .from('admin_users')
      .select('telegram_id')
      .eq('telegram_id', telegram_id)
      .maybeSingle()

    return new Response(JSON.stringify({
      user: {
        ...user,
        referral_count: referralCount || user.referral_count || 0,
      },
      isAdmin: !!adminCheck,
      subscribedChannels: subscriptions?.map(s => s.channel_task_id) || [],
      adsToday: adsToday || 0,
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
