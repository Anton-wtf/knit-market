import 'dotenv/config'
import { Bot, InlineKeyboard } from 'grammy'
import { createServer } from 'node:http'
import { createHmac, timingSafeEqual } from 'node:crypto'

const token = process.env.BOT_TOKEN
const ownerId = process.env.OWNER_TELEGRAM_ID
const port = Number(process.env.PORT) || 3000

if (!token || !ownerId) {
  console.error('Ошибка: проверь BOT_TOKEN и OWNER_TELEGRAM_ID в .env')
  process.exit(1)
}

const bot = new Bot(token)

const shopKeyboard = new InlineKeyboard()
  .webApp('🧶 Открыть магазин', 'https://knit-market.vercel.app')

// Каталог и цены проверяются на сервере,
// а не берутся из данных, присланных покупателем.
const products = {
  1: { name: 'Цветочное настроение', price: 1500, sizes: ['35–37', '38–40', '41–43'], models: ['Розовые цветы', 'Молочные с ромашками', 'Вишнёвые полоски'] },
  2: { name: 'Вишнёвый десерт', price: 1600, sizes: ['35–37', '38–40', '41–43'], models: ['Вишенки', 'Красные сердечки', 'Бордовые полоски'] },
  3: { name: 'Облачный день', price: 2900, sizes: ['Короткий', 'Средний', 'Длинный'], models: ['Голубое облако', 'Молочный', 'Розово-голубой'] },
  4: { name: 'Клубничное молоко', price: 3200, sizes: ['Короткий', 'Средний', 'Длинный'], models: ['Клубничный', 'Розовый в полоску', 'Молочный с бантиками'] },
  5: { name: 'Sunday sweater', price: 7900, sizes: ['XS', 'S', 'M', 'L', 'XL'], models: ['Масляный жёлтый', 'Молочный', 'Розовый с узором'] },
  6: { name: 'Мятное облако', price: 8500, sizes: ['XS', 'S', 'M', 'L', 'XL'], models: ['Мятный', 'Шалфейный', 'Молочный с цветами'] },
}

bot.command('start', async (ctx) => {
  await ctx.reply(
    'Привет! Добро пожаловать в KNIT MARKET 🧶\n\n' +
    'Здесь тебя ждут уютные вещи, связанные с любовью! ♡\n\n' +
    'Нажми на кнопку ниже, чтобы перейти в наш магазин 💗',
    { reply_markup: shopKeyboard }
  )
})

bot.command('help', async (ctx) => {
  await ctx.reply(
    'KNIT MARKET всегда рад тебе! 💗\n\n' +
    'Нажми на кнопку ниже, чтобы открыть магазин.',
    { reply_markup: shopKeyboard }
  )
})

bot.command('myid', async (ctx) => {
  await ctx.reply(`Твой Telegram ID: ${ctx.from.id}`)
})

// Проверка подлинности данных Telegram Mini App
function verifyTelegramData(initData) {
  if (!initData) return null

  const params = new URLSearchParams(initData)
  const receivedHash = params.get('hash')

  if (!receivedHash) return null

  params.delete('hash')

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')

  const secretKey = createHmac('sha256', 'WebAppData')
    .update(token)
    .digest()

  const calculatedHash = createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex')

  const received = Buffer.from(receivedHash, 'hex')
  const calculated = Buffer.from(calculatedHash, 'hex')

  if (
    received.length !== calculated.length ||
    !timingSafeEqual(received, calculated)
  ) {
    return null
  }

  const authDate = Number(params.get('auth_date'))

  if (!authDate || Date.now() / 1000 - authDate > 86400) {
    return null
  }

  try {
    return JSON.parse(params.get('user') || 'null')
  } catch {
    return null
  }
}

// Защита от повторной отправки одного и того же заказа.
// Ключ хранится в памяти сервера 24 часа.
const processedOrders = new Map()

const allowedOrigins = new Set([
  'https://knit-market.vercel.app',
  'http://127.0.0.1:5173',
  'http://localhost:5173',
])

