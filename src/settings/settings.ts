import { FolderStructureType } from '../utils/migrationUtils'

export interface FolderTemplate {
  id: string
  name: string
  description: string
  isEnabled: boolean
  structure: string // JSON string representing folder structure
}

export interface LinkPluginSettings {
  // Daily Notes Management
  autoUpdateMonthlyFolders: boolean
  checkIntervalMinutes: number
  checkIntervalVariance: number // Add randomization to prevent system load spikes
  dailyNotesLocation: string // Current location of daily notes

  // Folder Template Management
  folderTemplates: FolderTemplate[]
  activeTemplateId: string

  // Folder Structure Options
  folderStructureType: FolderStructureType // Legacy or Hugo-compatible
  alwaysEnsureArchive: boolean // Whether to ensure Archive folder always exists

  // Link Processing
  hugoCompatibleLinks: boolean // Ensure links are Hugo-compatible
}

// Default folder templates
const DEFAULT_TEMPLATES: FolderTemplate[] = [
  {
    id: 'default',
    name: 'Default Structure',
    description:
      'Basic structure with Journal, References, Workspace, and Documents',
    isEnabled: true,
    structure: JSON.stringify({
      Journal: {
        y_$YEAR$: {
          $MONTH$: {}
        }
      },
      Documents: {
        Images: {},
        Files: {}
      },
      Templates: {},
      Workspace: {
        Projects: {},
        Notes: {}
      },
      References: {
        Books: {},
        Articles: {},
        Resources: {}
      },
      Archive: {}
    })
  },
  {
    id: 'minimal',
    name: 'Minimal Structure',
    description: 'Just the essentials (Journal and References only)',
    isEnabled: true,
    structure: JSON.stringify({
      Journal: {
        y_$YEAR$: {
          $MONTH$: {}
        }
      },
      References: {
        Books: {},
        Articles: {}
      },
      Templates: {},
      Archive: {}
    })
  },
  {
    id: 'custom',
    name: 'Custom Structure',
    description: 'Select exactly which folders you need in your workflow',
    isEnabled: false,
    structure: JSON.stringify({
      Journal: {
        y_$YEAR$: {
          $MONTH$: {}
        }
      },
      // Optionally enable these folders based on your needs
      /* 
      Documents: {
        Images: {},
        Files: {}
      },
      Workspace: {
        'Projects': {},
        'Notes': {}
      },
      References: {
        Books: {},
        Articles: {},
        Resources: {}
      },
      */
      Templates: {},
      Archive: {}
    })
  }
]

export const DEFAULT_SETTINGS: LinkPluginSettings = {
  // Daily Notes Management
  autoUpdateMonthlyFolders: true,
  checkIntervalMinutes: 60,
  checkIntervalVariance: 5, // +/- 5 minutes random variance
  dailyNotesLocation: '', // Will be set during initialization

  // Folder Template Management
  folderTemplates: DEFAULT_TEMPLATES,
  activeTemplateId: 'default',

  // Folder Structure Options
  folderStructureType: FolderStructureType.VAULT_ROOT,
  alwaysEnsureArchive: true,

  // Link Processing
  hugoCompatibleLinks: true
}
