import { App, TFile, TFolder } from 'obsidian'
import { LinkPluginSettings } from '../settings/settings'

// Define folder structure types
export enum FolderStructureType {
  VAULT_ROOT = 'vault_root' // Structure directly in vault root
}

// Vault root (no prefix folder)
export const VAULT_ROOT = ''

/**
 * Determines the current folder structure type being used
 */
export async function detectFolderStructureType(
  vault: any
): Promise<FolderStructureType> {
  // Always return VAULT_ROOT as that's the only supported option
  return FolderStructureType.VAULT_ROOT
}

/**
 * Migrates folder structure to vault root format
 * @param app The Obsidian App instance
 * @param preserveFiles Whether to move files between structures (true) or create empty folders (false)
 * @param ensureArchive Whether to always maintain an Archive folder
 * @returns A log of migration operations performed
 */
export async function migrateFolderStructure(
  app: App,
  preserveFiles: boolean = true,
  ensureArchive: boolean = true
): Promise<string[]> {
  const migrationLog: string[] = []
  const vault = app.vault

  try {
    // Create Archive folder if needed
    if (ensureArchive) {
      await ensureArchiveFolder(app)
      migrationLog.push(
        `Verified Archive folder exists in vault root structure`
      )
    }

    migrationLog.push(`Migration completed successfully`)
    return migrationLog
  } catch (error) {
    migrationLog.push(`Error during migration: ${error.message}`)
    console.error('Error during folder structure migration:', error)
    throw error
  }
}

/**
 * Ensures the Archive folder exists in the vault
 */
export async function ensureArchiveFolder(app: App): Promise<void> {
  const archiveFolderName = 'Archive'
  const vault = app.vault

  // Check if Archive folder exists
  if (!(await vault.adapter.exists(archiveFolderName))) {
    // Create it if it doesn't
    await vault.createFolder(archiveFolderName)
    console.log('Created Archive folder')
  }
}
