const bot = require('../bot/bot')
const cacheManager = require('./cache')
const { exec } = require('child_process')

const cacheManagerInstance = cacheManager()

cacheManagerInstance.init()

cacheManagerInstance.getStateItem('repeatInterval', 10 * 60 * 1000)

cacheManagerInstance.getStateItem('allowUsersId', [
  448873904,
  5158846554,
])

cacheManagerInstance.getStateItem('schedulesByChatId', [])

cacheManagerInstance.updateStateItem('isRunning', false)

async function send(chatId, text) {
  try {
    await bot.sendMessage(chatId, text)
  } catch (e) {
    cacheManagerInstance.updateStateItem(`user-have-ban-bot-${chatId}`, true)
  }
}

async function startAssert(chatId, interval = 0) {
  cacheManagerInstance.init()

  const isRunning = cacheManagerInstance.getStateItem('isRunning', false)
  if (isRunning) {
    await send(chatId, 'Проверка уже запущена.')
    return
  }

  cacheManagerInstance.updateStateItem('isRunning', true)

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
      const { successPath, counterPath } = JSON.parse(stdout.slice(indexOf))

      if (!interval) {
        let prettyText = ``
        if (successPath.length) {
          prettyText = `Проверено путей: ${counterPath}. \n Найдено ${successPath.length} доступных для записи путей: \n ${successPath.join(' \n --- \n ')}`
        } else {
          prettyText = `Доступных для записи путей не найдено. Проверено путей: ${counterPath}`
        }

        await send(chatId, prettyText)
        return
      }

      cacheManagerInstance.init()

      const schedule = cacheManagerInstance.getStateItem(`schedule`, [])
      // TODO: check statuses

      cacheManagerInstance.updateStateItem('schedule', successPath)
      let prettyText = ``
      if (successPath.length) {
        prettyText = `Проверено путей: ${counterPath}. \n Найдено ${successPath.length} доступных для записи путей: \n ${successPath.join(' \n --- \n ')}`
      } else {
        prettyText = `Доступных для записи путей не найдено. Проверено путей: ${counterPath}`
      }
      await send(chatId, prettyText)
    } catch (e) {
      await send(chatId, 'Ошибка в работе парсера. Обратитесь к @yesfedor для исправления ошибок.')
    } finally {
      cacheManagerInstance.updateStateItem('isRunning', false)
    }
  })
}

bot.on('message', async ({from, text, chat}) => {
  const commands = {
    start: '/start',
    run: '/check',
    schedule: '/scheduled',
  }
  const commandsValues = Object.values(commands)

  if (!commandsValues.includes(text)) {
    return
  }

  const allowUsersId = cacheManagerInstance.getStateItem('allowUsersId')
  if (!allowUsersId.includes(from.id)) {
    await send(chat.id, `Пожалуйста, обратитесь к @yesfedor, для добавления в whitelist. Ваш id: ${from.id}`)
    return false
  }

  switch (text) {
    case commands.start:
      await bot.sendMessage(chat.id, 'Выберите действие:', {
        parse_mode: "MarkdownV2",
        reply_markup: JSON.stringify({
          keyboard: [
            ['Запустить проверку'],
          ],
          resize_keyboard: true,
        })
      })
      return true

    case commands.run:
      await send(chat.id, 'Ваш запрос был получен и будет обработан через 5-10 минут')
      await startAssert(chat.id)
      return true

    case commands.schedule:
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
