const TelegramBot = require('node-telegram-bot-api')
const { TELEGRAM_TOKEN } = require("./const")
const { exec } = require('child_process')

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true })

const allowUsersId = [
    448873904,
]

bot.on('message', async ({ from, text, chat }) => {
    const send = async (text) => {
        await bot.sendMessage(chat.id, text)
    }

    async function startAssert() {
        exec('npm run parser:start', async (error, stdout, stderr) => {
            if (error) {
                console.error('Ошибка при выполнении команды:', error.message)
                await send('Ошибка при выполнении команды. Обратитесь к @yesfedor для исправления ошибок.')
                return
            }
            if (stderr) {
                console.error('Ошибка в выводе:', stderr)
                await send('Ошибка в выводе. Обратитесь к @yesfedor для исправления ошибок.')
                return
            }
            try {
                const indexOf = stdout.indexOf('{')
                const { successPath } = JSON.parse(stdout.slice(indexOf))
                const prettyText = `Найдено ${ successPath.length } доступных для записи путей:\n ${ successPath.join(' \n --- \n ') }`
                await send(prettyText)
            } catch (e) {
                await send('Ошибка в работе парсера. Обратитесь к @yesfedor для исправления ошибок.')
            }
        })
    }

    if (!allowUsersId.includes(from.id)) {
        await send(`Пожалуйста, обратитесь к @yesfedor, для добавления в whitelist. Ваш id: ${from.id}`)
        return
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
            return
        case 'Запустить проверку 🚀🚀🚀':
            await send('Ваш запрос был получен и будет обработан в ближайшее время (5-10 мин)')
            await startAssert()
            return
    }

    await send(`${text}`)
})
