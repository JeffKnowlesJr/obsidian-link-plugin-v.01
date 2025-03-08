import {
  App,
  Editor,
  EventRef,
  MarkdownView,
  Modal,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  TFile,
  TFolder,
  Vault,
  WorkspaceLeaf,
  moment,
  setIcon
} from 'obsidian'
import { createLinkedNote } from './commands/createLinkedNote'
import {
  LinkPluginSettings,
  DEFAULT_SETTINGS,
  FolderTemplate
} from './settings/settings'
import { HelpModal } from './modals/helpModal'
import {
  StructurePreviewModal,
  TemplateEditModal
} from './modals/templateModals'
import {
  ensureFolderStructure,
  updateDailyNotesLocation,
  ROOT_FOLDER,
  BASE_FOLDERS,
  createDailyNoteContent,
  migrateExistingDailyNotes
} from './utils/folderUtils'
import { parseDate } from './utils/momentHelper'
import {
  migrateFolderStructure,
  FolderStructureType,
  detectFolderStructureType,
  ensureArchiveFolder
} from './utils/migrationUtils'

// Fix moment import
const momentInstance = (window as any).moment || moment

class ConfirmationModal extends Modal {
  private onConfirm: () => void

  constructor(app: App, onConfirm: () => void) {
    super(app)
    this.onConfirm = onConfirm
  }

  onOpen() {
    const { contentEl } = this
    contentEl.empty()

    contentEl.createEl('h2', { text: 'Regenerate Folder Structure?' })
    contentEl.createEl('p', {
      text: `Essential plugin folders are missing. Would you like to regenerate the folder structure?`
    })

    const buttonContainer = contentEl.createDiv('button-container')
    buttonContainer.style.display = 'flex'
    buttonContainer.style.justifyContent = 'flex-end'
    buttonContainer.style.gap = '10px'
    buttonContainer.style.marginTop = '20px'

    const confirmButton = buttonContainer.createEl('button', {
      text: 'Yes, regenerate',
      cls: 'mod-cta'
    })
    confirmButton.addEventListener('click', async () => {
      this.close()
      this.onConfirm()
    })

    const cancelButton = buttonContainer.createEl('button', {
      text: 'No, keep it deleted'
    })
    cancelButton.addEventListener('click', () => {
      this.close()
    })
  }

  onClose() {
    const { contentEl } = this
    contentEl.empty()
  }
}

export default class LinkPlugin extends Plugin {
  settings: LinkPluginSettings
  folderCheckInterval: number

  async onload() {
    try {
      console.group('Link Plugin Loading')
      console.debug('Starting plugin initialization...')
      console.time('Plugin Load Time')

      // Load settings
      console.debug('Loading plugin settings...')
      await this.loadSettings()
      console.debug('Settings loaded successfully:', this.settings)

      // Detect current folder structure type if not explicitly set
      if (!this.settings.folderStructureType) {
        this.settings.folderStructureType = await detectFolderStructureType(
          this.app.vault
        )
        await this.saveSettings()
      }

      // Ensure folder structure is using VAULT_ROOT type
      console.log(`Ensuring folders use vault root structure...`)

      this.settings.folderStructureType = FolderStructureType.VAULT_ROOT
      await this.saveSettings()

      const migrationLog = await migrateFolderStructure(
        this.app,
        true, // preserve files
        this.settings.alwaysEnsureArchive
      )

      // Log migration results
      migrationLog.forEach((entry) => console.log(entry))

      // Ensure folder structure and update daily notes location
      console.debug('Ensuring folder structure...')
      try {
        await ensureFolderStructure(this.app, this.settings)

        // Migrate existing daily notes to new folder structure
        console.debug('Migrating existing daily notes...')
        await migrateExistingDailyNotes(this.app)

        // Update daily notes location
        const newLocation = await updateDailyNotesLocation(this.app)
        this.settings.dailyNotesLocation = newLocation
        await this.saveSettings()
      } catch (error) {
        console.error('Error ensuring folder structure:', error)
        new Notice('Error initializing folder structure')
      }

      // Register commands
      console.debug('Registering commands...')
      this.registerCommands()

      // Patch daily notes plugin
      console.debug('Patching daily notes functionality...')
      this.patchDailyNotes()

      // Register root folder check
      console.debug('Registering root folder check...')
      this.registerRootFolderCheck()

      // Register monthly daily notes location update check
      console.debug('Registering monthly daily notes location update check...')
      this.registerDailyNotesLocationCheck()

      // Register settings tab
      console.debug('Registering settings tab...')
      this.addSettingTab(new LinkSettingTab(this.app, this))

      // Wait for daily notes plugin to be ready
      setTimeout(() => {
        this.patchDailyNotes()
      }, 1000)

      // Register file:create event to auto-enhance daily notes
      this.registerEvent(
        this.app.vault.on('create', (file) => {
          if (file instanceof TFile && this.isDailyNote(file)) {
            // Enhance the daily note if it's newly created
            this.enhanceDailyNote(file)
          }
        })
      )

      console.timeEnd('Plugin Load Time')
      console.debug('Plugin initialization complete')
      console.groupEnd()
    } catch (error) {
      console.error('Error loading Link Plugin:', error)
      new Notice('Error loading Link Plugin')
    }
  }

