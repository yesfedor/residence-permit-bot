const fs = require('fs')
const path = require('path')

function cacheManager() {
  return {
    cache: {},

    scheme: {
      lastWriteAt: 'lastWriteAt',
      lastCheckAt: 'lastCheckAt',
      state: 'state',
      stateItem: 'item',
      stateItemKey: 'key',
      stateItemValue: 'value',
    },

    getFilePath: () => path.resolve(__dirname, '../cache/cache.json'),

    setDefaultState() {
      if (typeof this.cache[this.scheme.state] !== 'object') {
        this.cache[this.scheme.state] = []
      }
    },

    getStateItem(key, initialValue = null) {
      this.setDefaultState()

      const candidate = this.cache[this.scheme.state].find((item) => item[this.scheme.stateItemKey] === key)
      if (candidate) {
        return candidate[this.scheme.stateItemValue]
      }

      this.updateStateItem(key, initialValue)

      return initialValue
    },

    updateStateItem(key, value) {
      this.setDefaultState()

      this.cache[this.scheme.lastCheckAt] = Date.now()

      const candidate = this.cache[this.scheme.state].find((item) => item[this.scheme.stateItemKey] === key)
      if (candidate) {
        candidate[this.scheme.stateItemValue] = value
      } else {
        this.cache[this.scheme.state].push({
          [this.scheme.stateItemKey]: key,
          [this.scheme.stateItemValue]: value,
        })
      }

      this.save()
    },

    init() {
      const value = fs.readFileSync(this.getFilePath())
      this.cache = JSON.parse(value)
    },

    save() {
      this.cache[this.scheme.lastWriteAt] = Date.now()
      const value = JSON.stringify(this.cache)
      fs.writeFileSync(this.getFilePath(), value)
    },
  }
}

module.exports = cacheManager
