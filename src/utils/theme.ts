import type { MindElixirInstance } from '../types/index'
import type { Theme } from '../types/index'

const changeTheme = function (this: MindElixirInstance, theme: Theme, shouldRefresh = true) {
  this.theme = theme
  const cssVar = this.theme.cssVar
  const keys = Object.keys(cssVar)
  this.container.style.cssText = ''
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i] as keyof typeof cssVar
    this.container.style.setProperty(key, cssVar[key] as string)
  }
  if (!theme.cssVar['--gap']) {
    this.container.style.setProperty('--gap', '30px')
  }
  shouldRefresh && this.refresh()
}

export default changeTheme