  private patchDailyNotes() {
    try {
      // Get the daily notes plugin
      const dailyNotesPlugin = (this.app as any).internalPlugins?.plugins[
        'daily-notes'
      ]
      if (!dailyNotesPlugin?.enabled) {
        console.debug('Daily notes plugin not enabled')
        return
      }

      const instance = dailyNotesPlugin.instance
      if (!instance?.createDailyNote) {
        console.debug('Daily notes createDailyNote function not found')
        return
      }

      // Store the original create daily note function
      const originalCreateDailyNote = instance.createDailyNote.bind(instance)

      // Replace with our enhanced version
      instance.createDailyNote = async (date?: Date) => {
        try {
          const file = await originalCreateDailyNote(date)
          if (file) {
            await this.enhanceDailyNote(file)
          }
          return file
        } catch (error) {
          console.error('Error in enhanced createDailyNote:', error)
          // Fall back to original function if our enhancement fails
          return originalCreateDailyNote(date)
        }
      }

      console.debug('Daily notes functionality patched successfully')
    } catch (error) {
      console.error('Error patching daily notes:', error)
    }
  }

  private registerRootFolderCheck() {
    // Check every 5 seconds for essential folders
    this.registerInterval(
      window.setInterval(async () => {
        try {
          // Check for critical folders in the vault root
          const templatesExists = await this.app.vault.adapter.exists(
            BASE_FOLDERS.TEMPLATES
          )
          const journalExists = await this.app.vault.adapter.exists(
            BASE_FOLDERS.JOURNAL
          )

          // If both essential folders are missing, prompt for regeneration
          if (!templatesExists && !journalExists) {
            console.debug(
              `Essential plugin folders not found, prompting for regeneration`
            )
            new ConfirmationModal(this.app, async () => {
              try {
                await ensureFolderStructure(this.app, this.settings)
                const newLocation = await updateDailyNotesLocation(this.app)
                this.settings.dailyNotesLocation = newLocation
                await this.saveSettings()
                new Notice(`Essential folder structure has been regenerated`)
              } catch (error) {
                console.error('Error regenerating folder structure:', error)
                new Notice('Failed to regenerate folder structure')
              }
            }).open()
          }
        } catch (error) {
          console.error('Error checking essential folders:', error)
        }
      }, 5000)
    )
  }

  private registerCommands() {
    // Create linked note command
    console.debug('Registering create linked note command...')
    this.addCommand({
      id: 'create-linked-note',
      name: 'Create Linked Note From Selection',
      editorCallback: (editor: Editor, view: MarkdownView) => {
        console.debug('Create linked note command triggered')
        createLinkedNote(this, editor, view)
      }
    })
  }

  async onunload() {
    console.group('Link Plugin Unloading')
    console.debug('Starting plugin cleanup...')
    console.time('Plugin Unload Time')

    try {
      // Add cleanup code here
      console.debug('Plugin cleanup completed')
    } catch (error) {
      console.error('Error during plugin cleanup:', error)
    } finally {
      console.timeEnd('Plugin Unload Time')
      console.groupEnd()
    }
  }

  async loadSettings() {
    console.debug('Loading settings...')
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
    console.debug('Settings loaded:', this.settings)
  }

  async saveSettings() {
    console.debug('Saving settings...')
    await this.saveData(this.settings)
    console.debug('Settings saved')
  }

  private async revealFileInExplorer(file: TFile) {
    try {
      // Get the file explorer leaf
      const fileExplorer =
        this.app.workspace.getLeavesOfType('file-explorer')[0]
      if (!fileExplorer) {
        return
      }

      // @ts-ignore - Access the file explorer view instance
      const fileExplorerView = fileExplorer.view
      if (!fileExplorerView) {
        return
      }

      // Reveal and highlight the file
      // @ts-ignore - Accessing internal API
      fileExplorerView.revealInFolder(file)
    } catch (error) {
      console.error('Error revealing file in explorer:', error)
    }
  }

