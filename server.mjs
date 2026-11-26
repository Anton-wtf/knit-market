import 'dotenv/config'
import { Bot } from 'grammy'

// Получаем секретный токен из файла .env
const token = process.env.BOT_TOKEN

if (!token) {
  console.error('Ошибка: не найден BOT_TOKEN в файле .env')
  process.exit(1)
}

// Создаём Telegram-бота
const bot = new Bot(token)

// Ответ на команду /start
bot.command('start', async (ctx) => {
  await ctx.reply(
    'Привет! Добро пожаловать в KNIT MARKET 🧶\n\n' +
    'Здесь тебя ждут уютные вещи, связанные с любовью!\n\n' +
    'Совсем скоро ты сможешь выбрать любимое изделие ' +
    'и оформить заказ прямо здесь. ♡'
  )
})

// Ответ на команду /help
bot.command('help', async (ctx) => {
  await ctx.reply(
    'KNIT MARKET всегда рад тебе! 💗\n\n' +
    'Скоро здесь появится возможность открыть наш магазин ' +
    'и оформить заказ.'
  )
})

// Обработка ошибок
bot.catch((error) => {
  console.error('Ошибка Telegram-бота:', error)
})

// Запускаем бота
bot.start()

console.log('KNIT MARKET запущен! 🧶')