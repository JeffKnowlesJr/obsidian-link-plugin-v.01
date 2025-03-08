import {
  App,
  Modal,
  Setting,
  TextComponent,
  DropdownComponent,
  BaseComponent
} from 'obsidian'
import { getCurrentMoment, addDay } from '../utils/momentHelper'
import { BASE_FOLDERS } from '../utils/folderUtils'

interface NewNoteResult {
  name: string
  folder: string
  date?: moment.Moment
}

export class NewNoteModal extends Modal {
  result: NewNoteResult
  containers: {
    nameContainer?: HTMLDivElement
    folderContainer?: HTMLDivElement
    datePickerContainer?: HTMLDivElement
  }
  folderDropdown?: Setting
  nameInput?: HTMLInputElement
  dateInput?: HTMLInputElement
  onSubmit: (result: NewNoteResult) => void

  constructor(app: App, onSubmit: (result: NewNoteResult) => void) {
    super(app)
    this.onSubmit = onSubmit
    this.result = {
      name: '',
      folder: BASE_FOLDERS.JOURNAL
    }
    this.containers = {}
  }

  onOpen() {
    const { contentEl } = this
    contentEl.empty()

    // Create containers
    this.containers.nameContainer = contentEl.createDiv()
    this.containers.folderContainer = contentEl.createDiv()
    this.containers.datePickerContainer = contentEl.createDiv()

    // Add folder dropdown
    this.folderDropdown = new Setting(this.containers.folderContainer)
      .setName('Folder')
      .setDesc('Choose where to create the note')
      .addDropdown((dropdown) => {
        Object.values(BASE_FOLDERS).forEach((folder) => {
          dropdown.addOption(folder, folder)
        })
        dropdown.setValue(BASE_FOLDERS.JOURNAL)
        dropdown.onChange((value) => {
          this.result.folder = value
          this.updateDisplay()
        })
      })

    // Add date picker for journal notes
    const datePickerSetting = new Setting(this.containers.datePickerContainer)
      .setName('Date')
      .setDesc('Choose the date for the note')

    datePickerSetting.addText((text) => {
      // Set tomorrow as default
      const tomorrowDate = addDay(getCurrentMoment())
      const tomorrow = tomorrowDate.format('YYYY-MM-DD')

      // Configure the date picker
      const datePickerEl = text.inputEl
      this.dateInput = datePickerEl
      datePickerEl.type = 'date'
      datePickerEl.value = tomorrow

      // Use tomorrow as the initial date value
      this.result.date = tomorrowDate
      // Format the name as YYYY-MM-DD-dddd
      this.result.name = tomorrowDate.format('YYYY-MM-DD-dddd')

      datePickerEl.addEventListener('change', () => {
        if (datePickerEl.value) {
          // Parse the date from the input value
          const momentDate = window.moment(datePickerEl.value, 'YYYY-MM-DD')
          console.debug(
            `Date picker changed to: ${momentDate.format('YYYY-MM-DD')}`
          )

          this.result.date = momentDate
          // Format the name as YYYY-MM-DD-dddd
          this.result.name = momentDate.format('YYYY-MM-DD-dddd')
        }
      })
    })

    // Add name input
    const nameInputSetting = new Setting(this.containers.nameContainer)
      .setName('Name')
      .setDesc('Enter the name for your note')

    nameInputSetting.addText((text) => {
      this.nameInput = text.inputEl
      text.onChange((value) => {
        this.result.name = value
      })
    })

    // Add buttons container for better styling
    const buttonsContainer = contentEl.createDiv('modal-button-container')
    buttonsContainer.style.display = 'flex'
    buttonsContainer.style.justifyContent = 'space-between'
    buttonsContainer.style.marginTop = '20px'

    // Left side - settings button
    const leftButtons = buttonsContainer.createDiv()
    new Setting(leftButtons).addButton((btn) =>
      btn
        .setButtonText('Open Settings')
        .setTooltip('Configure folder templates and plugin options')
        .onClick(() => {
          this.close()
          // Open settings tab
          // @ts-ignore - The setting property exists but is not in the type definitions
          this.app.setting.open()
          // Navigate to the plugin's tab
          // @ts-ignore - The setting property exists but is not in the type definitions
          this.app.setting.openTabById('obsidian-link-plugin')
        })
    )

    // Right side - create button
    const rightButtons = buttonsContainer.createDiv()
    new Setting(rightButtons).addButton((btn) =>
      btn
        .setButtonText('Create')
        .setCta()
        .onClick(() => {
          this.close()
          this.onSubmit(this.result)
        })
    )

    // Fix button container styling
    buttonsContainer.querySelectorAll('.setting-item').forEach((el) => {
      ;(el as HTMLElement).style.border = 'none'
      ;(el as HTMLElement).style.padding = '0'
    })

    this.updateDisplay()
  }

  /**
   * Set the name input value
   * @param value The value to set
   */
  setNameInputValue(value: string) {
    if (this.nameInput) {
      this.nameInput.value = value
      this.result.name = value
    }
  }

  private updateDisplay() {
    if (this.result.folder === BASE_FOLDERS.JOURNAL) {
      this.containers.datePickerContainer!.style.display = 'block'
      this.containers.nameContainer!.style.display = 'none'
      this.containers.folderContainer!.style.display = 'block'
    } else {
      this.containers.datePickerContainer!.style.display = 'none'
      this.containers.nameContainer!.style.display = 'block'
      this.containers.folderContainer!.style.display = 'block'
    }
  }

  onClose() {
    const { contentEl } = this
    contentEl.empty()
  }
}
