# Repository Sanitization Guide

This guide explains how to sanitize the repository of personal information before sharing it with others.

## Personal Information to Remove

1. **Deployment Paths**: The deployment script contains absolute paths specific to your system.
2. **Author Information**: The package.json file contains author name.
3. **Local References**: Any hardcoded paths in the codebase.

## How to Sanitize

### 1. Update deploy.mjs

Replace the hardcoded path in `deploy.mjs`:

```javascript
// FROM
const targetDir = 'X:/Obsidian/Link/content/.obsidian/plugins/linkplugin'

// TO
const targetDir = process.env.OBSIDIAN_PLUGIN_DIR || './dist'
```

This allows users to set their own path via environment variable or defaults to a local dist folder.

### 2. Update package.json

Consider anonymizing or generalizing author information if desired:

```json
"author": "Your Name Here", // Change as needed
```

### 3. Check for Hardcoded Paths

Search the codebase for any instances of:

- Your username
- Your computer's paths
- Personal directory names
- Any API keys or tokens

```bash
# Commands to help find personal information
grep -r "X:/" .
grep -r "C:\Users\" .
grep -r "home/" .
```

### 4. Update README.md

Ensure the README provides clear installation instructions that work for anyone:

```md
## Installation

1. Clone this repository
2. Run `npm install`
3. Run `npm run build`
4. Copy the contents of `main.js`, `manifest.json`, and `styles.css` to your Obsidian plugins folder
   OR set the OBSIDIAN_PLUGIN_DIR environment variable and run `npm run deploy`
```

### 5. Git History

Consider whether you need to sanitize git history:

- For a complete clean: Create a new repository and push only the sanitized code
- For preserving history: Use tools like BFG Repo Cleaner or git-filter-repo

## Testing After Sanitization

After sanitizing, verify that:

1. The build process works: `npm run build`
2. The tests run: `npm test`
3. The deployment works with the new configurable path: `npm run deploy`

By following these steps, you can share your repository without exposing personal information while ensuring it remains useful to others.
