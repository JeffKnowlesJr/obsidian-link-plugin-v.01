# Obsidian Link Plugin

A powerful plugin for Obsidian that helps you create and manage notes with an organized folder structure.

## Features

### Quick Note Creation and Linking

- Create new notes directly from selected text or via a modern modal interface
- Automatically creates wiki-style links (`[[note-name]]`) to newly created notes
- Choose destination folder from a dropdown menu
- Pre-fills note name if text is selected
- Smart file name sanitization for system compatibility
- Keyboard navigation support (Enter to create)

### Automatic Folder Structure

The plugin automatically maintains a structured folder hierarchy:

```
/Journal
  /y_2024
    /January
      /2024-01-01 Monday.md
      /2024-01-02 Tuesday.md
      ...
    /February
    /March
    ...
  /y_2025
    /January
    /February
    ...
/Documents
  /Images
  /Videos
  /Audio
  /Other
/Templates
  /Daily Note Template.md
  /Weekly Review Template.md
  /Project Plan Template.md
  ...
/Workspace
  /Client-X
    /Project-Alpha
      /SRS.md
      /Requirements.md
      ...
  /Client-Y
    /Project-Beta
      ...
  /Client-Self
    /Project-Zen
      ...
/References
  /Books
    /Technology
    /Business
  /Articles
    /Blog-Posts
    /Research
  /Courses
    /Online
    /Certifications
/Archive
  /Completed-Projects
  /Old-References
  /Old-Templates
```

### Daily Notes Management

- Automatically creates and maintains year/month folders in the Journal section using full month names
- Creates and manages a default daily note template if none exists
- Automatically updates daily notes location based on current month
- Hourly checks to ensure daily notes folder is correct for the current month
- Updates Obsidian's core daily notes settings to match the current structure
- Default template includes sections for tasks, notes, journal entries, and links
- Migrates existing notes from old folder format to new format automatically

### Auto-Updates and Error Handling

- Hourly checks for month changes to update daily notes location
- Creates new year/month folders as needed
- Maintains consistent folder structure across vault
- Graceful handling of duplicate files
- Clear error messages for invalid note names
- Fallback behaviors for missing templates
- Comprehensive error logging for troubleshooting

## Changelog

### Version 1.1.0

- **Breaking Change**: Removed root `_Link` folder and leading underscores from folder names for better Hugo compatibility
- Folder structure remains the same but without problematic underscore prefixes
- Existing notes will be automatically migrated to the new structure

## Known Bugs

### TypeScript Errors with moment.js Mock

There is a known issue with TypeScript type definitions when mocking the moment.js functionality provided by Obsidian. While the application works correctly in production, one test is failing due to TypeScript type conflicts between Obsidian's moment implementation and the test mock.

**Impact:**

- One test is failing due to TypeScript errors
- The application functions correctly in production
- This is a development/testing issue only, not a runtime problem

**Technical Details:**

- The error occurs when trying to mock Obsidian's moment.js implementation in tests
- TypeScript reports "Type 'typeof moment' has no call signatures"
- Multiple approaches to fixing the type definitions have been attempted without success
- The core functionality remains unaffected

**Workaround:**
Currently using a TypeScript type assertion to maintain functionality while acknowledging the type mismatch. This is not ideal but allows the application to function while we investigate a proper fix.

## Usage

### Creating New Notes

1. **Create a Note from Selection**:

   - Select some text in your current note
   - Use the command "Create new linked note" (or use the hotkey if configured)
   - The selected text becomes the title of your new note
   - A link to the new note replaces your selection

2. **Create a Note from Prompt**:
   - Without any text selected, use the command "Create new linked note"
   - Enter the desired note name in the popup dialog
   - Choose the destination folder from the dropdown
   - A new note will be created and linked at your cursor position

### Daily Notes

- Daily notes are automatically created in the correct year/month folder
- Template is automatically applied
- Folder structure is maintained automatically

## Installation

1. Open Obsidian Settings
2. Go to Community Plugins and disable Safe Mode
3. Click Browse and search for "Link Plugin"
4. Install the plugin and enable it
5. The plugin will automatically create the necessary folder structure
6. Daily notes settings will be configured automatically

## Configuration

- The plugin maintains its own settings and coordinates with Obsidian's core daily notes settings
- Folder structure is created and maintained automatically
- Templates are created if they don't exist

### Monthly Folder Updates

The plugin includes settings to control how daily notes folders are updated:

