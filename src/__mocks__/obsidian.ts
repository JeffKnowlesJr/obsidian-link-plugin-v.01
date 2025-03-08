// Mock moment implementation that doesn't rely on Jest
export const moment = function (date?: any) {
  return {
    format: function (format?: string) {
      return format ? `formatted-${format}` : 'formatted-date'
    },
    add: function (value: any, unit: any) {
      return this
    },
    subtract: function (value: any, unit: any) {
      return this
    },
    isValid: function () {
      return true
    }
  }
}

moment.now = function () {
  return 'now'
}

// Mock classes
export class WorkspaceLeaf {
  view: any = {}

  open() {
    return Promise.resolve()
  }
  getViewState() {
    return {}
  }
  setViewState() {
    return Promise.resolve()
  }
}

export class Plugin {
  settings: any = {}

  loadData() {
    return Promise.resolve({})
  }
  saveData() {
    return Promise.resolve()
  }
  registerEvent() {}
  registerInterval() {}
  registerDomEvent() {}
  addRibbonIcon() {}
  addStatusBarItem() {}
  addCommand() {}
  addSettingTab() {}
}

export class TFile {
  path: string
  basename: string
  extension: string

  constructor(path: string) {
    this.path = path
    const parts = path.split('.')
    this.extension = parts.pop() || ''
    this.basename = parts.join('.')
  }
}

export class TFolder {
  path: string
  children: (TFile | TFolder)[] = []

  constructor(path: string) {
    this.path = path
  }
}

export class Notice {
  constructor(message: string) {
    console.log(`Notice: ${message}`)
  }
}

export class Modal {
  open() {}
  close() {}
  onOpen() {}
  onClose() {}
}

export class Setting {
  containerEl: HTMLElement = document.createElement('div')

  setName() {
    return this
  }
  setDesc() {
    return this
  }
  addText() {
    return this
  }
  addToggle() {
    return this
  }
  addButton() {
    return this
  }
  addDropdown() {
    return this
  }
  addSlider() {
    return this
  }
}

// Mock interfaces
export interface App {
  workspace: {
    activeLeaf: WorkspaceLeaf
    getLeaf(): WorkspaceLeaf
  }
  vault: {
    getAbstractFileByPath(path: string): TFile | TFolder | null
    adapter: {
      read(path: string): Promise<string>
      write(path: string, data: string): Promise<void>
      exists(path: string): Promise<boolean>
    }
    createFolder(path: string): Promise<TFolder>
    delete(file: TFile | TFolder): Promise<void>
    create(path: string, data: string): Promise<TFile>
  }
  metadataCache: {
    getFileCache(file: TFile): any
  }
}

export const createApp = (): App => ({
  workspace: {
    activeLeaf: new WorkspaceLeaf(),
    getLeaf: () => new WorkspaceLeaf()
  },
  vault: {
    getAbstractFileByPath: () => null,
    adapter: {
      read: () => Promise.resolve(''),
      write: () => Promise.resolve(),
      exists: () => Promise.resolve(false)
    },
    createFolder: () => Promise.resolve(new TFolder('')),
    delete: () => Promise.resolve(),
    create: () => Promise.resolve(new TFile(''))
  },
  metadataCache: {
    getFileCache: () => ({})
  }
})