  private isDailyNote(file: TFile): boolean {
    // Check if the file is in a daily notes folder
    const dailyNotesPath = this.settings.dailyNotesLocation
    return file.path.startsWith(dailyNotesPath) && file.extension === 'md'
  }

  async enhanceDailyNote(file: TFile) {
    try {
      // Check if the file already has previous/next links
      const content = await this.app.vault.read(file)
      if (content.includes("previous: ''") || content.includes("next: ''")) {
        return
      }

      // Parse the date from the file name
      const date = parseDate(file.basename.match(/^(\d{4}-\d{2}-\d{2})/)![1])
      if (!date.isValid()) {
        console.debug('Invalid date format in file name:', file.basename)
        return
      }

      // Create enhanced content with links
      const enhancedContent = await createDailyNoteContent(
        this.app,
        file.basename,
        date
      )

      // Update the file with enhanced content
      await this.app.vault.modify(file, enhancedContent)
    } catch (error) {
      console.error('Error enhancing daily note:', error)
    }
  }

  registerDailyNotesLocationCheck() {
    if (this.folderCheckInterval) {
      window.clearInterval(this.folderCheckInterval)
    }

    if (!this.settings.autoUpdateMonthlyFolders) {
      console.debug('Automatic monthly folder updates disabled in settings')
      return
    }

    let currentMonth = new Date().getMonth()

    const getNextCheckDelay = () => {
      const baseInterval = this.settings.checkIntervalMinutes * 60 * 1000
      const variance = this.settings.checkIntervalVariance * 60 * 1000
      const randomVariance = Math.floor(Math.random() * variance * 2) - variance
      return baseInterval + randomVariance
    }

    const scheduleNextCheck = async () => {
      try {
        if (!this.settings.autoUpdateMonthlyFolders) return

        const now = new Date()
        const nowMonth = now.getMonth()

        if (nowMonth !== currentMonth) {
          console.debug('Month changed, updating daily notes location')
          currentMonth = nowMonth

          const newLocation = await updateDailyNotesLocation(this.app)
          await this.saveSettings()

          new Notice(
            `Daily notes location updated for ${now.toLocaleString('default', {
              month: 'long'
            })}`
          )
        }

        // Schedule next check with random variance
        this.folderCheckInterval = window.setTimeout(
          scheduleNextCheck,
          getNextCheckDelay()
        )
        this.registerInterval(this.folderCheckInterval)
      } catch (error) {
        console.error('Error in daily notes location check:', error)
        // Retry on error after base interval
        this.folderCheckInterval = window.setTimeout(
          scheduleNextCheck,
          this.settings.checkIntervalMinutes * 60 * 1000
        )
        this.registerInterval(this.folderCheckInterval)
      }
    }

    // Start the first check
    scheduleNextCheck()
  }

  /**
   * Apply the folder structure type setting
   */
  async migrateToFolderStructure(): Promise<void> {
    // Update the setting
    this.settings.folderStructureType = FolderStructureType.VAULT_ROOT
    await this.saveSettings()

    // Perform the migration
    const migrationLog = await migrateFolderStructure(
      this.app,
      true, // preserve files
      this.settings.alwaysEnsureArchive
    )

    // Log migration results
    migrationLog.forEach((entry) => console.log(entry))

    // Show success notice
    new Notice(`Folder structure updated successfully`)
  }

  /**
   * Applies the selected template structure immediately
   */
  async applySelectedTemplate(): Promise<void> {
    console.log(
      `Applying template structure for template: ${this.settings.activeTemplateId}`
    )

    try {
      // Ensure folder structure is updated with the selected template
      await ensureFolderStructure(this.app, this.settings)

      // Show success notice
      new Notice(
        `Template "${this.settings.activeTemplateId}" applied successfully`
      )
    } catch (error) {
      console.error('Error applying template:', error)
      new Notice(`Error applying template: ${error.message}`)
    }
  }

