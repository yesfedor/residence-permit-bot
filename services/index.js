const bot = require('../bot/bot')
const cacheManager = require('./cache')
const { exec } = require('child_process')

const cacheManagerInstance = cacheManager()

cacheManagerInstance.init()
cacheManagerInstance.updateStateItem('repeatInterval', 10 * 60 * 1000)
cacheManagerInstance.updateStateItem('allowUsersId', [
  448873904,
])
cacheManagerInstance.updateStateItem('schedulesByChatId', [])

async function send(chatId, text) {
  try {
    await bot.sendMessage(chatId, text)
  } catch (e) {
    cacheManagerInstance.updateStateItem(`user-have-ban-bot-${chatId}`, true)
  }
}

async function startAssert(chatId, interval = 0) {
  exec('npm run parser:start', async (error, stdout, stderr) => {
    if (error) {
      console.error('Ошибка при выполнении команды:', error.message)
      await send(chatId, 'Ошибка при выполнении команды. Обратитесь к @yesfedor для исправления ошибок.')
      return
    }
    if (stderr) {
      console.error('Ошибка в выводе:', stderr)
      await send(chatId, 'Ошибка в выводе. Обратитесь к @yesfedor для исправления ошибок.')
      return
    }
    try {
      const indexOf = stdout.indexOf('{')
      const { successPath } = JSON.parse(stdout.slice(indexOf))

      if (!interval) {
        const prettyText = `Найдено ${successPath.length} доступных для записи путей:\n ${successPath.join(' \n --- \n ')}`
        await send(chatId, prettyText)
        return
      }

      cacheManagerInstance.init()

      const schedule = cacheManagerInstance.getStateItem(`schedule`, [])
      // TODO: check statuses

      cacheManagerInstance.updateStateItem('schedule', successPath)
      const prettyText = `Найдено ${successPath.length} доступных для записи путей:\n ${successPath.join(' \n --- \n ')}`
      await send(chatId, prettyText)
    } catch (e) {
      await send(chatId, 'Ошибка в работе парсера. Обратитесь к @yesfedor для исправления ошибок.')
    }
  })
}

bot.on('message', async ({from, text, chat}) => {

  const allowUsersId = cacheManagerInstance.getStateItem('allowUsersId')
  if (!allowUsersId.includes(from.id)) {
    await send(chat.id, `Пожалуйста, обратитесь к @yesfedor, для добавления в whitelist. Ваш id: ${from.id}`)
    return false
  }

  switch (text) {
    case '/start':
      await bot.sendMessage(chat.id, 'Выберите действие:', {
        parse_mode: "MarkdownV2",
        reply_markup: JSON.stringify({
          keyboard: [
            ['Запустить проверку 🚀🚀🚀'],
          ],
          resize_keyboard: true,
        })
      })
      return true

    case 'Запустить проверку 🚀🚀🚀':
      await send(chat.id, 'Ваш запрос был получен и будет обработан через 5-10 минут')
      await startAssert(chat.id)
      return true

    case 'residence-permit:create a schedule':
      const schedulesByChatId = cacheManagerInstance.getStateItem('schedulesByChatId')
      if (schedulesByChatId.includes(chat.id)) {
        await send(chat.id, `В чате уже существует проверка по расписанию`)
        return true
      }

      const interval = setInterval(async () => {
        await send(chat.id, `Запущена проверка по расписанию - #${interval}`)
        await startAssert(chat.id, interval)
      }, cacheManagerInstance.getStateItem('repeatInterval'))

      await send(chat.id, `Создано новое расписание - #${interval}`)
      cacheManagerInstance.updateStateItem('schedulesByChatId', [
        ...schedulesByChatId,
        chat.id,
      ])
      return true
  }

  return true
})
