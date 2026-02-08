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