  /**
   * Applies the selected template with proper cleanup of unused folders
   * Unused folders will either be deleted if empty or moved to Archive
   */
  async applySelectedTemplateWithCleanup(): Promise<void> {
    try {
      console.log(`---------------------------------------`)
      console.log(`APPLYING TEMPLATE WITH CLEANUP START`)
      console.log(
        `Applying template with cleanup: ${this.settings.activeTemplateId}`
      )
      console.log(
        `Current folder structure type: ${this.settings.folderStructureType}`
      )

      // Find the active template
      const activeTemplate = this.settings.folderTemplates.find(
        (template) =>
          template.id === this.settings.activeTemplateId && template.isEnabled
      )

      console.log(
        `Active template found:`,
        activeTemplate ? activeTemplate.name : 'NONE'
      )

      if (!activeTemplate) {
        throw new Error('No active template found')
      }

      // Parse the structure to determine which folders should exist
      let structure: Record<string, any> = {}
      try {
        structure = JSON.parse(activeTemplate.structure)
        console.log(
          `Template structure parsed successfully with root folders:`,
          Object.keys(structure)
        )
      } catch (e) {
        console.error('Invalid template structure JSON:', e)
        throw new Error('Invalid template structure')
      }

      // Get flat list of root folders that should exist in the template
      const templateRootFolders = Object.keys(structure)
      console.log('Template root folders:', templateRootFolders)

      // Check which root folders currently exist
      const vault = this.app.vault
      const rootFolders = vault
        .getRoot()
        .children.filter((item) => item instanceof TFolder)
        .map((folder) => folder.name)

      console.log('Existing root folders:', rootFolders)

      // Create Archive folder if it doesn't exist
      const archiveFolderName = 'Archive'
      let archiveFolder: TFolder | null = vault
        .getRoot()
        .children.find(
          (item) => item instanceof TFolder && item.name === archiveFolderName
        ) as TFolder

      if (!archiveFolder) {
        try {
          await vault.createFolder(archiveFolderName)
          archiveFolder = vault
            .getRoot()
            .children.find(
              (item) =>
                item instanceof TFolder && item.name === archiveFolderName
            ) as TFolder
          console.log('Created Archive folder')
        } catch (error) {
          console.error('Error creating Archive folder:', error)
        }
      }

      // STEP 1: Check Archive for folders that are part of the template and restore them
      if (archiveFolder) {
        console.log(`Checking Archive folder for content to restore...`)

        for (const templateFolderName of templateRootFolders) {
          // Skip Archive folder itself
          if (templateFolderName === archiveFolderName) continue

          // Check if this template folder exists in the Archive
          const archivedFolderPath = `${archiveFolder.path}/${templateFolderName}`
          if (await vault.adapter.exists(archivedFolderPath)) {
            console.log(
              `Found archived folder that matches template: ${templateFolderName}`
            )

            // Check if folder already exists in root (could be empty)
            const rootPath = templateFolderName
            const folderExistsInRoot = await vault.adapter.exists(rootPath)

            if (folderExistsInRoot) {
              // If it already exists in root, we need to merge contents
              console.log(
                `Folder ${templateFolderName} exists in both Archive and root, merging...`
              )

              try {
                // Get the archived folder
                const archivedFolder = archiveFolder.children.find(
                  (item) =>
                    item instanceof TFolder && item.name === templateFolderName
                ) as TFolder

                if (archivedFolder) {
                  // Get the root folder
                  const rootFolder = vault
                    .getRoot()
                    .children.find(
                      (item) =>
                        item instanceof TFolder &&
                        item.name === templateFolderName
                    ) as TFolder

                  // Recursively merge folder contents
                  await this.mergeFolderContents(
                    archivedFolder,
                    rootFolder,
                    vault
                  )

                  // If archived folder is now empty, delete it
                  if (archivedFolder.children.length === 0) {
                    await vault.delete(archivedFolder)
                    console.log(
                      `Deleted empty archived folder after merging: ${archivedFolder.path}`
                    )
                  }
                }
              } catch (error) {
                console.error(
                  `Error merging folder ${templateFolderName}:`,
                  error
                )
              }
            } else {
              // If it doesn't exist in root, move the entire folder
              console.log(
                `Moving ${templateFolderName} from Archive to root...`
              )

              try {
                // Create the target folder in root
                await vault.createFolder(rootPath)

                // Get source folder in archive
                const sourceFolder = archiveFolder.children.find(
                  (item) =>
                    item instanceof TFolder && item.name === templateFolderName
                ) as TFolder

                if (sourceFolder) {
                  // Get the newly created target folder
                  const targetFolder = vault
                    .getRoot()
                    .children.find(
                      (item) =>
                        item instanceof TFolder &&
                        item.name === templateFolderName
                    ) as TFolder

                  // Move all contents
                  await this.mergeFolderContents(
                    sourceFolder,
                    targetFolder,
                    vault
                  )

                  // Delete the now-empty source folder in Archive
                  if (sourceFolder.children.length === 0) {
                    await vault.delete(sourceFolder)
                    console.log(
                      `Deleted empty archived folder after moving: ${sourceFolder.path}`
                    )
                  }
                }
              } catch (error) {
                console.error(
                  `Error moving folder ${templateFolderName} from Archive:`,
                  error
                )
              }
            }
          }
        }
      }

      // STEP 2: Process each existing root folder that's not in the template
      for (const folderName of rootFolders) {
        // Skip special folders and folders in the template
        if (
          folderName === archiveFolderName ||
          folderName === '.obsidian' ||
          templateRootFolders.includes(folderName)
        ) {
          console.log(`Skipping folder (special or in template): ${folderName}`)
          continue
        }

        console.log(`Processing folder: ${folderName}`)
        const folder = vault
          .getRoot()
          .children.find(
            (item) => item instanceof TFolder && item.name === folderName
          ) as TFolder

        if (!folder) {
          console.log(`Folder not found in vault: ${folderName}`)
          continue
        }

        // Check if the folder is empty
        const isEmpty = folder.children.length === 0
        console.log(
          `Folder ${folderName} is ${isEmpty ? 'empty' : 'not empty'} (${
            folder.children.length
          } items)`
        )

        if (isEmpty) {
          // Delete empty folders
          try {
            await vault.delete(folder)
            console.log(`Deleted empty folder: ${folderName}`)
          } catch (error) {
            console.error(`Error deleting folder ${folderName}:`, error)
          }
        } else if (archiveFolder) {
          // Move non-empty folders to Archive
          try {
            // Create a folder with the same name in Archive (or use existing one)
            const archivePath = `${archiveFolder.path}/${folderName}`

            // Check if the archive subfolder already exists
            if (await vault.adapter.exists(archivePath)) {
              console.log(
                `Archive subfolder ${archivePath} already exists, using it`
              )
            } else {
              // Create new archive subfolder
              await vault.createFolder(archivePath)
              console.log(`Created archive folder: ${archivePath}`)
            }

            // Move all contents to the archive folder
            for (const child of folder.children) {
              // Check if file already exists in destination
              const destinationPath = `${archivePath}/${child.name}`
              if (await vault.adapter.exists(destinationPath)) {
                // Skip or overwrite based on preference (skipping for safety)
                console.log(
                  `File ${child.name} already exists in archive, skipping`
                )
                continue
              }

              try {
                await vault.rename(child, destinationPath)
                console.log(`Moved item ${child.name} to ${archivePath}`)
              } catch (error) {
                console.error(
                  `Error moving ${child.name} to archive: ${error.message}`
                )
              }
            }

            // Delete the now-empty original folder
            if (folder.children.length === 0) {
              await vault.delete(folder)
              console.log(
                `Moved folder ${folderName} to Archive and deleted original`
              )
            } else {
              console.log(
                `Some items in ${folderName} could not be moved, folder not deleted`
              )
            }
          } catch (error) {
            console.error(
              `Error moving folder ${folderName} to Archive:`,
              error
            )
          }
        }
      }

      // Check for any empty folders recursively and clean them up
      await this.recursivelyCleanEmptyFolders(vault)

      // Apply the template
      console.log('Applying template structure...')
      await ensureFolderStructure(this.app, this.settings)
      console.log('Template applied successfully')

      // Run the recursive cleanup again after applying the template
      // to catch any newly empty folders
      await this.recursivelyCleanEmptyFolders(vault)

      // Update daily notes location
      console.log('Updating daily notes location...')
      await updateDailyNotesLocation(this.app)
      console.log('Daily notes location updated')

      // Show success notice
      new Notice(`Template applied with cleanup`)
      console.log(`APPLYING TEMPLATE WITH CLEANUP COMPLETE`)
      console.log(`---------------------------------------`)
    } catch (error) {
      console.error('Error applying template with cleanup:', error)
      new Notice(`Error: ${error.message}`)
      throw error
    }
  }

