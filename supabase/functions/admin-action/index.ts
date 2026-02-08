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

      case 'get_withdrawals': {
        const { data: withdrawals } = await supabase
          .from('withdrawal_requests')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50)

        const telegramIds = [...new Set(withdrawals?.map((w: any) => w.user_telegram_id) || [])]
        const { data: users } = await supabase
          .from('users')
          .select('telegram_id, username, first_name')
          .in('telegram_id', telegramIds.length > 0 ? telegramIds : [0])

        const enriched = withdrawals?.map((w: any) => ({
          ...w,
          user: users?.find((u: any) => u.telegram_id === w.user_telegram_id),
        }))

        result = { withdrawals: enriched || [] }
        break
      }

      case 'process_withdrawal': {
        const { withdrawal_id, status } = body
        if (!withdrawal_id || !['approved', 'rejected'].includes(status)) {
          result = { success: false, error: 'Invalid params' }
          break
        }

        if (status === 'rejected') {
          const { data: withdrawal } = await supabase
            .from('withdrawal_requests')
            .select('*')
            .eq('id', withdrawal_id)
            .single()

          if (withdrawal) {
            const { data: wUser } = await supabase
              .from('users')
              .select('coins')
              .eq('telegram_id', withdrawal.user_telegram_id)
              .single()

            if (wUser) {
              await supabase.from('users')
                .update({ coins: wUser.coins + withdrawal.amount_coins })
                .eq('telegram_id', withdrawal.user_telegram_id)
            }
          }
        }

        await supabase.from('withdrawal_requests')
          .update({ status, processed_at: new Date().toISOString() })
          .eq('id', withdrawal_id)

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
