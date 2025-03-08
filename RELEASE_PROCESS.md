# Obsidian Link Plugin Release Process

This document outlines the process for releasing new versions of the Obsidian Link Plugin.

## Automated Release (Recommended)

We provide two options for automated releases:

### Option 1: Python Script (cross-platform)

1. Make sure you have Python installed
2. Run `python deploy.py`
3. Follow the prompts to:
   - Choose the version increment type (patch, minor, major)
   - Add changelog entries for each category
4. The script will automatically:
   - Update version numbers in package.json and manifest.json
   - Update the CHANGELOG.md with your entries
   - Commit the changes to git
   - Build the plugin
   - Deploy to your Obsidian plugins folder

### Option 2: Batch Script (Windows only)

1. Run `release.bat`
2. Follow the prompts to:
   - Choose the version increment type
   - Add changelog entries
3. The script performs the same steps as the Python version

## Manual Release Process

If you prefer to release manually, follow these steps:

1. **Update Version Numbers**:

   - Edit `package.json` to increment the version
   - Edit `manifest.json` to match the same version

2. **Update the Changelog**:

   - Open `CHANGELOG.md`
   - Add a new version entry at the top with today's date
   - Format: `## [x.y.z] - YYYY-MM-DD`
   - Add changes under appropriate categories:
     - Added
     - Changed
     - Fixed
     - Removed

3. **Commit Changes**:

   ```bash
   git add CHANGELOG.md package.json manifest.json
   git commit -m "Bump version to x.y.z and update changelog"
   ```

4. **Build the Plugin**:

   ```bash
   npm run build
   ```

5. **Deploy to Obsidian**:

   - Clean the plugins directory:
     ```bash
     rm -f "X:/Obsidian/Link/content/.obsidian/plugins/linkplugin/*"
     ```
   - Copy the build files:
     ```bash
     cp main.js manifest.json styles.css "X:/Obsidian/Link/content/.obsidian/plugins/linkplugin/"
     ```

6. **Restart Obsidian** to load the new version

## Version Numbering

Follow semantic versioning (MAJOR.MINOR.PATCH):

- **MAJOR**: Incompatible API changes
- **MINOR**: New functionality in a backward compatible manner
- **PATCH**: Backward compatible bug fixes

## Changelog Format

Maintain a clean, user-focused changelog:

- Group changes by type (Added, Changed, Fixed, Removed)
- Write in plain language that users can understand
- Mark breaking changes with **Breaking** in bold
- Be specific about what changed and why it matters

## Troubleshooting

If you encounter the "jest is not defined" error:

1. Make sure the build configuration excludes test files
2. Clean the plugins directory completely before deploying
3. Check if your mock implementations use Jest
4. Try restarting Obsidian entirely