  /**
   * Recursively merges the contents of a source folder into a target folder
   */
  private async mergeFolderContents(
    sourceFolder: TFolder,
    targetFolder: TFolder,
    vault: Vault
  ): Promise<void> {
    // Process all children of the source folder
    for (const child of [...sourceFolder.children]) {
      const destinationPath = `${targetFolder.path}/${child.name}`

      if (child instanceof TFile) {
        // It's a file - check if it exists in target
        if (await vault.adapter.exists(destinationPath)) {
          console.log(`File ${child.name} already exists in target, skipping`)
          continue
        }

        // Move the file to target
        try {
          await vault.rename(child, destinationPath)
          console.log(`Moved file ${child.name} to ${targetFolder.path}`)
        } catch (error) {
          console.error(`Error moving file ${child.name}:`, error)
        }
      } else if (child instanceof TFolder) {
        // It's a subfolder - create if doesn't exist and recursively process
        if (!(await vault.adapter.exists(destinationPath))) {
          await vault.createFolder(destinationPath)
          console.log(`Created subfolder: ${destinationPath}`)
        }

        // Get or create the target subfolder
        const targetSubfolder = targetFolder.children.find(
          (item) => item instanceof TFolder && item.name === child.name
        ) as TFolder | undefined

        if (targetSubfolder) {
          // Recursively merge the contents
          await this.mergeFolderContents(child, targetSubfolder, vault)

          // If source subfolder is now empty, delete it
          if (child.children.length === 0) {
            await vault.delete(child)
            console.log(`Deleted empty source subfolder: ${child.path}`)
          }
        } else {
          // Target subfolder not found - this shouldn't happen since we just created it if needed
          console.error(`Target subfolder not found: ${destinationPath}`)

          // Try to get it directly from the vault
          const refreshedTarget = vault.getAbstractFileByPath(destinationPath)
          if (refreshedTarget instanceof TFolder) {
            await this.mergeFolderContents(child, refreshedTarget, vault)

            // Clean up empty source folder
            if (child.children.length === 0) {
              await vault.delete(child)
              console.log(
                `Deleted empty source subfolder after refresh: ${child.path}`
              )
            }
          } else {
            console.error(
              `Unable to find target folder after creation: ${destinationPath}`
            )
          }
        }
      }
    }
  }

