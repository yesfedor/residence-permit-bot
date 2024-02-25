const path = require('node:path')
const chrome = require("selenium-webdriver/chrome")

const { Builder, By, Key, until } = require("selenium-webdriver")

async function mainStart() {
  let driver = await new Builder()
    .forBrowser("chrome")
    .setChromeService(
      chrome.setDefaultService(
        new chrome.ServiceBuilder(path.join(__dirname, 'drivers/chromedriver')).build()
      )
    )
    .build()

  async function timeout(ms) {
    await driver.sleep(ms)
  }

  try {
    const successPath = []

    await driver.get("https://siga.marcacaodeatendimento.pt/Marcacao/MarcacaoInicio")

    await driver
      .findElement(By.css(".div-button .btn-entidade-assunto"))
      .click()

    await timeout(2000)
    
    await driver
      .findElement(By.css('.btn-selecionar-entidade[alt="IRN Registo"]'))
      .click()

    await timeout(2000)

    // form:Tema
    await driver.findElement(By.css('[name="IdCategoria"]')).click()
    await driver.findElement(By.css('[value="22002"]')).click()
    await timeout(2000)

    // form:Subtema
    await driver.findElement(By.css('[name="IdSubcategoria"]')).click()
    await driver.findElement(By.css('[value="30825"]')).click()
    await timeout(2000)

    await driver.findElement(By.css('a.set-date-button')).click()
  
    await timeout(2000)

    async function checkResultAndBack(...args) {
      const path = args.join(' - ')
      await timeout(200)
      await driver.findElement(By.css('a.set-date-button')).click()
      await timeout(1000)

      await driver.findElement(By.css('.error-message h5')).catch(() => {
        successPath.push(path)
      })

      await stepBack()
    }

    async function stepBack() {
      await driver.findElement(By.css('#liVoltarButton .m-left')).click()
      await timeout(1000)
    }

    // Local de atendimento
    const distrito = await driver.findElement(By.css('[name="IdDistrito"]'))
    const distritoOptions = await distrito.findElements(By.css('option'))

    for (const element of distritoOptions) {
      const distritoText = await element.getText()
      const distritoValue = await element.getAttribute('value')
      if (!distritoText || !distritoValue) {
        continue
      }

      await distrito.click()
      await element.click()
      await timeout(1000)

      const localidade = await driver.findElement(By.css('[name="IdLocalidade"]'))
      const localidadeOptions = await localidade.findElements(By.css('option'))
      for (const elementLocalidadeOption of localidadeOptions) {
        const localidadeText = await elementLocalidadeOption.getText()
        const localidadeValue = await elementLocalidadeOption.getAttribute('value')
        if (!localidadeText || !localidadeValue) {
          continue
        }

        await localidade.click()
        await elementLocalidadeOption.click()
        await timeout(1000)

        const atendimento = await driver.findElement(By.css('[name="IdLocalAtendimento"]'))
        const atendimentoOptions = await atendimento.findElements(By.css('option'))
        const isDisabled = await atendimento.getAttribute('disabled')
        console.log('--- isDisabled:', isDisabled)

        if (!isDisabled) {
          for (const elementAtendimentoOption of atendimentoOptions) {
            const atendimentoText = await elementAtendimentoOption.getText()
            const atendimentoValue = await elementAtendimentoOption.getAttribute('value')
            if (!atendimentoText || !atendimentoValue) {
              continue
            }
            atendimento.click()
            elementAtendimentoOption.click()
            await timeout(1000)

            await checkResultAndBack(distritoText, localidadeText, atendimentoText)
          }
        } else {
          await checkResultAndBack(distritoText, localidadeText)
        }
      }
    }

    console.log('successPath: ', successPath)
  } finally {
    driver.quit()
  }
}

mainStart()
