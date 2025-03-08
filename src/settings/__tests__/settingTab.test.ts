import { LinkPluginSettingTab } from '../settingsTab'
import { App } from 'obsidian'
import LinkPlugin from '../../main'
import { FolderTemplate, LinkPluginSettings } from '../settings'
import { createMockApp, createMockPlugin } from '../../tests/testUtils'

// Mock Obsidian components
jest.mock('obsidian', () => {
  const original = jest.requireActual('obsidian')

  return {
    ...original,
    // Mock element-creation API
    Setting: jest.fn().mockImplementation(() => ({
      setName: jest.fn().mockReturnThis(),
      setDesc: jest.fn().mockReturnThis(),
      addToggle: jest.fn().mockImplementation(() => ({
        setValue: jest.fn().mockReturnThis(),
        onChange: jest.fn().mockReturnThis()
      })),
      addText: jest.fn().mockImplementation(() => ({
        setValue: jest.fn().mockReturnThis(),
        onChange: jest.fn().mockReturnThis(),
        inputEl: {
          addEventListener: jest.fn()
        }
      })),
      addTextArea: jest.fn().mockImplementation(() => ({
        setValue: jest.fn().mockReturnThis(),
        onChange: jest.fn().mockReturnThis()
      })),
      addButton: jest.fn().mockImplementation(() => ({
        setButtonText: jest.fn().mockReturnThis(),
        onClick: jest.fn().mockReturnThis()
      })),
      addDropdown: jest.fn().mockImplementation(() => ({
        addOption: jest.fn().mockReturnThis(),
        setValue: jest.fn().mockReturnThis(),
        onChange: jest.fn().mockReturnThis()
      })),
      addSlider: jest.fn().mockImplementation(() => ({
        setLimits: jest.fn().mockReturnThis(),
        setValue: jest.fn().mockReturnThis(),
        setDynamicTooltip: jest.fn().mockReturnThis(),
        onChange: jest.fn().mockReturnThis()
      })),
      settingEl: {
        createEl: jest.fn().mockImplementation(() => ({
          createEl: jest.fn(),
          appendChild: jest.fn()
        })),
        appendChild: jest.fn()
      }
    })),
    // Mock plugin API
    PluginSettingTab: jest.fn(),
    // Mock fragment
    createFragment: jest.fn().mockImplementation(() => ({
      createEl: jest.fn().mockImplementation(() => ({
        setText: jest.fn().mockReturnThis(),
        addEventListener: jest.fn().mockReturnThis()
      })),
      appendChild: jest.fn()
    }))
  }
})

describe('LinkPluginSettingTab', () => {
  let mockApp: App
  let mockPlugin: any
  let settingTab: LinkPluginSettingTab

  beforeEach(() => {
    mockApp = createMockApp()
    mockPlugin = {
      settings: {
        dailyNotesLocation: 'Journal',
        autoRevealFile: true,
        autoUpdateMonthlyFolders: true,
        checkIntervalMinutes: 5,
        folderTemplates: [],
        activeTemplateId: '',
        hugoCompatibleLinks: false
      },
      saveSettings: jest.fn()
    }
    settingTab = new LinkPluginSettingTab(mockApp, mockPlugin)
  })

  it('should display settings', () => {
    const container = document.createElement('div')
    settingTab.display()

    // Verify that settings are rendered
    expect(settingTab.containerEl).toBeDefined()
  })

  it('should update settings when changed', () => {
    settingTab.display()

    // Simulate changing a setting
    mockPlugin.settings.autoUpdateMonthlyFolders = false

    // Trigger save
    settingTab.hide()

    expect(mockPlugin.saveSettings).toHaveBeenCalled()
  })
})