  /**
   * Recursively checks for empty folders in the vault and deletes them,
   * but preserves folders defined in the template structure even if empty
   */
  private async recursivelyCleanEmptyFolders(vault: Vault): Promise<boolean> {
    console.log('Starting recursive cleanup of empty folders...')
    let emptyFoldersDeleted = false

    // Get the template structure to check which folders should be preserved
    let templateFolders: string[] = []
    try {
      // Find the active template
      const activeTemplate = this.settings.folderTemplates.find(
        (template) =>
          template.id === this.settings.activeTemplateId && template.isEnabled
      )

      if (activeTemplate) {
        // Parse template structure and get root folder names
        const structure = JSON.parse(activeTemplate.structure)
        templateFolders = Object.keys(structure).map((folder) => folder)
        console.log('Template folders to preserve:', templateFolders)
      }
    } catch (error) {
      console.error('Error parsing template structure:', error)
    }

    // Helper function to check if a folder is empty (or contains only empty folders)
    const isFolderEmpty = async (folder: TFolder): Promise<boolean> => {
      if (folder.children.length === 0) {
        return true
      }

      // If folder only contains other folders (no files), check if those are empty
      const hasFiles = folder.children.some((child) => child instanceof TFile)
      if (hasFiles) {
        return false
      }

      // Check if all subfolders are empty
      for (const child of folder.children) {
        if (child instanceof TFolder) {
          const isEmpty = await isFolderEmpty(child)
          if (!isEmpty) {
            return false
          }
        }
      }

      return true
    }

    // Helper function to check if a folder should be preserved (part of template)
    const shouldPreserveFolder = (folder: TFolder): boolean => {
      // Special folders should never be deleted
      if (folder.name === '.obsidian' || folder.name === 'Archive') {
        return true
      }

      // Always preserve certain essential folders
      const essentialFolders = ['Journal', 'Templates']
      if (essentialFolders.includes(folder.name)) {
        console.log(`Preserving essential folder: ${folder.name}`)
        return true
      }

      // Check if this is a root folder defined in the template
      if (templateFolders.includes(folder.name)) {
        console.log(`Preserving template folder: ${folder.name}`)
        return true
      }

      // Check if this is a subfolder of a template folder
      // For example: Journal/y_2024, Journal/y_2024/March, etc.
      for (const templateFolder of templateFolders) {
        if (folder.path.startsWith(templateFolder + '/')) {
          console.log(`Preserving template subfolder: ${folder.path}`)
          return true
        }
      }

      // Also preserve year and month folders in Journal structure
      if (
        folder.path.indexOf('Journal/') === 0 &&
        (/Journal\/y_\d{4}$/.test(folder.path) || // Year folders like Journal/y_2024
          /Journal\/y_\d{4}\/[A-Z][a-z]+$/.test(folder.path)) // Month folders like Journal/y_2024/March
      ) {
        console.log(`Preserving date structure folder: ${folder.path}`)
        return true
      }

      return false
    }

    // Helper function to recursively delete empty folders
    const deleteEmptyFolders = async (folder: TFolder): Promise<boolean> => {
      // Check if this folder should be preserved
      if (shouldPreserveFolder(folder)) {
        return false
      }

      let anyDeleted = false

      // First, try to delete any empty subfolders
      for (const child of [...folder.children]) {
        if (child instanceof TFolder) {
          const deleted = await deleteEmptyFolders(child)
          if (deleted) {
            anyDeleted = true
          }
        }
      }

      // After processing subfolders, check if this folder is now empty
      if (await isFolderEmpty(folder)) {
        try {
          await vault.delete(folder)
          console.log(`Deleted empty folder: ${folder.path}`)
          return true
        } catch (error) {
          console.error(`Error deleting empty folder ${folder.path}:`, error)
        }
      }

      return anyDeleted
    }

    // Start with the root level folders
    const rootFolders = vault
      .getRoot()
      .children.filter((item) => item instanceof TFolder)

    for (const folder of rootFolders) {
      if (folder instanceof TFolder) {
        const deleted = await deleteEmptyFolders(folder)
        if (deleted) {
          emptyFoldersDeleted = true
        }
      }
    }

    console.log(
      `Recursive cleanup ${
        emptyFoldersDeleted ? 'deleted some' : 'found no'
      } empty folders`
    )
    return emptyFoldersDeleted
  }
}

