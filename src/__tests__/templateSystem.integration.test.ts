import { App } from 'obsidian'
import { TemplateManager } from '../templates/templateManager'
import { createMockApp } from '../tests/testUtils'

describe('TemplateManager', () => {
  let mockApp: App
  let mockVault: any

  beforeEach(() => {
    mockApp = createMockApp()
    mockVault = mockApp.vault

    // Setup mock functions
    mockVault.adapter = {
      exists: jest.fn().mockResolvedValue(true),
      read: jest
        .fn()
        .mockResolvedValue('# {{title}}\n\nCreated: {{date}}\n\n## Notes\n\n')
    }
    mockVault.getAbstractFileByPath = jest.fn().mockReturnValue({
      path: 'templates/research.md',
      content: '# {{title}}\n\nCreated: {{date}}\n\n## Notes\n\n'
    })
  })

  it('should load template from file', async () => {
    const templateManager = new TemplateManager(mockApp)
    const template = await templateManager.loadTemplate('templates/research.md')
    expect(template).toBe('# {{title}}\n\nCreated: {{date}}\n\n## Notes\n\n')
  })

  it('should handle missing template file', async () => {
    mockVault.adapter.exists = jest.fn().mockResolvedValue(false)
    mockVault.getAbstractFileByPath = jest.fn().mockReturnValue(null)

    const templateManager = new TemplateManager(mockApp)
    await expect(
      templateManager.loadTemplate('templates/missing.md')
    ).rejects.toThrow()
  })

  it('should apply template with variables', async () => {
    const templateManager = new TemplateManager(mockApp)
    const variables = {
      title: 'Test Note',
      date: '2024-03-14'
    }

    const result = await templateManager.applyTemplate(
      '# {{title}}\n\nCreated: {{date}}\n\n## Notes\n\n',
      variables
    )
    expect(result).toBe('# Test Note\n\nCreated: 2024-03-14\n\n## Notes\n\n')
  })
})
