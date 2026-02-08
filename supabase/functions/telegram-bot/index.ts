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

  const keyboard = {
    inline_keyboard: [
      [
        {
          text: '💰 Pul ishlash',
          web_app: { url: webAppUrl }
        }
      ],
      [
        {
          text: '📞 Aloqa (Admin)',
          url: `tg://user?id=${ADMIN_ID}`
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
        // Extract start parameter (referral code)
        const startParam = text.startsWith('/start ') ? text.substring(7).trim() : undefined
        console.log(`[Bot] Start command from ${userId}, param: ${startParam}`)
        await handleStart(chatId, userId, firstName, startParam)
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