class LinkSettingTab extends PluginSettingTab {
  plugin: LinkPlugin

  constructor(app: App, plugin: LinkPlugin) {
    super(app, plugin)
    this.plugin = plugin
  }

  display(): void {
    const { containerEl } = this

    containerEl.empty()

    containerEl.createEl('h2', { text: 'Link Plugin Settings' })

    // Link Processing Section
    containerEl.createEl('h3', { text: 'Link Processing' })

    new Setting(containerEl)
      .setName('Hugo-compatible links')
      .setDesc(
        'Ensure links are processed in a way that works with Hugo and other static site generators'
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.hugoCompatibleLinks)
          .onChange(async (value) => {
            this.plugin.settings.hugoCompatibleLinks = value
            await this.plugin.saveSettings()
          })
      )

    // Daily Notes Management Section
    containerEl.createEl('h3', { text: 'Daily Notes Management' })

    new Setting(containerEl)
      .setName('Auto-update monthly folders')
      .setDesc('Automatically update daily notes location when month changes')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.autoUpdateMonthlyFolders)
          .onChange(async (value) => {
            this.plugin.settings.autoUpdateMonthlyFolders = value
            await this.plugin.saveSettings()
          })
      )

    new Setting(containerEl)
      .setName('Check interval (minutes)')
      .setDesc(
        'Base interval for checking month changes (a random variance will be added to prevent system load spikes)'
      )
      .addSlider((slider) =>
        slider
          .setLimits(15, 240, 15)
          .setValue(this.plugin.settings.checkIntervalMinutes)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.checkIntervalMinutes = value
            await this.plugin.saveSettings()
            this.plugin.registerDailyNotesLocationCheck()
          })
      )

    new Setting(containerEl)
      .setName('Check interval variance (minutes)')
      .setDesc(
        'Random variance added to check interval (±minutes) to prevent system load spikes'
      )
      .addSlider((slider) =>
        slider
          .setLimits(1, 15, 1)
          .setValue(this.plugin.settings.checkIntervalVariance)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.checkIntervalVariance = value
            await this.plugin.saveSettings()
            this.plugin.registerDailyNotesLocationCheck()
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
        // First, ensure all other templates are disabled except this one
        // This makes templates work like radio buttons
        this.plugin.settings.folderTemplates.forEach((t) => {
          if (t.id !== template.id) {
            t.isEnabled = false

            // Also update the UI for other template cards
            document.querySelectorAll('.template-card').forEach((el) => {
              const titleEl = el.querySelector('.template-card-title')
              if (titleEl && titleEl.textContent === t.name) {
                el.classList.add('disabled')
                const toggleIcon = el.querySelector(
                  '.template-card-header > div'
                ) as HTMLElement
                if (toggleIcon) {
                  setIcon(toggleIcon, 'circle')
                }
              }
            })
          }
        })

        // Then enable this template
        template.isEnabled = true
        setIcon(templateToggle, 'check-circle')
        templateCard.classList.remove('disabled')

        // Set it as active
        this.plugin.settings.activeTemplateId = template.id

        // Update UI to show this template as active
        document.querySelectorAll('.template-card').forEach((el) => {
          el.classList.remove('active')
        })
        templateCard.classList.add('active')

        // Show custom options if this is the custom template
        if (template.id === 'custom') {
          // Remove any existing custom options first
          const existingCustomOptions = containerEl.querySelector(
            '.custom-template-options'
          )
          if (existingCustomOptions) {
            existingCustomOptions.remove()
          }

          // Create options container
          const customOptionsContainer = containerEl.createDiv({
            cls: 'custom-template-options'
          })
          customOptionsContainer.style.marginTop = '16px'
          customOptionsContainer.style.padding = '16px'
          customOptionsContainer.style.border =
            '1px solid var(--background-modifier-border)'
          customOptionsContainer.style.borderRadius = '5px'

          // Add heading
          customOptionsContainer.createEl('h4', {
            text: 'Customize Template Folders'
          })
          customOptionsContainer.createEl('p', {
            text: 'Select which folders to include in your custom template:',
            cls: 'setting-item-description'
          })

          // Get custom structure
          let customStructure: Record<string, any> = {}
          try {
            customStructure = JSON.parse(template.structure)
          } catch (e) {
            console.error('Error parsing custom template structure', e)
            customStructure = {}
          }

          // Create toggle for each possible folder
          const folderOptions = [
            { id: 'Documents', label: 'Documents (Files, Images)' },
            { id: 'Workspace', label: 'Workspace (Projects, Notes)' },
            {
              id: 'References',
              label: 'References (Books, Articles, Resources)'
            }
          ]

          folderOptions.forEach((option) => {
            const folderSetting = new Setting(customOptionsContainer)
              .setName(option.label)
              .setDesc(
                `Include the ${option.id} folder in your custom template`
              )
              .addToggle((toggle) => {
                // Check if this folder exists in the structure
                const isEnabled = !!customStructure[option.id]

                toggle.setValue(isEnabled).onChange(async (value) => {
                  // Parse the current structure
                  let structure: Record<string, any> = {}
                  try {
                    structure = JSON.parse(template.structure)
                  } catch (e) {
                    console.error('Error parsing template structure', e)
                    structure = {}
                  }

                  // Add or remove the folder
                  if (value) {
                    // Add the folder with default subfolders
                    if (option.id === 'Documents') {
                      structure.Documents = {
                        Images: {},
                        Files: {}
                      }
                    } else if (option.id === 'Workspace') {
                      structure.Workspace = {
                        Projects: {},
                        Notes: {}
                      }
                    } else if (option.id === 'References') {
                      structure.References = {
                        Books: {},
                        Articles: {},
                        Resources: {}
                      }
                    }
                  } else {
                    // Remove the folder
                    delete structure[option.id]
                  }

                  // Update the template structure
                  template.structure = JSON.stringify(structure)
                  await this.plugin.saveSettings()
                })
              })
          })

          // Insert the custom options right after the template grid
          const templateActionDiv = containerEl.createDiv({
            cls: 'template-actions'
          })
          const saveTemplateButton = templateActionDiv.createEl('button', {
            text: 'Apply Template Changes',
            cls: 'mod-cta'
          })

          // Make the button more noticeable
          const actionsStyle = document.createElement('style')
          actionsStyle.textContent = `
            .template-actions {
              display: flex;
              justify-content: flex-end;
              margin-top: 16px;
              margin-bottom: 24px;
            }
            button.mod-cta {
              font-weight: bold;
            }
          `
          document.head.appendChild(actionsStyle)

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

          // Insert the custom options before the template action div
          const existingActionDiv =
            containerEl.querySelector('.template-actions')
          if (existingActionDiv) {
            containerEl.insertBefore(customOptionsContainer, existingActionDiv)
          } else {
            containerEl.appendChild(customOptionsContainer)
          }
        } else {
          // Remove custom options if switching away from custom template
          const existingCustomOptions = containerEl.querySelector(
            '.custom-template-options'
          )
          if (existingCustomOptions) {
            existingCustomOptions.remove()
          }
        }

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

    // After all template cards are created, add the Apply Changes button
    const templateActionDiv = containerEl.createDiv({ cls: 'template-actions' })
    const saveTemplateButton = templateActionDiv.createEl('button', {
      text: 'Apply Template Changes',
      cls: 'mod-cta'
    })

    // Make the button more noticeable
    const actionsStyle = document.createElement('style')
    actionsStyle.textContent = `
      .template-actions {
        display: flex;
        justify-content: flex-end;
        margin-top: 16px;
        margin-bottom: 24px;
      }
      button.mod-cta {
        font-weight: bold;
      }
    `
    document.head.appendChild(actionsStyle)

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

    new Setting(containerEl)
      .setName('Help')
      .setDesc('Open the help documentation')
      .addButton((btn) =>
        btn.setButtonText('Open Help').onClick(() => {
          new HelpModal(this.app).open()
        })
      )
  }
}
