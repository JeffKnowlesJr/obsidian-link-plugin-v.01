import { Vault, App, moment, TFolder } from 'obsidian'
import { LinkPluginSettings, DEFAULT_SETTINGS } from '../settings/settings'
import {
  subtractDay,
  addDay,
  formatTime,
  getCurrentMoment
} from './momentHelper'

// Use empty string for ROOT_FOLDER to indicate vault root
export const ROOT_FOLDER = ''

export const BASE_FOLDERS = {
  JOURNAL: `Journal`,
  DOCUMENTS: `Documents`,
  TEMPLATES: `Templates`,
  WORKSPACE: `Workspace`,
  REFERENCES: `References`,
  ARCHIVE: `Archive`
} as const

export const SUB_FOLDERS = {
  [BASE_FOLDERS.DOCUMENTS]: ['Images', 'Videos', 'Audio', 'Other'],
  [BASE_FOLDERS.REFERENCES]: [
    'Books/Technology',
    'Books/Business',
    'Articles/Blog-Posts',
    'Articles/Research',
    'Courses/Online',
    'Courses/Certifications'
  ],
  [BASE_FOLDERS.ARCHIVE]: [
    'Completed-Projects',
    'Old-References',
    'Old-Templates'
  ]
} as const

const DEFAULT_TEMPLATE_CONTENT = `---
previous: ''
next: ''
tags: []
resources: []
stakeholders: []
---

## Routine Checklist

- [ ] **Daily Checks**

  - [ ] Bed and Clothes 🛏️🧺
  - [ ] Self Care🛀🧴
  - [ ] Clean Kitchen 🍽✨
  - [ ] Pet Care 🐕🚶🏻‍♂️
  - [ ] Get Focused 🖥️💊

- [ ] **Technology Check**
  - [ ] Wear Watch ⌚️
  - [ ] Manage [Calendar](https://calendar.google.com) 📆
  - [ ] Check [Mail](https://mail.google.com) ✉️
  - [ ] Review [[December Log]] 🗓️
  - [ ] Review [[December List]] ✅

---

## Log

### To Do

- [ ]

### Stream

>

### Events

-

### Work

- ***

## Daily Planning Tips

1. **Set Clear Goals**: Identify three major tasks (🟩🟨🟥), prioritizing one high-impact task (🟥).
2. **Break Down Tasks**: Divide projects into manageable, specific steps.
3. **Use Focus Sessions**: 40 mins work + 10 mins review/break.
4. **Prioritize Early**: Start with critical tasks for peak productivity.
5. **End with Review**: Reflect on accomplishments; outline tomorrow's goals.
6. **Limit Distractions**: Turn off notifications; avoid multitasking.
7. **Organize Visually**: Use Obsidian as a "second brain" reference.
8. **Plan Extra Time**: Buffer for complex tasks to avoid rushing.
9. **Weekly Review**: Adjust goals based on progress and priorities.

### Tip

Incorporate one of these each day to build a strong, consistent planning habit.

---

## Challenges

`

async function ensureTemplateExists(vault: Vault): Promise<string> {
  const templatePath = `${BASE_FOLDERS.TEMPLATES}/Daily Note Template.md`
  try {
    const exists = await vault.adapter.exists(templatePath)
    if (!exists) {
      await vault.create(templatePath, DEFAULT_TEMPLATE_CONTENT)
      console.debug(`Created template file: ${templatePath}`)
    }
    return templatePath
  } catch (error) {
    console.error('Error ensuring template exists:', error)
    throw error
  }
}

export async function updateDailyNotesLocation(app: App): Promise<string> {
  try {
    const now = new Date()
    const year = now.getFullYear()
    const monthName = new Intl.DateTimeFormat('en-US', {
      month: 'long'
    }).format(now)

    const yearFolder = `${BASE_FOLDERS.JOURNAL}/y_${year}`
    const monthFolder = `${yearFolder}/${monthName}`

    // Ensure the folders exist
    await createFolderIfNotExists(app.vault, yearFolder)
    await createFolderIfNotExists(app.vault, monthFolder)

    // Ensure template exists and get its path
    const templatePath = await ensureTemplateExists(app.vault)

    // Update Obsidian's core daily notes settings
    try {
      const dailyNotesSettings = await app.vault.adapter
        .read('.obsidian/daily-notes.json')
        .catch(() => '{}')
      const settings = JSON.parse(dailyNotesSettings)

      settings.folder = monthFolder
      settings.template = templatePath
      settings.format = 'YYYY-MM-DD dddd'

      await app.vault.adapter.write(
        '.obsidian/daily-notes.json',
        JSON.stringify(settings, null, 2)
      )

      // If the daily-notes plugin is enabled, update its settings
      const dailyNotesPlugin = (app as any).internalPlugins?.plugins[
        'daily-notes'
      ]
      if (dailyNotesPlugin?.enabled) {
        dailyNotesPlugin.instance.options = settings
      }
    } catch (error) {
      console.error('Error updating daily notes settings:', error)
      // Continue execution even if settings update fails
    }

    return monthFolder
  } catch (error) {
    console.error('Error updating daily notes location:', error)
    throw new Error('Failed to update daily notes location')
  }
}

