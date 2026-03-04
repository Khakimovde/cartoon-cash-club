import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!
const ADMIN_ID = 5326022510
const WEB_APP_URL = 'https://cartoon-cash-club.lovable.app'

interface TelegramUpdate {
  update_id: number
  message?: {
    message_id: number
    from: {
      id: number
      first_name: string
      last_name?: string
      username?: string
    }
    chat: {
      id: number
      type: string
    }
    text?: string
    date: number
  }
}

async function sendMessage(chatId: number, text: string, replyMarkup?: Record<string, unknown>) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`
  
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML',
  }
  
  if (replyMarkup) {
    body.reply_markup = replyMarkup
  }
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  
  const result = await response.json()
  console.log('Send message result:', JSON.stringify(result))
  return result
}

async function handleStart(chatId: number, userId: number, firstName: string, startParam?: string) {
  const welcomeText = `🎉 <b>Xush kelibsiz, ${firstName}!</b>

💰 <b>AdoraPay</b> ilovasiga xush kelibsiz!

Bu yerda siz quyidagi usullar bilan pul ishlashingiz mumkin:

📺 <b>Reklama ko'rish</b> - Har bir reklama uchun tangalar oling
📢 <b>Kanallarga obuna</b> - Bonus tangalar yutib oling  
👥 <b>Do'stlarni taklif qilish</b> - Referal daromad oling

Tayyor bo'lsangiz, quyidagi tugmani bosing! 👇`

  // Build web app URL with referral code if present
  let webAppUrl = WEB_APP_URL
  // Pass ref code as URL parameter so it's available when Mini App opens via inline button
  if (startParam) {
    webAppUrl += `?ref=${encodeURIComponent(startParam)}`
  }

  // Pass ref code in mini-app URL so useTelegram can pick it up
  let miniAppUrl = 'https://698888fe460c6.xvest5.ru'
  if (startParam) {
    miniAppUrl += `?ref=${encodeURIComponent(startParam)}`
  }

  const keyboard = {
    inline_keyboard: [
      [
        {
          text: '🍂 Pul ishlash',
          web_app: { url: miniAppUrl }
        }
      ],
      [
        {
          text: '💌 Aloqa uchun',
          url: 'https://t.me/AdoraChat_bot'
        }
      ]
    ]
  }

  await sendMessage(chatId, welcomeText, keyboard)
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const update: TelegramUpdate = await req.json()
    console.log('Received update:', JSON.stringify(update))

    if (update.message?.text) {
      const chatId = update.message.chat.id
      const userId = update.message.from.id
      const firstName = update.message.from.first_name
      const text = update.message.text

      if (text === '/start' || text.startsWith('/start ')) {
        const startParam = text.startsWith('/start ') ? text.substring(7).trim() : undefined
        console.log(`[Bot] Start command from ${userId}, param: ${startParam}`)
        await handleStart(chatId, userId, firstName, startParam)
      } else if (text === '/bonusday' && userId === ADMIN_ID) {
        // Admin command: show all bonus day earners
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        )
        const { data: bonusUsers } = await supabase
          .from('users')
          .select('telegram_id, username, first_name, last_name, bonus_coins')
          .gt('bonus_coins', 0)
          .order('bonus_coins', { ascending: false })
          .limit(100)

        if (!bonusUsers || bonusUsers.length === 0) {
          await sendMessage(chatId, '📊 <b>Bonus Day</b>\n\nHali hech kim bonus tanga ishlamagan.')
        } else {
          let msg = `📊 <b>Bonus Day - Ishtirokchilar</b>\n\n`
          msg += `Jami: <b>${bonusUsers.length}</b> ta foydalanuvchi\n\n`
          bonusUsers.forEach((u: any, i: number) => {
            const name = u.first_name || u.username || 'Noma\'lum'
            const uname = u.username ? `@${u.username}` : '-'
            msg += `${i + 1}. <b>${name}</b> (${uname})\n   ID: <code>${u.telegram_id}</code> | ⭐ <b>${u.bonus_coins}</b> bonus\n\n`
          })
          await sendMessage(chatId, msg)
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
