import { App, Notice, PluginSettingTab, Setting, setIcon } from 'obsidian'
import LinkPlugin from '../main'
import { FolderTemplate } from './settings'
import { FolderStructureType } from '../utils/migrationUtils'

export class LinkPluginSettingTab extends PluginSettingTab {
  plugin: LinkPlugin

  constructor(app: App, plugin: LinkPlugin) {
    super(app, plugin)
    this.plugin = plugin
  }

  display(): void {
    const { containerEl } = this
    containerEl.empty()

    containerEl.createEl('h2', { text: 'Link Plugin Settings' })

    // Daily Notes Management
    containerEl.createEl('h3', { text: 'Daily Notes Management' })
    new Setting(containerEl)
      .setName('Auto-update Monthly Folders')
      .setDesc(
        'Automatically update daily notes location based on current month'
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.autoUpdateMonthlyFolders)
          .onChange(async (value) => {
            this.plugin.settings.autoUpdateMonthlyFolders = value
            await this.plugin.saveSettings()
          })
      )

    new Setting(containerEl)
      .setName('Check Interval')
      .setDesc('How often to check for folder updates (in minutes)')
      .addSlider((slider) =>
        slider
          .setLimits(1, 120, 1)
          .setValue(this.plugin.settings.checkIntervalMinutes)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.checkIntervalMinutes = value
            await this.plugin.saveSettings()
          })
      )

    // Folder Structure Settings
    containerEl.createEl('h3', { text: 'Folder Structure' })

    new Setting(containerEl)
      .setName('Folder structure type')
      .setDesc('Using direct vault folder structure (recommended)')
      .addText((text) =>
        text.setValue('Vault Root (default)').setDisabled(true)
      )

    new Setting(containerEl)
      .setName('Always ensure Archive folder')
      .setDesc('Always create and maintain the Archive folder')
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.alwaysEnsureArchive)
          .onChange(async (value) => {
            this.plugin.settings.alwaysEnsureArchive = value
            await this.plugin.saveSettings()
          })
      })

    // Link Processing
    containerEl.createEl('h3', { text: 'Link Processing' })
    new Setting(containerEl)
      .setName('Hugo Compatible Links')
      .setDesc('Ensure links are compatible with Hugo static site generator')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.hugoCompatibleLinks)
          .onChange(async (value) => {
            this.plugin.settings.hugoCompatibleLinks = value
            await this.plugin.saveSettings()
          })
      )

    // Folder Templates
    const templatesHeading = containerEl.createEl('h3', {
      text: 'Folder Templates'
    })

    // Add a help text for folder templates
    const templateHelp = containerEl.createEl('p', {
      cls: 'setting-item-description'
    })
    templateHelp.textContent =
      'Select a template to use for your folder structure. Changing templates will clean up unused folders.'

    // Create a templates container with a more compact display
    const templatesContainer = containerEl.createDiv({ cls: 'template-grid' })

    // Add CSS for the template grid
    const style = document.createElement('style')
    style.textContent = `
      .template-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 10px;
        margin-bottom: 16px;
      }
      .template-card {
        border: 1px solid var(--background-modifier-border);
        border-radius: 5px;
        padding: 10px;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .template-card:hover {
        background-color: var(--background-secondary-alt);
      }
      .template-card.active {
        border-color: var(--interactive-accent);
        background-color: var(--background-secondary-alt);
      }
      .template-card.disabled {
        opacity: 0.6;
      }
      .template-card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
      }
      .template-card-title {
        font-weight: bold;
        margin: 0;
      }
      .template-card-description {
        font-size: 0.8em;
        color: var(--text-muted);
        margin: 0;
      }
    `
    document.head.appendChild(style)

    // Add template cards for ALL templates, regardless of enabled status
    this.plugin.settings.folderTemplates.forEach((template: FolderTemplate) => {
      const templateCard = templatesContainer.createDiv({
        cls: `template-card ${
          this.plugin.settings.activeTemplateId === template.id ? 'active' : ''
        } ${!template.isEnabled ? 'disabled' : ''}`
      })

      // Template header with title and toggle
      const templateHeader = templateCard.createDiv({
        cls: 'template-card-header'
      })
      const templateTitle = templateHeader.createEl('h4', {
        text: template.name,
        cls: 'template-card-title'
      })

      // Checkbox for enabling/disabling
      const templateToggle = templateHeader.createEl('div')
      setIcon(templateToggle, template.isEnabled ? 'check-circle' : 'circle')

      // Template description
      templateCard.createEl('p', {
        text: template.description,
        cls: 'template-card-description'
      })

      // Click handler for the entire card
      templateCard.addEventListener('click', async () => {
        // First, enable this template if it's not already enabled
        if (!template.isEnabled) {
          template.isEnabled = true
          setIcon(templateToggle, 'check-circle')
          templateCard.classList.remove('disabled')
        }

        // Then set it as active
        this.plugin.settings.activeTemplateId = template.id

        // Update UI to show this template as active
        document.querySelectorAll('.template-card').forEach((el) => {
          el.classList.remove('active')
        })
        templateCard.classList.add('active')

        // Show feedback about what to do next
        new Notice(
          `Selected template "${template.name}". Click "Apply Template Changes" to update folder structure.`,
          5000
        )

        // Save settings
        await this.plugin.saveSettings()
      })

      // Toggle handler
      templateToggle.addEventListener('click', async (e) => {
        e.stopPropagation() // Prevent triggering the card click

        template.isEnabled = !template.isEnabled
        setIcon(templateToggle, template.isEnabled ? 'check-circle' : 'circle')

        if (template.isEnabled) {
          templateCard.classList.remove('disabled')
        } else {
          templateCard.classList.add('disabled')
        }

        // If disabling the active template, find another one to make active
        if (
          !template.isEnabled &&
          this.plugin.settings.activeTemplateId === template.id
        ) {
          const nextTemplate = this.plugin.settings.folderTemplates.find(
            (t) => t.isEnabled && t.id !== template.id
          )

          if (nextTemplate) {
            this.plugin.settings.activeTemplateId = nextTemplate.id
            // Update UI
            document.querySelectorAll('.template-card').forEach((el) => {
              el.classList.remove('active')
              const titleEl = el.querySelector('.template-card-title')
              if (titleEl && titleEl.textContent === nextTemplate.name) {
                el.classList.add('active')
              }
            })
          }
        }

        await this.plugin.saveSettings()
      })
    })

    // Add a "Save Template Changes" button
    const templateActionDiv = containerEl.createDiv({ cls: 'template-actions' })
    const saveTemplateButton = templateActionDiv.createEl('button', {
      text: 'Apply Template Changes',
      cls: 'mod-cta'
    })

    // Make the button more noticeable if template has been changed but not applied
    // Add a data attribute to track the last applied template
    saveTemplateButton.setAttribute(
      'data-last-applied',
      this.plugin.settings.activeTemplateId
    )
    if (
      this.plugin.settings.activeTemplateId !==
      saveTemplateButton.getAttribute('data-last-applied')
    ) {
      saveTemplateButton.addClass('mod-warning')
    }

    saveTemplateButton.addEventListener('click', async () => {
      // Show a confirmation dialog
      if (
        confirm(
          'This will apply your selected template. Unused folders will either be deleted (if empty) or moved to Archive. Continue?'
        )
      ) {
        try {
          saveTemplateButton.disabled = true
          saveTemplateButton.textContent = 'Applying changes...'

          // Apply the template changes with cleanup
          await this.plugin.applySelectedTemplateWithCleanup()

          // Update the last applied template
          saveTemplateButton.setAttribute(
            'data-last-applied',
            this.plugin.settings.activeTemplateId
          )
          saveTemplateButton.removeClass('mod-warning')

          // Show success message
          saveTemplateButton.textContent = 'Changes applied successfully!'

          // Reset button after a delay
          setTimeout(() => {
            saveTemplateButton.disabled = false
            saveTemplateButton.textContent = 'Apply Template Changes'
          }, 2000)
        } catch (error) {
          saveTemplateButton.textContent = 'Error applying changes'
          console.error('Error applying template:', error)

          // Reset button after a delay
          setTimeout(() => {
            saveTemplateButton.disabled = false
            saveTemplateButton.textContent = 'Apply Template Changes'
          }, 2000)
        }
      }
    })

    // Style the template actions
    const actionsStyle = document.createElement('style')
    actionsStyle.textContent = `
      .template-actions {
        display: flex;
        justify-content: flex-end;
        margin-top: 16px;
      }
    `
    document.head.appendChild(actionsStyle)
  }
}