export async function ensureFolderStructure(
  app: App,
  settings: LinkPluginSettings = DEFAULT_SETTINGS
): Promise<void> {
  try {
    // Create root folder first
    await createFolderIfNotExists(app.vault, ROOT_FOLDER)

    // Find the active template
    const activeTemplate = settings.folderTemplates.find(
      (template) =>
        template.id === settings.activeTemplateId && template.isEnabled
    )

    // If no active template is found, use the first enabled one
    const templateToUse =
      activeTemplate ||
      settings.folderTemplates.find((template) => template.isEnabled) ||
      settings.folderTemplates[0]

    if (!templateToUse) {
      console.error('No valid folder template found')
      throw new Error('No valid folder template found')
    }

    // Parse the structure
    let structure: any
    try {
      structure = JSON.parse(templateToUse.structure)
    } catch (e) {
      console.error('Invalid template structure JSON:', e)
      throw new Error('Invalid template structure')
    }

    // Process template variables
    const now = new Date()
    const currentYear = now.getFullYear().toString()
    const currentMonth = new Intl.DateTimeFormat('en-US', {
      month: 'long'
    }).format(now)

    // Create the folder structure recursively
    await createFolderStructure(app.vault, ROOT_FOLDER, structure, {
      $YEAR$: currentYear,
      $MONTH$: currentMonth
    })

    // Update daily notes location
    await updateDailyNotesLocation(app)
  } catch (error) {
    console.error('Error ensuring folder structure:', error)
    throw new Error('Failed to create folder structure')
  }
}

/**
 * Recursively creates a folder structure based on a template
 */
async function createFolderStructure(
  vault: Vault,
  basePath: string,
  structure: any,
  variables: Record<string, string> = {}
): Promise<void> {
  for (const [folderName, subFolders] of Object.entries(structure)) {
    // Replace any variables in the folder name
    let processedFolderName = folderName
    for (const [variable, value] of Object.entries(variables)) {
      processedFolderName = processedFolderName.replace(variable, value)
    }

    // Create this folder
    const fullPath = `${basePath}/${processedFolderName}`
    await createFolderIfNotExists(vault, fullPath)

    // Recursively create subfolders if any
    if (
      subFolders &&
      typeof subFolders === 'object' &&
      Object.keys(subFolders).length > 0
    ) {
      await createFolderStructure(vault, fullPath, subFolders, variables)
    }
  }
}

async function createFolderIfNotExists(
  vault: Vault,
  path: string
): Promise<void> {
  try {
    const exists = await vault.adapter.exists(path)
    if (!exists) {
      await vault.createFolder(path)
      console.debug(`Created folder: ${path}`)
    }
  } catch (error) {
    console.error(`Error creating folder ${path}:`, error)
    throw error
  }
}

export async function ensureFutureDailyNoteFolder(
  app: App,
  date: moment.Moment
): Promise<string> {
  try {
    const year = date.year()
    const monthName = date.format('MMMM') // Use full month name (January, February, etc.)

    const yearFolder = `${BASE_FOLDERS.JOURNAL}/y_${year}`
    const monthFolder = `${yearFolder}/${monthName}`

    // Create folders if they don't exist
    await createFolderIfNotExists(app.vault, yearFolder)
    await createFolderIfNotExists(app.vault, monthFolder)

    return monthFolder
  } catch (error) {
    console.error('Error creating future daily note folder:', error)
    throw new Error('Failed to create future daily note folder')
  }
}

