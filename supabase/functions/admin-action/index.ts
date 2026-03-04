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

    const body = await req.json()
    const { action, telegram_id } = body

    // Verify admin
    const { data: adminCheck } = await supabase
      .from('admin_users')
      .select('telegram_id')
      .eq('telegram_id', telegram_id)
      .maybeSingle()

    if (!adminCheck) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    let result: Record<string, unknown> = { success: true }

    switch (action) {
      case 'get_stats': {
        const { count: totalUsers } = await supabase
          .from('users').select('*', { count: 'exact', head: true })

        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const { count: todayUsers } = await supabase
          .from('users').select('*', { count: 'exact', head: true })
          .gte('created_at', today.toISOString())

        const { count: totalAds } = await supabase
          .from('ad_views').select('*', { count: 'exact', head: true })

        const { count: todayAds } = await supabase
          .from('ad_views').select('*', { count: 'exact', head: true })
          .gte('viewed_at', today.toISOString())

        const { count: totalReferrals } = await supabase
          .from('referrals').select('*', { count: 'exact', head: true })

        const { count: pendingWithdrawals } = await supabase
          .from('withdrawal_requests').select('*', { count: 'exact', head: true })
          .eq('status', 'pending')

        result = {
          totalUsers: totalUsers || 0,
          todayUsers: todayUsers || 0,
          totalAds: totalAds || 0,
          todayAds: todayAds || 0,
          totalReferrals: totalReferrals || 0,
          pendingWithdrawals: pendingWithdrawals || 0,
        }
        break
      }

      case 'find_user': {
        const { target_telegram_id } = body
        if (!target_telegram_id) {
          result = { success: false, error: 'target_telegram_id required' }
          break
        }

        const { data: user } = await supabase
          .from('users')
          .select('*')
          .eq('telegram_id', target_telegram_id)
          .maybeSingle()

        if (!user) {
          result = { success: false, error: 'User not found' }
        } else {
          result = { success: true, user }
        }
        break
      }

      case 'modify_user_coins': {
        const { target_telegram_id, amount, operation } = body
        if (!target_telegram_id || !amount || !operation) {
          result = { success: false, error: 'Missing required fields' }
          break
        }

        const parsedAmount = parseInt(amount)
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
          result = { success: false, error: 'Invalid amount' }
          break
        }

        const { data: targetUser } = await supabase
          .from('users')
          .select('*')
          .eq('telegram_id', target_telegram_id)
          .maybeSingle()

        if (!targetUser) {
          result = { success: false, error: 'User not found' }
          break
        }

        let newCoins = targetUser.coins || 0
        if (operation === 'add') {
          newCoins += parsedAmount
        } else if (operation === 'subtract') {
          newCoins = Math.max(0, newCoins - parsedAmount)
        } else {
          result = { success: false, error: 'Invalid operation' }
          break
        }

        await supabase.from('users')
          .update({ coins: newCoins })
          .eq('telegram_id', target_telegram_id)

        const { data: updatedUser } = await supabase
          .from('users')
          .select('*')
          .eq('telegram_id', target_telegram_id)
          .maybeSingle()

        result = { success: true, user: updatedUser }
        break
      }

      case 'get_withdrawals': {
        const { data: withdrawals } = await supabase
          .from('withdrawal_requests')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50)

        const telegramIds = [...new Set(withdrawals?.map((w: any) => w.user_telegram_id) || [])]
        const { data: users } = await supabase
          .from('users')
          .select('telegram_id, username, first_name, last_name')
          .in('telegram_id', telegramIds.length > 0 ? telegramIds : [0])

        const enriched = withdrawals?.map((w: any) => ({
          ...w,
          user: users?.find((u: any) => u.telegram_id === w.user_telegram_id),
        }))

        result = { withdrawals: enriched || [] }
        break
      }

      case 'process_withdrawal': {
        const { withdrawal_id, status, rejection_reason } = body
        const validStatuses = ['processing', 'paid', 'rejected']
        
        if (!withdrawal_id || !validStatuses.includes(status)) {
          result = { success: false, error: 'Invalid params' }
          break
        }

        const { data: withdrawal } = await supabase
          .from('withdrawal_requests')
          .select('*')
          .eq('id', withdrawal_id)
          .single()

        if (!withdrawal) {
          result = { success: false, error: 'Withdrawal not found' }
          break
        }

        const allowedTransitions: Record<string, string[]> = {
          pending: ['processing', 'rejected'],
          processing: ['paid', 'rejected'],
        }

        if (!allowedTransitions[withdrawal.status]?.includes(status)) {
          result = { success: false, error: `Cannot change from ${withdrawal.status} to ${status}` }
          break
        }

        if (status === 'rejected') {
          if (!rejection_reason?.trim()) {
            result = { success: false, error: 'Rejection reason required' }
            break
          }

          const { data: wUser } = await supabase
            .from('users')
            .select('coins')
            .eq('telegram_id', withdrawal.user_telegram_id)
            .single()

          if (wUser) {
            await supabase.from('users')
              .update({ coins: (wUser.coins || 0) + withdrawal.amount_coins })
              .eq('telegram_id', withdrawal.user_telegram_id)
          }

          await supabase.from('withdrawal_requests')
            .update({
              status: 'rejected',
              rejection_reason: rejection_reason.trim(),
              processed_at: new Date().toISOString(),
            })
            .eq('id', withdrawal_id)
        } else {
          const updateData: Record<string, unknown> = { status }
          if (status === 'paid') {
            updateData.processed_at = new Date().toISOString()
          }

          await supabase.from('withdrawal_requests')
            .update(updateData)
            .eq('id', withdrawal_id)
        }

        result = { success: true }
        break
      }

      case 'update_setting': {
        const { key, value } = body
        if (!key || value === undefined) {
          result = { success: false, error: 'key and value required' }
          break
        }

        await supabase.from('app_settings')
          .update({ value: String(value), updated_at: new Date().toISOString() })
          .eq('key', key)

        result = { success: true }
        break
      }

      case 'add_channel': {
        const { name, username, reward } = body
        if (!name || !username) {
          result = { success: false, error: 'name and username required' }
          break
        }

        const { data: channel } = await supabase.from('channel_tasks')
          .insert({ name, username, reward: reward || 100 })
          .select()
          .single()

        result = { success: true, channel }
        break
      }

      case 'remove_channel': {
        const { channel_id } = body
        await supabase.from('channel_tasks')
          .delete()
          .eq('id', channel_id)

        result = { success: true }
        break
      }

      case 'get_channels': {
        const { data: channels } = await supabase
          .from('channel_tasks')
          .select('*')
          .order('created_at', { ascending: false })

        result = { channels: channels || [] }
        break
      }

      case 'set_user_level': {
        const { target_telegram_id, referral_count } = body
        if (target_telegram_id === undefined || referral_count === undefined) {
          result = { success: false, error: 'target_telegram_id and referral_count required' }
          break
        }

        const parsedCount = parseInt(referral_count)
        if (isNaN(parsedCount) || parsedCount < 0) {
          result = { success: false, error: 'Invalid referral_count' }
          break
        }

        const { data: targetUser } = await supabase
          .from('users')
          .select('*')
          .eq('telegram_id', target_telegram_id)
          .maybeSingle()

        if (!targetUser) {
          result = { success: false, error: 'User not found' }
          break
        }

        await supabase.from('users')
          .update({ referral_count: parsedCount })
          .eq('telegram_id', target_telegram_id)

        const { data: updatedUser } = await supabase
          .from('users')
          .select('*')
          .eq('telegram_id', target_telegram_id)
          .maybeSingle()

        result = { success: true, user: updatedUser }
        break
      }

      case 'get_games': {
        const { data: games } = await supabase
          .from('game_settings')
          .select('*')
          .order('sort_order', { ascending: true })

        result = { games: games || [] }
        break
      }

      case 'update_game': {
        const { game_id, bet_amount, reward_amount, active } = body
        if (!game_id) {
          result = { success: false, error: 'game_id required' }
          break
        }

        const updateData: Record<string, unknown> = {}
        if (bet_amount !== undefined) updateData.bet_amount = parseInt(bet_amount)
        if (reward_amount !== undefined) updateData.reward_amount = parseInt(reward_amount)
        if (active !== undefined) updateData.active = active

        await supabase.from('game_settings')
          .update(updateData)
          .eq('id', game_id)

        const { data: updatedGame } = await supabase
          .from('game_settings')
          .select('*')
          .eq('id', game_id)
          .single()

        result = { success: true, game: updatedGame }
        break
      }

      case 'reorder_game': {
        const { game_id, direction } = body
        if (!game_id || !direction) {
          result = { success: false, error: 'game_id and direction required' }
          break
        }

        const { data: allGames } = await supabase
          .from('game_settings')
          .select('id, sort_order')
          .order('sort_order', { ascending: true })

        if (!allGames || allGames.length < 2) {
          result = { success: false, error: 'Not enough games to reorder' }
          break
        }

        const idx = allGames.findIndex((g: any) => g.id === game_id)
        if (idx === -1) {
          result = { success: false, error: 'Game not found' }
          break
        }

        const swapIdx = direction === 'up' ? idx - 1 : idx + 1
        if (swapIdx < 0 || swapIdx >= allGames.length) {
          result = { success: false, error: 'Cannot move further' }
          break
        }

        // Swap sort_orders
        const currentOrder = allGames[idx].sort_order
        const swapOrder = allGames[swapIdx].sort_order

        await supabase.from('game_settings')
          .update({ sort_order: swapOrder })
          .eq('id', allGames[idx].id)

        await supabase.from('game_settings')
          .update({ sort_order: currentOrder })
          .eq('id', allGames[swapIdx].id)

        result = { success: true }
        break
      }

      case 'get_admin_promos': {
        const { data: promos } = await supabase
          .from('admin_promo_codes')
          .select('*')
          .order('created_at', { ascending: false })

        result = { promos: promos || [] }
        break
      }

      case 'create_admin_promo': {
        const { code, coins_reward, max_uses, expires_hours } = body
        if (!code || !code.trim()) {
          result = { success: false, error: 'Promokod kiritilmagan' }
          break
        }

        const cleanCode = code.trim().toUpperCase()

        // Check uniqueness across both tables
        const { data: existingAdmin } = await supabase
          .from('admin_promo_codes')
          .select('id')
          .eq('code', cleanCode)
          .maybeSingle()

        const { data: existingUser } = await supabase
          .from('promo_codes')
          .select('id')
          .eq('code', cleanCode)
          .maybeSingle()

        if (existingAdmin || existingUser) {
          result = { success: false, error: 'Bu kod allaqachon mavjud' }
          break
        }

        const expiresAt = new Date(Date.now() + (parseInt(expires_hours) || 24) * 60 * 60 * 1000).toISOString()

        await supabase.from('admin_promo_codes').insert({
          code: cleanCode,
          coins_reward: parseInt(coins_reward) || 50,
          max_uses: parseInt(max_uses) || 1,
          expires_at: expiresAt,
          created_by_telegram_id: telegram_id,
        })

        result = { success: true }
        break
      }

      case 'toggle_admin_promo': {
        const { promo_id, active } = body
        if (!promo_id) {
          result = { success: false, error: 'promo_id required' }
          break
        }
        await supabase.from('admin_promo_codes')
          .update({ active })
          .eq('id', promo_id)
        result = { success: true }
        break
      }

      case 'delete_admin_promo': {
        const { promo_id } = body
        if (!promo_id) {
          result = { success: false, error: 'promo_id required' }
          break
        }
        await supabase.from('admin_promo_codes')
          .delete()
          .eq('id', promo_id)
        result = { success: true }
        break
      }

      case 'get_bonus_day_users': {
        const { data: bonusUsers } = await supabase
          .from('users')
          .select('telegram_id, username, first_name, last_name, bonus_coins')
          .gt('bonus_coins', 0)
          .order('bonus_coins', { ascending: false })
          .limit(200)

        result = { success: true, users: bonusUsers || [] }
        break
      }

      case 'toggle_bonus_day': {
        const { active } = body
        await supabase.from('app_settings')
          .update({ value: active ? 'true' : 'false', updated_at: new Date().toISOString() })
          .eq('key', 'bonus_day_active')
        result = { success: true }
        break
      }

      case 'convert_bonus_coins': {
        const { target_telegram_id, amount } = body
        if (!target_telegram_id || !amount) {
          result = { success: false, error: 'target_telegram_id and amount required' }
          break
        }

        const parsedAmt = parseInt(amount)
        if (isNaN(parsedAmt) || parsedAmt <= 0) {
          result = { success: false, error: 'Invalid amount' }
          break
        }

        const { data: targetUser } = await supabase
          .from('users')
          .select('coins, bonus_coins')
          .eq('telegram_id', target_telegram_id)
          .maybeSingle()

        if (!targetUser) {
          result = { success: false, error: 'User not found' }
          break
        }

        if ((targetUser.bonus_coins || 0) < parsedAmt) {
          result = { success: false, error: 'Bonus tanga yetarli emas' }
          break
        }

        await supabase.from('users')
          .update({
            coins: (targetUser.coins || 0) + parsedAmt,
            bonus_coins: (targetUser.bonus_coins || 0) - parsedAmt,
          })
          .eq('telegram_id', target_telegram_id)

        const { data: updatedUser } = await supabase
          .from('users')
          .select('*')
          .eq('telegram_id', target_telegram_id)
          .maybeSingle()

        result = { success: true, user: updatedUser }
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