- **Auto-update monthly folders**: Toggle automatic monthly folder updates on/off
- **Check interval**: Set how frequently the plugin checks for month changes (15-240 minutes)

These settings help ensure your daily notes are always created in the correct monthly folder without manual intervention.

### Folder Structure Templates

The plugin now uses a template system for managing folder structures:

- **Predefined templates**: Choose from several built-in folder structure templates

  - **Default Structure**: The complete folder hierarchy with all sections
  - **Minimal Structure**: Just the essential Journal and Templates folders
  - **Research Focus**: Optimized for research and reference materials

- **Custom templates**: Create your own folder structure templates with a user-friendly editor

  - Design custom hierarchies to match your workflow
  - Use variables like `$YEAR$` and `$MONTH$` for dynamic folder names
  - Enable/disable templates as needed

- **Template management**:
  - Preview templates before applying them
  - Edit existing templates
  - Create new templates from scratch
  - Apply templates with a single click

This template system gives you complete control over how your vault is organized, allowing you to create the exact structure that works best for your needs.

## Technical Architecture

### Core Components

1. **Main Plugin Class (`main.ts`)**

   - Entry point for the plugin
   - Handles plugin lifecycle (load/unload)
   - Registers commands
   - Manages plugin initialization

2. **Commands (`src/commands/`)**

   - `createLinkedNote.ts`: Core functionality for creating and linking notes
   - Modular functions for each operation
   - Strong type safety with TypeScript
   - Comprehensive error handling
   - Clear separation of concerns:
     - Note name acquisition
     - File name validation
     - File creation
     - Link insertion

3. **Modals (`src/modals/`)**

   - `helpModal.ts`: Displays plugin documentation and settings access
   - `newNoteModal.ts`: Handles note name input with validation

4. **Utilities (`src/utils/`)**
   - `fileUtils.ts`: File system operations and path handling
   - `errorHandler.ts`: Centralized error handling with custom error types

### Data Flow

1. **Note Creation Flow**

   ```
   User Action (Selection/Command)
   ↓
   Get Note Name (Selection/Modal)
   ↓
   Validate & Sanitize Filename
   ↓
   Create Note File
   ↓
   Insert Link
   ↓
   Show Success Notice
   ```

2. **Error Handling Flow**
   ```
   Error Occurs
   ↓
   Error Wrapped as LinkPluginError
   ↓
   Context Added
   ↓
   Error Logged
   ↓
   User Notified
   ↓
   Error Propagated
   ```

### Dependencies

- **Obsidian API**: Core functionality for file operations and UI
- **TypeScript**: Type safety and modern JavaScript features
- **tslib**: TypeScript helper functions

### Best Practices

1. **Code Organization**

   - Single responsibility functions
   - Clear error boundaries
   - Type-safe interfaces
   - Async operation handling

2. **Error Handling**

   - Always use `LinkPluginError`
   - Preserve error context
   - Provide user-friendly messages
   - Log for debugging

3. **File Operations**
   - Validate before operations
   - Handle existence checks
   - Proper error propagation
   - Clean error messages

## Support

If you encounter any issues or have suggestions, please visit our [GitHub repository](https://github.com/jeffknowlesjr/obsidian-link-plugin) to file an issue.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## For Contributors

### Version Management and Changelog

When contributing to this project, please follow these guidelines:

1. **Version Increment**:

   - Increment the version number in both `package.json` and `manifest.json` files
   - Follow semantic versioning principles:
     - MAJOR version for incompatible API changes (e.g., 1.2.0 → 2.0.0)
     - MINOR version for added functionality in a backward compatible manner (e.g., 1.1.0 → 1.2.0)
     - PATCH version for backward compatible bug fixes (e.g., 1.2.0 → 1.2.1)

2. **Changelog Updates**:

   - Document ALL changes in the CHANGELOG.md file
   - Create a new version section at the top of the file with the new version number and date
   - Categorize changes under appropriate headings (Added, Changed, Fixed, etc.)
   - Write clear, user-focused descriptions of each change
   - Mark breaking changes with **Breaking** in bold
   - Update the version and date in existing entries if you're adding to an unreleased version

3. **Commit Messages**:

   - Include the version number in commit messages when updating version
   - Example: "Bump version to 1.2.0 and update changelog"
   - For routine changes: "feat: add new folder template option" or "fix: resolve moment.js typing issues"

4. **Pull Requests**:
   - Reference the version number in PR titles when they include version bumps
   - Include a summary of changelog additions in the PR description

These practices ensure proper tracking of changes and help users understand what has changed between versions.

### Build System
