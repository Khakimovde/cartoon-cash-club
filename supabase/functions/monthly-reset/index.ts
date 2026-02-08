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

    // Optional: verify this is called by admin or cron
    const body = await req.json().catch(() => ({}))
    const { telegram_id } = body

    // If telegram_id provided, verify admin
    if (telegram_id) {
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
    }

    console.log('[Monthly Reset] Starting monthly reset...')

    // Reset all users' referral_count, referral_earnings
    const { error: resetError } = await supabase
      .from('users')
      .update({
        referral_count: 0,
        referral_earnings: 0,
      })
      .gte('telegram_id', 0) // match all users

    if (resetError) {
      console.error('[Monthly Reset] Error resetting users:', resetError)
      throw resetError
    }

    // Clear referrals table for new month
    const { error: clearRefError } = await supabase
      .from('referrals')
      .delete()
      .gte('created_at', '2000-01-01') // delete all

    if (clearRefError) {
      console.error('[Monthly Reset] Error clearing referrals:', clearRefError)
    }

    // Clear ad_views for new month
    const { error: clearAdsError } = await supabase
      .from('ad_views')
      .delete()
      .gte('viewed_at', '2000-01-01') // delete all

    if (clearAdsError) {
      console.error('[Monthly Reset] Error clearing ad views:', clearAdsError)
    }

    console.log('[Monthly Reset] Monthly reset completed successfully')

    return new Response(JSON.stringify({
      success: true,
      message: 'Monthly reset completed. Referral counts, earnings, and leaderboard reset.',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Monthly Reset] Error:', msg)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
