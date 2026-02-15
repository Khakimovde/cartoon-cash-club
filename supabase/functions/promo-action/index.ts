import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

function generatePromoCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// Get the current 30-min window start: :00 or :30 of current hour
function getWindowStart(): Date {
  const now = new Date()
  const minutes = now.getMinutes() >= 30 ? 30 : 0
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), minutes, 0, 0)
}

// Get the next 30-min boundary: :00 or :30
function getWindowEnd(): number {
  const now = new Date()
  const nextMinutes = now.getMinutes() >= 30 ? 0 : 30
  const nextHour = now.getMinutes() >= 30 ? now.getHours() + 1 : now.getHours()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), nextHour, nextMinutes, 0, 0).getTime()
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

    let result: Record<string, unknown> = { success: true }

    switch (action) {
      case 'watch_promo_ad': {
        const windowStart = getWindowStart().toISOString()
        const maxAds = 10

        const { count } = await supabase
          .from('promo_ad_views')
          .select('*', { count: 'exact', head: true })
          .eq('user_telegram_id', telegram_id)
          .gte('viewed_at', windowStart)

        const currentCount = count || 0
        if (currentCount >= maxAds) {
          result = { success: false, error: 'Limit tugadi' }
          break
        }

        await supabase.from('promo_ad_views').insert({
          user_telegram_id: telegram_id,
        })

        const newCount = currentCount + 1
        const isComplete = newCount >= maxAds

        if (isComplete) {
          let code = generatePromoCode()
          let attempts = 0
          while (attempts < 5) {
            const { data: existing } = await supabase
              .from('promo_codes')
              .select('id')
              .eq('code', code)
              .maybeSingle()
            if (!existing) break
            code = generatePromoCode()
            attempts++
          }

          const reward = Math.floor(Math.random() * 41) + 10

          await supabase.from('promo_codes').insert({
            code,
            coins_reward: reward,
            created_by_telegram_id: telegram_id,
          })

          result = { success: true, ads_count: newCount, completed: true, promo_code: code }
        } else {
          result = { success: true, ads_count: newCount, completed: false }
        }
        break
      }

      case 'get_promo_status': {
        const windowStart = getWindowStart().toISOString()
        const { count } = await supabase
          .from('promo_ad_views')
          .select('*', { count: 'exact', head: true })
          .eq('user_telegram_id', telegram_id)
          .gte('viewed_at', windowStart)

        // Cooldown = next :00 or :30 boundary
        let cooldownEnd = 0
        if ((count || 0) >= 10) {
          cooldownEnd = getWindowEnd()
        }

        // Get user's latest generated (unused by others) promo code
        const { data: latestPromo } = await supabase
          .from('promo_codes')
          .select('*')
          .eq('created_by_telegram_id', telegram_id)
          .is('used_by_telegram_id', null)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1)

        result = {
          success: true,
          ads_count: count || 0,
          cooldown_end: cooldownEnd,
          active_promo: latestPromo?.[0] || null,
        }
        break
      }

      case 'redeem_promo': {
        const { code } = body
        if (!code || typeof code !== 'string' || code.trim().length === 0) {
          result = { success: false, error: 'Promokod kiritilmagan' }
          break
        }

        const cleanCode = code.trim().toUpperCase()

        // First check admin promo codes
        const { data: adminPromo } = await supabase
          .from('admin_promo_codes')
          .select('*')
          .eq('code', cleanCode)
          .eq('active', true)
          .maybeSingle()

        if (adminPromo) {
          // Check expiry
          if (new Date(adminPromo.expires_at) < new Date()) {
            result = { success: false, error: "Promokod muddati o'tgan" }
            break
          }
          // Check max uses
          if (adminPromo.used_count >= adminPromo.max_uses) {
            result = { success: false, error: 'Bu promokod allaqachon ishlatilgan' }
            break
          }
          // Check if this user already used it
          const { data: existingUse } = await supabase
            .from('admin_promo_redemptions')
            .select('id')
            .eq('promo_code_id', adminPromo.id)
            .eq('user_telegram_id', telegram_id)
            .maybeSingle()

          if (existingUse) {
            result = { success: false, error: 'Siz bu promokodni allaqachon ishlatgansiz' }
            break
          }

          // Redeem
          await supabase.from('admin_promo_redemptions').insert({
            promo_code_id: adminPromo.id,
            user_telegram_id: telegram_id,
            coins_earned: adminPromo.coins_reward,
          })

          await supabase.from('admin_promo_codes')
            .update({ used_count: adminPromo.used_count + 1 })
            .eq('id', adminPromo.id)

          // Add coins
          const { data: user } = await supabase
            .from('users')
            .select('coins')
            .eq('telegram_id', telegram_id)
            .single()

          if (user) {
            await supabase.from('users')
              .update({ coins: (user.coins || 0) + adminPromo.coins_reward })
              .eq('telegram_id', telegram_id)
          }

          // Save to history
          await supabase.from('promo_history').insert({
            user_telegram_id: telegram_id,
            code: cleanCode,
            coins_earned: adminPromo.coins_reward,
            source: 'admin',
          })

          result = { success: true, coins_earned: adminPromo.coins_reward }
          break
        }

        // Then check user promo codes
        const { data: promo } = await supabase
          .from('promo_codes')
          .select('*')
          .eq('code', cleanCode)
          .maybeSingle()

        if (!promo) {
          result = { success: false, error: 'Promokod topilmadi yoki xato' }
          break
        }

        if (new Date(promo.expires_at) < new Date()) {
          await supabase.from('promo_codes').delete().eq('id', promo.id)
          result = { success: false, error: "Promokod muddati o'tgan" }
          break
        }

        if (promo.used_by_telegram_id) {
          result = { success: false, error: 'Bu promokod allaqachon ishlatilgan' }
          break
        }

        // Allow own code usage now
        // Mark as used
        await supabase.from('promo_codes')
          .update({ used_by_telegram_id: telegram_id, used_at: new Date().toISOString() })
          .eq('id', promo.id)

        // Add coins
        const { data: user } = await supabase
          .from('users')
          .select('coins')
          .eq('telegram_id', telegram_id)
          .single()

        if (user) {
          await supabase.from('users')
            .update({ coins: (user.coins || 0) + promo.coins_reward })
            .eq('telegram_id', telegram_id)
        }

        // Save to history
        await supabase.from('promo_history').insert({
          user_telegram_id: telegram_id,
          code: cleanCode,
          coins_earned: promo.coins_reward,
          source: promo.created_by_telegram_id === telegram_id ? 'own' : 'user',
        })

        // Delete the promo code after use
        await supabase.from('promo_codes').delete().eq('id', promo.id)

        result = { success: true, coins_earned: promo.coins_reward }
        break
      }

      case 'get_promo_history': {
        const { data: history } = await supabase
          .from('promo_history')
          .select('*')
          .eq('user_telegram_id', telegram_id)
          .order('redeemed_at', { ascending: false })
          .limit(50)

        result = { success: true, history: history || [] }
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