const server = createServer(async (req, res) => {
  const origin = req.headers.origin

  if (allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }

  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    return res.end()
  }

  if (req.method !== 'POST' || req.url !== '/api/orders') {
    res.writeHead(404)
    return res.end('Not found')
  }

  if (!allowedOrigins.has(origin)) {
    res.writeHead(403)
    return res.end('Forbidden origin')
  }

  try {
    let body = ''
    for await (const chunk of req) {
      body += chunk
      if (body.length > 20000) {
        res.writeHead(413)
        return res.end('Request too large')
      }
    }

    const data = JSON.parse(body)
    const user = verifyTelegramData(data.initData)

    if (!user || !user.id) {
      res.writeHead(401, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ error: 'Не удалось проверить Telegram-пользователя' }))
    }

    const orderRequestId = String(data.orderRequestId || '')

    if (!/^[0-9a-f-]{36}$/i.test(orderRequestId)) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ error: 'Не удалось определить номер заказа. Обнови страницу и попробуй ещё раз.' }))
    }

    const requestKey = `${user.id}:${orderRequestId}`
    const previousOrder = processedOrders.get(requestKey)

    if (previousOrder && previousOrder > Date.now()) {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ success: true, duplicate: true }))
    }

    const customerName = String(data.name || '').trim()
    const comment = String(data.comment || '').trim()
    const items = data.items

    if (!customerName || customerName.length > 80) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ error: 'Проверь имя покупателя' }))
    }

    if (comment.length > 500 || !Array.isArray(items) || items.length < 1 || items.length > 30) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ error: 'Проверь данные заказа' }))
    }

    let total = 0
    const orderLines = []

    for (const item of items) {
      const product = products[item.productId]
      const quantity = Number(item.quantity)

      if (
        !product ||
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > 20 ||
        !product.sizes.includes(item.size) ||
        !product.models.includes(item.model)
      ) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        return res.end(JSON.stringify({ error: 'В заказе есть некорректный товар' }))
      }

      const lineTotal = product.price * quantity
      total += lineTotal

      orderLines.push(
        `• ${product.name}\n` +
        `  ${item.size} · ${item.model}\n` +
        `  ${quantity} шт. × ${product.price.toLocaleString('ru-RU')} ₽ = ${lineTotal.toLocaleString('ru-RU')} ₽`
      )
    }

    const username = user.username
      ? `@${user.username}`
      : 'Не указан'

    const message =
      `🧶 НОВЫЙ ЗАКАЗ KNIT MARKET\n\n` +
      `👤 Имя: ${customerName}\n` +
      `💬 Telegram: ${username}\n` +
      `🆔 Telegram ID: ${user.id}\n\n` +
      `📦 СОСТАВ ЗАКАЗА:\n${orderLines.join('\n\n')}\n\n` +
      `💰 ИТОГО: ${total.toLocaleString('ru-RU')} ₽\n\n` +
      `📝 Комментарий: ${comment || 'Нет'}`

    // Запоминаем ключ до отправки сообщения, чтобы параллельные запросы
    // с тем же ключом не создали два уведомления.
    processedOrders.set(requestKey, Date.now() + 24 * 60 * 60 * 1000)

    try {
      await bot.api.sendMessage(ownerId, message)
    } catch (error) {
      processedOrders.delete(requestKey)
      throw error
    }

    // Периодически удаляем устаревшие ключи.
    for (const [key, expiresAt] of processedOrders) {
      if (expiresAt <= Date.now()) processedOrders.delete(key)
    }

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ success: true }))
  } catch (error) {
    console.error('Ошибка оформления заказа:', error)
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Не удалось отправить заказ' }))
  }
})

bot.catch((error) => {
  console.error('Ошибка Telegram-бота:', error)
})

bot.start()

server.listen(port, '0.0.0.0', () => {
  console.log(`KNIT MARKET: сервер запущен на порту ${port} 🧶`)
})