export async function createDailyNoteContent(
  app: App,
  noteName: string,
  date?: string | Date
): Promise<string> {
  try {
    const templatePath = `${BASE_FOLDERS.TEMPLATES}/Daily Note Template.md`
    const template = await app.vault.adapter.read(templatePath)

    if (date) {
      const prevDateStr = subtractDay(date).format('YYYY-MM-DD')
      const nextDateStr = addDay(date).format('YYYY-MM-DD')

      // Format the dates for links
      const prevLink = `${prevDateStr}`
      const nextLink = `${nextDateStr}`

      // Replace template variables
      return template
        .replace(/prev: ''/g, `prev: '[[${prevLink}]]'`)
        .replace(/next: ''/g, `next: '[[${nextLink}]]'`)
        .replace(
          /{{date:YYYY-MM-DD}}/g,
          getCurrentMoment().format('YYYY-MM-DD')
        )
        .replace(/{{time:HH:mm}}/g, formatTime())
        .replace(
          /{{date:dddd, MMMM D, YYYY}}/g,
          getCurrentMoment().format('dddd, MMMM D, YYYY')
        )
    }

    return template
  } catch (error) {
    console.error('Error creating daily note content:', error)
    throw error
  }
}

export async function migrateExistingDailyNotes(app: App): Promise<void> {
  try {
    console.debug(
      'Starting migration of existing daily notes to new folder structure'
    )

    // Find all existing daily note folders with the old format
    const journalFolder = BASE_FOLDERS.JOURNAL

    // Get all year folders
    const yearFolders = await app.vault.adapter.list(journalFolder)
    if (!yearFolders || !yearFolders.folders) return

    // Process each year folder
    for (const yearFolder of yearFolders.folders) {
      // Only process year folders that match the pattern y_YYYY
      if (!yearFolder.match(/\/y_\d{4}$/)) continue

      // Get all month folders in this year
      const monthFolders = await app.vault.adapter.list(yearFolder)
      if (!monthFolders || !monthFolders.folders) continue

      // Process each month folder
      for (const oldMonthFolder of monthFolders.folders) {
        // Only process folders that match the old format m_MM_MMM
        const oldFormatMatch = oldMonthFolder.match(/\/m_(\d{2})_(\w{3})$/)
        if (!oldFormatMatch) continue

        // Extract the month information
        const monthNumber = parseInt(oldFormatMatch[1], 10)
        const monthAbbrev = oldFormatMatch[2]

        // Convert to full month name
        const monthDate = new Date(2000, monthNumber - 1, 1) // Use any year, the month is what matters
        const monthName = new Intl.DateTimeFormat('en-US', {
          month: 'long' // Use full month name
        }).format(monthDate)

        // Create the new month folder path
        const pathParts = yearFolder.split('/')
        const yearFolderName = pathParts[pathParts.length - 1]
        const year = yearFolderName.replace('y_', '')
        const newMonthFolder = `${yearFolder}/${monthName}`

        // Create the new folder if it doesn't exist
        if (!(await app.vault.adapter.exists(newMonthFolder))) {
          await app.vault.createFolder(newMonthFolder)
          console.debug(`Created new month folder: ${newMonthFolder}`)
        }

        // Move all files from old folder to new folder
        const oldFolderContents = await app.vault.adapter.list(oldMonthFolder)
        if (oldFolderContents && oldFolderContents.files) {
          for (const file of oldFolderContents.files) {
            const fileName = file.split('/').pop()
            const newFilePath = `${newMonthFolder}/${fileName}`

            // Move the file if the destination doesn't exist
            if (!(await app.vault.adapter.exists(newFilePath))) {
              // Read file content
              const content = await app.vault.adapter.read(file)

              // Create file in new location
              await app.vault.create(newFilePath, content)

              // Delete original file
              const originalFile = app.vault.getAbstractFileByPath(file)
              if (originalFile) {
                await app.vault.delete(originalFile)
              }

              console.debug(`Migrated file: ${file} → ${newFilePath}`)
            }
          }
        }

        // Remove the old folder if it's empty
        const newCheckOldFolder = await app.vault.adapter.list(oldMonthFolder)
        if (
          !newCheckOldFolder.files.length &&
          !newCheckOldFolder.folders.length
        ) {
          const oldFolder = app.vault.getAbstractFileByPath(oldMonthFolder)
          if (oldFolder) {
            await app.vault.delete(oldFolder)
            console.debug(`Removed empty old folder: ${oldMonthFolder}`)
          }
        }
      }
    }

    console.debug('Migration of existing daily notes completed')
  } catch (error) {
    console.error('Error migrating existing daily notes:', error)
    throw new Error('Failed to migrate existing daily notes')
  }
}
